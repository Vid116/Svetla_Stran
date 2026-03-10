/**
 * Fix broken sources - try alternate URLs, discover RSS, find correct pages.
 */
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

const UA = 'SvetlaStran/1.0 (+https://svetlastran.si)';
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': UA } });

async function tryFetch(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    return { ok: res.ok, status: res.status, url: res.url, html: res.ok ? await res.text() : null };
  } catch (e) {
    return { ok: false, error: e.message?.slice(0, 80) };
  }
}

async function tryRSS(url) {
  try {
    const feed = await parser.parseURL(url);
    return { ok: true, count: feed.items?.length || 0, sample: feed.items?.[0]?.title?.slice(0, 70), url };
  } catch (e) {
    return { ok: false, error: e.message?.slice(0, 60) };
  }
}

async function investigate(name, urls, rssGuesses = []) {
  console.log(`\n── ${name} ──`);

  // Try all URLs
  for (const url of urls) {
    const r = await tryFetch(url);
    if (r.ok) {
      const $ = cheerio.load(r.html);
      const title = $('title').text().trim().slice(0, 80);
      const rssLink = $('link[type="application/rss+xml"]').attr('href') ||
                      $('link[type="application/atom+xml"]').attr('href') || '';
      const articles = $('article, .article, .news-item, .post, .entry, .novica, .card').length;
      const h2links = $('h2 a, h3 a, .title a, .naslov a').length;
      console.log(`  ✓ ${url}`);
      console.log(`    Title: "${title}"`);
      console.log(`    Redirected to: ${r.url !== url ? r.url : 'no redirect'}`);
      console.log(`    Articles: ${articles}, Links: ${h2links}`);
      if (rssLink) {
        const rssUrl = rssLink.startsWith('http') ? rssLink : `${new URL(r.url).origin}${rssLink}`;
        console.log(`    RSS found: ${rssUrl}`);
        const rr = await tryRSS(rssUrl);
        if (rr.ok) console.log(`    RSS works: ${rr.count} items | "${rr.sample}"`);
        else console.log(`    RSS broken: ${rr.error}`);
      }
      // Show some content hints
      const links = [];
      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim().slice(0, 50);
        if (text.length > 10 && (href.includes('novic') || href.includes('news') || href.includes('blog') || href.includes('novost') || href.includes('clanek') || href.includes('aktual'))) {
          links.push(`${text} → ${href}`);
        }
      });
      if (links.length > 0) {
        console.log(`    Interesting links:`);
        links.slice(0, 5).forEach(l => console.log(`      • ${l}`));
      }
    } else {
      console.log(`  ✗ ${url} → ${r.error || `HTTP ${r.status}`}`);
    }
  }

  // Try RSS guesses
  for (const url of rssGuesses) {
    const r = await tryRSS(url);
    if (r.ok) console.log(`  ✓ RSS @ ${url} → ${r.count} items | "${r.sample}"`);
    else console.log(`  ✗ RSS @ ${url} → ${r.error}`);
  }
}

const t0 = Date.now();

// Run ALL investigations in parallel
await Promise.all([
  investigate('Večer', [
    'https://www.vecer.com',
    'https://vecer.com',
  ], [
    'https://www.vecer.com/rss.xml',
    'https://www.vecer.com/rss',
    'https://www.vecer.com/feed',
    'https://vecer.com/rss',
  ]),

  investigate('Koroške Novice', [
    'https://www.koroske-novice.si',
    'https://koroske-novice.si',
    'https://www.koroske.si',
  ], []),

  investigate('Štajerski Tednik', [
    'https://www.st.si',
    'https://st.si',
    'https://www.stajerskitednik.si',
  ], []),

  investigate('Savinjske Novice', [
    'https://www.savinjske.com',
    'https://savinjske.com',
    'https://www.savinjske-novice.si',
  ], []),

  investigate('Lokalne.si', [
    'https://www.lokalne.si',
    'https://lokalne.si',
  ], []),

  investigate('MOL Ljubljana', [
    'https://www.ljubljana.si/sl/moja-ljubljana/novice',
    'https://www.ljubljana.si/sl/novice',
    'https://www.ljubljana.si',
  ], [
    'https://www.ljubljana.si/feed',
    'https://www.ljubljana.si/rss',
  ]),

  investigate('ZOO Ljubljana', [
    'https://www.zoo.si',
    'https://www.zoo.si/novice',
    'https://www.zoo.si/sl/novice',
    'https://www.zoo.si/sl/zivalski-vrt',
    'https://www.zoo-ljubljana.si',
  ], [
    'https://www.zoo.si/feed',
    'https://www.zoo.si/rss',
  ]),

  investigate('ZOO Maribor', [
    'https://www.zoo-maribor.si',
    'https://zoo-maribor.si',
    'https://www.zoo.mb.si',
    'https://www.maribor-pohorje.si/zoo',
  ], []),

  investigate('DOPPS (ptice)', [
    'https://www.dopps.si',
    'https://www.dopps.si/novice',
    'https://dopps.si',
    'https://ptice.si',
  ], [
    'https://www.dopps.si/feed',
    'https://www.dopps.si/rss',
  ]),

  investigate('Atletska zveza', [
    'https://www.atletska-zveza.si',
    'https://atletska-zveza.si',
    'https://www.azs.si',
    'https://www.atletika.si',
  ], []),

  investigate('ŠZIS (invalidi)', [
    'https://www.szis.si',
    'https://szis.si',
    'https://www.sportinvalid.si',
  ], []),

  investigate('FURS', [
    'https://www.fu.gov.si',
    'https://www.fu.gov.si/novosti',
    'https://www.gov.si/drzavni-organi/organi-v-sestavi/financna-uprava/',
  ], []),

  investigate('URSZR (gasilci)', [
    'https://www.urszr.si',
    'https://urszr.si',
    'https://www.gov.si/drzavni-organi/organi-v-sestavi/uprava-za-zaščito-in-reševanje/',
  ], []),
]);

console.log(`\n── Done in ${((Date.now() - t0) / 1000).toFixed(1)}s ──\n`);
