#!/usr/bin/env node
/**
 * Backfill AI images for drafts that don't have one yet.
 *
 * For person stories (JUNAKI, SPORT, or Claude decides use_reference=true):
 *   → Re-generates prompt with reference photo logic (og:image → Wikipedia)
 * For everything else:
 *   → Uses the existing image_prompt from the draft
 *
 * Usage: node scripts/backfill-images.mjs [--dry-run] [--limit N]
 */
delete process.env.CLAUDECODE;
delete process.env.ANTHROPIC_API_KEY;

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config({ path: '.env' });

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit'));
const LIMIT = LIMIT_ARG ? parseInt(process.argv[process.argv.indexOf(LIMIT_ARG) + 1]) : 999;
const BATCH_SIZE = 3;
const DELAY_MS = 2000; // delay between batches to avoid rate limits

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Dynamic import of the image generation module
const { generateArticleImage } = await import('../lib/research-write/generate-image.mjs');

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  BACKFILL IMAGES`);
  console.log(`  ${new Date().toLocaleString('sl-SI')}`);
  if (DRY_RUN) console.log(`  ** DRY RUN **`);
  console.log(`${'═'.repeat(60)}\n`);

  // Fetch drafts without images
  const { data: drafts, error } = await supabase
    .from('drafts')
    .select('id, title, body, category, slug, source_url, image_prompt, ai_image_url, image_url')
    .eq('status', 'ready')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('DB error:', error.message);
    process.exit(1);
  }

  const needsImage = drafts
    .filter(d => !d.ai_image_url && !d.image_url)
    .slice(0, LIMIT);

  console.log(`Found ${needsImage.length} drafts without images (of ${drafts.length} total)\n`);

  if (needsImage.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < needsImage.length; i += BATCH_SIZE) {
    const batch = needsImage.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(batch.map(async (draft, j) => {
      const idx = i + j + 1;
      const prefix = `[${idx}/${needsImage.length}]`;

      console.log(`${prefix} Processing: "${draft.title.slice(0, 50)}..." (${draft.category})`);

      if (DRY_RUN) {
        console.log(`${prefix} → DRY RUN, skipping`);
        return;
      }

      try {
        // Generate image — this will:
        // 1. Re-generate scene description with Claude (decides use_reference)
        // 2. If reference needed: fetch og:image → Wikipedia fallback → describe person
        // 3. Generate image via Nano Banana → Cloudflare → HuggingFace
        // 4. Upload to Supabase Storage
        const result = await generateArticleImage(
          draft.title,
          draft.body,
          draft.category || 'SKUPNOST',
          draft.slug,
          draft.source_url || null,
        );

        if (result?.imageUrl) {
          // Update draft with new image
          const { error: updateErr } = await supabase
            .from('drafts')
            .update({
              ai_image_url: result.imageUrl,
              image_prompt: result.imagePrompt || draft.image_prompt,
            })
            .eq('id', draft.id);

          if (updateErr) {
            console.error(`${prefix} ✗ DB update failed: ${updateErr.message}`);
            failed++;
          } else {
            console.log(`${prefix} ✓ Image saved`);
            success++;
          }
        } else if (result?.imagePrompt) {
          console.log(`${prefix} ⚠ No image generated, prompt saved`);
          // Update prompt even if image failed (might have better prompt now)
          await supabase.from('drafts').update({ image_prompt: result.imagePrompt }).eq('id', draft.id);
          failed++;
        } else {
          console.log(`${prefix} ✗ No image or prompt generated`);
          failed++;
        }
      } catch (err) {
        console.error(`${prefix} ✗ Error: ${err.message}`);
        failed++;
      }
    }));

    // Delay between batches
    if (i + BATCH_SIZE < needsImage.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  DONE: ${success} success, ${failed} failed, ${needsImage.length} total`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
