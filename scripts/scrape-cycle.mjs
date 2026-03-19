#!/usr/bin/env node
/**
 * SVETLA STRAN - Scrape Cycle v2
 *
 * Full pipeline: crawl → dedup → title filter → eager content cache → score → save to DB
 *
 * Features:
 *   - Tiered scraping: --tier 1 (15min), --tier 2 (30min), --tier 3 (60min), or all
 *   - Conditional HTTP: ETag/Last-Modified for efficient polling
 *   - Eager content caching: full article text saved immediately for title-filter passes
 *   - Source failure tracking: consecutive failures flagged in DB
 *   - Dual discovery: HTML backups for critical RSS sources (dedup prevents doubles)
 *   - Writes to `headlines` table in Supabase (editorial inbox reads from there)
 *
 * Usage:
 *   node scripts/scrape-cycle.mjs                # all sources
 *   node scripts/scrape-cycle.mjs --tier 1       # only tier 1 (critical, every 15min)
 *   node scripts/scrape-cycle.mjs --tier 2       # only tier 2 (medium, every 30min)
 *   node scripts/scrape-cycle.mjs --tier 3       # only tier 3 (low-volume, every 60min)
 *   node scripts/scrape-cycle.mjs --dry-run      # crawl + dedup only, no AI
 */
// Agent SDK loaded dynamically below (must clear CLAUDECODE before import)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load .env.local for standalone execution
config({ path: '.env.local' });
config({ path: '.env' });

// ── CONFIG ──────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const TIER_ARG = process.argv.find(a => a.startsWith('--tier'));
const TIER_FILTER = TIER_ARG ? parseInt(process.argv[process.argv.indexOf(TIER_ARG) + 1] || process.argv[process.argv.indexOf('--tier') + 1]) : null;
const ARTICLES_DIR = './output/articles';
const STATE_FILE = './output/scrape-state.json';
const AUTO_WRITE_MIN_SCORE = 8;
const CUTOFF_HOURS = 48;
const USER_AGENT = 'SvetlaStran/1.0 (+https://svetlastran.si)';

// ── SUPABASE ────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ── AGENT SDK (dynamic import) ───────────────────────────────────────────────
// Clear CLAUDECODE to allow nested CC subprocess, and ANTHROPIC_API_KEY so
// the subprocess uses CC subscription auth instead of the (placeholder) API key.
delete process.env.CLAUDECODE;
delete process.env.ANTHROPIC_API_KEY;
const { query } = await import('@anthropic-ai/claude-agent-sdk');

// ── SOURCES (loaded from Supabase `sources` table) ──────────────────────────

async function loadSources() {
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) {
    console.error(`[Sources] DB load failed: ${error.message}`);
    return { rss: [], html: [] };
  }

  let sources = data || [];

  // Filter by tier if specified
  if (TIER_FILTER) {
    sources = sources.filter(s => s.scrape_tier === TIER_FILTER);
  }

  return {
    rss: sources.filter(s => s.type === 'rss').map(s => ({
      name: s.name, url: s.url, category: s.category || null,
      _dbId: s.id, _etag: s.last_etag, _lastModified: s.last_modified,
    })),
    html: sources.filter(s => s.type === 'html').map(s => ({
      name: s.name, url: s.url, category: s.category || null,
      linkSelector: s.link_selector || 'a', linkPattern: s.link_pattern || '/.+/',
      _dbId: s.id, _etag: s.last_etag, _lastModified: s.last_modified,
    })),
  };
}

// ── AI PROMPTS ──────────────────────────────────────────────────────────────

