/**
 * Generate AI images for an article.
 *
 * Each article gets TWO variants generated in parallel:
 *   - watercolor: warm illustrated, on-brand cozy feel
 *   - photo:     cinematic editorial photograph, contemporary realism
 *
 * Editor picks one in /urednik/osnutki/[id]; chosen URL is mirrored into
 * the existing `ai_image_url` column so the public site reads it unchanged.
 *
 * Pipeline:
 *   1. Claude — concise scene description (10-15 words) from article
 *   2. Claude vision — describe person from og:image / Wikipedia (if needed)
 *   3. Nano Banana 2 (Gemini) — render both styles in parallel
 *   4. Cloudflare R2 — host both PNGs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { askClaude, askClaudeWithImage } from './ai.mjs';

const log = (msg) => process.stderr.write(`[ImageGen] ${msg}\n`);

// ── Edge-fill + anti-text suffix used by both styles ────────────────────────
// Watercolor needs heavy "no paper border" prompt-stuffing because the medium
// naturally bleeds at edges. Photo needs much less.
const WATERCOLOR_SUFFIX = ', wide landscape format, main subject placed in the vertical and horizontal center of the frame, full-bleed edge-to-edge composition, painted background fills 100% of the canvas, color and texture extend all the way to all four edges of the frame, scene continues past the frame edges as if cropped from a larger painting, absolutely no white margins, no white border, no paper border visible at any edge, no paper texture showing at edges, no off-white frame, no cream-colored border, no rectangular inset, no matte board, no scanned-paper look, no vignette, no unpainted areas, no negative space at the edges. The image is NOT a framed artwork — it is a flat illustration that touches every pixel of the output. No text, no words, no letters, no writing, no numbers.';

const PHOTO_SUFFIX = ', wide 16:9 landscape framing, main subject centered, full-bleed photograph filling 100% of canvas, no border, no vignette, no watermark, no text, no words, no letters, no numbers, no logos. Modern everyday clothing on people (jeans, T-shirts, hoodies, light jackets) — NEVER period costumes, aprons, suspenders, neckerchiefs, or peasant dress unless the article explicitly describes a historical or folkloric subject.';

// ── Style per category — watercolor (existing palette + medium) ────────────
const CATEGORY_WATERCOLOR_STYLES = {
  SPORT: 'Dynamic watercolor illustration with bold strokes, vivid electric blues and bright greens, sense of motion and energy, stadium lighting',
  ZIVALI: 'Warm naturalistic watercolor, rich earth tones and forest greens, soft amber light, intimate close-up feel, bokeh background',
  SKUPNOST: 'Soft golden-hour watercolor illustration, warm ambers and honey tones, contemporary Slovenian village atmosphere, gentle diffused sunlight',
  NARAVA: 'Lush landscape watercolor, vibrant greens and sky blues, crisp morning light, fresh and alive, rich natural colors',
  INFRASTRUKTURA: 'Clean architectural watercolor, cool steel blues and concrete grays with warm sunset accents, strong geometric lines, modern',
  PODJETNISTVO: 'Crisp modern illustration, clean whites and tech blues with warm wood accents, bright workshop lighting, innovative feel',
  SLOVENIJA_V_SVETU: 'Expansive watercolor panorama, deep alpine blues and white peaks with subtle red accents, majestic wide-angle view',
  JUNAKI: 'Warm portrait-style watercolor, rich skin tones and golden intimate lighting, soft focus background, emotional and personal',
  KULTURA: 'Dramatic watercolor with theater lighting, deep burgundy reds and royal purples with golden stage highlights, artistic atmosphere',
};

// ── Style per category — photoreal (cinematic editorial) ───────────────────
const CATEGORY_PHOTO_STYLES = {
  SPORT: 'Sports action photograph, fast shutter, stadium lighting, dynamic angle, sharp focus on athlete in motion',
  ZIVALI: 'Wildlife photograph, telephoto lens, soft natural bokeh, intimate framing, golden-hour light',
  SKUPNOST: 'Warm documentary editorial photograph, golden-hour natural light, 35mm, shallow depth of field, contemporary rural Slovenia (Štajerska, Dolenjska, Gorenjska — simple stone-and-stucco houses with red tile roofs, NOT half-timbered fairy-tale villages)',
  NARAVA: 'Landscape photograph, dramatic natural light, wide vista, crisp detail, contemporary Slovenian alpine or hill country',
  INFRASTRUKTURA: 'Architectural photograph, clean lines, golden-hour or blue-hour lighting, modern Slovenia',
  PODJETNISTVO: 'Editorial product / workshop photograph, clean modern lighting, focused detail, contemporary Slovenian workspace',
  SLOVENIJA_V_SVETU: 'Travel photograph, wide vista, alpine landscape opening to horizon, natural golden-hour light',
  JUNAKI: 'Intimate portrait photograph, golden-hour window light, shallow depth of field, contemporary Slovenia',
  KULTURA: 'Stage / performance photograph, theater lighting, cinematic colors, contemporary Slovenian venue',
};

function getWatercolorStyle(category) {
  return (CATEGORY_WATERCOLOR_STYLES[category] || CATEGORY_WATERCOLOR_STYLES.SKUPNOST) + ', ';
}
function getPhotoStyle(category) {
  return (CATEGORY_PHOTO_STYLES[category] || CATEGORY_PHOTO_STYLES.SKUPNOST) + ', ';
}

// ── Generic safe scenes for category — used when all person-aware retries fail
// Always people-free so Gemini's safety filter has nothing to bite on.
const GENERIC_SCENES = {
  SPORT: 'empty modern indoor sports arena at golden hour, dynamic stadium lighting, clean polished floor, no people visible',
  ZIVALI: 'serene Slovenian forest clearing at dawn with soft mist, tall pine trees, no animals or people visible',
  SKUPNOST: 'contemporary Slovenian village square at golden hour with stone-and-stucco buildings and a stone fountain, no people visible',
  NARAVA: 'wide Slovenian alpine landscape at sunrise with morning mist over green valleys and snow-capped peaks, no people',
  INFRASTRUKTURA: 'modern Slovenian architectural detail at blue hour with clean geometric lines and warm interior lighting, no people',
  PODJETNISTVO: 'clean modern Slovenian workshop interior with bright daylight, wood workbench and tools laid out neatly, no people',
  SLOVENIJA_V_SVETU: 'Triglav peak with dramatic morning light over alpine landscape opening to distant horizon, no people',
  JUNAKI: 'warm cozy contemporary Slovenian home interior with afternoon window light, simple wooden furniture, no people',
  KULTURA: 'empty contemporary Slovenian theater stage with dramatic warm lighting and red velvet curtain, no people',
};

// ── Level 2: Claude softens a prompt that Gemini refused for safety
const SOFTEN_SYSTEM = `You're rewriting an AI image-generation prompt that Google Gemini refused for safety reasons. The most common cause is named or recognizable real people.

Rewrite the prompt to:
- Replace any named person with a generic archetype ("a Slovenian athlete", "an elderly Slovenian actor")
- Remove identifying details (specific clothing items, distinctive facial features, recognizable settings tied to one person)
- Keep general physical descriptors (skin tone, hair color, age range) — those are fine
- Preserve the visual scene, setting, atmosphere, and ALL technical descriptors (style, framing, "no border", "no watermark", "16:9", etc.)

Output ONLY the rewritten prompt as a single line. No commentary, no explanation, no quotes.`;

async function softenPrompt(prompt) {
  try {
    const { askClaude } = await import('./ai.mjs');
    const rewritten = await askClaude(SOFTEN_SYSTEM, prompt, 'image_soften');
    const cleaned = rewritten.trim().replace(/^["']|["']$/g, '');
    return cleaned && cleaned !== prompt ? cleaned : null;
  } catch (err) {
    return null;
  }
}

// Cascade: original-with-ref → text-only → Claude-softened → generic safe scene.
// Returns { buf, prompt, level } or null. The prompt returned is the one that
// actually produced the image — store this as the variant's prompt so editors
// see what was used, not the original that failed.
async function tryNanoBananaWithRetry(originalPrompt, refImageUrl, kind, category) {
  // L1: original + reference
  let buf = await tryNanoBanana(originalPrompt, refImageUrl, kind);
  if (buf) return { buf, prompt: originalPrompt, level: 1 };

  // L1.5: drop reference (most common Gemini refusal — reference photo of real person)
  if (refImageUrl) {
    log(`(${kind}) L1 failed → retry text-only`);
    buf = await tryNanoBanana(originalPrompt, null, kind);
    if (buf) return { buf, prompt: originalPrompt, level: 1.5 };
  }

  // L2: Claude rewrites the prompt to be safer (one extra LLM call, ~$0.01)
  log(`(${kind}) L1.5 failed → asking Claude to soften prompt`);
  const softened = await softenPrompt(originalPrompt);
  if (softened) {
    buf = await tryNanoBanana(softened, null, kind);
    if (buf) return { buf, prompt: softened, level: 2 };
  }

  // L3: generic category-appropriate scene with no people — almost always works
  log(`(${kind}) L2 failed → generic fallback`);
  const styleFn = kind === 'watercolor' ? getWatercolorStyle : getPhotoStyle;
  const suffix  = kind === 'watercolor' ? WATERCOLOR_SUFFIX  : PHOTO_SUFFIX;
  const genericScene = GENERIC_SCENES[category] || GENERIC_SCENES.SKUPNOST;
  const fallback = styleFn(category) + genericScene + suffix;
  buf = await tryNanoBanana(fallback, null, kind);
  if (buf) return { buf, prompt: fallback, level: 3 };

  return null;
}

// ── Category-specific hints for Claude's scene description ─────────────────
const CATEGORY_HINTS = {
  SPORT: `Focus on the specific athlete from the article. Extract and include these details:
- WHICH SPORT they play (basketball, skiing, cycling, football, etc.)
- Their JERSEY/DRESS NUMBER if mentioned
- Their SKIN COLOR and HAIR (be specific: light-skinned, dark-skinned, blonde, etc.)
- Their TEAM COLORS or NATIONAL TEAM jersey colors
- The specific ACTION they're doing (dunking, skiing downhill, crossing finish line)
- The VENUE (indoor arena, ski slope, stadium, velodrome)
Show the athlete mid-action in their correct sport and attire. Use concrete nouns: "light-skinned basketball player number 77 in white jersey soaring for a dunk in a packed arena"`,

  ZIVALI: `Focus on the animal itself — close portrait or in its natural habitat. Show eyes, fur/feathers, personality. Use concrete nouns: "wolf pack moving through misty alpine forest at dawn"`,

  SKUPNOST: `Focus on people together — hands meeting, a group gathered, a community event. Show the setting (village square, school, park). Use concrete nouns: "neighbors planting trees together in a sunny village square"`,

  NARAVA: `Focus on the specific natural element from the story — a river, mountain, forest, flower. Show the landscape or close-up detail. Use concrete nouns: "morning mist rising over a green alpine valley with wildflowers"`,

  INFRASTRUKTURA: `Focus on the structure itself — a bridge, building, road, solar panels. Show it at its most impressive angle. Use concrete nouns: "modern glass bridge spanning a deep gorge at golden hour"`,

  PODJETNISTVO: `Focus on WHAT they built — the product, device, invention. Show it in its workshop or in use. Use concrete nouns: "small bluetooth tracker resting on recycled ocean plastic pellets in a workshop"`,

  SLOVENIJA_V_SVETU: `Focus on Slovenian identity in a global context — alpine mountains with world landmarks, Slovenian landscape opening to the horizon. Use concrete nouns: "Triglav peak with morning light and a distant city skyline"`,

  JUNAKI: `Focus on the person in their element — their workspace, their tools, their hands. Show what makes them heroic through their environment. Use concrete nouns: "elderly grandmother teaching a child to play piano in a cozy apartment"`,

  KULTURA: `Focus on the art form in action — instrument being played, dancers mid-movement, a theater stage. Show the specific art. Use concrete nouns: "choir singing in a candlelit stone church with stained glass windows"`,
};

// ── Claude generates a short scene description + decides on reference photo ──
const IMAGE_PROMPT_SYSTEM = `You are writing a short image description for an AI image generator. Based on the article and the visual hint, write a SINGLE scene description in English.

Rules:
- EXACTLY 10-15 words
- Describe what the viewer should SEE — concrete nouns and settings
- The MAIN SUBJECT must be in the CENTER of the scene — describe it as the central focal point
- Include setting/context around the subject — where is this happening?
- The image will be cropped to show the center, so do NOT place key elements at edges
- PEOPLE: This is Slovenia — ALL people must be described as "light-skinned" or "white" or "fair-skinned" in your scene description UNLESS the article explicitly mentions a different ethnicity. Always include skin tone in the description when people are present. Example: "light-skinned elderly woman" not just "elderly woman"
- CONTEMPORARY SLOVENIA: Anchor scenes to modern-day Slovenia. Buildings should be described as simple stone-and-stucco with red tile roofs, NOT half-timbered fairy-tale villages. People wear modern everyday clothes unless the article is explicitly historical/folkloric.
- ONE scene only — pick a single setting (the barn OR the village square, not both glued together)
- NO abstract concepts ("innovation", "success", "community spirit")
- NO article title repetition

Also decide: should the image generator use a reference photo of the real person from the article?
- YES only if the article is about ONE specific named person whose FACE is central to the story
- NO for groups of people, animals, nature, buildings, abstract topics, unnamed people
- Examples: "Babica Manja igra klavir" → YES (one person, her face matters)
            "10.000 prostovoljcev" → NO (group, no single face)
            "Risinja Sneška z mladiči" → NO (animal)
            "Voznik Bojan postal prvak" → YES (one person)

Return ONLY JSON, no markdown:
{"scene": "your 10-15 word scene description", "use_reference": true|false}`;

async function generateSceneDescription(title, body, category) {
  const hint = CATEGORY_HINTS[category] || CATEGORY_HINTS.SKUPNOST;
  const bodyExcerpt = body.slice(0, 800).replace(/\n+/g, ' ');

  const response = await askClaude(
    IMAGE_PROMPT_SYSTEM,
    `VISUAL HINT:\n${hint}\n\nARTICLE TITLE: ${title}\n\nARTICLE CONTENT:\n${bodyExcerpt}`,
    'phase9_image_prompt',
  );

  try {
    const cleaned = response.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      scene: (parsed.scene || '').replace(/^["']|["']$/g, ''),
      useReference: parsed.use_reference === true,
    };
  } catch {
    return {
      scene: response.trim().replace(/^["']|["']$/g, ''),
      useReference: false,
    };
  }
}

// ── Generate both variants in parallel ─────────────────────────────────────
/**
 * Returns {
 *   variants: {
 *     watercolor: { url, prompt } | null,
 *     photo:      { url, prompt } | null,
 *   },
 *   imageUrl:    string | null,   // chosen variant's URL (defaults to watercolor)
 *   imagePrompt: string | null,   // chosen variant's prompt
 * }
 *
 * imageUrl is what gets written to drafts.ai_image_url for backward compat.
 * If both variants succeed, watercolor is chosen by default; editor can switch.
 */
