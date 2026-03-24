/**
 * Generate an AI image for an article using:
 * 1. Claude — creates a concise scene description (10-15 words) from article content
 * 2. Cloudflare Workers AI (FLUX.1-schnell) — generates watercolor illustration
 * 3. Supabase Storage — hosts the result
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { askClaude, askClaudeWithImage } from './ai.mjs';

const log = (msg) => process.stderr.write(`[ImageGen] ${msg}\n`);

// ── Style per category — each has its own palette, mood, and rendering style ──
const STYLE_SUFFIX = ', wide landscape format, main subject placed in the vertical and horizontal center of the frame. No text, no words, no letters, no writing, no numbers.';

const CATEGORY_STYLES = {
  SPORT: 'Dynamic watercolor illustration with bold strokes, vivid electric blues and bright greens, sense of motion and energy, stadium lighting',
  ZIVALI: 'Warm naturalistic watercolor, rich earth tones and forest greens, soft amber light, intimate close-up feel, bokeh background',
  SKUPNOST: 'Soft golden-hour watercolor illustration, warm ambers and honey tones, cozy village atmosphere, gentle diffused sunlight',
  NARAVA: 'Lush landscape watercolor, vibrant greens and sky blues, crisp morning light, fresh and alive, rich natural colors',
  INFRASTRUKTURA: 'Clean architectural watercolor, cool steel blues and concrete grays with warm sunset accents, strong geometric lines, modern',
  PODJETNISTVO: 'Crisp modern illustration, clean whites and tech blues with warm wood accents, bright workshop lighting, innovative feel',
  SLOVENIJA_V_SVETU: 'Expansive watercolor panorama, deep alpine blues and white peaks with subtle red accents, majestic wide-angle view',
  JUNAKI: 'Warm portrait-style watercolor, rich skin tones and golden intimate lighting, soft focus background, emotional and personal',
  KULTURA: 'Dramatic watercolor with theater lighting, deep burgundy reds and royal purples with golden stage highlights, artistic atmosphere',
};

function getStylePrefix(category) {
  return (CATEGORY_STYLES[category] || CATEGORY_STYLES.SKUPNOST) + ', ';
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
- If the image includes people: default to white/Caucasian appearance (this is Slovenia) UNLESS the article specifically describes someone of a different ethnicity
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
    // Fallback: treat entire response as scene description (backward compat)
    return {
      scene: response.trim().replace(/^["']|["']$/g, ''),
      useReference: false,
    };
  }
}

// ── Generate image with Cloudflare FLUX and upload ─────────────────────────
/**
 * Returns { imageUrl, imagePrompt }
 * - imageUrl: public URL if auto-generated, null if manual needed
 * - imagePrompt: full prompt string for manual generation
 */
export async function generateArticleImage(title, body, category, slug, sourceUrl = null) {
  // Step 1: Always generate the prompt (even if API unavailable)
  log('Generating scene description with Claude...');
  let sceneResult;
  try {
    sceneResult = await generateSceneDescription(title, body, category);
  } catch (err) {
    log(`Scene description failed: ${err.message}`);
    return { imageUrl: null, imagePrompt: null };
  }

  const { scene, useReference } = sceneResult;
  log(`Scene: "${scene}"`);
  log(`Reference needed: ${useReference ? 'YES (Claude decided)' : 'NO'}`);

  // Step 1.5: If Claude wants a reference, fetch the source photo and have Claude describe the person
  let personDescription = null;
  let refImageUrl = null;
  if (useReference && sourceUrl) {
    refImageUrl = await fetchReferenceImage(sourceUrl);
    if (refImageUrl) {
      personDescription = await describePersonFromPhoto(refImageUrl);
    }
  }

  // Build the full prompt — inject person description if available
  let finalScene = scene;
  if (personDescription) {
    // Replace generic person description with the specific one from the photo
    finalScene = personDescription + ', ' + scene;
    log(`Enhanced scene with person: "${finalScene}"`);
  }

  const fullPrompt = getStylePrefix(category) + finalScene + STYLE_SUFFIX;
  log(`Full prompt: "${fullPrompt}"`);

  // Step 2: Try image generation — priority order:
  // 1. Nano Banana 2 (if available, can also use raw reference image)
  // 2. Cloudflare FLUX (fast, 50/month free)
  // 3. HuggingFace FLUX (slower, daily reset free)
  // All get the enhanced prompt with person description baked in
  let imageBuffer = null;

  // Try Nano Banana 2 — pass raw reference image too if available (best quality)
  imageBuffer = await tryNanoBanana(fullPrompt, refImageUrl);

  // Fallback: Cloudflare FLUX
  if (!imageBuffer) {
    imageBuffer = await tryCloudflare(fullPrompt);
  }

  // Fallback: HuggingFace FLUX
  if (!imageBuffer) {
    imageBuffer = await tryHuggingFace(fullPrompt);
  }

  if (!imageBuffer) {
    log('All image APIs failed — returning prompt for manual generation');
    return { imageUrl: null, imagePrompt: fullPrompt };
  }

  // Step 3: Upload to Supabase Storage
  return await uploadToSupabase(imageBuffer, slug, fullPrompt);
}