const FILOZOFIJA = `SVETLA STRAN je SLOVENSKI portal dobrih novic. Naše poslanstvo:
Za vsak strup, ki ga mediji dajejo, imamo specifično zdravilo.

| Strup medijev              | Naše zdravilo                                               |
|----------------------------|-------------------------------------------------------------|
| Jeza (politika, konflikti) | Odpuščanje, sprava, ljudje ki izberejo prijaznost           |
| Skrb (kriminal, strah)    | Upanje, rešene težave, skupnosti ki delujejo                |
| Cinizem (korupcija)       | Dokaz da so ljudje dobri - brez skritih agend              |
| Osamljenost               | Skupnost, povezanost, tujci ki postanejo sosedje           |
| Obup (podnebje, vojna)    | Odpornost, obnova, narava ki se vrača                      |
| Strah (nevarnost povsod)  | Pogum - običajni ljudje ki naredijo tihe izredne stvari    |

9 KATEGORIJ:
- JUNAKI: Običajni ljudje ki naredijo izjemne stvari. Gasilci, reševalci, prostovoljci, učitelji, zdravniki, sosedje ki pomagajo. Tihi junaki brez slave. TO JE NAŠA NAJPOMEMBNEJŠA KATEGORIJA.
- PODJETNISTVO: Slovenska inovacija, startupii, patenti, nova delovna mesta, izvozni uspehi, mladi podjetniki. Tudi obrtniki in kmetje z inovativnimi pristopi.
- SKUPNOST: Skupnostni projekti, solidarnost, dobrodelnost, soseske ki delujejo skupaj.
- SPORT: IZKLJUČNO slovenski športniki ali slovenske ekipe. Pogačar, Dončić, Kopitar, Prevc, slovenska reprezentanca itd. NIKOLI tuji športniki brez slovenske povezave.
- NARAVA: SLOVENSKI naravni pojavi, obnova okolja, trajnostnost. Velikonočnice pri Ponikvi DA, Dolina smrti v Kaliforniji NE.
- ZIVALI: Vse kar se tiče živali in ogreje srce. Rojstvo mladiča v živalskem vrtu = 8+. Rešena žival = 8+. Vrnitev vrste v naravo = 8+. Posvojitev = 7+. Te zgodbe so "instant smile" za bralca - ne potrebujejo globoke zgodbe, dovolj je da ogrejo srce.
- INFRASTRUKTURA: Gradnja, obnova, novi objekti ki izboljšujejo življenje v Sloveniji.
- SLOVENIJA_V_SVETU: Slovenija prepoznana mednarodno, nagrade, uvrstitve, diplomacija.
- KULTURA: Umetnost, glasba, literatura, film, gledališče, festivali. Iščemo ZGODBE ne napovednike. Koncert prihodnji teden = napovednik (ocena 3). Skupnost ki živi skozi kulturo = zgodba (ocena 7+).`;

const TITLE_FILTER_PROMPT = `Si uredniški asistent za Svetla Stran - SLOVENSKI portal pozitivnih novic.

${FILOZOFIJA}

Dobiš seznam naslovov člankov (ID: naslov). Za vsakega odloči:
- "DA" - naslov nakazuje potencialno pozitivno SLOVENSKO zgodbo
- "NE" - naslov je očitno negativen, političen, kriminalen, vojni konflikt, nesreča ali nerelevanten

ŠPORT: DA samo za SLOVENSKE športnike/ekipe. Tuji športniki (NBA, Premier League, La Liga) brez slovenske povezave = NE.
PODJETNISTVO/JUNAKI: Bodi posebej pozoren da te ne izpustiš - inovacije, prostovoljstvo, reševanje.

Bodi LIBERALEN z DA pri vseh kategorijah RAZEN pri tujem športu.

Vrni SAMO JSON brez markdown:
{"rezultati": [{"id": "string", "odlocitev": "DA" | "NE"}]}`;

