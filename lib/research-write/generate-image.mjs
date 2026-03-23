/**
 * Generate an AI image for an article using:
 * 1. Claude — creates a concise scene description (10-15 words) from article content
 * 2. Cloudflare Workers AI (FLUX.1-schnell) — generates watercolor illustration
 * 3. Supabase Storage — hosts the result
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { askClaude } from './ai.mjs';

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

// ── Claude generates a short scene description ─────────────────────────────
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
- Output ONLY the scene description, nothing else

Examples:
- "wolf pack moving through a misty alpine forest at dawn"
- "blacksmith forging a knife at a glowing anvil in a rustic workshop"
- "bright orange-red Caribbean flamingo standing among pale pink flamingos in salt flats"`;

async function generateSceneDescription(title, body, category) {
  const hint = CATEGORY_HINTS[category] || CATEGORY_HINTS.SKUPNOST;
  const bodyExcerpt = body.slice(0, 800).replace(/\n+/g, ' ');

  const response = await askClaude(
    IMAGE_PROMPT_SYSTEM,
    `VISUAL HINT:\n${hint}\n\nARTICLE TITLE: ${title}\n\nARTICLE CONTENT:\n${bodyExcerpt}`,
    'phase9_image_prompt',
  );

  return response.trim().replace(/^["']|["']$/g, ''); // strip quotes if present
}

// ── Generate image with Cloudflare FLUX and upload ─────────────────────────
/**
 * Returns { imageUrl, imagePrompt }
 * - imageUrl: public URL if auto-generated, null if manual needed
 * - imagePrompt: full prompt string for manual generation
 */
export async function generateArticleImage(title, body, category, slug) {
  // Step 1: Always generate the prompt (even if API unavailable)
  log('Generating scene description with Claude...');
  let scene;
  try {
    scene = await generateSceneDescription(title, body, category);
  } catch (err) {
    log(`Scene description failed: ${err.message}`);
    return { imageUrl: null, imagePrompt: null };
  }

  const fullPrompt = getStylePrefix(category) + scene + STYLE_SUFFIX;
  log(`Scene: "${scene}"`);
  log(`Full prompt: "${fullPrompt}"`);

  // Step 2: Try Cloudflare FLUX if credentials available
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    log('CF credentials not set — returning prompt for manual generation');
    return { imageUrl: null, imagePrompt: fullPrompt };
  }

  try {
    log('Generating image with Cloudflare FLUX...');
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          width: 1216,
          height: 832,
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      log(`FLUX API error ${res.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    // Response is raw PNG binary
    const imageBuffer = Buffer.from(await res.arrayBuffer());

    if (imageBuffer.length < 1000) {
      log(`Image too small (${imageBuffer.length} bytes), likely an error`);
      return null;
    }

    // Step 3: Upload to Supabase Storage
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
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('article-images')
      .getPublicUrl(fileName);

    log(`✓ Image generated and uploaded: ${urlData.publicUrl.slice(0, 80)}...`);
    return { imageUrl: urlData.publicUrl, imagePrompt: fullPrompt };
  } catch (err) {
    log(`Image generation failed (non-fatal): ${err.message}`);
    return { imageUrl: null, imagePrompt: fullPrompt };
  }
}