// ── Claude describes a person from their photo (for text-to-image accuracy) ──

const DESCRIBE_PERSON_PROMPT = `Look at this photo from a news article. Describe the person's physical appearance for an AI image generator in English. Be SPECIFIC and VISUAL:

- Skin tone (light, medium, dark, etc.)
- Hair (color, length, style)
- Age range (approximate)
- Build (slim, athletic, stocky, etc.)
- Facial features (beard, glasses, distinctive features)
- What they're wearing (jersey number if sports, uniform, casual, etc.)
- Expression/pose if notable

Output ONLY the description, max 25 words. Be factual, no interpretation.
Examples:
- "light-skinned athletic man, short brown hair, mid-30s, wearing white basketball jersey number 77"
- "elderly woman with white hair in a bun, glasses, warm smile, wearing a blue cardigan"`;

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

// ── Fetch reference photo from source article (on demand) ───────────────────

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

    // Try og:image first (most reliable)
    let imgUrl = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
              || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1];

    // Fallback: twitter:image
    if (!imgUrl || SKIP_IMAGE_PATTERNS.test(imgUrl)) {
      imgUrl = html.match(/<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
            || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:image["']/i)?.[1];
    }

    if (!imgUrl || SKIP_IMAGE_PATTERNS.test(imgUrl)) {
      log('No usable reference photo found in source');
      return null;
    }

    // Resolve relative URLs
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

async function tryNanoBanana(prompt, referenceImageUrl) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    log('Nano Banana: no API key (GOOGLE_AI_API_KEY), skipping');
    return null;
  }

  try {
    const model = 'gemini-2.5-flash-image'; // Nano Banana 2
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Build request parts
    const parts = [];

    // Add reference image if provided (for person stories)
    if (referenceImageUrl) {
      try {
        log(`Nano Banana: fetching reference image...`);
        const imgRes = await fetch(referenceImageUrl, {
          signal: AbortSignal.timeout(10000),
          headers: { 'User-Agent': 'SvetlaStran/1.0' },
        });
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
          parts.push({
            inlineData: {
              mimeType,
              data: imgBuffer.toString('base64'),
            },
          });
          parts.push({ text: `Use this reference photo to match the person's appearance in the generated image. Generate a watercolor illustration based on this prompt: ${prompt}` });
          log(`Nano Banana: reference image attached (${(imgBuffer.length / 1024).toFixed(0)}KB)`);
        } else {
          log(`Nano Banana: reference fetch failed (${imgRes.status}), using text-only`);
          parts.push({ text: `Generate a watercolor illustration: ${prompt}` });
        }
      } catch (err) {
        log(`Nano Banana: reference fetch error: ${err.message}, using text-only`);
        parts.push({ text: `Generate a watercolor illustration: ${prompt}` });
      }
    } else {
      parts.push({ text: `Generate a watercolor illustration: ${prompt}` });
    }

    log('Trying Nano Banana 2...');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageDimensions: { width: 1216, height: 832 },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      log(`Nano Banana error ${res.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();

    // Extract image from response
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) {
      log('Nano Banana: no parts in response');
      return null;
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        const buf = Buffer.from(part.inlineData.data, 'base64');
        if (buf.length < 1000) {
          log(`Nano Banana: image too small (${buf.length} bytes)`);
          return null;
        }
        log(`Nano Banana: ✓ ${(buf.length / 1024).toFixed(0)}KB${referenceImageUrl ? ' (with reference)' : ''}`);
        return buf;
      }
    }

    log('Nano Banana: no image in response parts');
    return null;
  } catch (err) {
    log(`Nano Banana failed: ${err.message}`);
    return null;
  }
}

// ── Cloudflare Workers AI (FLUX.1-schnell) ──────────────────────────────────

async function tryCloudflare(prompt) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    log('Cloudflare: no credentials, skipping');
    return null;
  }

  try {
    log('Trying Cloudflare FLUX...');
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, width: 1216, height: 832 }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      log(`Cloudflare error ${res.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) {
      log(`Cloudflare: image too small (${buf.length} bytes)`);
      return null;
    }

    log(`Cloudflare: ✓ ${(buf.length / 1024).toFixed(0)}KB`);
    return buf;
  } catch (err) {
    log(`Cloudflare failed: ${err.message}`);
    return null;
  }
}

