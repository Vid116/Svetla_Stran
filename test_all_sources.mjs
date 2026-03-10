/**
 * Test VSEH virov iz SPEC-a - PARALELNO.
 */
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

const UA = 'SvetlaStran/1.0 (+https://svetlastran.si)';
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': UA } });

async function testRSS(name, url) {
  try {
    const feed = await parser.parseURL(url);
    const count = feed.items?.length || 0;
    const sample = feed.items?.[0]?.title?.slice(0, 70) || '';
    return { name, type: 'rss', ok: true, count, sample, url };
  } catch (e) {
    return { name, type: 'rss', ok: false, error: e.message?.slice(0, 80), url };
  }
}

async function testHTML(name, url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    if (!res.ok) return { name, type: 'html', ok: false, error: `HTTP ${res.status}`, url };
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $('title').text().trim().slice(0, 60);
    const articles = $('article, .article, .news-item, .post, .entry').length;
    const h2s = $('h2 a, h3 a').length;
    const rssLink = $('link[type="application/rss+xml"]').attr('href') ||
                    $('link[type="application/atom+xml"]').attr('href') || '';
    return { name, type: 'html', ok: true, title, articles, h2s, rssLink, url, size: html.length };
  } catch (e) {
    return { name, type: 'html', ok: false, error: e.message?.slice(0, 80), url };
  }
}

async function testRSSWithFallback(name, url) {
  const r = await testRSS(name, url);
  if (r.ok) return r;
  // Try common alternates
  const origin = new URL(url).origin;
  for (const alt of [`${origin}/rss`, `${origin}/feed`, `${origin}/rss.xml`]) {
    if (alt === url) continue;
    const r2 = await testRSS(name, alt);
    if (r2.ok) return { ...r2, note: `alt: ${alt}` };
  }
  return r;
}

async function testHTMLWithRSSDiscovery(name, url) {
  const h = await testHTML(name, url);
  if (!h.ok) return h;
  // If RSS link found in HTML, test it too
  if (h.rssLink) {
    const rssUrl = h.rssLink.startsWith('http') ? h.rssLink : `${new URL(url).origin}${h.rssLink}`;
    const r = await testRSS(name, rssUrl);
    h.rssTest = r;
  } else {
    // Try common RSS paths
    const origin = new URL(url).origin;
    for (const path of ['/rss', '/rss.xml', '/feed', '/feed.xml', '/feeds/latest']) {
      const r = await testRSS(name, `${origin}${path}`);
      if (r.ok) { h.rssTest = r; h.rssLink = `${origin}${path}`; break; }
    }
  }
  return h;
}

// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║      SVETLA STRAN - TEST VSEH VIROV (PARALELNO)             ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const t0 = Date.now();

// Launch ALL tests in parallel
const [
  rssResults,
  regionalResults,
  obcineResults,
  zivaliResults,
  sportResults,
  vladaResults,
  civilnaResults,
  resevanjeResults,
  gospodResults,
  kulturaResults,
  solstvoResults,
] = await Promise.all([
  // 1. Nacionalni RSS
  Promise.all([
    testRSSWithFallback('RTV SLO',   'https://www.rtvslo.si/feeds/01.xml'),
    testRSSWithFallback('STA',       'https://www.sta.si/rss-0'),
    testRSSWithFallback('24ur',      'https://www.24ur.com/rss'),
    testRSSWithFallback('Delo',      'https://www.delo.si/rss'),
    testRSSWithFallback('Dnevnik',   'https://www.dnevnik.si/rss'),
    testRSSWithFallback('Večer',     'https://www.vecer.com/rss.xml'),
    testRSSWithFallback('Žurnal24',  'https://www.zurnal24.si/feeds/latest'),
  ]),
  // 2. Regionalni
  Promise.all([
    testHTMLWithRSSDiscovery('Gorenjski Glas',   'https://www.gorenjskiglas.si'),
    testHTMLWithRSSDiscovery('Primorske Novice', 'https://www.primorske.si'),
    testHTMLWithRSSDiscovery('Koroške Novice',   'https://www.koroske-novice.si'),
    testHTMLWithRSSDiscovery('Dolenjski List',   'https://www.dolenjskilist.si'),
    testHTMLWithRSSDiscovery('Štajerski Tednik', 'https://www.st.si'),
    testHTMLWithRSSDiscovery('Savinjske Novice', 'https://www.savinjske.com'),
    testHTMLWithRSSDiscovery('Sobotainfo',       'https://sobotainfo.com'),
    testHTMLWithRSSDiscovery('Lokalne.si',       'https://www.lokalne.si'),
  ]),
  // 3. Občine
  Promise.all([
    testHTMLWithRSSDiscovery('MOL (Ljubljana)',  'https://www.ljubljana.si/sl/moja-ljubljana/novice'),
    testHTMLWithRSSDiscovery('MOM (Maribor)',    'https://www.maribor.si/novice'),
  ]),
  // 4. Živali & Narava
  Promise.all([
    testHTMLWithRSSDiscovery('ZOO Ljubljana',    'https://www.zoo.si/novice'),
    testHTMLWithRSSDiscovery('ZOO Maribor',      'https://www.zoo-maribor.si'),
    testHTMLWithRSSDiscovery('DOPPS (ptice)',     'https://www.dopps.si/novice'),
    testHTMLWithRSSDiscovery('ZRSVN (narava)',    'https://www.zrsvn.si'),
  ]),
  // 5. Šport
  Promise.all([
    testHTMLWithRSSDiscovery('Atletska zveza',   'https://www.atletska-zveza.si'),
    testHTMLWithRSSDiscovery('Smučarska zveza',  'https://www.sloski.si'),
    testHTMLWithRSSDiscovery('Kolesarska zveza', 'https://www.kolesarska-zveza.si'),
    testHTMLWithRSSDiscovery('ŠZIS (invalidi)',  'https://www.szis.si'),
    testHTMLWithRSSDiscovery('Olympic.si',       'https://www.olympic.si'),
  ]),
  // 6. Vlada
  Promise.all([
    testHTMLWithRSSDiscovery('Gov.si novice',    'https://www.gov.si/novice'),
    testHTMLWithRSSDiscovery('FURS novosti',     'https://www.fu.gov.si/novosti'),
    testHTMLWithRSSDiscovery('Uradni list RS',   'https://www.uradni-list.si'),
  ]),
  // 7. Civilna družba
  Promise.all([
    testHTMLWithRSSDiscovery('CNVOS',            'https://www.cnvos.si'),
    testHTMLWithRSSDiscovery('Prostovoljstvo',   'https://www.prostovoljstvo.org'),
    testHTMLWithRSSDiscovery('Rdeči križ',       'https://www.rks.si'),
  ]),
  // 8. Reševanje
  Promise.all([
    testHTMLWithRSSDiscovery('URSZR (gasilci)',  'https://www.urszr.si'),
  ]),
  // 9. Gospodarstvo
  Promise.all([
    testHTMLWithRSSDiscovery('SPIRIT Slovenija', 'https://www.spiritslovenia.si'),
    testHTMLWithRSSDiscovery('KGZS',             'https://www.kgzs.si'),
  ]),
  // 10. Kultura
  Promise.all([
    testHTMLWithRSSDiscovery('ZVKDS (dediščina)','https://www.zvkds.si'),
  ]),
  // 11. Šolstvo
  Promise.all([
    testHTMLWithRSSDiscovery('Taborniki',        'https://www.taborniki.si'),
  ]),
]);

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