const SCORING_PROMPT = `Si uredniški agent za Svetla Stran - SLOVENSKI portal dobrih novic.

${FILOZOFIJA}

KRITIČNA PRAVILA ZA OCENJEVANJE:

1. SLOVENSKA POVEZAVA JE OBVEZNA za visoko oceno.
   - Šport BREZ slovenskega športnika/ekipe = ocena 0, rejected_because: "Ni slovenskega športnika"
   - Tuji športniki (NBA, Premier League) nas NE zanimajo razen če je Slovenec protagonist
   - ŠPORT — REZULTAT vs ZGODBA (KRITIČNO, beri pozorno):
     ✗ REZULTAT = kdo je zmagal, koliko točk, kateri krog, kvalifikacije, uvrstitev → max ocena 4
       Primeri: "ACH Volley premagal Fenerbahče 3:1", "Dončić z 38 točkami", "Cedevita v polfinalu",
       "13 atletov na SP", "Fain z dvema normama", "Rakete v kvalifikacije" → VSE max 4
     ✓ ZGODBA = osebna pot, premagana ovira, čustveni trenutek, slovo, rekord kariere, prvak → 7+
       Primeri: "Kopitarjevo slovo: nasprotniki vstali in ploskali", "Kavtičnik pri 41 prvak ZDA",
       "Cene Prevc: Moja največja zmaga je žena", "Eksplodirala mu je bomba, postal športnik"
     Vprašaj se: Ali bi to bralca GANILO ali samo INFORMIRALO? Če samo informira → max 4.
   - "Blizu rekorda", "napoveduje boj", "bo nastopil" = NAPOVED, nič se ni zgodilo → max 3

2. JUNAKI - NAJPOMEMBNEJŠA KATEGORIJA, iščemo AKTIVNO:
   - Gasilci, reševalci, prostovoljci, učitelji, zdravniki, trenerji = ocena 7+ če je človeška zgodba
   - Sosedje ki pomagajo, ljudje ki rešijo življenje, tihi dobrotniki = ocena 8+
   - Paraolimpijci in športniki ki premagajo ovire (invalidnost, bolezen, revščino) = JUNAKI, ne SPORT
   - Trener ki 20 let dela z mladimi brez slave = JUNAKI, ne SPORT
   - Prostovoljci ki pomagajo živalim/naravi = JUNAKI, ne ZIVALI/NARAVA
   - Študentje ki darujejo kri, občani ki pomagajo = JUNAKI, ne SKUPNOST
   - Reševanje otrok iz poplav, reševanje življenj = JUNAKI, ne SKUPNOST
   - PRAVILO: Če je v zgodbi OSEBA ki je naredila nekaj izjemnega → VEDNO kategorija JUNAKI
     JUNAKI pregazi vse druge kategorije. Najprej preveri ali gre za junaka, šele potem za drugo.

3. PODJETNISTVO - iščemo AKTIVNO:
   - Inovacija, patent, nov produkt, izvozni uspeh = ocena 7+
   - Startup, mladi podjetniki, obrtniki z zgodbo = ocena 7+
   - Sij razvil jeklo za vesolje, nova tovarna, širitev podjetja = PODJETNISTVO (ne INFRASTRUKTURA)
   - Robotizirana lekarna, AI ekosistem, nova tehnologija = PODJETNISTVO (ne INFRASTRUKTURA)
   - GENERIC "startup zbral X milijonov" brez konkretne zgodbe/inovacije = max ocena 5

4. INFRASTRUKTURA - strogo ločuj:
   - ČLOVEŠKA ZGODBA za projektom (vrtec po poplavah, skupnost ki je zgradila) = ocena 7+
   - Vladni PR, tiskovne konference, minister prerezal trak, slavnostna otvoritev = max ocena 4
   - Odprtje ceste/predora/proge brez človeške zgodbe = max ocena 4 (to so politične slovesnosti, ne zgodbe)
   - Korporativni PR (podjetje X gradi Y) brez človeške zgodbe = max ocena 4
   - Rutinska lokalna infrastruktura (parkirišča, asfalt) = max ocena 3
   - Mednarodna tehnologija brez slovenske povezave = ocena 0

5. KULTURA - ločuj zgodbe od napovednikov:
   - Napovedniki dogodkov (koncert bo, razstava se odpira, knjiga izide) = max ocena 3
   - Zgodba O kulturnem dosežku, osebi, skupnosti = ocena 7+
   - Ključno vprašanje: ali se je že ZGODILO nekaj posebnega, ali samo NAPOVEDUJEM dogodek?

6. NARAVA - SLOVENSKA narava:
   - Slovenski naravni pojavi (cvetenje, vrnitev vrst, obnova habitatov) = ocena 7+
   - Tuje naravne zgodbe (Dolina smrti, Amazonka) brez slovenske povezave = ocena 0
   - Suhoparni birokratski projekti (X milijonov za Y) = max ocena 5
   - ZNANSTVENE ODKRITJA in raziskave o naravi ki bralca NAUČIJO nekaj novega = ocena 7+
     Primeri: analiza morske vode razkrije plenilce, nova metoda štetja ptic, odkritje nove vrste,
     kako se obnavljajo mokrišča. Če bi bralec rekel "o, tega pa nisem vedel!" → 7+

7. ZIVALI - ocenjuj ČUSTVENO, ne novinarsko:
   - Rojstvo mladiča (v živalskem vrtu ali naravi) = ocena 8+, to je "instant smile" za bralca
   - Rešena/posvojena žival = ocena 8+
   - Vrnitev vrste v naravo, flamingoji na bajerju = ocena 8+
   - NE potrebuje globoke zgodbe ali podrobnosti — že sam dogodek je pozitiven
   - Fascinantna dejstva o živalih ki bralca NAUČIJO = ocena 7+
     Primer: kako delfini komunicirajo, zakaj čebele plešejo, kako bobri spreminjajo krajino
   - Suhoparen opozorilni/izobraževalni tekst BREZ wow faktorja = ocena 2-3

8. Čustva: PONOS, TOPLINA, OLAJSANJE, CUDESENJE, UPANJE
   Ocena 0 če primarno zbudi: krivdo, jezo, žalost, tesnobo, zahteva denar, politiko, senzacionalizem.

9. NAPOVEDI vs ZGODBE — velja za VSE kategorije:
   - Če se nekaj ŠE NI ZGODILO (bo nastopil, bo tekmoval, se pripravlja, je blizu) → max ocena 3
   - Samo DOKONČANI dosežki dobijo visoko oceno
   - "X bo odprl" ≠ "X je odprl". Prvo je napoved, drugo je zgodba.

10. KLJUČNI TEST za oceno 6+:
   Ali bi ta zgodba bralca GANILA, NAVDUŠILA ali PRESENETILA?
   Ali je v njej nekaj kar bi povedal prijatelju?
   Če samo INFORMIRA (rezultat, statistika, napoved, PR) → max 5.

11. FAKTOR ČUDENJA — velja za VSE kategorije:
   Zgodba ki bralca NAUČI nekaj presenetljivega ali fascinantnega dobi +2 na oceno.
   "O, tega pa nisem vedel!" = znak dobre zgodbe za Svetla Stran.
   Primeri: nova raziskava razkrije presenetljivo dejstvo, nenavaden pristop k problemu,
   skrita zgodba za nečim vsakdanjim. To velja za naravo, živali, znanost, skupnost, vse.

Vrni SAMO JSON brez markdown:
{
  "score": number,
  "emotions": ["PONOS"|"TOPLINA"|"OLAJSANJE"|"CUDESENJE"|"UPANJE"],
  "rejected_because": null | string,
  "reason": "max 2 stavka",
  "category": "ZIVALI|SKUPNOST|SPORT|NARAVA|INFRASTRUKTURA|PODJETNISTVO|SLOVENIJA_V_SVETU|JUNAKI|KULTURA",
  "headline_suggestion": "max 10 besed",
  "antidote_for": null | "jeza"|"skrb"|"cinizem"|"osamljenost"|"obup"|"strah"
}`;