export async function generateArticleImage(title, body, category, slug, sourceUrl = null) {
  // Step 1: Claude scene description (used by BOTH styles — same composition)
  log('Generating scene description with Claude...');
  let sceneResult;
  try {
    sceneResult = await generateSceneDescription(title, body, category);
  } catch (err) {
    log(`Scene description failed: ${err.message}`);
    return { variants: { watercolor: null, photo: null }, imageUrl: null, imagePrompt: null };
  }

  const { scene, useReference } = sceneResult;
  log(`Scene: "${scene}"`);
  log(`Reference needed: ${useReference ? 'YES (Claude decided)' : 'NO'}`);

  // Step 2: Person description from reference photo (if needed)
  // Person describes ONLY the person — never location/setting (that's the scene's job)
  let personDescription = null;
  let refImageUrl = null;
  if (useReference && sourceUrl) {
    refImageUrl = await fetchReferenceImage(sourceUrl);
    if (refImageUrl) {
      personDescription = await describePersonFromPhoto(refImageUrl);
    }
    if (!personDescription) {
      const personName = extractPersonName(title, body);
      if (personName) {
        const wikiPhoto = await fetchWikipediaPhoto(personName);
        if (wikiPhoto) {
          refImageUrl = wikiPhoto;
          personDescription = await describePersonFromPhoto(wikiPhoto);
        }
      }
    }
  }

  const finalScene = personDescription ? `${personDescription}, ${scene}` : scene;
  if (personDescription) log(`Enhanced scene with person: "${finalScene}"`);

  // Step 3: Build BOTH prompts
  const watercolorPrompt = getWatercolorStyle(category) + finalScene + WATERCOLOR_SUFFIX;
  const photoPrompt      = getPhotoStyle(category)      + finalScene + PHOTO_SUFFIX;

  log(`Watercolor prompt: "${watercolorPrompt}"`);
  log(`Photo prompt:      "${photoPrompt}"`);

  // Step 4: Generate BOTH images in parallel with retry cascade.
  // Each variant: original → text-only → Claude-softened → generic scene.
  const [wcResult, photoResult] = await Promise.all([
    tryNanoBananaWithRetry(watercolorPrompt, refImageUrl, 'watercolor', category)
      .catch(err => { log(`Watercolor cascade threw: ${err.message}`); return null; }),
    tryNanoBananaWithRetry(photoPrompt, refImageUrl, 'photo', category)
      .catch(err => { log(`Photo cascade threw: ${err.message}`); return null; }),
  ]);

  // Step 5: Upload BOTH to R2 in parallel
  const [wcUpload, photoUpload] = await Promise.all([
    wcResult?.buf    ? uploadToR2(wcResult.buf, slug, 'wc')    : Promise.resolve(null),
    photoResult?.buf ? uploadToR2(photoResult.buf, slug, 'photo') : Promise.resolve(null),
  ]);

  // Use the prompt that actually succeeded (may be softened or generic), not the original.
  const wcFinalPrompt    = wcResult?.prompt    || watercolorPrompt;
  const photoFinalPrompt = photoResult?.prompt || photoPrompt;

  const watercolor = wcUpload?.imageUrl ? { url: wcUpload.imageUrl, prompt: wcFinalPrompt } : null;
  const photo      = photoUpload?.imageUrl ? { url: photoUpload.imageUrl, prompt: photoFinalPrompt } : null;

  // Default chosen variant: watercolor (backward compat). Editor can switch.
  const chosen = watercolor || photo;
  const imageUrl    = chosen?.url    || null;
  const imagePrompt = chosen?.prompt || (watercolor ? wcFinalPrompt : photoFinalPrompt);

  if (watercolor && photo) log(`✓ Both variants (wc L${wcResult.level}, photo L${photoResult.level})`);
  else if (chosen) log(`⚠ Only ${watercolor ? 'watercolor' : 'photo'} variant (L${(watercolor ? wcResult : photoResult).level})`);
  else log('✗ Both variants failed even after cascade');

  return {
    variants: { watercolor, photo },
    imageUrl,
    imagePrompt,
  };
}