// ── HuggingFace Inference API (FLUX.1-schnell, free tier) ───────────────────

async function tryHuggingFace(prompt) {
  const hfToken = process.env.HF_API_TOKEN;

  if (!hfToken) {
    log('HuggingFace: no token (HF_API_TOKEN), skipping');
    return null;
  }

  try {
    log('Trying HuggingFace FLUX (fallback)...');
    const res = await fetch(
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { width: 1216, height: 832 },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      // 503 = model loading, 429 = rate limit
      if (res.status === 503) {
        log('HuggingFace: model is loading, retrying in 20s...');
        await new Promise(r => setTimeout(r, 20000));
        const retry = await fetch(
          'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${hfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: { width: 1216, height: 832 },
            }),
          },
        );
        if (!retry.ok) {
          log(`HuggingFace retry failed: ${retry.status}`);
          return null;
        }
        const buf = Buffer.from(await retry.arrayBuffer());
        if (buf.length < 1000) return null;
        log(`HuggingFace (retry): ✓ ${(buf.length / 1024).toFixed(0)}KB`);
        return buf;
      }
      log(`HuggingFace error ${res.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) {
      log(`HuggingFace: image too small (${buf.length} bytes)`);
      return null;
    }

    log(`HuggingFace: ✓ ${(buf.length / 1024).toFixed(0)}KB`);
    return buf;
  } catch (err) {
    log(`HuggingFace failed: ${err.message}`);
    return null;
  }
}

// ── Upload to Supabase Storage ──────────────────────────────────────────────

async function uploadToSupabase(imageBuffer, slug, fullPrompt) {
  try {
    log(`Uploading ${(imageBuffer.length / 1024).toFixed(0)}KB image to Supabase Storage...`);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const fileName = `${slug}-${randomUUID().slice(0, 8)}.png`;

    const { error: uploadErr } = await supabase.storage
      .from('article-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      log(`Upload error: ${uploadErr.message}`);
      return { imageUrl: null, imagePrompt: fullPrompt };
    }

    const { data: urlData } = supabase.storage
      .from('article-images')
      .getPublicUrl(fileName);

    log(`✓ Image uploaded: ${urlData.publicUrl.slice(0, 80)}...`);
    return { imageUrl: urlData.publicUrl, imagePrompt: fullPrompt };
  } catch (err) {
    log(`Upload failed: ${err.message}`);
    return { imageUrl: null, imagePrompt: fullPrompt };
  }
}
