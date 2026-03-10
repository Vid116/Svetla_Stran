/**
 * Test za scraping pipeline - brez baze, brez AI.
 * Testira: RSS branje vseh 5 virov, polna vsebina članka, dedup hash.
 */
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const USER_AGENT = 'SvetlaStran/1.0 (+https://svetlastran.si)';
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': USER_AGENT } });
const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

function contentHash(title, content) {
  const normalized = (title + (content || '').slice(0, 100)).toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// ── Phase 1 RSS viri ────────────────────────────────────────────────────────

const RSS_VIRI = [
  { ime: 'RTV SLO',   url: 'https://www.rtvslo.si/feeds/01.xml' },
  { ime: 'STA',       url: 'https://www.sta.si/rss-0' },
  { ime: '24ur',      url: 'https://www.24ur.com/rss' },
  { ime: 'Žurnal24',  url: 'https://www.zurnal24.si/feeds/latest' },
  { ime: 'Delo',      url: 'https://www.delo.si/rss' },
];

console.log('═══ 1. RSS BRANJE ═══\n');

const vseStories = [];

for (const vir of RSS_VIRI) {
  try {
    const feed = await parser.parseURL(vir.url);
    let count = 0;
    for (const item of feed.items) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      if (pubDate && pubDate < cutoff) continue;
      vseStories.push({
        rawTitle: item.title?.trim() || '',
        sourceUrl: item.link?.trim() || '',
        rawContent: (item.contentSnippet || item.content || '').trim().slice(0, 200),
        sourceName: vir.ime,
      });
      count++;
    }
    console.log(`  ✓ ${vir.ime.padEnd(12)} ${String(count).padStart(3)} člankov`);
  } catch (e) {
    console.log(`  ✗ ${vir.ime.padEnd(12)} NAPAKA: ${e.message?.slice(0, 80)}`);
  }
}

console.log(`\n  Skupaj: ${vseStories.length} člankov iz ${RSS_VIRI.length} virov`);

// ── Dedup test ──────────────────────────────────────────────────────────────

console.log('\n═══ 2. DEDUP TEST ═══\n');

const hashSet = new Set();
let dupCount = 0;
for (const s of vseStories) {
  const h = contentHash(s.rawTitle, s.rawContent);
  if (hashSet.has(h)) { dupCount++; } else { hashSet.add(h); }
}
console.log(`  Unikatnih: ${hashSet.size}, Duplikatov: ${dupCount}`);

// ── Vzorec naslovov po virih ────────────────────────────────────────────────

console.log('\n═══ 3. VZOREC NASLOVOV (3 na vir) ═══\n');
for (const vir of RSS_VIRI) {
  const virsStories = vseStories.filter(s => s.sourceName === vir.ime).slice(0, 3);
  console.log(`  [${vir.ime}]`);
  virsStories.forEach(s => console.log(`    • ${s.rawTitle}`));
  console.log();
}

// ── Test polnega članka ──────────────────────────────────────────────────────

console.log('═══ 4. TEST POLNE VSEBINE (1 na vir) ═══\n');

for (const vir of RSS_VIRI) {
  const story = vseStories.find(s => s.sourceName === vir.ime && s.sourceUrl.startsWith('http'));
  if (!story) { console.log(`  ✗ ${vir.ime}: ni URL-ja`); continue; }

  try {
    const res = await fetch(story.sourceUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const body =
      $('article').text() ||
      $('[class*="article-body"]').text() ||
      $('[class*="content"]').first().text() ||
      $('main p').map((_, el) => $(el).text()).get().join('\n');

    const len = body.trim().length;
    const preview = body.trim().replace(/\s+/g, ' ').slice(0, 150);
    console.log(`  ✓ ${vir.ime.padEnd(12)} ${len} znakov`);
    console.log(`    ${story.rawTitle}`);
    console.log(`    "${preview}..."`);
    console.log();
  } catch (e) {
    console.log(`  ✗ ${vir.ime.padEnd(12)} NAPAKA: ${e.message?.slice(0, 60)}\n`);
  }
}

console.log('═══ VSE OK ═══');
