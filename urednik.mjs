#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  SVETLA STRAN - UREDNIŠKI PIPELINE (CLI)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Celoten uredniški tok brez baze ali web aplikacije.
 *  Uporablja Claude Agent SDK (tvoja naročnina, brez API kreditov).
 *
 *  Uporaba:
 *    node urednik.mjs                    # celoten pipeline
 *    node urednik.mjs --scrape-only      # samo scraping + shrani raw
 *    node urednik.mjs --filter           # title filter na shranjenih naslovin
 *    node urednik.mjs --score            # scoring filtriranih zgodb → inbox
 *    node urednik.mjs --inbox            # prikaži shranjen inbox
 *    node urednik.mjs --write <idx>      # napiši članek za zgodbo #idx
 */

// Dovoli zagon znotraj Claude Code seje
delete process.env.CLAUDECODE;

import { query } from '@anthropic-ai/claude-agent-sdk';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createInterface } from 'readline';

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const USER_AGENT = 'SvetlaStran/1.0 (+https://svetlastran.si)';
const DATA_DIR = './output';
const INBOX_FILE = `${DATA_DIR}/inbox.json`;
const ARTICLES_DIR = `${DATA_DIR}/articles`;

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(ARTICLES_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════════════════════
//  VIRI (iz sources.ts, hardcoded za standalone)
// ═══════════════════════════════════════════════════════════════════════════════

const RSS_SOURCES = [
  { name: 'RTV SLO',          url: 'https://www.rtvslo.si/feeds/01.xml' },
  { name: 'STA',              url: 'https://www.sta.si/rss-0' },
  { name: '24ur',             url: 'https://www.24ur.com/rss' },
  { name: 'Delo',             url: 'https://www.delo.si/rss' },
  { name: 'Dnevnik',          url: 'https://www.dnevnik.si/rss.xml' },
  { name: 'Žurnal24',         url: 'https://www.zurnal24.si/feeds/latest' },
  { name: 'Gorenjski Glas',   url: 'https://www.gorenjskiglas.si/rss.xml' },
  { name: 'Primorske Novice', url: 'https://www.primorske.si/rss.xml' },
  { name: 'Gov.si',           url: 'https://www.gov.si/novice/rss',           category: 'INFRASTRUKTURA' },
  { name: 'DOPPS',            url: 'https://ptice.si/feed/',                  category: 'ZIVALI' },
  { name: 'ZRSVN',            url: 'https://zrsvn-varstvonarave.si/feed/',    category: 'NARAVA' },
  { name: 'Smučarska zveza',  url: 'https://www.sloski.si/feed/',             category: 'SPORT' },
  { name: 'Kolesarska zveza', url: 'https://kolesarska-zveza.si/feed/',       category: 'SPORT' },
  { name: 'ŠZIS',             url: 'https://www.zsis.si/feed/',               category: 'SPORT' },
  { name: 'Rdeči križ',       url: 'https://www.rks.si/feed/',               category: 'SKUPNOST' },
  { name: 'Taborniki',        url: 'https://www.taborniki.si/feed/',          category: 'SKUPNOST' },
  { name: 'ZVKDS',            url: 'https://www.zvkds.si/feed/',             category: 'KULTURA' },
  { name: 'SNG Ljubljana',    url: 'https://www.drama.si/feed',              category: 'KULTURA' },
  { name: 'SNG Maribor',      url: 'https://www.sng-mb.si/feed/',            category: 'KULTURA' },
];

const HTML_SOURCES = [
  { name: 'Večer',              url: 'https://vecer.com',                                  linkSelector: 'a', linkPattern: '/(slovenija|maribor|aktualno|sport|kultura)/' },
  { name: 'Sobotainfo',         url: 'https://sobotainfo.com',                             linkSelector: 'a', linkPattern: '/(aktualno|lokalno|novice|sport)/' },
  { name: 'Savinjske Novice',   url: 'https://savinjske.com',                              linkSelector: 'a', linkPattern: '/novica/' },
  { name: 'MOL Ljubljana',      url: 'https://www.ljubljana.si/sl/aktualno/novice',        linkSelector: 'a', linkPattern: '/sl/aktualno/novice/', category: 'INFRASTRUKTURA' },
  { name: 'MOM Maribor',        url: 'https://www.maribor.si/novice',                      linkSelector: 'a', linkPattern: '/maribor_novice/', category: 'INFRASTRUKTURA' },
  { name: 'ZOO Ljubljana',      url: 'https://www.zoo.si',                                 linkSelector: 'a', linkPattern: '/novice/.+/.+', category: 'ZIVALI' },
  { name: 'Zavetišče Ljubljana', url: 'https://www.zavetisce-ljubljana.si',                linkSelector: 'a', linkPattern: '/(blog|novice-in-obvestila)/', category: 'ZIVALI' },
  { name: 'Zavetišče Maribor',  url: 'https://zavetisce-mb.si',                            linkSelector: 'a', linkPattern: '/(najdeni|izgubljeni|novice|posvojitev)', category: 'ZIVALI' },
  { name: 'Olympic.si',         url: 'https://www.olympic.si',                             linkSelector: 'a', linkPattern: '/aktualno/', category: 'SPORT' },
  { name: 'KGZS',               url: 'https://www.kgzs.si',                                linkSelector: 'a', linkPattern: '/novica/', category: 'PODJETNISTVO' },
  { name: 'Zadružna zveza',     url: 'https://zzs.si',                                     linkSelector: 'a', linkPattern: '/aktualno/', category: 'PODJETNISTVO' },
  { name: 'CNVOS',              url: 'https://www.cnvos.si',                                linkSelector: 'a', linkPattern: '/(novice|nvo-sektor)', category: 'SKUPNOST' },
  { name: 'Prostovoljstvo.org', url: 'https://www.prostovoljstvo.org',                     linkSelector: 'a', linkPattern: '/(novice|dogodki)/', category: 'SKUPNOST' },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  FILOZOFIJA & PROMPTS (iz anthropic.ts)
// ═══════════════════════════════════════════════════════════════════════════════

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
- "DA" - naslov nakazuje potencialno pozitivno slovensko zgodbo (vredno branja vsebine)
- "NE" - naslov je očitno negativen, političen, kriminalen, vojni konflikt, nesreča ali povsem nerelevanten

Pravila:
- Bodi LIBERALEN z DA - raje preveč kot premalo. NE samo če je očitno neuporabno.
- Šport (zmage, uspehi) = DA
- Živali (posvojitve, reševanja, rojstva) = DA
- Infrastruktura (odprtje, obnova) = DA
- Politika, kriminal, nesreče, vojne, teroizem = NE
- Prošnje za denar, donacije = NE

Vrni SAMO JSON brez markdown:
{"rezultati": [{"id": "string", "odlocitev": "DA" | "NE"}]}`;

const SCORING_PROMPT = `Si uredniški agent za Svetla Stran.

${FILOZOFIJA}

TVOJA NALOGA: Oceni zgodbo od 0 do 10 po uredniškem filtru.

5 ČUSTEV KI JIH IŠČEMO (zgodba mora zbiditi vsaj eno):
- PONOS: Slovenec, kraj, ekipa ali stvar je prepoznana, zmaga ali slavljena. Vsaka raven šteje.
- TOPLINA: Človek ali žival v težkem položaju in drugi so stopili zraven.
- OLAJSANJE: Nekaj kar je bilo pokvarjeno ali manjkalo je končno popravljeno ali rešeno.
- CUDESENJE: Zgodilo se je nekaj lepega, nepričakovanega ali izrednega.
- UPANJE: Zgodba te prepriča da je prihodnost morda vendarle vredna zaupanja.

UREDNIŠKI PREIZKUS: Katero je PRVO čustvo ki ga ta zgodba zbudi?
- Če je katero od petih dobrih → oceni visoko
- Če je karkoli s seznama zavrnitve → ocena 0, ne glede na to koliko dobrega je zakopano v njej

AVTOMATSKA OCENA 0 - zgodba primarno zbudi:
- Krivdo (tudi če je rešitev podana)
- Jezo (tudi če je pravica zmagala)
- Žalost (tudi s srebrno podlogo - "umrl je ampak pred tem naredil čudovite stvari")
- Tesnobo (tudi s pozitivnim izidom)
- Zahteva denarno pomoč ali donacije
- Politična zmaga ki je zgolj poraz za drugo stran
- Senzacionalizem z zelenim premazom

PRIMERI KAR OBJAVLJAMO:
- Živali rescuirane, posvojene, uzdravne
- Sosedje ki so si pomagali
- Otroci in mladi ki naredijo kaj izrednega
- Starejši prepoznani za tiho delo
- Skupnosti ki so se dvignile po težkih časih
- Narava ki se vrača, reke ki so čistejše, gozd ki raste
- Infrastruktura ki končno dela
- Slovenec v tujini ki zmaga ali zasije
- Podjetje ki naredi resnično dobro stvar
- Kulturna dediščina ki je ohranjena ali obujena

ABSOLUTNO PRAVILO: Ocenjuješ SAMO vsebino ki ti je predana. Nikoli ne izmišljaš.

Vrni SAMO JSON brez markdown:
{
  "score": number,
  "emotions": ["PONOS"|"TOPLINA"|"OLAJSANJE"|"CUDESENJE"|"UPANJE"],
  "rejected_because": null | "krivda"|"jeza"|"zalost"|"tesnoba"|"denar"|"politika"|"senzacionalizem",
  "reason": "max 2 stavka zakaj je ta zgodba dobra ali zakaj ni primerna",
  "category": "ZIVALI|SKUPNOST|SPORT|NARAVA|INFRASTRUKTURA|PODJETNISTVO|SLOVENIJA_V_SVETU|JUNAKI|KULTURA",
  "headline_suggestion": "predlagani naslov v slovenščini, max 10 besed, konkreten, ne clickbait",
  "antidote_for": null | "jeza"|"skrb"|"cinizem"|"osamljenost"|"obup"|"strah"
}`;

const WRITING_PROMPT = `Si novinar za Svetla Stran - slovensko spletno stran pozitivnih novic.

${FILOZOFIJA}

ABSOLUTNA PRAVILA - BREZ IZJEM:
1. Piši SAMO na podlagi priloženega vira. Nič drugega.
2. NIKOLI ne dodajaj dejstev, imen, datumov ali podrobnosti ki niso v viru.
3. Če informacija ni v viru - je NE VKLJUČI. Raje krajši članek kot izmišljena podrobnost.
4. NIKOLI ne piši: pozivov k donacijam, statistik nesreč, primerjav s slabimi stvarmi, političnih komentarjev.
5. NIKOLI ne moraliziraj. Ne reci bralcu kaj naj čuti. Pusti da zgodba govori sama.

TON:
- Topel, human, brez patetike in senzacionalizma
- Bralec mora ob koncu čutiti dobro - ne solzno
- Piši kot bi pripovedoval prijatelju ob kavi, ne kot napovedovalec v dnevniku
- Brez klicajev (!), brez clickbait naslovov, brez dramatičnih besed

STRUKTURA:
- Naslov: max 10 besed, konkreten, pove kaj se je zgodilo
- Podnaslov: 1 stavek, jedro zgodbe
- Telo: 200-350 besed, 3-4 odstavki
  1. Uvod: kdo, kaj, kje - bralec takoj ve za kaj gre
  2. Ozadje: kontekst, pot do tu
  3. Srce zgodbe: dejanski dosežek ali trenutek
  4. Zaključek: odprt, topel, NE moralizira, NE "in to je dokaz da..."
- Slug: naslov v URL obliki brez šumnikov (č→c, š→s, ž→z)

Vrni SAMO JSON brez markdown:
{
  "title": "naslov",
  "subtitle": "podnaslov - en stavek",
  "body": "telo članka, odstavki ločeni z \\n\\n",
  "slug": "naslov-v-url-obliki"
}`;

// ═══════════════════════════════════════════════════════════════════════════════
//  CRAWLING
// ═══════════════════════════════════════════════════════════════════════════════

const rssParser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': USER_AGENT },
});

async function crawlRSS(source) {
  const results = [];
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h

  try {
    const feed = await rssParser.parseURL(source.url);
    for (const item of feed.items) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      if (pubDate && pubDate < cutoff) continue;
      const title = item.title?.trim();
      const link = item.link?.trim();
      if (!title || !link) continue;
      results.push({
        rawTitle: title,
        rawContent: item.contentSnippet?.trim() || item.content?.trim() || '',
        sourceUrl: link,
        sourceName: source.name,
        category: source.category || null,
      });
    }
  } catch (e) {
    console.error(`  ✗ RSS [${source.name}]: ${e.message}`);
  }
  return results;
}

async function crawlHTML(source) {
  const results = [];
  const pattern = new RegExp(source.linkPattern);
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const origin = new URL(source.url).origin;
    const seen = new Set();

    $(source.linkSelector).each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text.length < 15 || !pattern.test(href)) return;
      const fullUrl = href.startsWith('http') ? href : `${origin}${href.split('#')[0]}`;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);
      results.push({
        rawTitle: text.slice(0, 200),
        rawContent: '',
        sourceUrl: fullUrl,
        sourceName: source.name,
        category: source.category || null,
      });
    });
  } catch (e) {
    console.error(`  ✗ HTML [${source.name}]: ${e.message}`);
  }
  return results;
}

async function fetchFullContent(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const body =
      $('article').text() ||
      $('[class*="article-body"]').text() ||
      $('[class*="content"]').first().text() ||
      $('main p').map((_, el) => $(el).text()).get().join('\n');
    return body.trim().slice(0, 3000);
  } catch {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DEDUP
// ═══════════════════════════════════════════════════════════════════════════════

function hash(title, content) {
  const norm = (title + (content || '').slice(0, 100)).toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(norm).digest('hex');
}

function dedup(stories) {
  const seen = new Set();
  return stories.filter(s => {
    const h = hash(s.rawTitle, s.rawContent);
    if (seen.has(h) || seen.has(s.sourceUrl)) return false;
    seen.add(h);
    seen.add(s.sourceUrl);
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AI FUNCTIONS (Agent SDK - tvoja naročnina, brez API kreditov)
// ═══════════════════════════════════════════════════════════════════════════════

/** Pošlje prompt skozi Agent SDK in vrne besedilo odgovora */
async function askClaude(systemPrompt, userMessage) {
  let result = '';
  for await (const msg of query({
    prompt: userMessage,
    options: {
      systemPrompt,
      maxTurns: 1,
      allowedTools: [],
    },
  })) {
    if ('result' in msg) {
      result = msg.result;
    }
  }
  return result;
}

/** Izvleče JSON iz odgovora (očisti markdown code fences) */
function extractJSON(text) {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const start = cleaned.search(/[\[{]/);
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (start === -1 || end === -1) throw new Error('Ni JSON v odgovoru');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function aiTitleFilter(stories) {
  const BATCH = 50;
  const results = [];

  for (let i = 0; i < stories.length; i += BATCH) {
    const batch = stories.slice(i, i + BATCH);
    const seznam = batch.map((s, idx) => `${i + idx}: ${s.rawTitle}`).join('\n');

    console.log(`  Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(stories.length / BATCH)} (${batch.length} naslovov)...`);

    const text = await askClaude(TITLE_FILTER_PROMPT, seznam);
    try {
      const parsed = extractJSON(text);
      const rezultati = parsed.rezultati || parsed;
      results.push(...rezultati);
    } catch (e) {
      console.error(`  ✗ JSON parse napaka v batch ${i}: ${e.message}`);
    }
  }

  return results;
}

async function aiScore(story) {
  const userMsg = `Naslov: ${story.rawTitle}\n\nVsebina:\n${story.fullContent || story.rawContent}`;
  const text = await askClaude(SCORING_PROMPT, userMsg);
  return extractJSON(text);
}

async function aiWrite(story) {
  let content = `Naslov vira: ${story.rawTitle}\n\nVsebina vira:\n${story.fullContent || story.rawContent}`;
  if (story.aiHeadline) content += `\n\nPredlagani naslov: ${story.aiHeadline}`;
  if (story.aiCategory) content += `\nKategorija: ${story.aiCategory}`;

  const text = await askClaude(WRITING_PROMPT, content);
  return extractJSON(text);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bg_green: '\x1b[42m',
  bg_yellow: '\x1b[43m',
  bg_red: '\x1b[41m',
};

function scoreColor(score) {
  if (score >= 8) return COLORS.bg_green + COLORS.bold + ' ' + score + '/10 ' + COLORS.reset;
  if (score >= 6) return COLORS.bg_yellow + COLORS.bold + ' ' + score + '/10 ' + COLORS.reset;
  return COLORS.bg_red + COLORS.bold + ' ' + score + '/10 ' + COLORS.reset;
}

function printInbox(inbox) {
  console.log('\n' + COLORS.bold + '═══════════════════════════════════════════════════════════════' + COLORS.reset);
  console.log(COLORS.bold + COLORS.green + '  SVETLA STRAN - UREDNIŠKI INBOX' + COLORS.reset);
  console.log(COLORS.bold + '═══════════════════════════════════════════════════════════════' + COLORS.reset);
  console.log(COLORS.dim + `  ${inbox.length} zgodb čaka na pregled` + COLORS.reset + '\n');

  inbox.forEach((s, i) => {
    const antidote = s.ai.antidote_for ? COLORS.magenta + ` [zdravilo: ${s.ai.antidote_for}]` + COLORS.reset : '';
    console.log(`${COLORS.bold}  [${i}]${COLORS.reset} ${scoreColor(s.ai.score)} ${COLORS.cyan}${s.ai.category}${COLORS.reset}${antidote}`);
    console.log(`      ${COLORS.bold}${s.ai.headline_suggestion}${COLORS.reset}`);
    console.log(`      ${COLORS.dim}${s.rawTitle}${COLORS.reset}`);
    console.log(`      ${s.ai.emotions.join(', ')}  |  ${COLORS.dim}${s.sourceName}${COLORS.reset}`);
    console.log(`      ${COLORS.dim}${s.ai.reason}${COLORS.reset}`);
    console.log(`      ${COLORS.dim}${s.sourceUrl}${COLORS.reset}`);
    console.log();
  });
}

function printArticle(article) {
  console.log('\n' + COLORS.bold + '───────────────────────────────────────────────────────────────' + COLORS.reset);
  console.log(COLORS.bold + COLORS.green + '  ' + article.title + COLORS.reset);
  console.log(COLORS.cyan + '  ' + article.subtitle + COLORS.reset);
  console.log(COLORS.bold + '───────────────────────────────────────────────────────────────' + COLORS.reset);
  console.log();
  article.body.split('\n\n').forEach(p => {
    console.log('  ' + p);
    console.log();
  });
  console.log(COLORS.dim + '  slug: /' + article.slug + COLORS.reset);
  console.log(COLORS.bold + '───────────────────────────────────────────────────────────────' + COLORS.reset);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  READLINE PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

async function scrape() {
  console.log(COLORS.bold + '\n── 1/5 SCRAPING VIROV ──' + COLORS.reset);
  const allStories = [];

  // RSS
  console.log(`  RSS viri (${RSS_SOURCES.length}):`);
  const rssResults = await Promise.allSettled(
    RSS_SOURCES.map(async s => {
      const items = await crawlRSS(s);
      if (items.length > 0) console.log(`    ${COLORS.green}✓${COLORS.reset} ${s.name}: ${items.length}`);
      return items;
    })
  );

  // HTML
  console.log(`  HTML viri (${HTML_SOURCES.length}):`);
  const htmlResults = await Promise.allSettled(
    HTML_SOURCES.map(async s => {
      const items = await crawlHTML(s);
      if (items.length > 0) console.log(`    ${COLORS.green}✓${COLORS.reset} ${s.name}: ${items.length}`);
      return items;
    })
  );

  for (const r of [...rssResults, ...htmlResults]) {
    if (r.status === 'fulfilled') allStories.push(...r.value);
  }

  // Dedup
  const unique = dedup(allStories);
  console.log(`\n  Skupaj: ${allStories.length} → deduplicirano: ${unique.length}`);
  return unique;
}

async function titleFilter(stories) {
  console.log(COLORS.bold + '\n── 2/5 TITLE FILTER (Haiku) ──' + COLORS.reset);
  const results = await aiTitleFilter(stories);

  const daIds = new Set(results.filter(r => r.odlocitev === 'DA').map(r => parseInt(r.id)));
  const da = stories.filter((_, i) => daIds.has(i));
  const ne = stories.length - da.length;

  console.log(`  ${COLORS.green}DA: ${da.length}${COLORS.reset}  |  ${COLORS.red}NE: ${ne}${COLORS.reset}`);
  return da;
}

async function fetchContent(stories) {
  console.log(COLORS.bold + '\n── 3/5 POLNA VSEBINA ──' + COLORS.reset);
  let fetched = 0;

  const BATCH = 5;
  for (let i = 0; i < stories.length; i += BATCH) {
    const batch = stories.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map(async s => {
        const content = await fetchFullContent(s.sourceUrl);
        if (content.length > 100) {
          s.fullContent = content;
          fetched++;
        }
      })
    );
    process.stdout.write(`  ${COLORS.dim}${Math.min(i + BATCH, stories.length)}/${stories.length}${COLORS.reset}\r`);
  }

  console.log(`  Polna vsebina: ${fetched}/${stories.length}`);
  return stories;
}

async function score(stories) {
  console.log(COLORS.bold + '\n── 4/5 SCORING (Haiku) ──' + COLORS.reset);
  const inbox = [];

  for (let i = 0; i < stories.length; i++) {
    const s = stories[i];
    try {
      const result = await aiScore(s);
      s.ai = result;

      if (result.score >= 6 && !result.rejected_because) {
        inbox.push(s);
        process.stdout.write(`  ${COLORS.green}✓${COLORS.reset} [${result.score}] ${s.rawTitle.slice(0, 50)}...\n`);
      } else {
        const reason = result.rejected_because || `score ${result.score}`;
        process.stdout.write(`  ${COLORS.red}✗${COLORS.reset} [${reason}] ${s.rawTitle.slice(0, 50)}...\n`);
      }
    } catch (e) {
      console.error(`  ✗ Napaka: ${e.message}`);
    }

    // Rate limit courtesy
    if (i > 0 && i % 10 === 0) await new Promise(r => setTimeout(r, 1000));
  }

  // Sort by score desc
  inbox.sort((a, b) => b.ai.score - a.ai.score);
  console.log(`\n  ${COLORS.green}V inbox: ${inbox.length}${COLORS.reset} od ${stories.length}`);
  return inbox;
}

async function interactiveInbox(inbox) {
  printInbox(inbox);

  while (true) {
    const input = await ask(
      COLORS.bold + '  Vnesi # zgodbe za pisanje, "q" za izhod: ' + COLORS.reset
    );

    if (input === 'q' || input === 'quit' || input === 'exit') break;

    const idx = parseInt(input);
    if (isNaN(idx) || idx < 0 || idx >= inbox.length) {
      console.log('  Neveljavna izbira.');
      continue;
    }

    const story = inbox[idx];
    console.log(COLORS.bold + '\n── 5/5 PISANJE ČLANKA (Sonnet) ──' + COLORS.reset);
    console.log(`  Pišem: "${story.ai.headline_suggestion}"...`);

    try {
      const article = await aiWrite({
        rawTitle: story.rawTitle,
        rawContent: story.fullContent || story.rawContent,
        aiHeadline: story.ai.headline_suggestion,
        aiCategory: story.ai.category,
      });

      printArticle(article);

      // Save
      const filename = `${ARTICLES_DIR}/${article.slug}.json`;
      writeFileSync(filename, JSON.stringify({
        ...article,
        source: {
          url: story.sourceUrl,
          name: story.sourceName,
          rawTitle: story.rawTitle,
        },
        ai: story.ai,
        written_at: new Date().toISOString(),
      }, null, 2));
      console.log(`  ${COLORS.green}Shranjeno: ${filename}${COLORS.reset}`);

    } catch (e) {
      console.error(`  ✗ Napaka pri pisanju: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

if (args.includes('--filter')) {
  // Title filter on saved raw.json
  if (!existsSync(`${DATA_DIR}/raw.json`)) {
    console.log('Ni raw.json. Najprej poženi: node urednik.mjs --scrape-only');
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(`${DATA_DIR}/raw.json`, 'utf-8'));
  console.log(`Naloženih ${raw.length} naslovov iz raw.json\n`);

  const da = await titleFilter(raw);

  // Save filtered
  writeFileSync(`${DATA_DIR}/filtered.json`, JSON.stringify(da, null, 2));
  console.log(`\nShranjeno: ${DATA_DIR}/filtered.json`);

  // Print DA headlines grouped by source
  const bySource = {};
  da.forEach(s => {
    if (!bySource[s.sourceName]) bySource[s.sourceName] = [];
    bySource[s.sourceName].push(s.rawTitle);
  });

  console.log('\n' + COLORS.bold + '═══════════════════════════════════════════════════════════════' + COLORS.reset);
  console.log(COLORS.bold + COLORS.green + '  NASLOV PREŽIVEL FILTER - VREDNO BRANJA' + COLORS.reset);
  console.log(COLORS.bold + '═══════════════════════════════════════════════════════════════' + COLORS.reset + '\n');

  for (const [source, titles] of Object.entries(bySource).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${COLORS.cyan}${source}${COLORS.reset} (${titles.length}):`);
    titles.forEach(t => console.log(`    ${COLORS.dim}•${COLORS.reset} ${t}`));
    console.log();
  }

} else if (args.includes('--score')) {
  // Score filtered stories
  if (!existsSync(`${DATA_DIR}/filtered.json`)) {
    console.log('Ni filtered.json. Najprej poženi: node urednik.mjs --filter');
    process.exit(1);
  }
  const filtered = JSON.parse(readFileSync(`${DATA_DIR}/filtered.json`, 'utf-8'));
  console.log(`Naloženih ${filtered.length} filtriranih zgodb\n`);

  // 3. Full content
  const withContent = await fetchContent(filtered);

  // 4. Score
  const inbox = await score(withContent);

  // Save inbox
  writeFileSync(INBOX_FILE, JSON.stringify(inbox, null, 2));
  console.log(`\nInbox shranjen: ${INBOX_FILE}`);

  // Show inbox
  printInbox(inbox);

} else if (args.includes('--inbox')) {
  // Show saved inbox
  if (!existsSync(INBOX_FILE)) {
    console.log('Ni shranjene inbox. Najprej poženi: node urednik.mjs');
    process.exit(1);
  }
  const inbox = JSON.parse(readFileSync(INBOX_FILE, 'utf-8'));
  await interactiveInbox(inbox);

} else if (args.includes('--write')) {
  // Write specific article from inbox
  const idx = parseInt(args[args.indexOf('--write') + 1]);
  if (!existsSync(INBOX_FILE)) {
    console.log('Ni shranjene inbox.');
    process.exit(1);
  }
  const inbox = JSON.parse(readFileSync(INBOX_FILE, 'utf-8'));
  if (isNaN(idx) || idx < 0 || idx >= inbox.length) {
    console.log(`Neveljavna izbira. Inbox ima ${inbox.length} zgodb (0-${inbox.length - 1}).`);
    process.exit(1);
  }
  const story = inbox[idx];
  console.log(`Pišem: "${story.ai.headline_suggestion}"...`);
  const article = await aiWrite({
    rawTitle: story.rawTitle,
    rawContent: story.fullContent || story.rawContent,
    aiHeadline: story.ai.headline_suggestion,
    aiCategory: story.ai.category,
  });
  printArticle(article);
  const filename = `${ARTICLES_DIR}/${article.slug}.json`;
  writeFileSync(filename, JSON.stringify({ ...article, source: { url: story.sourceUrl, name: story.sourceName }, ai: story.ai, written_at: new Date().toISOString() }, null, 2));
  console.log(`${COLORS.green}Shranjeno: ${filename}${COLORS.reset}`);

} else {
  // Full pipeline
  console.log(COLORS.bold + COLORS.green);
  console.log('  ╔═══════════════════════════════════════════════════╗');
  console.log('  ║          SVETLA STRAN - UREDNIK CLI              ║');
  console.log('  ╚═══════════════════════════════════════════════════╝');
  console.log(COLORS.reset);

  const scrapeOnly = args.includes('--scrape-only');

  // 1. Scrape
  const raw = await scrape();

  if (scrapeOnly) {
    writeFileSync(`${DATA_DIR}/raw.json`, JSON.stringify(raw, null, 2));
    console.log(`\nShranjeno v ${DATA_DIR}/raw.json`);
    process.exit(0);
  }

  // 2. Title filter
  const da = await titleFilter(raw);

  // 3. Full content
  const withContent = await fetchContent(da);

  // 4. Score
  const inbox = await score(withContent);

  // Save inbox
  writeFileSync(INBOX_FILE, JSON.stringify(inbox, null, 2));
  console.log(`\n  Inbox shranjen: ${INBOX_FILE}`);

  // 5. Interactive
  await interactiveInbox(inbox);
}