const WRITING_PROMPT = `Si novinar za Svetla Stran - slovensko spletno stran pozitivnih novic.

${FILOZOFIJA}

ABSOLUTNA PRAVILA - BREZ IZJEM:
1. Piši SAMO na podlagi priloženega vira. Nič drugega.
2. NIKOLI ne dodajaj dejstev, imen, datumov ali podrobnosti ki niso v viru.
3. Če informacija ni v viru - je NE VKLJUČI.
4. NIKOLI ne piši: pozivov k donacijam, statistik nesreč, primerjav s slabimi stvarmi, političnih komentarjev.
5. NIKOLI ne moraliziraj. Pusti da zgodba govori sama.

TON: Topel, human, brez patetike. Piši kot bi pripovedoval prijatelju ob kavi.

STRUKTURA:
- Naslov: max 10 besed, konkreten
- Podnaslov: 1 stavek
- Telo: 200-350 besed, 3-4 odstavki
- Slug: naslov v URL obliki brez šumnikov

Vrni SAMO JSON brez markdown:
{"title": "", "subtitle": "", "body": "", "slug": ""}`;

// ── STATE MANAGEMENT ────────────────────────────────────────────────────────

function loadState() {
  if (!existsSync(STATE_FILE)) return { seenUrls: [], seenHashes: [], lastRun: null };
  return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
}

