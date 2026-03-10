/**
 * Final test - all FIXED sources with correct URLs.
 */
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

const UA = 'SvetlaStran/1.0 (+https://svetlastran.si)';
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': UA } });

async function testRSS(url) {
  const feed = await parser.parseURL(url);
  return { count: feed.items?.length || 0, sample: feed.items?.[0]?.title?.slice(0, 70) };
}

async function testHTML(url, linkPattern) {
  const res = await fetch(url, { headers: {'User-Agent': UA}, signal: AbortSignal.timeout(15000), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());
  const links = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim().replace(/\s+/g, ' ').slice(0, 100);
    if (text.length > 15 && linkPattern.test(href)) links.push({ text, href });
  });
  // Deduplicate by href
  const seen = new Set();
  return links.filter(l => { if (seen.has(l.href)) return false; seen.add(l.href); return true; });
}

const results = [];

function log(icon, name, type, detail) {
  const line = `${icon} ${name.padEnd(26)} ${type.padEnd(5)} ${detail}`;
  console.log(`  ${line}`);
  results.push({ name, type, ok: icon === '✓', detail });
}

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║   SVETLA STRAN - KONČNI TEST VSEH VIROV                  ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const t0 = Date.now();

// ── ALL RSS SOURCES ──────────────────────────────────────────────────────────

console.log('═══ RSS VIRI ═══\n');

const rssSources = [
  ['RTV SLO',          'https://www.rtvslo.si/feeds/01.xml'],
  ['STA',              'https://www.sta.si/rss-0'],
  ['24ur',             'https://www.24ur.com/rss'],
  ['Delo',             'https://www.delo.si/rss'],
  ['Dnevnik',          'https://www.dnevnik.si/rss.xml'],
  ['Žurnal24',         'https://www.zurnal24.si/feeds/latest'],
  ['Gorenjski Glas',   'https://www.gorenjskiglas.si/rss.xml'],
  ['Primorske Novice', 'https://www.primorske.si/rss.xml'],
  ['Gov.si',           'https://www.gov.si/novice/rss'],
  ['DOPPS (ptice.si)', 'https://ptice.si/feed/'],
  ['ZRSVN',            'https://zrsvn-varstvonarave.si/feed/'],
  ['Smučarska zveza',  'https://www.sloski.si/feed/'],
  ['Kolesarska zveza', 'https://kolesarska-zveza.si/feed/'],
  ['Rdeči križ',       'https://www.rks.si/feed/'],
  ['ZVKDS',            'https://www.zvkds.si/feed/'],
  ['Taborniki',        'https://www.taborniki.si/feed/'],
  ['MOL Ljubljana',    'https://www.ljubljana.si/sl/aktualno/novice/rss'],
];

await Promise.all(rssSources.map(async ([name, url]) => {
  try {
    const r = await testRSS(url);
    log('✓', name, 'RSS', `${r.count} člankov | "${r.sample}"`);
  } catch (e) {
    log('✗', name, 'RSS', `NAPAKA: ${e.message?.slice(0, 60)}`);
  }
}));

// ── HTML SCRAPE SOURCES ──────────────────────────────────────────────────────

console.log('\n═══ HTML VIRI (scraping) ═══\n');

const htmlSources = [
  ['Večer',            'https://vecer.com', /\/(slovenija|maribor|aktualno|sport|kultura)\//],
  ['Dolenjski List',   'https://www.dolenjskilist.si', /\/(clanek|novica|article)\//],
  ['Sobotainfo',       'https://sobotainfo.com', /\/(aktualno|lokalno|novice|sport)\//],
  ['Savinjske Novice', 'https://savinjske.com', /\/novica\//],
  ['KGZS',             'https://www.kgzs.si', /\/(novice|aktualno|clanek)\//],
  ['ZOO Ljubljana',    'https://www.zoo.si', /\/novice\/.+\/.+/],
];

await Promise.all(htmlSources.map(async ([name, url, pattern]) => {
  try {
    const links = await testHTML(url, pattern);
    if (links.length > 0) {
      log('✓', name, 'HTML', `${links.length} člankov`);
      links.slice(0, 3).forEach(l => console.log(`    • ${l.text}`));
    } else {
      log('~', name, 'HTML', 'dosegljiv, 0 člankov z vzorcem');
    }
  } catch (e) {
    log('✗', name, 'HTML', `NAPAKA: ${e.message?.slice(0, 60)}`);
  }
}));

// ── STILL DEAD (for the record) ──────────────────────────────────────────────

console.log('\n═══ NE DELA (DNS/SSL) ═══\n');
const dead = [
  'Koroške Novice (koroske-novice.si)',
  'Štajerski Tednik (st.si)',
  'Lokalne.si',
  'ZOO Maribor (zoo-maribor.si)',
  'Atletska zveza (atletska-zveza.si)',
  'ŠZIS (szis.si)',
  'URSZR (urszr.si)',
];
dead.forEach(d => console.log(`  ✗ ${d}`));

// ── SUMMARY ──────────────────────────────────────────────────────────────────

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
const working = results.filter(r => r.ok);
const rssWorking = results.filter(r => r.ok && r.type === 'RSS');
const htmlWorking = results.filter(r => r.ok && r.type === 'HTML');

console.log(`\n═══ POVZETEK ═══\n`);
console.log(`  Čas:         ${elapsed}s`);
console.log(`  RSS deluje:  ${rssWorking.length}/${rssSources.length}`);
console.log(`  HTML deluje: ${htmlWorking.length}/${htmlSources.length}`);
console.log(`  Skupaj:      ${working.length} delujočih virov`);
console.log(`  Mrtvi:       ${dead.length} (DNS/SSL/firewall)\n`);
