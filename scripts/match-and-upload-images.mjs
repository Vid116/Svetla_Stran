#!/usr/bin/env node
/**
 * Match local images to articles by timestamp, upload to R2, update DB.
 *
 * Logic: sort files by mtime, sort articles by published_at,
 * match each file to the next article published after it.
 *
 * Usage: node scripts/match-and-upload-images.mjs [--dry-run]
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, extname } from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import postgres from 'postgres';

const DRY_RUN = process.argv.includes('--dry-run');
const PICS_DIR = 'C:/Svetla_Stran/Pics';

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

// Skip known non-article files
const SKIP_FILES = new Set(['Boris.jpg']);

async function main() {
  console.log(`=== Match & Upload Images ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  // 1. Load files sorted by mtime
  const allFiles = readdirSync(PICS_DIR)
    .filter(f => !SKIP_FILES.has(f) && /\.(png|jpg|jpeg|webp)$/i.test(f))
    .map(f => {
      const path = join(PICS_DIR, f);
      const stat = statSync(path);
      return { name: f, path, mtime: stat.mtimeMs, mtimeDate: new Date(stat.mtimeMs) };
    })
    .sort((a, b) => a.mtime - b.mtime);

  console.log(`Found ${allFiles.length} image files\n`);

  // 2. Load articles with broken Supabase image_url, sorted by published_at
  const articles = await sql`
    SELECT id, title, slug, published_at, image_url
    FROM articles
    WHERE image_url LIKE '%supabase%'
    ORDER BY published_at ASC
  `;
  console.log(`Found ${articles.length} articles needing images\n`);

  // 3. Match: for each file, find the next article published after it
  let articleIdx = 0;
  let matched = 0;
  let uploaded = 0;
  let failed = 0;

  for (const file of allFiles) {
    // Skip to next article published after this file
    while (articleIdx < articles.length &&
           new Date(articles[articleIdx].published_at).getTime() < file.mtime) {
      articleIdx++;
    }

    if (articleIdx >= articles.length) break;

    const article = articles[articleIdx];
    const gapMin = ((new Date(article.published_at).getTime() - file.mtime) / 60000).toFixed(1);

    // Only match if gap is reasonable (< 120 min)
    if (parseFloat(gapMin) > 120) {
      console.log(`  SKIP ${file.name} — gap too large (${gapMin} min to "${article.title.slice(0, 40)}")`);
      continue;
    }

    matched++;
    console.log(`  ${file.name}`);
    console.log(`    → ${article.title.slice(0, 60)} (gap: ${gapMin} min)`);

    if (!DRY_RUN) {
      try {
        // Upload to R2
        const ext = extname(file.name).toLowerCase() || '.png';
        const r2Key = `${article.slug}${ext}`;
        const buffer = readFileSync(file.path);
        const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
          : ext === '.webp' ? 'image/webp' : 'image/png';

        await r2.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: r2Key,
          Body: buffer,
          ContentType: contentType,
        }));

        const newUrl = `${PUBLIC_URL}/${r2Key}`;

        // Update DB
        await sql`UPDATE articles SET image_url = ${newUrl} WHERE id = ${article.id}`;
        console.log(`    ✓ Uploaded → ${r2Key}`);
        uploaded++;
      } catch (err) {
        console.log(`    ✗ Failed: ${err.message}`);
        failed++;
      }
    }

    articleIdx++; // Move to next article
  }

  // Check remaining unmatched articles
  const unmatched = articles.length - matched;

  console.log(`\n=== Results ===`);
  console.log(`  Matched: ${matched}`);
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Unmatched articles: ${unmatched}`);

  if (unmatched > 0) {
    console.log(`\n=== Unmatched articles (no local image found) ===`);
    // Re-query to find remaining
    const remaining = await sql`
      SELECT title, published_at FROM articles
      WHERE image_url LIKE '%supabase%'
      ORDER BY published_at ASC
    `;
    for (const a of remaining) {
      console.log(`  ${a.published_at.toISOString().slice(0,16)} — ${a.title.slice(0, 60)}`);
    }
  }

  await sql.end();
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
