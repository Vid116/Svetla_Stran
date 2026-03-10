import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'SvetlaStran/1.0 (+https://svetlastran.si)' },
});

const VIRI = [
  { ime: 'RTV SLO',   url: 'https://www.rtvslo.si/feeds/01.xml' },
  { ime: 'STA',       url: 'https://www.sta.si/rss' },
  { ime: '24ur',      url: 'https://www.24ur.com/rss' },
  { ime: 'Žurnal24',  url: 'https://www.zurnal24.si/feeds/latest' },
  { ime: 'Delo',      url: 'https://www.delo.si/rss' },
];

const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
const vse = [];

for (const vir of VIRI) {
  try {
    const feed = await parser.parseURL(vir.url);
    let count = 0;
    for (const item of feed.items) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      if (pubDate && pubDate < cutoff) continue;

      vse.push({
        naslov: item.title?.trim() || '',
        url: item.link?.trim() || '',
        snippet: (item.contentSnippet || item.content || '').trim().slice(0, 120),
        vir: vir.ime,
      });
      count++;
    }
    console.log(`✓ ${vir.ime.padEnd(12)} ${count} člankov`);
  } catch (e) {
    console.log(`✗ ${vir.ime.padEnd(12)} NAPAKA: ${e.message?.slice(0, 80)}`);
  }
}

console.log(`\nSkupaj: ${vse.length} člankov\n`);
console.log('── Prvih 20 naslovov ──\n');
vse.slice(0, 20).forEach((s, i) => {
  console.log(`${String(i + 1).padStart(2)}. [${s.vir}] ${s.naslov}`);
  if (s.snippet) console.log(`    ${s.snippet}...`);
  console.log();
});
