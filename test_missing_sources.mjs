/**
 * Test all missing sources from SPEC - find working URLs, RSS, and HTML selectors.
 */
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

const UA = 'SvetlaStran/1.0 (+https://svetlastran.si)';
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': UA } });

async function probe(name, urls, rssGuesses = []) {
  const result = { name, html: null, rss: null, links: [] };

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: {'User-Agent': UA}, signal: AbortSignal.timeout(15000), redirect: 'follow' });
      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);
      const title = $('title').text().trim().slice(0, 60);
      const rssLink = $('link[type="application/rss+xml"]').attr('href') || $('link[type="application/atom+xml"]').attr('href') || '';

      // Collect all meaningful links
      const allLinks = [];
      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text.length > 15 && href.length > 1 && !href.startsWith('#') && !href.includes('facebook') && !href.includes('twitter') && !href.includes('instagram') && !href.includes('youtube') && !href.includes('cookie') && !href.includes('privacy') && !href.includes('mailto:')) {
          const origin = new URL(res.url).origin;
          const full = href.startsWith('http') ? href : `${origin}${href.split('#')[0]}`;
          allLinks.push({ text: text.slice(0, 90), href: full });
        }
      });

      // Deduplicate
      const seen = new Set();
      const unique = allLinks.filter(l => { if (seen.has(l.href)) return false; seen.add(l.href); return true; });

      result.html = { url: res.url, title, linkCount: unique.length };
      result.links = unique;

      // Test discovered RSS
      if (rssLink) {
        const rssUrl = rssLink.startsWith('http') ? rssLink : `${new URL(res.url).origin}${rssLink}`;
        rssGuesses.unshift(rssUrl);
      }
      break;
    } catch (e) {}
  }

  // Test RSS guesses
  for (const url of rssGuesses) {
    try {
      const feed = await parser.parseURL(url);
      if (feed.items?.length > 0) {
        result.rss = { url, count: feed.items.length, sample: feed.items[0]?.title?.slice(0, 70) };
        break;
      }
    } catch (e) {}
  }

  return result;
}

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║   PROBE MISSING SOURCES FROM SPEC                        ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const t0 = Date.now();

const results = await Promise.all([
  probe('Uradni list RS', ['https://www.uradni-list.si'], ['https://www.uradni-list.si/rss', 'https://www.uradni-list.si/feed']),
  probe('CNVOS', ['https://www.cnvos.si', 'https://www.cnvos.si/novice'], ['https://www.cnvos.si/feed', 'https://www.cnvos.si/rss']),
  probe('Prostovoljstvo.org', ['https://www.prostovoljstvo.org', 'https://www.prostovoljstvo.org/novice'], ['https://www.prostovoljstvo.org/feed']),
  probe('MOL Ljubljana', ['https://www.ljubljana.si/sl/aktualno/novice'], ['https://www.ljubljana.si/sl/aktualno/novice/rss']),
  probe('MOM Maribor', ['https://www.maribor.si/novice', 'https://www.maribor.si'], ['https://www.maribor.si/rss', 'https://www.maribor.si/feed']),
  probe('Olympic.si', ['https://www.olympic.si', 'https://www.olympic.si/novice'], ['https://www.olympic.si/feed', 'https://www.olympic.si/rss']),
  probe('SPIRIT Slovenija', ['https://www.spiritslovenia.si', 'https://www.spiritslovenia.si/novice'], ['https://www.spiritslovenia.si/feed', 'https://www.spiritslovenia.si/rss']),
  probe('KGZS', ['https://www.kgzs.si', 'https://www.kgzs.si/novice'], ['https://www.kgzs.si/feed', 'https://www.kgzs.si/rss']),
  probe('Zadružna zveza', ['https://www.zadruznaz-zveza.si', 'https://www.zadruzna-zveza.si', 'https://zadruznaz-zveza.si'], []),
  probe('Mlada Slovenija', ['https://www.mlada-slovenija.si', 'https://mlada-slovenija.si'], ['https://www.mlada-slovenija.si/feed']),
  probe('SNG Ljubljana', ['https://www.sng-lj.si', 'https://www.drama.si'], ['https://www.sng-lj.si/feed', 'https://www.drama.si/feed']),
  probe('SNG Maribor', ['https://www.sng-mb.si'], ['https://www.sng-mb.si/feed']),
  probe('Aquarium Piran', ['https://www.aquariumpiran.si', 'https://aquarium-piran.si', 'https://www.akvarij-piran.si'], []),
  probe('World Athletics', ['https://worldathletics.org/athletes/slovenia'], []),
  probe('UCI Cycling', ['https://www.uci.org'], []),
  // Retry dead ones with alternate domains
  probe('Atletska zveza (retry)', ['https://www.atletska-zveza.si', 'https://www.azs-atletika.si', 'https://atletika.si'], []),
  probe('ŠZIS (retry)', ['https://www.szis.si', 'https://www.paralympic.si', 'https://www.paralimpik.si'], []),
  probe('FURS', ['https://www.fu.gov.si', 'https://www.fu.gov.si/novice-stran'], ['https://www.fu.gov.si/rss']),
  probe('Zavetišče Ljubljana', ['https://zavetisce-ljubljana.si', 'https://www.zavetisce-ljubljana.si'], ['https://zavetisce-ljubljana.si/feed']),
  probe('Zavetišče Maribor', ['https://zavetisce-mb.si', 'https://www.zavetisce-mb.si', 'https://zavetisce-maribor.si'], []),
]);

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

for (const r of results) {
  console.log(`── ${r.name} ──`);
  if (!r.html) {
    console.log('  ✗ Nedosegljiv\n');
    continue;
  }
  console.log(`  ✓ HTML: ${r.html.url}`);
  console.log(`    Title: "${r.html.title}"`);
  console.log(`    Links: ${r.html.linkCount}`);

  if (r.rss) {
    console.log(`  ✓ RSS: ${r.rss.url} (${r.rss.count} items)`);
    console.log(`    Sample: "${r.rss.sample}"`);
  } else {
    console.log('  ✗ RSS: ni');
  }

  if (r.links.length > 0 && !r.rss) {
    console.log('  Top links:');
    r.links.slice(0, 5).forEach(l => console.log(`    • ${l.text}`));
    // Try to find URL pattern
    const paths = r.links.map(l => { try { return new URL(l.href).pathname; } catch { return ''; } }).filter(Boolean);
    const segments = {};
    paths.forEach(p => {
      const parts = p.split('/').filter(Boolean);
      if (parts.length >= 1) segments[parts[0]] = (segments[parts[0]] || 0) + 1;
    });
    const topSeg = Object.entries(segments).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (topSeg.length > 0) console.log(`    Common path segments: ${topSeg.map(([k,v]) => `/${k} (${v})`).join(', ')}`);
  }
  console.log();
}

console.log(`Done in ${elapsed}s`);