// ── Claude describes a person from their photo (face + clothing only) ──────

const DESCRIBE_PERSON_PROMPT = `Look at this photo from a news article. Describe ONLY the person's physical appearance for an AI image generator in English. Be SPECIFIC and VISUAL:

- Skin tone (light, medium, dark, etc.)
- Hair (color, length, style)
- Age range (approximate)
- Build (slim, athletic, stocky, etc.)
- Facial features (beard, glasses, distinctive features)
- What they're wearing (jersey number if sports, uniform, casual, etc.)

DO NOT describe:
- Their location, setting, or background ("standing in a barn", "in front of a building", "at a stadium")
- Other people around them
- Activities or actions ("playing piano", "milking a cow")
- Lighting or atmosphere

Output ONLY the person description, max 25 words. Be factual, no interpretation.
Examples:
- "light-skinned athletic man, short brown hair, mid-30s, wearing white basketball jersey number 77"
- "elderly woman with white hair in a bun, glasses, warm smile, wearing a blue cardigan"
- "light-skinned young man, short dark brown hair, early 20s, stocky build, wearing a blue polo shirt"`;

async function describePersonFromPhoto(imageUrl) {
  try {
    log('Claude analyzing reference photo...');
    const imgRes = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'SvetlaStran/1.0' },
    });
    if (!imgRes.ok) {
      log(`Photo fetch failed: ${imgRes.status}`);
      return null;
    }

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
    const base64 = imgBuffer.toString('base64');

    if (imgBuffer.length < 1000) {
      log('Photo too small, skipping');
      return null;
    }

    const description = await askClaudeWithImage(
      DESCRIBE_PERSON_PROMPT,
      'Describe this person for an image generator.',
      base64,
      mimeType,
      'phase9_describe_person',
    );

    const cleaned = description.trim().replace(/^["']|["']$/g, '');
    log(`Person description: "${cleaned}"`);
    return cleaned;
  } catch (err) {
    log(`Person description failed: ${err.message}`);
    return null;
  }
}

