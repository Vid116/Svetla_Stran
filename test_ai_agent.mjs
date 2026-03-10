/**
 * Test AI uredniški agent proti pravim člankom.
 * Potrebuje: ANTHROPIC_API_KEY v okolju.
 *
 * Uporaba:
 *   ANTHROPIC_API_KEY=sk-ant-... node test_ai_agent.mjs
 */
import Anthropic from '@anthropic-ai/sdk';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('NAPAKA: Nastavi ANTHROPIC_API_KEY okolje spremenljivko.');
  console.error('  ANTHROPIC_API_KEY=sk-ant-... node test_ai_agent.mjs');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey });
const UA = 'SvetlaStran/1.0 (+https://svetlastran.si)';
const rssParser = new Parser({ timeout: 15000, headers: { 'User-Agent': UA } });

// ── Filozofija (kopirano iz anthropic.ts) ────────────────────────────────────

const FILOZOFIJA = `
SVETLA STRAN je slovenski portal dobrih novic. Naše poslanstvo:
Za vsak strup, ki ga mediji dajejo, imamo specifično zdravilo.

| Strup medijev              | Naše zdravilo                                               |
|----------------------------|-------------------------------------------------------------|
| Jeza (politika, konflikti) | Odpuščanje, sprava, ljudje ki izberejo prijaznost           |
| Skrb (kriminal, strah)    | Upanje, rešene težave, skupnosti ki delujejo                |
| Cinizem (korupcija)       | Dokaz da so ljudje dobri - brez skritih agend              |
| Osamljenost               | Skupnost, povezanost, tujci ki postanejo sosedje           |
| Obup (podnebje, vojna)    | Odpornost, obnova, narava ki se vrača                      |
| Strah (nevarnost povsod)  | Pogum - običajni ljudje ki naredijo tihe izredne stvari    |

Uredniško vprašanje NI "Ali je ta zgodba pozitivna?"
Vprašanje JE: "Ali ta zgodba RAZBLINI kaj težkega?"

9 KATEGORIJ: ZIVALI, SKUPNOST, SPORT, NARAVA, INFRASTRUKTURA, PODJETNISTVO, SLOVENIJA_V_SVETU, JUNAKI, KULTURA
`.trim();

const TITLE_FILTER_PROMPT = `Si uredniški asistent za Svetla Stran - portal pozitivnih novic iz Slovenije.

${FILOZOFIJA}

Dobiš seznam naslovov člankov (ID: naslov). Za vsakega odloči:
- "DA" - naslov nakazuje potencialno pozitivno slovensko zgodbo
- "NE" - naslov je očitno negativen, političen, kriminalen, vojni konflikt, nesreča ali nerelevanten

Pravila:
- Bodi LIBERALEN z DA - raje preveč kot premalo. NE samo če je očitno neuporabno.
- Šport (zmage, uspehi) = DA. Živali (posvojitve, reševanja) = DA. Infrastruktura (odprtje, obnova) = DA.
- Politika, kriminal, nesreče, vojne = NE. Prošnje za denar = NE.

Vrni SAMO JSON brez markdown:
{"rezultati": [{"id": "string", "odlocitev": "DA" | "NE"}]}`;

const SCORING_PROMPT = `Si uredniški agent za Svetla Stran.

${FILOZOFIJA}

TVOJA NALOGA: Oceni zgodbo od 0 do 10 po uredniškem filtru.

5 ČUSTEV KI JIH IŠČEMO:
- PONOS: Slovenec, kraj, ekipa ali stvar je prepoznana, zmaga ali slavljena.
- TOPLINA: Človek ali žival v težkem položaju in drugi so stopili zraven.
- OLAJSANJE: Nekaj kar je bilo pokvarjeno ali manjkalo je končno popravljeno ali rešeno.
- CUDESENJE: Zgodilo se je nekaj lepega, nepričakovanega ali izrednega.
- UPANJE: Zgodba te prepriča da je prihodnost morda vendarle vredna zaupanja.

UREDNIŠKI PREIZKUS: Katero je PRVO čustvo ki ga ta zgodba zbudi?

AVTOMATSKA OCENA 0 če zgodba primarno zbudi: krivdo, jezo, žalost, tesnobo, zahteva denar, politična zmaga kot poraz za drugo stran, senzacionalizem.

Vrni SAMO JSON brez markdown:
{
  "score": number,
  "emotions": ["PONOS"|"TOPLINA"|"OLAJSANJE"|"CUDESENJE"|"UPANJE"],
  "rejected_because": null | "krivda"|"jeza"|"zalost"|"tesnoba"|"denar"|"politika"|"senzacionalizem",
  "reason": "max 2 stavka",
  "category": "ZIVALI|SKUPNOST|SPORT|NARAVA|INFRASTRUKTURA|PODJETNISTVO|SLOVENIJA_V_SVETU|JUNAKI|KULTURA",
  "headline_suggestion": "predlagani naslov, max 10 besed",
  "antidote_for": null | "jeza"|"skrb"|"cinizem"|"osamljenost"|"obup"|"strah"
}`;

