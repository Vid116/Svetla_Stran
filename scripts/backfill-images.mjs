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

// Import just the image generators + uploader (skip Claude scene description)
const { createClient: createSBClient } = await import('@supabase/supabase-js');
const { randomUUID } = await import('node:crypto');

async function tryCloudflare(prompt) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) return null;
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      { method: 'POST', headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width: 1216, height: 832 }) },
    );
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 1000 ? buf : null;
  } catch { return null; }
}

async function tryHuggingFace(prompt) {
  const hfToken = process.env.HF_API_TOKEN;
  if (!hfToken) return null;
  try {
    const res = await fetch(
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      { method: 'POST', headers: { Authorization: `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt, parameters: { width: 1216, height: 832 } }) },
    );
    if (!res.ok) {
      if (res.status === 503) {
        console.log('    HuggingFace: model loading, waiting 20s...');
        await new Promise(r => setTimeout(r, 20000));
        const retry = await fetch(
          'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
          { method: 'POST', headers: { Authorization: `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: prompt, parameters: { width: 1216, height: 832 } }) },
        );
        if (!retry.ok) return null;
        const buf = Buffer.from(await retry.arrayBuffer());
        return buf.length > 1000 ? buf : null;
      }
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 1000 ? buf : null;
  } catch { return null; }
}

async function uploadToSupabase(imageBuffer, slug) {
  const sb = createSBClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const fileName = `${slug}-${randomUUID().slice(0, 8)}.png`;
  const { error } = await sb.storage.from('article-images').upload(fileName, imageBuffer, { contentType: 'image/png', upsert: true });
  if (error) return null;
  const { data } = sb.storage.from('article-images').getPublicUrl(fileName);
  return data.publicUrl;
}

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

  // Run ONE at a time — Claude Code subprocess can't handle parallel calls
  for (let i = 0; i < needsImage.length; i++) {
    const draft = needsImage[i];
    const prefix = `[${i + 1}/${needsImage.length}]`;
    {

      console.log(`${prefix} Processing: "${draft.title.slice(0, 50)}..." (${draft.category})`);

      if (DRY_RUN) {
        console.log(`${prefix} → DRY RUN, skipping`);
        return;
      }

      try {
        const prompt = draft.image_prompt;
        if (!prompt) {
          console.log(`${prefix} ⚠ No prompt saved, skipping`);
          failed++;
          return;
        }

        // Try Cloudflare first, then HuggingFace
        let buf = await tryCloudflare(prompt);
        if (buf) {
          console.log(`${prefix}   Cloudflare: ✓ ${(buf.length / 1024).toFixed(0)}KB`);
        } else {
          buf = await tryHuggingFace(prompt);
          if (buf) {
            console.log(`${prefix}   HuggingFace: ✓ ${(buf.length / 1024).toFixed(0)}KB`);
          }
        }

        if (!buf) {
          console.log(`${prefix} ✗ All image APIs failed`);
          failed++;
          return;
        }

        // Upload and update draft
        const imageUrl = await uploadToSupabase(buf, draft.slug);
        if (imageUrl) {
          await supabase.from('drafts').update({ ai_image_url: imageUrl }).eq('id', draft.id);
          console.log(`${prefix} ✓ Image saved`);
          success++;
        } else {
          console.log(`${prefix} ✗ Upload failed`);
          failed++;
        }
      } catch (err) {
        console.error(`${prefix} ✗ Error: ${err.message}`);
        failed++;
      }
    }

    // Brief delay between images
    if (i + 1 < needsImage.length) {
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