// ── Extract person name from article ────────────────────────────────────────

function extractPersonName(title, body) {
  const titleMatch = title.match(/([A-ZČŠŽĐ][a-zčšžćđ]+(?:\s+[A-ZČŠŽĐ][a-zčšžćđ]+){1,2})/);
  if (titleMatch) {
    log(`Extracted name from title: "${titleMatch[1]}"`);
    return titleMatch[1];
  }
  const bodyFirst = body.slice(0, 500);
  const bodyMatch = bodyFirst.match(/([A-ZČŠŽĐ][a-zčšžćđ]+\s+[A-ZČŠŽĐ][a-zčšžćđ]+)/);
  if (bodyMatch) {
    log(`Extracted name from body: "${bodyMatch[1]}"`);
    return bodyMatch[1];
  }
  return null;
}

// ── Fetch photo from Wikipedia ──────────────────────────────────────────────

async function fetchWikipediaPhoto(personName) {
  try {
    log(`Wikipedia: searching for "${personName}"...`);
    for (const lang of ['sl', 'en']) {
      const searchUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(personName)}`;
      const res = await fetch(searchUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'SvetlaStran/1.0 (positive news portal)' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const imgUrl = data.thumbnail?.source || data.originalimage?.source;
      if (imgUrl) {
        log(`Wikipedia (${lang}): found photo for "${data.title}"`);
        return imgUrl;
      }
    }
    log('Wikipedia: no photo found');
    return null;
  } catch (err) {
    log(`Wikipedia error: ${err.message}`);
    return null;
  }
}

// ── Fetch reference photo from source article ──────────────────────────────

const SKIP_IMAGE_PATTERNS = /logo|icon|avatar|banner|sprite|ad-|ads\/|pixel|tracking|doubleclick|googlesyndication|\.svg$/i;

async function fetchReferenceImage(sourceUrl) {
  try {
    log(`Fetching reference photo from ${sourceUrl.slice(0, 60)}...`);
    const res = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'SvetlaStran/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      log(`Reference source fetch failed: ${res.status}`);
      return null;
    }

    const html = await res.text();

    let imgUrl = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
              || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1];

    if (!imgUrl || SKIP_IMAGE_PATTERNS.test(imgUrl)) {
      imgUrl = html.match(/<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
            || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:image["']/i)?.[1];
    }

    if (!imgUrl || SKIP_IMAGE_PATTERNS.test(imgUrl)) {
      log('No usable reference photo found in source');
      return null;
    }

    if (!imgUrl.startsWith('http')) {
      try { imgUrl = new URL(imgUrl, sourceUrl).href; } catch { return null; }
    }

    log(`Reference photo found: ${imgUrl.slice(0, 80)}...`);
    return imgUrl;
  } catch (err) {
    log(`Reference fetch error: ${err.message}`);
    return null;
  }
}

// ── Nano Banana 2 (Gemini, supports reference images) ───────────────────────
// `kind` is just a log tag — the prompt itself already encodes the medium.

async function tryNanoBanana(prompt, referenceImageUrl, kind = 'image') {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    log(`Nano Banana (${kind}): no API key, skipping`);
    return null;
  }

  try {
    const model = 'gemini-2.5-flash-image';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const parts = [];

    if (referenceImageUrl) {
      try {
        const imgRes = await fetch(referenceImageUrl, {
          signal: AbortSignal.timeout(10000),
          headers: { 'User-Agent': 'SvetlaStran/1.0' },
        });
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
          parts.push({
            inlineData: { mimeType, data: imgBuffer.toString('base64') },
          });
          parts.push({ text: `Use this reference photo to match the person's appearance in the generated image. Generate an image based on this prompt: ${prompt}` });
        } else {
          log(`Nano Banana (${kind}): reference fetch failed (${imgRes.status}), text-only`);
          parts.push({ text: prompt });
        }
      } catch (err) {
        log(`Nano Banana (${kind}): reference error: ${err.message}, text-only`);
        parts.push({ text: prompt });
      }
    } else {
      parts.push({ text: prompt });
    }

    log(`Nano Banana (${kind}): generating...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: { aspectRatio: '16:9' },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      log(`Nano Banana (${kind}) error ${res.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) {
      log(`Nano Banana (${kind}): no parts in response`);
      return null;
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        const buf = Buffer.from(part.inlineData.data, 'base64');
        if (buf.length < 1000) {
          log(`Nano Banana (${kind}): image too small (${buf.length} bytes)`);
          return null;
        }
        log(`Nano Banana (${kind}): ✓ ${(buf.length / 1024).toFixed(0)}KB${referenceImageUrl ? ' (with reference)' : ''}`);
        return buf;
      }
    }

    log(`Nano Banana (${kind}): no image in response`);
    return null;
  } catch (err) {
    log(`Nano Banana (${kind}) failed: ${err.message}`);
    return null;
  }
}

// ── Upload to Cloudflare R2 ─────────────────────────────────────────────────

async function uploadToR2(imageBuffer, slug, variantTag = '') {
  try {
    const tag = variantTag ? `-${variantTag}` : '';
    log(`Uploading ${(imageBuffer.length / 1024).toFixed(0)}KB image to R2 (${variantTag || 'default'})...`);

    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const fileName = `${slug}${tag}-${randomUUID().slice(0, 8)}.png`;

    await r2.send(new PutObjectCommand({
      Bucket: 'article-images',
      Key: fileName,
      Body: imageBuffer,
      ContentType: 'image/png',
    }));

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    log(`✓ Uploaded (${variantTag || 'default'}): ${publicUrl.slice(0, 80)}...`);
    return { imageUrl: publicUrl };
  } catch (err) {
    log(`Upload (${variantTag}) failed: ${err.message}`);
    return null;
  }
}