// ── 1. Poberi prave članke ──────────────────────────────────────────────────

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║   SVETLA STRAN - TEST AI UREDNIŠKEGA AGENTA              ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log('1. Berem članke iz virov...\n');

const feeds = [
  { name: 'RTV SLO', url: 'https://www.rtvslo.si/feeds/01.xml' },
  { name: 'STA',     url: 'https://www.sta.si/rss-0' },
  { name: '24ur',    url: 'https://www.24ur.com/rss' },
];

const allStories = [];
for (const feed of feeds) {
  try {
    const f = await rssParser.parseURL(feed.url);
    for (const item of f.items.slice(0, 15)) {
      allStories.push({
        id: `${feed.name.replace(/\s/g,'')}-${allStories.length}`,
        rawTitle: item.title?.trim() || '',
        rawContent: (item.contentSnippet || item.content || '').trim().slice(0, 300),
        sourceUrl: item.link?.trim() || '',
        sourceName: feed.name,
      });
    }
  } catch (e) {
    console.log(`  ✗ ${feed.name}: ${e.message?.slice(0, 60)}`);
  }
}

console.log(`  Pobranih: ${allStories.length} člankov\n`);

// ── 2. Title filter ─────────────────────────────────────────────────────────

console.log('2. Title filter (Haiku)...\n');

const titleList = allStories.map(s => `${s.id}: ${s.rawTitle}`).join('\n');

const titleMsg = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  system: TITLE_FILTER_PROMPT,
  messages: [{ role: 'user', content: titleList }],
});

const titleText = titleMsg.content.map(b => b.text || '').join('').trim();
const titleResults = JSON.parse(titleText.replace(/```json|```/g, '').trim()).rezultati;

const daStories = titleResults.filter(r => r.odlocitev === 'DA');
const neStories = titleResults.filter(r => r.odlocitev === 'NE');

console.log(`  DA: ${daStories.length}  |  NE: ${neStories.length}\n`);

console.log('  ── NE (zavrnjeni po naslovu) ──');
neStories.slice(0, 10).forEach(r => {
  const story = allStories.find(s => s.id === r.id);
  console.log(`    ✗ [${story?.sourceName}] ${story?.rawTitle}`);
});

console.log('\n  ── DA (gredo v scoring) ──');
daStories.slice(0, 10).forEach(r => {
  const story = allStories.find(s => s.id === r.id);
  console.log(`    ✓ [${story?.sourceName}] ${story?.rawTitle}`);
});

// ── 3. Scoring (prvih 5 DA) ────────────────────────────────────────────────

const toScore = daStories.slice(0, 8).map(r => allStories.find(s => s.id === r.id)).filter(Boolean);

console.log(`\n3. Scoring ${toScore.length} zgodb (Haiku)...\n`);

// Poberi polno vsebino
for (const story of toScore) {
  try {
    const res = await fetch(story.sourceUrl, { headers: {'User-Agent': UA}, signal: AbortSignal.timeout(10000) });
    const html = await res.text();
    const $ = cheerio.load(html);
    const body = $('article').text() || $('[class*="article-body"]').text() || $('[class*="content"]').first().text() || '';
    story.rawContent = body.trim().slice(0, 2000) || story.rawContent;
  } catch (e) {}
}

for (const story of toScore) {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SCORING_PROMPT,
      messages: [{ role: 'user', content: `Naslov: ${story.rawTitle}\n\nVsebina:\n${story.rawContent}` }],
    });

    const text = msg.content.map(b => b.text || '').join('').trim();
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    const icon = result.score >= 6 ? '✓' : '✗';
    const emotions = result.emotions?.join(', ') || '-';
    const antidote = result.antidote_for ? ` | Zdravilo za: ${result.antidote_for}` : '';
    const rejected = result.rejected_because ? ` | ZAVRNJENO: ${result.rejected_because}` : '';

    console.log(`  ${icon} [${result.score}/10] [${story.sourceName}] ${story.rawTitle}`);
    console.log(`    Čustva: ${emotions}${antidote}${rejected}`);
    console.log(`    Kategorija: ${result.category}`);
    console.log(`    Naslov: "${result.headline_suggestion}"`);
    console.log(`    Razlog: ${result.reason}`);
    console.log();
  } catch (e) {
    console.log(`  ✗ NAPAKA: ${e.message?.slice(0, 60)}\n`);
  }
}

console.log('═══ KONEC TESTA ═══\n');
