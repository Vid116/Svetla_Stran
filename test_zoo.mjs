/**
 * Deep dive into ZOO Ljubljana - find births, arrivals, news.
 */
import * as cheerio from 'cheerio';
const UA = 'SvetlaStran/1.0 (+https://svetlastran.si)';

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
  return cheerio.load(await res.text());
}

const PAGES = [
  ['Splošne novice',          'https://www.zoo.si/novice/novice'],
  ['Prihodi, odhodi, rojstva','https://www.zoo.si/novice/prihodi-odhodi-rojstva'],
  ['Sponzorski dogodki',      'https://www.zoo.si/novice/sponzorski-dogodki'],
  ['Ostali dogodki',          'https://www.zoo.si/novice/ostali-dogodki'],
  ['Obvestila',               'https://www.zoo.si/novice/obvestila'],
];

for (const [name, url] of PAGES) {
  console.log(`\n═══ ${name} ═══`);
  console.log(`    ${url}\n`);
  try {
    const $ = await fetchPage(url);

    // Try various selectors to find news items
    const selectors = ['article', '.news-item', '.card', '.post', '.entry', '.novica', 'a[href*="novice"]', '.content-item', '.item', '.list-item'];
    for (const sel of selectors) {
      const count = $(sel).length;
      if (count > 0) console.log(`    Selector "${sel}": ${count} elements`);
    }

    // Find all links that look like articles
    const links = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().replace(/\s+/g, ' ').slice(0, 80);
      if (text.length > 15 && href.includes('/novice/') && !href.endsWith('/novice/novice') && !href.endsWith('/novice/obvestila')) {
        links.push({ text, href });
      }
    });

    if (links.length > 0) {
      console.log(`\n    Articles found (${links.length}):`);
      // Deduplicate
      const seen = new Set();
      links.forEach(l => {
        if (!seen.has(l.href)) {
          seen.add(l.href);
          console.log(`      • ${l.text}`);
          console.log(`        ${l.href}`);
        }
      });
    } else {
      console.log('    No article links found, dumping page structure...');
      // Show main content area
      const body = $('main, .main, #main, .content, #content, body').first();
      const text = body.text().replace(/\s+/g, ' ').trim().slice(0, 500);
      console.log(`    Content preview: ${text}`);
    }
  } catch (e) {
    console.log(`    ✗ ERROR: ${e.message?.slice(0, 80)}`);
  }
}

// Also check if there's any structured data or API
console.log('\n═══ Check for API/JSON endpoints ═══\n');
for (const path of ['/api', '/api/novice', '/wp-json', '/wp-json/wp/v2/posts']) {
  try {
    const res = await fetch(`https://www.zoo.si${path}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000)
    });
    console.log(`  ${path} → ${res.status} ${res.headers.get('content-type')?.slice(0, 40)}`);
  } catch (e) {
    console.log(`  ${path} → FAIL`);
  }
}