function saveState(state) {
  // Keep last 5000 URLs/hashes to prevent unbounded growth
  state.seenUrls = state.seenUrls.slice(-5000);
  state.seenHashes = state.seenHashes.slice(-5000);
  state.lastRun = new Date().toISOString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function contentHash(title, content) {
  const normalized = (title + (content || '').slice(0, 100)).toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized).digest('hex');
}

// ── SOURCE FAILURE TRACKING ──────────────────────────────────────────────────

async function recordSuccess(source) {
  if (!source._dbId) return;
  await supabase.from('sources').update({
    consecutive_failures: 0,
    last_success_at: new Date().toISOString(),
    last_scraped_at: new Date().toISOString(),
  }).eq('id', source._dbId).then(() => {});
}

async function recordFailure(source, errorMsg) {
  if (!source._dbId) return;
  await supabase.from('sources').update({
    consecutive_failures: supabase.rpc ? undefined : 1, // incremented below
    last_failure_at: new Date().toISOString(),
    last_scraped_at: new Date().toISOString(),
  }).eq('id', source._dbId).then(() => {});
  // Increment consecutive_failures
  await supabase.rpc('increment_source_failures', { source_id: source._dbId }).catch(() => {
    // Fallback: just set to 1 if RPC doesn't exist yet
    supabase.from('sources').update({ consecutive_failures: 1 }).eq('id', source._dbId);
  });
}

async function saveEtag(source, etag, lastModified) {
  if (!source._dbId) return;
  const updates = {};
  if (etag) updates.last_etag = etag;
  if (lastModified) updates.last_modified = lastModified;
  if (Object.keys(updates).length > 0) {
    await supabase.from('sources').update(updates).eq('id', source._dbId).then(() => {});
  }
}

// ── CRAWLERS ────────────────────────────────────────────────────────────────

const rssParser = new Parser({ timeout: 15000, headers: { 'User-Agent': USER_AGENT } });

