import { CheerioCrawler, RequestQueue } from 'crawlee';
import { MemoryStorage } from '@crawlee/memory-storage';

const VIRI = [
  { ime: 'RTV SLO', url: 'https://www.rtvslo.si/feeds/01.xml' },
  { ime: 'STA',     url: 'https://www.sta.si/rss-0' },
  { ime: '24ur',    url: 'https://www.24ur.com/rss' },
  { ime: 'Žurnal24',url: 'https://www.zurnal24.si/feeds/latest' },
];

const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
const vse = [];

for (const vir of VIRI) {
  const results = [];

  // Svež in-memory queue za vsak vir - brez persistiranega stanja
  const storage = new MemoryStorage();
  const requestQueue = await RequestQueue.open(null, { storageClient: storage });
  await requestQueue.addRequest({ url: vir.url });

  const crawler = new CheerioCrawler({
    requestQueue,
    maxRequestsPerCrawl: 1,
    additionalMimeTypes: ['application/rss+xml', 'application/xml', 'text/xml', 'application/atom+xml'],
    async requestHandler({ $ }) {
      $('item, entry').each((_, el) => {
        const title = $(el).find('title').first().text().trim();
        const link = $(el).find('link').first().text().trim() || $(el).find('link').first().attr('href') || '';
        const snippet = $(el).find('description, summary').first().text().trim().slice(0, 120);
        const pubDate = $(el).find('pubDate, published, updated').first().text().trim();

        if (!title || !link) return;
        if (pubDate && new Date(pubDate) < cutoff) return;

        results.push({ naslov: title, url: link, snippet, vir: vir.ime });
      });
    },
  });

  try {
    await crawler.run();
    console.log(`✓ ${vir.ime.padEnd(12)} ${results.length} člankov`);
    vse.push(...results);
  } catch (e) {
    console.log(`✗ ${vir.ime.padEnd(12)} NAPAKA: ${e.message}`);
  }
}

console.log(`\nSkupaj: ${vse.length} člankov\n`);
console.log('── Prvih 15 naslovov ──\n');
vse.slice(0, 15).forEach((s, i) => {
  console.log(`${String(i+1).padStart(2)}. [${s.vir}] ${s.naslov}`);
  if (s.snippet) console.log(`    ${s.snippet}...`);
  console.log();
});

console.log(`\nSkupaj: ${vse.length} člankov\n`);
console.log('── Prvih 10 naslovov ──\n');
vse.slice(0, 10).forEach((s, i) => {
  console.log(`${String(i+1).padStart(2)}. [${s.vir}] ${s.naslov}`);
  if (s.snippet) console.log(`    ${s.snippet}...`);
  console.log();
});
