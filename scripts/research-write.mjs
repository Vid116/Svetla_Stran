#!/usr/bin/env node
/**
 * SVETLA STRAN - Research & Write
 *
 * Deep research pipeline using Agent SDK (subscription, not API credits).
 * Triggered by the UI via /api/research-write, which spawns this as a child process.
 *
 * Usage:
 *   node scripts/research-write.mjs < story.json > result.json
 */
delete process.env.CLAUDECODE;

import { query } from '@anthropic-ai/claude-agent-sdk';
import * as cheerio from 'cheerio';

const USER_AGENT = 'SvetlaStran/1.0 (+https://svetlastran.si)';

// ── AI HELPER ───────────────────────────────────────────────────────────────

async function askClaude(systemPrompt, userMessage) {
  let result = '';
  for await (const msg of query({
    prompt: userMessage,
    options: { systemPrompt, maxTurns: 1, allowedTools: [] },
  })) {
    // Capture result from any message type
    if ('result' in msg) result = msg.result;
    else if ('content' in msg && typeof msg.content === 'string') result = msg.content;
  }
  if (!result) {
    process.stderr.write(`[askClaude] WARNING: empty response\n`);
  }
  return result;
}

function extractJSON(text) {
  if (!text) throw new Error('Empty response from AI');
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  // Try direct parse first
  try { return JSON.parse(cleaned); } catch {}
  // Find JSON object or array
  const start = cleaned.search(/[{[]/);
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (start === -1 || end === -1) {
    process.stderr.write(`[extractJSON] Failed to find JSON in: ${cleaned.slice(0, 200)}\n`);
    throw new Error('No JSON in response');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ── STEP 1: Generate search queries ─────────────────────────────────────────

async function generateSearchQueries(story) {
  const text = await askClaude(
    '',
    `Generiraj 3-5 iskalnih poizvedb (v slovenscini IN anglescini) za globlje raziskovanje te zgodbe. Isci dejstva ki jih lahko preverimo: imena, datume, stevilke, kontekst.

Naslov: ${story.rawTitle}
Vir: ${story.sourceName}
Vsebina: ${story.rawContent.slice(0, 1000)}

Vrni SAMO JSON array stringov, brez markdown:
["iskalna poizvedba 1", "iskalna poizvedba 2", ...]`
  );
  return extractJSON(text);
}

// ── STEP 2: Web search via DuckDuckGo ───────────────────────────────────────

async function searchWeb(q) {
  const results = [];
  try {
    const encoded = encodeURIComponent(q);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return results;
    const html = await res.text();
    const $ = cheerio.load(html);

    $('.result').each((i, el) => {
      if (i >= 5) return false;
      const title = $(el).find('.result__title a').text().trim();
      const url = $(el).find('.result__url').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const href = $(el).find('.result__title a').attr('href') || '';

      let actualUrl = '';
      if (href.includes('uddg=')) {
        try {
          actualUrl = decodeURIComponent(href.split('uddg=')[1]?.split('&')[0] || '');
        } catch { actualUrl = url.startsWith('http') ? url : `https://${url}`; }
      } else {
        actualUrl = url.startsWith('http') ? url : `https://${url}`;
      }
      if (title && actualUrl) results.push({ title, url: actualUrl, snippet });
    });
  } catch (e) {
    process.stderr.write(`Search fail [${q}]: ${e.message}\n`);
  }
  return results;
}

// ── STEP 3: Fetch article content ───────────────────────────────────────────

async function fetchArticleContent(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!res.ok) return '';
    const html = await res.text();
    const $ = cheerio.load(html);
    $('nav, footer, script, style, iframe, [class*="ad-"], [class*="banner"]').remove();
    const body =
      $('article').text() ||
      $('[class*="article-body"]').text() ||
      $('[class*="story-body"]').text() ||
      $('[class*="content"]').first().text() ||
      $('main p').map((_, el) => $(el).text()).get().join('\n');
    return body.replace(/\s+/g, ' ').trim().slice(0, 3000);
  } catch { return ''; }
}

// ── STEP 4: Compile verified facts ──────────────────────────────────────────

async function compileResearch(story, sources) {
  const usable = sources.filter(s => s.content.length > 100).slice(0, 8);
  if (usable.length === 0) return { verifiedFacts: '', usedSources: [] };

  const sourceSummaries = usable
    .map((s, i) => `[Vir ${i + 1}: ${s.title}]\nURL: ${s.url}\n${s.content.slice(0, 1500)}`)
    .join('\n\n---\n\n');

  const factsText = await askClaude(
    '',
    `Si raziskovalec za slovensko novico. Tvoja naloga je SAMO zbrati preverjeno DEJSTVA — nic mnenj, nic interpretacij.

IZVIRNA ZGODBA:
Naslov: ${story.rawTitle}
Vsebina: ${story.rawContent.slice(0, 1500)}

DODATNI VIRI:
${sourceSummaries}

NALOGA:
1. Najdi dejstva ki DOPOLNJUJEJO izvorno zgodbo (imena, stevilke, datumi, kontekst, ozadje)
2. Vkljuci SAMO dejstva ki jih potrjuje vsaj en zanesljiv vir
3. NE vkljucuj mnenj, spekulacij ali informacij ki si jih ne mores preveriti
4. NE ponavljaj informacij ki ze so v izvirni zgodbi
5. Za vsako dejstvo v oklepaju navedi stevilko vira iz katerega izvira, npr. (Vir 2)

Vrni seznam preverjenih dodatnih dejstev, vsako v svoji vrstici:`
  );

  // Find which sources were referenced
  const usedSources = [];
  const usedIndices = new Set();
  for (let i = 0; i < usable.length; i++) {
    if (factsText.includes(`Vir ${i + 1}`) || factsText.includes(`vir ${i + 1}`)) {
      usedIndices.add(i);
    }
  }
  if (usedIndices.size === 0) {
    for (let i = 0; i < usable.length; i++) usedIndices.add(i);
  }
  for (const i of usedIndices) {
    usedSources.push({ url: usable[i].url, title: usable[i].title });
  }

  return { verifiedFacts: factsText, usedSources };
}

// ── STEP 5: Write enriched article ──────────────────────────────────────────

const ENRICHED_WRITING_PROMPT = `Si novinar za Svetla Stran - slovensko spletno stran pozitivnih novic.

ABSOLUTNA PRAVILA - BREZ IZJEM:
1. Pisi na podlagi IZVIRNEGA VIRA + PREVERJENIH DODATNIH DEJSTEV.
2. Dodatna dejstva so ze preverjena — jih lahko uporabis za obogatitev clanka.
3. NE dodajaj NICESAR kar ni v izvirnem viru ALI v preverjenih dejstvih.
4. NIKOLI ne moraliziraj. Pusti da zgodba govori sama.
5. NIKOLI ne pisi: pozivov k donacijam, statistik nesrec, politicnih komentarjev.

TON:
- Topel, human, brez patetike in senzacionalizma
- Pisi kot bi pripovedoval prijatelju ob kavi
- Brez klicajev (!), brez clickbait naslovov

STRUKTURA:
- Naslov: max 10 besed, konkreten, pove kaj se je zgodilo
- Podnaslov: 1 stavek, jedro zgodbe — vkljuci kljucno podrobnost iz raziskave
- Telo: 300-500 besed, 4-6 odstavkov (DALJSE kot obicajno — imas vec gradiva)
  1. Uvod: kdo, kaj, kje - bralec takoj ve za kaj gre
  2. Ozadje: kontekst iz dodatnih dejstev
  3-4. Jedro zgodbe: dejanski dosezek z bogatimi podrobnostmi
  5. Sirsi kontekst: zakaj je to pomembno (dejstva, ne mnenja)
  6. Zakljucek: odprt, topel, NE moralizira
- Slug: naslov v URL obliki brez sumnikov (c->c, s->s, z->z)

Vrni SAMO JSON brez markdown:
{"title": "", "subtitle": "", "body": "", "slug": ""}`;

async function writeEnrichedArticle(story, verifiedFacts) {
  let content = `IZVIRNI VIR:\nNaslov: ${story.rawTitle}\nVsebina:\n${story.rawContent}`;
  if (verifiedFacts) content += `\n\nPREVERJENA DODATNA DEJSTVA (iz vecih virov):\n${verifiedFacts}`;
  if (story.aiHeadline) content += `\n\nPredlagani naslov: ${story.aiHeadline}`;
  if (story.aiCategory) content += `\nKategorija: ${story.aiCategory}`;

  const text = await askClaude(ENRICHED_WRITING_PROMPT, content);
  return extractJSON(text);
}

// ── STEP 6: Verify article ──────────────────────────────────────────────────

async function verifyArticle(articleBody, originalContent, verifiedFacts) {
  const text = await askClaude(
    '',
    `Si dejstveni preverjevalec (fact-checker) za slovensko novico. Tvoja naloga je preveriti VSAKO trditev v napisanem clanku.

NAPISANI CLANEK:
${articleBody}

IZVIRNI VIR:
${originalContent.slice(0, 2000)}

PREVERJENA DODATNA DEJSTVA:
${verifiedFacts || "(brez dodatnih dejstev)"}

NALOGA:
Preglej VSAKO dejstveno trditev v clanku (imena, stevilke, datumi, kraji, rezultati, citati). Za vsako trditev doloci:
- "ok" — trditev je potrjena v izvirnem viru ALI v preverjenih dejstvih
- "nepreverljivo" — trditev ni ne potrjena ne zanikana v virih (morda dodana od AI)
- "napacno" — trditev nasprotuje virom

PRAVILA:
- Stilske izjave in zakljucki niso trditve (jih preskoci)
- Preveri VSAK konkreten podatek: imena, stevilke, datume, rezultate
- Bodi strog — ce podatek ni nikjer v virih, je "nepreverljivo"

Vrni SAMO JSON brez markdown:
{
  "passed": true/false,
  "claims": [
    {"claim": "kratka trditev", "status": "ok"|"nepreverljivo"|"napacno", "note": "kje je potrjena ali zakaj ne"}
  ],
  "summary": "en stavek povzetek preverbe"
}

passed = true ce ni NOBENE "napacno" trditve IN manj kot 3 "nepreverljivo" trditve.`
  );
  return extractJSON(text);
}

// ── STEP 7: OG image ────────────────────────────────────────────────────────

async function findOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    return $('meta[property="og:image"]').attr('content') || null;
  } catch { return null; }
}

// ── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  // Read story from stdin
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const story = JSON.parse(Buffer.concat(chunks).toString());

  const content = story.fullContent || story.rawContent;

  process.stderr.write(`[Research] Generating search queries...\n`);
  const queries = await generateSearchQueries({
    rawTitle: story.rawTitle,
    rawContent: content,
    sourceName: story.sourceName,
  });
  process.stderr.write(`[Research] ${queries.length} queries\n`);

  // Search
  process.stderr.write(`[Research] Searching...\n`);
  const allResults = (await Promise.all(queries.map(q => searchWeb(q)))).flat();

  // Dedupe
  const seen = new Set([story.sourceUrl]);
  const unique = allResults.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  process.stderr.write(`[Research] ${unique.length} unique results\n`);

  // Fetch content
  process.stderr.write(`[Research] Fetching content...\n`);
  const toFetch = unique.slice(0, 10);
  const fetched = await Promise.all(
    toFetch.map(async r => ({
      url: r.url,
      title: r.title,
      content: await fetchArticleContent(r.url),
    }))
  );
  const withContent = fetched.filter(f => f.content.length > 100);
  process.stderr.write(`[Research] ${withContent.length}/${toFetch.length} usable\n`);

  // Compile facts
  process.stderr.write(`[Research] Compiling facts...\n`);
  let verifiedFacts = '';
  let references = [];
  if (withContent.length > 0) {
    const compiled = await compileResearch(
      { rawTitle: story.rawTitle, rawContent: content },
      withContent
    );
    verifiedFacts = compiled.verifiedFacts;
    references = compiled.usedSources;
  }
  references = [
    { url: story.sourceUrl, title: story.sourceName },
    ...references.filter(r => r.url !== story.sourceUrl),
  ];

  // Write article
  process.stderr.write(`[Research] Writing article...\n`);
  const article = await writeEnrichedArticle(
    {
      rawTitle: story.rawTitle,
      rawContent: content,
      aiHeadline: story.ai?.headline_suggestion,
      aiCategory: story.ai?.category,
    },
    verifiedFacts
  );

  // Verify
  process.stderr.write(`[Research] Verifying...\n`);
  const verification = await verifyArticle(article.body, content, verifiedFacts);
  process.stderr.write(
    `[Research] ${verification.passed ? 'PASSED' : 'FAILED'}: ${verification.summary}\n`
  );

  // OG image
  const imageUrl = await findOgImage(story.sourceUrl);

  // Output result as JSON to stdout
  const result = {
    article,
    research: {
      queriesUsed: queries,
      sourcesFound: unique.length,
      sourcesUsed: withContent.length,
      verifiedFacts,
      references,
    },
    verification,
    imageUrl,
  };

  process.stdout.write(JSON.stringify(result));
  process.stderr.write(`[Research] Done: "${article.title}"\n`);
}

main().catch(e => {
  process.stderr.write(`Fatal: ${e.message}\n`);
  process.exit(1);
});
