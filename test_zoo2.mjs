import * as cheerio from 'cheerio';
const UA = 'SvetlaStran/1.0 (+https://svetlastran.si)';

async function dump(name, url) {
  console.log(`\n── ${name} ──`);
  console.log(`   ${url}\n`);
  try {
    const res = await fetch(url, { headers: {'User-Agent': UA}, signal: AbortSignal.timeout(15000) });
    if (!res.ok) { console.log(`   HTTP ${res.status}`); return; }
    const html = await res.text();
    const $ = cheerio.load(html);

    // Find ALL links on page
    const allLinks = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().replace(/\s+/g, ' ').slice(0, 100);
      if (text.length > 5 && href.length > 1) allLinks.push({text, href});
    });

    console.log(`   ${allLinks.length} total links\n`);

    // Show links that look like articles (long text, real paths)
    const articleLinks = allLinks.filter(l =>
      l.text.length > 20 &&
      !l.href.startsWith('#') &&
      !l.href.includes('facebook') &&
      !l.href.includes('instagram')
    );

    articleLinks.slice(0, 15).forEach(l => {
      console.log(`   • ${l.text}`);
      console.log(`     ${l.href}`);
    });

    // Also dump the main text
    const mainText = ($('main').text() || $('.content').text() || $('body').text())
      .replace(/\s+/g, ' ').trim().slice(0, 800);
    console.log(`\n   Page text: "${mainText}"`);
  } catch(e) {
    console.log(`   ERROR: ${e.message?.slice(0,80)}`);
  }
}

await Promise.all([
  // The article we found earlier
  dump('ZOO Article', 'https://www.zoo.si/novice/novice/novi-in-navihani-prebivalci-zivalskega-vrta-ljubljana'),
  // Try the actual news listing with different URL patterns
  dump('ZOO /novice', 'https://www.zoo.si/novice'),
  dump('ZOO /novice/prihodi-in-odhodi', 'https://www.zoo.si/novice/prihodi-in-odhodi'),
  // Check their Facebook page info
  dump('ZOO /o-nas', 'https://www.zoo.si/o-nas'),
  // Main page - maybe articles are there
  dump('ZOO Homepage', 'https://www.zoo.si'),
]);
