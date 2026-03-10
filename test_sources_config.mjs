/**
 * Test da sources.ts config deluje - crawl vse vire iz datoteke.
 * Brez baze, brez AI. Samo crawling.
 */
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

const UA = 'SvetlaStran/1.0 (+https://svetlastran.si)';
const rssParser = new Parser({ timeout: 15000, headers: { 'User-Agent': UA } });
const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

// ── Kopirano iz sources.ts ──────────────────────────────────────────────────

const RSS_SOURCES = [
  { name: 'RTV SLO',          url: 'https://www.rtvslo.si/feeds/01.xml' },
  { name: 'STA',              url: 'https://www.sta.si/rss-0' },
  { name: '24ur',             url: 'https://www.24ur.com/rss' },
  { name: 'Delo',             url: 'https://www.delo.si/rss' },
  { name: 'Dnevnik',          url: 'https://www.dnevnik.si/rss.xml' },
  { name: 'Žurnal24',         url: 'https://www.zurnal24.si/feeds/latest' },
  { name: 'Gorenjski Glas',   url: 'https://www.gorenjskiglas.si/rss.xml' },
  { name: 'Primorske Novice', url: 'https://www.primorske.si/rss.xml' },
  { name: 'Gov.si',           url: 'https://www.gov.si/novice/rss' },
  { name: 'DOPPS',            url: 'https://ptice.si/feed/' },
  { name: 'ZRSVN',            url: 'https://zrsvn-varstvonarave.si/feed/' },
  { name: 'Smučarska zveza',  url: 'https://www.sloski.si/feed/' },
  { name: 'Kolesarska zveza', url: 'https://kolesarska-zveza.si/feed/' },
  { name: 'ŠZIS',             url: 'https://www.zsis.si/feed/' },
  { name: 'Rdeči križ',       url: 'https://www.rks.si/feed/' },
  { name: 'Taborniki',        url: 'https://www.taborniki.si/feed/' },
  { name: 'ZVKDS',            url: 'https://www.zvkds.si/feed/' },
  { name: 'SNG Ljubljana',    url: 'https://www.drama.si/feed' },
  { name: 'SNG Maribor',      url: 'https://www.sng-mb.si/feed/' },
];

const HTML_SOURCES = [
  { name: 'Večer',              url: 'https://vecer.com',                               linkSelector: 'a', linkPattern: '/(slovenija|maribor|aktualno|sport|kultura)/' },
  { name: 'Sobotainfo',         url: 'https://sobotainfo.com',                          linkSelector: 'a', linkPattern: '/(aktualno|lokalno|novice|sport)/' },
  { name: 'Savinjske Novice',   url: 'https://savinjske.com',                           linkSelector: 'a', linkPattern: '/novica/' },
  { name: 'MOL Ljubljana',      url: 'https://www.ljubljana.si/sl/aktualno/novice',     linkSelector: 'a', linkPattern: '/sl/aktualno/novice/' },
  { name: 'MOM Maribor',        url: 'https://www.maribor.si/novice',                   linkSelector: 'a', linkPattern: '/maribor_novice/' },
  { name: 'ZOO Ljubljana',      url: 'https://www.zoo.si',                              linkSelector: 'a', linkPattern: '/novice/.+/.+' },
  { name: 'Zavetišče Ljubljana', url: 'https://www.zavetisce-ljubljana.si',              linkSelector: 'a', linkPattern: '/(blog|novice-in-obvestila)/' },
  { name: 'Zavetišče Maribor',  url: 'https://zavetisce-mb.si',                         linkSelector: 'a', linkPattern: '/(najdeni|izgubljeni|novice|posvojitev)' },
  { name: 'Olympic.si',         url: 'https://www.olympic.si',                          linkSelector: 'a', linkPattern: '/aktualno/' },
  { name: 'KGZS',               url: 'https://www.kgzs.si',                             linkSelector: 'a', linkPattern: '/novica/' },
  { name: 'Zadružna zveza',     url: 'https://zzs.si',                                  linkSelector: 'a', linkPattern: '/aktualno/' },
  { name: 'CNVOS',              url: 'https://www.cnvos.si',                             linkSelector: 'a', linkPattern: '/(novice|nvo-sektor)' },
  { name: 'Prostovoljstvo.org', url: 'https://www.prostovoljstvo.org',                  linkSelector: 'a', linkPattern: '/(novice|dogodki)/' },
];

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║   SVETLA STRAN - FULL SOURCE CONFIG TEST                  ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const t0 = Date.now();
let totalStories = 0;
let rssOk = 0, rssFail = 0, htmlOk = 0, htmlFail = 0;

// ── RSS ──

console.log(`═══ RSS (${RSS_SOURCES.length} virov) ═══\n`);

const rssResults = await Promise.allSettled(
  RSS_SOURCES.map(async (src) => {
    const feed = await rssParser.parseURL(src.url);
    let count = 0;
    for (const item of feed.items) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      if (pubDate && pubDate < cutoff) continue;
      count++;
    }
    return { name: src.name, count };
  })
);

for (const r of rssResults) {
  if (r.status === 'fulfilled') {
    console.log(`  ✓ ${r.value.name.padEnd(22)} ${String(r.value.count).padStart(4)} člankov`);
    totalStories += r.value.count;
    rssOk++;
  } else {
    console.log(`  ✗ ${'?'.padEnd(22)} NAPAKA: ${r.reason?.message?.slice(0, 60)}`);
    rssFail++;
  }
}

// ── HTML ──

console.log(`\n═══ HTML (${HTML_SOURCES.length} virov) ═══\n`);

const htmlResults = await Promise.allSettled(
  HTML_SOURCES.map(async (src) => {
    const res = await fetch(src.url, { headers: {'User-Agent': UA}, signal: AbortSignal.timeout(15000), redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const pattern = new RegExp(src.linkPattern);
    const seen = new Set();
    const links = [];
    $(src.linkSelector).each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.length < 15 || !pattern.test(href)) return;
      const origin = new URL(src.url).origin;
      const fullUrl = href.startsWith('http') ? href : `${origin}${href.split('#')[0]}`;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);
      links.push(text.slice(0, 70));
    });
    return { name: src.name, count: links.length, sample: links[0] || '' };
  })
);

for (const r of htmlResults) {
  if (r.status === 'fulfilled') {
    console.log(`  ✓ ${r.value.name.padEnd(22)} ${String(r.value.count).padStart(4)} člankov`);
    if (r.value.sample) console.log(`      • ${r.value.sample}`);
    totalStories += r.value.count;
    htmlOk++;
  } else {
    console.log(`  ✗ ${'?'.padEnd(22)} NAPAKA: ${r.reason?.message?.slice(0, 60)}`);
    htmlFail++;
  }
}

// ── SUMMARY ──

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n═══ POVZETEK ═══\n`);
console.log(`  Čas:            ${elapsed}s`);
console.log(`  RSS:            ${rssOk}/${RSS_SOURCES.length} deluje`);
console.log(`  HTML:           ${htmlOk}/${HTML_SOURCES.length} deluje`);
console.log(`  Skupaj virov:   ${rssOk + htmlOk}/${RSS_SOURCES.length + HTML_SOURCES.length}`);
console.log(`  Skupaj člankov: ${totalStories}`);
console.log();
