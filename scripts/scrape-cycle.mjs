#!/usr/bin/env node
/**
 * SVETLA STRAN - Scrape Cycle
 *
 * Full pipeline: crawl → dedup → title filter → content → score → auto-write
 * Designed to run every 2h via Claude Code `/loop 2h` or cron.
 *
 * Usage:
 *   node scripts/scrape-cycle.mjs            # full cycle
 *   node scripts/scrape-cycle.mjs --dry-run  # crawl + dedup only, no AI calls
 */
delete process.env.CLAUDECODE;

import { query } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

// ── CONFIG ──────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const ARTICLES_DIR = './output/articles';
const STATE_FILE = './output/scrape-state.json';
const AUTO_WRITE_MIN_SCORE = 8;
const CUTOFF_HOURS = 48;
const USER_AGENT = 'SvetlaStran/1.0 (+https://svetlastran.si)';

// ── SOURCES (loaded from sources.json — editable via /viri UI) ──────────────
const SOURCES_FILE = './output/sources.json';

function loadSources() {
  try {
    const raw = readFileSync(SOURCES_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      rss: (data.rss || []).filter(s => s.active !== false),
      html: (data.html || []).filter(s => s.active !== false),
    };
  } catch (e) {
    console.error(`[Sources] Failed to load ${SOURCES_FILE}: ${e.message}`);
    console.error('[Sources] Falling back to empty sources');
    return { rss: [], html: [] };
  }
}

const { rss: RSS_SOURCES, html: HTML_SOURCES } = loadSources();

// ── AI PROMPTS ──────────────────────────────────────────────────────────────

const FILOZOFIJA = `SVETLA STRAN je slovenski portal dobrih novic. Naše poslanstvo:
Za vsak strup, ki ga mediji dajejo, imamo specifično zdravilo.

| Strup medijev              | Naše zdravilo                                               |
|----------------------------|-------------------------------------------------------------|
| Jeza (politika, konflikti) | Odpuščanje, sprava, ljudje ki izberejo prijaznost           |
| Skrb (kriminal, strah)    | Upanje, rešene težave, skupnosti ki delujejo                |
| Cinizem (korupcija)       | Dokaz da so ljudje dobri - brez skritih agend              |
| Osamljenost               | Skupnost, povezanost, tujci ki postanejo sosedje           |
| Obup (podnebje, vojna)    | Odpornost, obnova, narava ki se vrača                      |
| Strah (nevarnost povsod)  | Pogum - običajni ljudje ki naredijo tihe izredne stvari    |

9 KATEGORIJ: ZIVALI, SKUPNOST, SPORT, NARAVA, INFRASTRUKTURA, PODJETNISTVO, SLOVENIJA_V_SVETU, JUNAKI, KULTURA`;

const TITLE_FILTER_PROMPT = `Si uredniški asistent za Svetla Stran - portal pozitivnih novic iz Slovenije.

${FILOZOFIJA}

Dobiš seznam naslovov člankov (ID: naslov). Za vsakega odloči:
- "DA" - naslov nakazuje potencialno pozitivno slovensko zgodbo
- "NE" - naslov je očitno negativen, političen, kriminalen, vojni konflikt, nesreča ali nerelevanten

Bodi LIBERALEN z DA - raje preveč kot premalo.

Vrni SAMO JSON brez markdown:
{"rezultati": [{"id": "string", "odlocitev": "DA" | "NE"}]}`;