async function crawlRSS(source) {
  const cutoff = new Date(Date.now() - CUTOFF_HOURS * 60 * 60 * 1000);
  try {
    // Conditional HTTP: check ETag/Last-Modified before full download
    const headers = { 'User-Agent': USER_AGENT };
    if (source._etag) headers['If-None-Match'] = source._etag;
    if (source._lastModified) headers['If-Modified-Since'] = source._lastModified;

    const res = await fetch(source.url, {
      headers,
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });

    // 304 Not Modified — nothing new
    if (res.status === 304) {
      console.log(`  ↺ ${source.name}: not modified`);
      await recordSuccess(source);
      return [];
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Save new ETag/Last-Modified for next time
    const newEtag = res.headers.get('etag');
    const newLastMod = res.headers.get('last-modified');
    await saveEtag(source, newEtag, newLastMod);

    // Parse RSS from response body (not URL, since we already fetched)
    const body = await res.text();
    const feed = await rssParser.parseString(body);

    await recordSuccess(source);

    return feed.items
      .filter(item => {
        const pub = item.pubDate ? new Date(item.pubDate) : null;
        return !pub || pub >= cutoff;
      })
      .filter(item => item.title?.trim() && item.link?.trim())
      .map(item => ({
        rawTitle: item.title.trim(),
        rawContent: item.contentSnippet?.trim() || item.content?.trim() || '',
        sourceUrl: item.link.trim(),
        sourceName: source.name,
        category: source.category || null,
      }));
  } catch (e) {
    console.error(`  ✗ RSS fail [${source.name}]: ${e.message}`);
    await recordFailure(source, e.message);
    return [];
  }
}

async function crawlHTML(source) {
  const pattern = new RegExp(source.linkPattern);
  try {
    const headers = { 'User-Agent': USER_AGENT };
    if (source._etag) headers['If-None-Match'] = source._etag;
    if (source._lastModified) headers['If-Modified-Since'] = source._lastModified;

    const res = await fetch(source.url, {
      headers,
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });

    if (res.status === 304) {
      console.log(`  ↺ ${source.name}: not modified`);
      await recordSuccess(source);
      return [];
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const newEtag = res.headers.get('etag');
    const newLastMod = res.headers.get('last-modified');
    await saveEtag(source, newEtag, newLastMod);

    const html = await res.text();
    const $ = cheerio.load(html);
    const origin = new URL(source.url).origin;
    const seen = new Set();
    const results = [];

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

    await recordSuccess(source);
    return results;
  } catch (e) {
    console.error(`  ✗ HTML fail [${source.name}]: ${e.message}`);
    await recordFailure(source, e.message);
    return [];
  }
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
    return body.trim().slice(0, 5000);
  } catch {
    return '';
  }
}

// ── AI HELPERS (Claude Agent SDK — uses CC subscription auth) ────────────────

async function askClaude(systemPrompt, userMessage) {
  let result = '';
  for await (const msg of query({
    prompt: userMessage,
    options: { systemPrompt, maxTurns: 1, allowedTools: [] },
  })) {
    if ('result' in msg) result = msg.result;
  }
  return result;
}

function extractJSON(text) {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const start = cleaned.search(/[{[]/);
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (start === -1 || end === -1) throw new Error('No JSON in response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ── SAVE HEADLINE TO DB ──────────────────────────────────────────────────────

async function saveHeadlineToDB(story) {
  const hash = contentHash(story.rawTitle, story.rawContent);
  const row = {
    raw_title: story.rawTitle,
    raw_content: story.rawContent || null,
    full_content: story.fullContent || null,
    source_url: story.sourceUrl,
    source_name: story.sourceName,
    content_hash: hash,
    ai_score: story.ai?.score ?? null,
    ai_emotions: story.ai?.emotions || null,
    ai_reason: story.ai?.reason || null,
    ai_category: story.ai?.category || null,
    ai_headline: story.ai?.headline_suggestion || null,
    ai_antidote: story.ai?.antidote_for || null,
    ai_rejected_because: story.ai?.rejected_because || null,
    status: story.ai?.score >= 6 && !story.ai?.rejected_because ? 'new' : 'dismissed',
    scraped_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('headlines').upsert(row, {
    onConflict: 'source_url',
    ignoreDuplicates: true,
  });

  if (error && error.code !== '23505') {
    console.error(`  DB save fail [${story.rawTitle.slice(0, 40)}]: ${error.message}`);
  }
}

// ── MAIN PIPELINE ───────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  const state = loadState();
  const urlSet = new Set(state.seenUrls);
  const hashSet = new Set(state.seenHashes);

  // Load sources from DB
  const { rss: RSS_SOURCES, html: HTML_SOURCES } = await loadSources();

  const tierLabel = TIER_FILTER ? `tier ${TIER_FILTER}` : 'all tiers';

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  SVETLA STRAN - Scrape Cycle v2`);
  console.log(`  ${new Date().toLocaleString('sl-SI')} | ${tierLabel}`);
  console.log(`  Sources: ${RSS_SOURCES.length} RSS + ${HTML_SOURCES.length} HTML`);
  console.log(`  Last run: ${state.lastRun || 'never'}`);
  if (DRY_RUN) console.log(`  ** DRY RUN - no AI calls **`);
  console.log(`${'═'.repeat(60)}`);

  // ── 1. CRAWL ──────────────────────────────────────────────────────────────
  console.log(`\n[1/6] Crawling...`);

  const allStories = [];

  const rssResults = await Promise.allSettled(RSS_SOURCES.map(s => crawlRSS(s)));
  const htmlResults = await Promise.allSettled(HTML_SOURCES.map(s => crawlHTML(s)));

  for (const r of [...rssResults, ...htmlResults]) {
    if (r.status === 'fulfilled') allStories.push(...r.value);
  }
  console.log(`  Found ${allStories.length} total items`);

  // ── 2. DEDUP (local state + DB check) ──────────────────────────────────────
  console.log(`\n[2/6] Deduplicating...`);

  // Also check DB for existing URLs
  const { data: existingHeadlines } = await supabase
    .from('headlines')
    .select('source_url, content_hash')
    .then(({ data }) => ({ data: data || [] }));

  const dbUrlSet = new Set(existingHeadlines.map(h => h.source_url));
  const dbHashSet = new Set(existingHeadlines.map(h => h.content_hash).filter(Boolean));

  const newStories = allStories.filter(s => {
    if (urlSet.has(s.sourceUrl) || dbUrlSet.has(s.sourceUrl)) return false;
    const hash = contentHash(s.rawTitle, s.rawContent);
    if (hashSet.has(hash) || dbHashSet.has(hash)) return false;
    urlSet.add(s.sourceUrl);
    hashSet.add(hash);
    state.seenUrls.push(s.sourceUrl);
    state.seenHashes.push(hash);
    return true;
  });

  console.log(`  ${newStories.length} new stories (${allStories.length - newStories.length} dupes)`);

  if (newStories.length === 0 || DRY_RUN) {
    saveState(state);
    console.log(DRY_RUN ? `\n  Dry run complete.` : `\n  Nothing new.`);
    return;
  }

  // ── 3. TITLE FILTER ───────────────────────────────────────────────────────
  console.log(`\n[3/6] Title filter (${newStories.length} stories)...`);

  const withIds = newStories.map((s, i) => ({ ...s, _id: `s${i}` }));
  const BATCH = 50;
  const passedStories = [];
  const failedStories = [];

  for (let i = 0; i < withIds.length; i += BATCH) {
    const batch = withIds.slice(i, i + BATCH);
    const seznam = batch.map(s => `${s._id}: ${s.rawTitle}`).join('\n');
    try {
      const text = await askClaude(TITLE_FILTER_PROMPT, seznam);
      const result = extractJSON(text);
      const daIds = new Set(result.rezultati.filter(r => r.odlocitev === 'DA').map(r => r.id));
      passedStories.push(...batch.filter(s => daIds.has(s._id)));
      failedStories.push(...batch.filter(s => !daIds.has(s._id)));
    } catch (e) {
      console.error(`  Title filter batch error: ${e.message}`);
      passedStories.push(...batch);
    }
  }

  console.log(`  ${passedStories.length} passed, ${failedStories.length} rejected`);

  // ── 4. EAGER CONTENT CACHING ──────────────────────────────────────────────
  // Fetch full article text NOW for all stories that passed title filter
  // This is the key reliability feature — cache content before it disappears
  console.log(`\n[4/6] Eager content caching for ${passedStories.length} stories...`);

  const CONTENT_BATCH = 5;
  for (let i = 0; i < passedStories.length; i += CONTENT_BATCH) {
    const batch = passedStories.slice(i, i + CONTENT_BATCH);
    await Promise.allSettled(batch.map(async (story) => {
      const full = await fetchFullContent(story.sourceUrl);
      if (full && full.length > 50) {
        story.fullContent = full;
        // Use full content for scoring if rawContent is short
        if (!story.rawContent || story.rawContent.length < 100) {
          story.rawContent = full;
        }
      }
    }));
  }

  const cached = passedStories.filter(s => s.fullContent).length;
  console.log(`  Cached ${cached}/${passedStories.length} full articles`);

  if (passedStories.length === 0) {
    saveState(state);
    console.log(`\n  No stories passed filter.`);
    return;
  }

  // ── 5. SCORING ────────────────────────────────────────────────────────────
  console.log(`\n[5/6] Scoring...`);

  const PARALLEL = 4;
  const scored = [];
  for (let i = 0; i < passedStories.length; i += PARALLEL) {
    const chunk = passedStories.slice(i, i + PARALLEL);
    const results = await Promise.all(chunk.map(async (story) => {
      try {
        const contentForScoring = story.fullContent || story.rawContent;
        const userMsg = `Naslov: ${story.rawTitle}\n\nVsebina:\n${contentForScoring}`;
        const text = await askClaude(SCORING_PROMPT, userMsg);
        const result = extractJSON(text);
        const icon = result.score >= AUTO_WRITE_MIN_SCORE ? '★' : result.score >= 6 ? '●' : '○';
        console.log(`  ${icon} [${result.score}] ${story.rawTitle.slice(0, 60)}`);
        return { ...story, ai: result };
      } catch (e) {
        console.error(`  Score fail: ${story.rawTitle.slice(0, 40)} - ${e.message}`);
        return null;
      }
    }));
    scored.push(...results.filter(Boolean));
  }

  // ── 6. SAVE TO DATABASE ───────────────────────────────────────────────────
  console.log(`\n[6/6] Saving to database...`);

  // Save scored stories (score 6+ go to inbox as 'new', rest as 'dismissed')
  let dbSaved = 0;
  for (const story of scored) {
    await saveHeadlineToDB(story);
    dbSaved++;
  }

  // Also save rejected stories (title filter NE) as dismissed for tracking
  for (const story of failedStories) {
    story.ai = { rejected_because: 'Naslov ne ustreza' };
    await saveHeadlineToDB(story);
  }

  const inInbox = scored.filter(s => s.ai.score >= 6 && !s.ai.rejected_because).length;
  console.log(`  Saved ${dbSaved} scored + ${failedStories.length} rejected to DB`);
  console.log(`  ${inInbox} stories in editor inbox (score >= 6)`);

  // ── OPTIONAL: File backup (legacy compatibility) ──────────────────────────
  if (!existsSync(ARTICLES_DIR)) mkdirSync(ARTICLES_DIR, { recursive: true });

  const INBOX_FILE = './output/inbox.json';
  const forInbox = scored.filter(s => s.ai.score >= 6);
  if (forInbox.length > 0) {
    let inbox = [];
    if (existsSync(INBOX_FILE)) {
      try { inbox = JSON.parse(readFileSync(INBOX_FILE, 'utf-8')); } catch {}
    }
    const inboxUrls = new Set(inbox.map(s => s.sourceUrl));
    let added = 0;
    for (const s of forInbox) {
      if (inboxUrls.has(s.sourceUrl)) continue;
      inbox.push({
        rawTitle: s.rawTitle,
        rawContent: s.rawContent,
        fullContent: s.fullContent || null,
        sourceUrl: s.sourceUrl,
        sourceName: s.sourceName,
        category: s.category,
        scrapedAt: new Date().toISOString(),
        ai: s.ai,
      });
      added++;
    }
    if (added > 0) {
      writeFileSync(INBOX_FILE, JSON.stringify(inbox, null, 2));
    }
  }

  // ── SAVE STATE & SUMMARY ──────────────────────────────────────────────────
  saveState(state);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  DONE in ${elapsed}s | ${tierLabel}`);
  console.log(`  Crawled: ${allStories.length} | New: ${newStories.length} | Passed: ${passedStories.length}`);
  console.log(`  Scored: ${scored.length} | In inbox: ${inInbox} | Cached content: ${cached}`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
