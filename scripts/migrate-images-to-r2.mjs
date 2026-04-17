#!/usr/bin/env node
/**
 * Migrate images from Supabase Storage to Cloudflare R2.
 * Downloads each image, uploads to R2, updates DB URLs.
 *
 * Usage: node scripts/migrate-images-to-r2.mjs
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import postgres from 'postgres';

const sql = postgres(process.env.NEON_DB_URL, { ssl: 'require', max: 1 });

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = 'article-images';
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function migrateImage(oldUrl) {
  // Extract filename from Supabase URL
  const fileName = oldUrl.split('/').pop();
  if (!fileName) return null;

  try {
    // Download from Supabase
    const res = await fetch(oldUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.log(`  ✗ Download failed (${res.status}): ${fileName}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) {
      console.log(`  ✗ Too small (${buffer.length}B): ${fileName}`);
      return null;
    }

    // Upload to R2
    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: 'image/png',
    }));

    const newUrl = `${PUBLIC_URL}/${fileName}`;
    console.log(`  ✓ ${(buffer.length / 1024).toFixed(0)}KB → ${fileName}`);
    return newUrl;
  } catch (err) {
    console.log(`  ✗ Error: ${fileName}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('=== Migrate Images: Supabase → R2 ===\n');

  // Find all Supabase image URLs in articles
  const articles = await sql`
    SELECT id, ai_image_url, image_url FROM articles
    WHERE ai_image_url LIKE '%supabase.co%' OR image_url LIKE '%supabase.co%'
  `;
  console.log(`Found ${articles.length} articles with Supabase images\n`);

  let migrated = 0;
  let failed = 0;

  for (const article of articles) {
    // Migrate ai_image_url
    if (article.ai_image_url?.includes('supabase.co')) {
      const newUrl = await migrateImage(article.ai_image_url);
      if (newUrl) {
        await sql`UPDATE articles SET ai_image_url = ${newUrl} WHERE id = ${article.id}`;
        migrated++;
      } else {
        failed++;
      }
    }

    // Migrate image_url (if different from ai_image_url)
    if (article.image_url?.includes('supabase.co') && article.image_url !== article.ai_image_url) {
      const newUrl = await migrateImage(article.image_url);
      if (newUrl) {
        await sql`UPDATE articles SET image_url = ${newUrl} WHERE id = ${article.id}`;
        migrated++;
      } else {
        failed++;
      }
    }
  }

  // Also check drafts
  const drafts = await sql`
    SELECT id, ai_image_url, image_url FROM drafts
    WHERE ai_image_url LIKE '%supabase.co%' OR image_url LIKE '%supabase.co%'
  `;
  console.log(`\nFound ${drafts.length} drafts with Supabase images\n`);

  for (const draft of drafts) {
    if (draft.ai_image_url?.includes('supabase.co')) {
      const newUrl = await migrateImage(draft.ai_image_url);
      if (newUrl) {
        await sql`UPDATE drafts SET ai_image_url = ${newUrl} WHERE id = ${draft.id}`;
        migrated++;
      } else {
        failed++;
      }
    }
    if (draft.image_url?.includes('supabase.co') && draft.image_url !== draft.ai_image_url) {
      const newUrl = await migrateImage(draft.image_url);
      if (newUrl) {
        await sql`UPDATE drafts SET image_url = ${newUrl} WHERE id = ${draft.id}`;
        migrated++;
      } else {
        failed++;
      }
    }
  }

  console.log(`\n=== Done: ${migrated} migrated, ${failed} failed ===`);
  await sql.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