const SCORING_PROMPT = `Si uredniški agent za Svetla Stran.

${FILOZOFIJA}

Oceni zgodbo od 0 do 10. 5 čustev: PONOS, TOPLINA, OLAJSANJE, CUDESENJE, UPANJE.
Ocena 0 če primarno zbudi: krivdo, jezo, žalost, tesnobo, zahteva denar, politiko, senzacionalizem.

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

// ── CRAWLERS ────────────────────────────────────────────────────────────────

const rssParser = new Parser({ timeout: 15000, headers: { 'User-Agent': USER_AGENT } });

async function crawlRSS(source) {
  const cutoff = new Date(Date.now() - CUTOFF_HOURS * 60 * 60 * 1000);
  try {
    const feed = await rssParser.parseURL(source.url);
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
    console.error(`  RSS fail [${source.name}]: ${e.message}`);
    return [];
  }
}

async function crawlHTML(source) {
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
    return results;
  } catch (e) {
    console.error(`  HTML fail [${source.name}]: ${e.message}`);
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
    return body.trim().slice(0, 3000);
  } catch {
    return '';
  }
}

// ── AI HELPERS (using Claude Agent SDK - subscription, not API credits) ─────

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

// ── MAIN PIPELINE ───────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  const state = loadState();
  const urlSet = new Set(state.seenUrls);
  const hashSet = new Set(state.seenHashes);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  SVETLA STRAN - Scrape Cycle`);
  console.log(`  ${new Date().toLocaleString('sl-SI')}`);
  console.log(`  Last run: ${state.lastRun || 'never'}`);
  if (DRY_RUN) console.log(`  ** DRY RUN - no AI calls **`);
  console.log(`${'═'.repeat(60)}`);

  // ── 1. CRAWL ──────────────────────────────────────────────────────────────
  console.log(`\n[1/6] Crawling ${RSS_SOURCES.length} RSS + ${HTML_SOURCES.length} HTML sources...`);

  const allStories = [];

  const rssResults = await Promise.allSettled(RSS_SOURCES.map(s => crawlRSS(s)));
  const htmlResults = await Promise.allSettled(HTML_SOURCES.map(s => crawlHTML(s)));

  for (const r of [...rssResults, ...htmlResults]) {
    if (r.status === 'fulfilled') allStories.push(...r.value);
  }
  console.log(`  Found ${allStories.length} total items`);

  // ── 2. DEDUP ──────────────────────────────────────────────────────────────
  console.log(`\n[2/6] Deduplicating...`);

  const newStories = allStories.filter(s => {
    if (urlSet.has(s.sourceUrl)) return false;
    const hash = contentHash(s.rawTitle, s.rawContent);
    if (hashSet.has(hash)) return false;
    // Mark as seen
    urlSet.add(s.sourceUrl);
    hashSet.add(hash);
    state.seenUrls.push(s.sourceUrl);
    state.seenHashes.push(hash);
    return true;
  });

  console.log(`  ${newStories.length} new stories (${allStories.length - newStories.length} dupes)`);

  if (newStories.length === 0 || DRY_RUN) {
    saveState(state);
    console.log(DRY_RUN ? `\n  Dry run complete.` : `\n  Nothing new. Sleeping.`);
    return;
  }

  // ── 3. TITLE FILTER ───────────────────────────────────────────────────────
  console.log(`\n[3/6] Title filter (${newStories.length} stories)...`);

  // Give each story a temp ID for the filter
  const withIds = newStories.map((s, i) => ({ ...s, _id: `s${i}` }));
  const BATCH = 50;
  const passedStories = [];

  for (let i = 0; i < withIds.length; i += BATCH) {
    const batch = withIds.slice(i, i + BATCH);
    const seznam = batch.map(s => `${s._id}: ${s.rawTitle}`).join('\n');
    try {
      const text = await askClaude(TITLE_FILTER_PROMPT, seznam);
      const result = extractJSON(text);
      const daIds = new Set(result.rezultati.filter(r => r.odlocitev === 'DA').map(r => r.id));
      passedStories.push(...batch.filter(s => daIds.has(s._id)));
    } catch (e) {
      console.error(`  Title filter batch error: ${e.message}`);
      // On error, let all through rather than lose stories
      passedStories.push(...batch);
    }
  }

  console.log(`  ${passedStories.length} passed title filter`);

  if (passedStories.length === 0) {
    saveState(state);
    console.log(`\n  No stories passed filter.`);
    return;
  }

  // ── 4. FULL CONTENT ───────────────────────────────────────────────────────
  console.log(`\n[4/6] Fetching full content for ${passedStories.length} stories...`);

  for (const story of passedStories) {
    if (!story.rawContent || story.rawContent.length < 100) {
      const full = await fetchFullContent(story.sourceUrl);
      if (full) story.rawContent = full;
    }
  }

  // ── 5. SCORING ────────────────────────────────────────────────────────────
  console.log(`\n[5/6] Scoring...`);

  const scored = [];
  for (const story of passedStories) {
    try {
      const userMsg = `Naslov: ${story.rawTitle}\n\nVsebina:\n${story.rawContent}`;
      const text = await askClaude(SCORING_PROMPT, userMsg);
      const result = extractJSON(text);
      scored.push({ ...story, ai: result });
      const icon = result.score >= AUTO_WRITE_MIN_SCORE ? '★' : result.score >= 6 ? '●' : '○';
      console.log(`  ${icon} [${result.score}] ${story.rawTitle.slice(0, 60)}`);
    } catch (e) {
      console.error(`  Score fail: ${story.rawTitle.slice(0, 40)} - ${e.message}`);
    }
  }

  // ── 6. AUTO-WRITE ─────────────────────────────────────────────────────────
  const toWrite = scored.filter(s => s.ai.score >= AUTO_WRITE_MIN_SCORE);
  console.log(`\n[6/6] Auto-writing ${toWrite.length} articles (score >= ${AUTO_WRITE_MIN_SCORE})...`);

  if (!existsSync(ARTICLES_DIR)) mkdirSync(ARTICLES_DIR, { recursive: true });
  const existingFiles = new Set(readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')));

  let written = 0;
  for (const story of toWrite) {
    try {
      let userMsg = `Naslov vira: ${story.rawTitle}\n\nVsebina vira:\n${story.rawContent}`;
      if (story.ai.headline_suggestion) userMsg += `\n\nPredlagani naslov: ${story.ai.headline_suggestion}`;
      if (story.ai.category) userMsg += `\nKategorija: ${story.ai.category}`;

      const text = await askClaude(WRITING_PROMPT, userMsg);
      const article = extractJSON(text);

      if (existingFiles.has(article.slug)) {
        console.log(`  SKIP (exists) ${article.slug}`);
        continue;
      }

      // Try to get OG image from source
      let imageUrl = null;
      try {
        const res = await fetch(story.sourceUrl, {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        const $ = cheerio.load(html);
        imageUrl = $('meta[property="og:image"]').attr('content') || null;
      } catch {}

      const record = {
        ...article,
        source: {
          rawTitle: story.rawTitle,
          sourceUrl: story.sourceUrl,
          sourceName: story.sourceName,
        },
        ai: {
          score: story.ai.score,
          category: story.ai.category,
          emotions: story.ai.emotions,
          antidote_for: story.ai.antidote_for,
        },
        publishedAt: new Date().toISOString(),
        ...(imageUrl && { imageUrl }),
      };

      writeFileSync(`${ARTICLES_DIR}/${article.slug}.json`, JSON.stringify(record, null, 2));
      existingFiles.add(article.slug);
      written++;
      console.log(`  OK ${article.title}`);
    } catch (e) {
      console.error(`  Write fail: ${e.message.slice(0, 60)}`);
    }
  }

  // ── APPEND TO INBOX (score 6+ stories for editorial review) ────────────
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
      console.log(`  Added ${added} stories to inbox.json`);
    }
  }

  // ── SAVE STATE & SUMMARY ──────────────────────────────────────────────────
  saveState(state);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  const inbox = scored.filter(s => s.ai.score >= 6 && s.ai.score < AUTO_WRITE_MIN_SCORE);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  DONE in ${elapsed}s`);
  console.log(`  Crawled: ${allStories.length} | New: ${newStories.length} | Passed filter: ${passedStories.length}`);
  console.log(`  Scored 8+: ${toWrite.length} | Written: ${written} | Inbox (6-7): ${inbox.length}`);
  console.log(`  Total articles: ${existingFiles.size}`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