// ── PRINT RESULTS ────────────────────────────────────────────────────────────

function printSection(title, results) {
  console.log(`═══ ${title} ═══\n`);
  for (const r of results) {
    if (r.type === 'rss') {
      if (r.ok) {
        const note = r.note ? ` (${r.note})` : '';
        console.log(`  ✓ ${r.name.padEnd(24)} RSS  ${String(r.count).padStart(4)} člankov${note}`);
        console.log(`    "${r.sample}"`);
      } else {
        console.log(`  ✗ ${r.name.padEnd(24)} RSS  NAPAKA: ${r.error}`);
      }
    } else {
      if (r.ok) {
        const rss = r.rssTest?.ok ? ` | RSS: ✓ ${r.rssTest.count} členkov @ ${r.rssLink}` : (r.rssLink ? ` | RSS: ✗` : ' | RSS: ni');
        console.log(`  ✓ ${r.name.padEnd(24)} HTML ${r.articles} articles, ${r.h2s} h2/h3 links${rss}`);
        console.log(`    "${r.title}"`);
      } else {
        console.log(`  ✗ ${r.name.padEnd(24)} NAPAKA: ${r.error}`);
      }
    }
  }
  console.log();
}

printSection('1. NACIONALNI MEDIJI (RSS)', rssResults);
printSection('2. REGIONALNI MEDIJI', regionalResults);
printSection('3. OBČINE', obcineResults);
printSection('4. ŽIVALI & NARAVA', zivaliResults);
printSection('5. ŠPORT', sportResults);
printSection('6. VLADA & URADNI VIRI', vladaResults);
printSection('7. CIVILNA DRUŽBA', civilnaResults);
printSection('8. REŠEVANJE & 112', resevanjeResults);
printSection('9. GOSPODARSTVO & KMETIJSTVO', gospodResults);
printSection('10. KULTURA & DEDIŠČINA', kulturaResults);
printSection('11. ŠOLSTVO & MLADI', solstvoResults);

// ── SUMMARY ──────────────────────────────────────────────────────────────────

const all = [rssResults, regionalResults, obcineResults, zivaliResults, sportResults, vladaResults, civilnaResults, resevanjeResults, gospodResults, kulturaResults, solstvoResults].flat();
const working = all.filter(r => r.ok);
const failed = all.filter(r => !r.ok);
const withRSS = all.filter(r => (r.type === 'rss' && r.ok) || r.rssTest?.ok);

console.log('═══ POVZETEK ═══\n');
console.log(`  Čas:      ${elapsed}s`);
console.log(`  Skupaj:   ${all.length} virov`);
console.log(`  Deluje:   ${working.length}`);
console.log(`  Ne dela:  ${failed.length}`);
console.log(`  Z RSS:    ${withRSS.length}`);
if (failed.length > 0) {
  console.log(`\n  Nedelujoči:`);
  failed.forEach(r => console.log(`    ✗ ${r.name}: ${r.error}`));
}
console.log();
