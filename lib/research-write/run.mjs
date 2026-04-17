#!/usr/bin/env node
/**
 * SVETLA STRAN - Multi-Phase Research & Write Pipeline (v3 - Content → Truth → Beauty → Correctness)
 *
 * Phase 0: DEDUP CHECK          (1 haiku call — skip if story already covered)
 * Phase 1: GENERATE QUERIES     (1 turn, no tools)
 * Phase 2: PARALLEL RESEARCH    (N subagents, each 5 turns max, parallel)
 * Phase 3: COMPILE FACTS        (1 turn, no tools — merge + resolve conflicts)
 * Phase 4: FILL GAPS            (conditional, 1-2 targeted subagents)
 * Phase 5: WRITE ARTICLE        (1 turn, no tools — editorial guidelines, NO K&M)
 * Phase 6: VERIFY               (verify article claims against sources)
 * Phase 6b: REPAIR              (conditional — simple factual fixes, NO K&M)
 * Phase 6c: SPOT-CHECK          (re-fetch actual sources, compare hard facts)
 * Phase 6d: REPAIR              (conditional — fix spot-check discrepancies)
 * Phase 7: K&M POLISH           (1 turn, no tools — literary polish on verified text)
 * Phase 8: GRAMMAR CHECK        (1 turn, no tools — final Slovenian grammar pass)
 * Parallel: SOURCE DISCOVERY    (runs alongside Phase 5)
 *
 * Max context per call: ~30-40K tokens. No single call approaches 200K.
 *
 * Usage: node lib/research-write/run.mjs < story.json > result.json
 */
delete process.env.CLAUDECODE;
delete process.env.ANTHROPIC_API_KEY;

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

import { askClaude, askClaudeWithImage, askClaudeWithFetch, researchWithClaude, extractJSON, tokenTracker } from './ai.mjs';
// findBestImage removed — we generate AI images, not scrape from sources
import { discoverSources } from './discover.mjs';
import { generateArticleImage } from './generate-image.mjs';
import {
  QUERY_GENERATION_PROMPT,
  SUBAGENT_RESEARCH_PROMPT,
  COMPILE_FACTS_PROMPT,
  GAP_FILL_PROMPT,
  VERIFICATION_PROMPT,
  SPOT_CHECK_PROMPT,
  DEPTH_ASSESSMENT_PROMPT,
  createWritingPrompt,
  createPolishPrompt,
  createRepairPrompt,
  createLongFormPrompt,
  createGrammarPrompt,
  CATEGORY_DIRECTIONS,
} from './prompts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const log = (msg) => process.stderr.write(`[Pipeline] ${msg}\n`);

const DEEP_SCORING_PROMPT = `Si uredniški ocenjevalec za Svetla Stran - SLOVENSKI portal dobrih novic.

Prebral boš DOKONČAN članek ki ga je napisala naša redakcija. Oceni ga na podlagi vsebine.

ANTIDOTE — izberi PRIMARNEGA ki NAJBOLJE opisuje jedro zgodbe, in opcijsko SEKUNDARNEGA če zgodba pokriva še drugo čustvo:
- "jeza" = zgodba kjer nekdo izbere prijaznost, odpuščanje ali spravo NAMESTO konflikta ali maščevanja
- "skrb" = zgodba ki pokaže da so se stvari uredile, da sistem deluje, da je pomoč prišla pravočasno
- "cinizem" = zgodba ki dokaže da so ljudje nesebično dobri, brez skritih agend ali koristi
- "osamljenost" = zgodba o povezovanju, skupnosti, sosedih, tujcih ki postanejo prijatelji
- "obup" = zgodba o odpornosti, obnovi po nesreči, naravi ki se vrača, premagani oviri
- "strah" = zgodba o pogumu — NE samo fizična nevarnost! Tudi: učitelj ki se postavi za učenca, žvižgač ki spregovori, nekdo ki začne znova po vsem, nekdo ki stoji za prepričanja ko je težko, človek ki reši življenje, gasilci, reševalci, pogumne odločitve v vsakdanjem življenju
- "dolgcas" = zgodba ki te nasmeje ali ogreje srce — živali, otroci, simpatični trenutki, nenavadni rekordi, čudni dosežki, smešne naključja, presenetljive dobrote, "feel-good" zgodbe ki jih pošlješ prijatelju

KATEGORIJA — potrdi ali popravi:
ZIVALI, SKUPNOST, SPORT, NARAVA, INFRASTRUKTURA, PODJETNISTVO, SLOVENIJA_V_SVETU, JUNAKI, KULTURA

OCENA 0-10:
- Ali bi ta zgodba bralca GANILA, NAVDUŠILA ali PRESENETILA?
- Ali je dobro napisana, zanimiva, vredna branja?
- Ali bi jo povedal prijatelju?

DODATNE TEME (opcijsko) — označi članek z "tiho-delo" SAMO če:
- Glavni lik ali liki so ljudje, ki opravljajo nepoznano, neglamurozno delo v družbi (medicinske sestre, cestarji, knjižničarke, vzgojiteljice, voznice rešilcev, smetarji, kurirke, čistilke, prostovoljci, reševalci)
- Delo je pomembno, a običajno ostane nevidno
- Članek ni o slavni osebi ali nagradi

Vrni SAMO JSON brez markdown:
{
  "score": number,
  "antidote": "jeza"|"skrb"|"cinizem"|"osamljenost"|"obup"|"strah"|"dolgcas",
  "antidote_secondary": null | "jeza"|"skrb"|"cinizem"|"osamljenost"|"obup"|"strah"|"dolgcas",
  "category": "ZIVALI"|"SKUPNOST"|"SPORT"|"NARAVA"|"INFRASTRUKTURA"|"PODJETNISTVO"|"SLOVENIJA_V_SVETU"|"JUNAKI"|"KULTURA",
  "themes": [] | ["tiho-delo"],
  "reason": "max 2 stavka zakaj ta ocena in ta antidote"
}`;

// ── PHASE 1: Generate search queries ────────────────────────────────────────

async function generateQueries(title, content, sourceName) {
  log('Phase 1: Generating search queries...');
  const text = await askClaude(
    QUERY_GENERATION_PROMPT,
    `Naslov: ${title}\nVir: ${sourceName || 'neznan'}\n\nVsebina:\n${content.slice(0, 5000)}`,
    'phase1_queries'
  );
  const result = extractJSON(text);
  const queries = result.queries || [];
  log(`  → ${queries.length} queries generated`);
  return queries;
}

// ── PHASE 2: Parallel subagent research ─────────────────────────────────────

async function researchQuery(query, sourceUrl, title, content, index) {
  const phase = `phase2_agent_${index}`;
  log(`  Agent ${index}: "${query}"`);

  const userMsg = `Raziskuj to iskalno poizvedbo za zgodbo "${title}":

ISKALNA POIZVEDBA: ${query}

IZVIRNI VIR (za kontekst):
${content.slice(0, 2000)}
${sourceUrl ? `URL izvirnega vira: ${sourceUrl}` : ''}

NAVODILO: Uporabi WebSearch za to poizvedbo. Odpri 2-3 najboljše rezultate z FetchArticleText in preberi vsebino. Vrni izvlečena dejstva.`;

  const text = await researchWithClaude(SUBAGENT_RESEARCH_PROMPT, userMsg, 8, phase);

  try {
    return extractJSON(text);
  } catch {
    // If not valid JSON, return raw text as facts
    return { facts: text, references: [], query };
  }
}

async function parallelResearch(queries, sourceUrl, title, content) {
  log(`Phase 2: Launching ${queries.length} research subagents in parallel...`);

  // Also fetch original source as a separate subagent
  const tasks = queries.map((q, i) =>
    researchQuery(q, sourceUrl, title, content, i + 1)
      .catch(err => {
        log(`  Agent ${i + 1} failed: ${err.message}`);
        return { facts: '', references: [], query: q };
      })
  );

  // If we have the source URL, also fetch it directly
  if (sourceUrl) {
    tasks.push(
      researchWithClaude(
        SUBAGENT_RESEARCH_PROMPT,
        `Preberi izvirni vir za zgodbo "${title}" in izvleci vsa dejstva:\n\nURL: ${sourceUrl}\n\nUporabi FetchArticleText da prebereš celoten članek. Vrni vsa dejstva ki jih najdeš.`,
        5,
        'phase2_original_source'
      ).then(text => {
        try { return extractJSON(text); }
        catch { return { facts: text, references: [{ url: sourceUrl, title: 'Izvirni vir' }] }; }
      }).catch(() => ({ facts: '', references: [] }))
    );
  }

  const results = await Promise.all(tasks);

  log(`  → ${results.length} subagents completed`);
  return results;
}

// ── PHASE 3: Compile facts from all subagents ───────────────────────────────

async function compileFacts(title, subagentResults, originalContent) {
  log('Phase 3: Compiling facts from all subagents...');

  // Build a summary of all subagent findings
  const agentOutputs = subagentResults.map((r, i) => {
    // facts can be array (new format) or string (legacy/fallback)
    const rawFacts = r.facts || r.verifiedFacts || '';
    const facts = Array.isArray(rawFacts) ? rawFacts.join('\n') : rawFacts;
    const refs = (r.references || []).map(ref => `  - ${ref.title || ref.url}: ${ref.url}`).join('\n');
    return `--- Agent ${i + 1} ---\nDejstva:\n${facts}\nViri:\n${refs || '(brez virov)'}`;
  }).join('\n\n');

  const userMsg = `Zberi in uredi dejstva iz ${subagentResults.length} raziskovalnih agentov za zgodbo:
"${title}"

IZVIRNA VSEBINA:
${originalContent.slice(0, 3000)}

REZULTATI AGENTOV:
${agentOutputs}

Združi, dedupliciraj in uredi vsa dejstva. Obdrži samo preverjene informacije z navedbami virov.`;

  const text = await askClaude(COMPILE_FACTS_PROMPT, userMsg, 'phase3_compile');
  return extractJSON(text);
}

// ── PHASE 4: Fill gaps (targeted subagents) ─────────────────────────────────

async function fillGaps(title, gaps, existingFacts) {
  if (!gaps || gaps.length === 0) {
    log('Phase 4: No gaps to fill, skipping.');
    return null;
  }

  log(`Phase 4: Filling ${gaps.length} gap(s) with targeted subagents (all gaps, no cap)...`);

  // Every gap gets its own subagent — all run in parallel.
  // Cost scales with gap count but article quality scales with it too.
  const tasks = gaps.map((gap, i) =>
    researchWithClaude(
      GAP_FILL_PROMPT,
      `Vrzel: ${gap}\n\nŽe znana dejstva:\n${existingFacts.slice(0, 2000)}\n\nPoišči specifično informacijo za zapolnitev te vrzeli.`,
      5,
      `phase4_gap_${i}`
    ).then(text => {
      try { return extractJSON(text); }
      catch { return { additionalFacts: text, references: [] }; }
    }).catch(() => ({ additionalFacts: '', references: [], remainingGaps: [gap] }))
  );

  const results = await Promise.all(tasks);

  // Merge results — additionalFacts can be array (new) or string (legacy)
  const additionalFacts = results
    .map(r => {
      const f = r.additionalFacts || '';
      return Array.isArray(f) ? f.join('\n') : f;
    })
    .filter(Boolean)
    .join('\n');
  const references = results.flatMap(r => r.references || []);
  const remainingGaps = results.flatMap(r => r.remainingGaps || []);

  log(`  → ${results.length} gap agents completed, ${remainingGaps.length} gaps remain`);
  return { additionalFacts, references, remainingGaps };
}

// ── PHASE 3.5: Depth assessment ──────────────────────────────────────────────

async function assessDepth(title, verifiedFacts, content) {
  log('Phase 3.5: Assessing depth for long-form...');
  const userMsg = `ZGODBA: ${title}\n\nIZVIRNI VIR (začetek):\n${content.slice(0, 3000)}\n\nPREVERJENA DEJSTVA:\n${verifiedFacts}`;
  const text = await askClaude(DEPTH_ASSESSMENT_PROMPT, userMsg, 'phase3_5_depth');
  const result = extractJSON(text);
  log(`  → Long-form: ${result.longForm ? 'YES — ' + result.reason : 'no'}`);
  return result;
}

// ── PHASE 5-LONG: Long-form article ─────────────────────────────────────────

async function writeLongFormArticle(story, verifiedFacts, standardArticle, longFormPrompt, narrativeHooks) {
  log('Phase 5-long: Writing long-form article...');

  const content = story.fullContent || story.rawContent || '';
  let userMsg = `IZVIRNI VIR:\nNaslov: ${story.rawTitle}\nVsebina:\n${content}`;

  if (verifiedFacts) {
    userMsg += `\n\nPREVERJENA DODATNA DEJSTVA (iz večih virov):\n${verifiedFacts}`;
  }

  userMsg += `\n\nŽE OBJAVLJEN KRAJŠI ČLANEK (bralec ga je že prebral — NE ponavljaj):\n${JSON.stringify(standardArticle)}`;

  if (narrativeHooks?.length) {
    userMsg += `\n\nPRIPOVEDNA JEDRA za dolgi članek:\n${narrativeHooks.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;
  }

  if (story.aiCategory) userMsg += `\nKategorija: ${story.aiCategory}`;
  if (story.aiCategory && CATEGORY_DIRECTIONS[story.aiCategory]) {
    userMsg += `\n\n${CATEGORY_DIRECTIONS[story.aiCategory]}`;
  }

  const text = await askClaude(longFormPrompt, userMsg, 'phase5_longform');
  const article = extractJSON(text);
  log(`  → Long-form: "${article.title}"`);
  return article;
}

// ── PHASE 5: Write article ──────────────────────────────────────────────────

async function writeArticle(story, verifiedFacts, writingPrompt) {
  log('Phase 5: Writing article...');

  const content = story.fullContent || story.rawContent || '';
  let userMsg = `IZVIRNI VIR:\nNaslov: ${story.rawTitle}\nVsebina:\n${content}`;

  if (verifiedFacts) {
    userMsg += `\n\nPREVERJENA DODATNA DEJSTVA (iz večih virov):\n${verifiedFacts}`;
  }
  if (story.aiHeadline) userMsg += `\n\nPredlagani naslov: ${story.aiHeadline}`;
  if (story.aiCategory) userMsg += `\nKategorija: ${story.aiCategory}`;
  if (story.aiCategory && CATEGORY_DIRECTIONS[story.aiCategory]) {
    userMsg += `\n\n${CATEGORY_DIRECTIONS[story.aiCategory]}`;
  }

  const text = await askClaude(writingPrompt, userMsg, 'phase5_write');
  const article = extractJSON(text);
  log(`  → "${article.title}"`);
  return article;
}

// ── Load skill & guideline content ──────────────────────────────────────────

function loadSkillContent() {
  const skillDir = join(__dirname, '..', '..', 'K&M_Pisatelj', 'elegant-slovenian');
  const skillMd = readFileSync(join(skillDir, 'SKILL.md'), 'utf-8');
  const styleGuide = readFileSync(join(skillDir, 'references', 'style-guide.md'), 'utf-8');
  const grammarReference = readFileSync(join(__dirname, 'grammar-prompt.md'), 'utf-8');
  return { skillMd, styleGuide, grammarReference };
}

// ── PHASE 7: K&M Polish (after verification + repair) ──────────────────────

async function polishArticle(article, polishPrompt) {
  log('Phase 7: K&M polish on verified text...');
  const articleJSON = JSON.stringify(article);
  const text = await askClaude(polishPrompt, articleJSON, 'phase7_polish');
  const polished = extractJSON(text);

  // Safety: ensure slug was preserved
  if (!polished.slug) polished.slug = article.slug;

  log(`  → Polished: "${polished.title}"`);
  return polished;
}

// ── PHASE 8: Grammar check (final pass) ─────────────────────────────────────

async function checkGrammar(article, grammarPrompt) {
  log('Phase 8: Grammar check...');
  const articleJSON = JSON.stringify(article);
  const text = await askClaude(grammarPrompt, articleJSON, 'phase8_grammar');
  const checked = extractJSON(text);

  // Safety: ensure slug was preserved
  if (!checked.slug) checked.slug = article.slug;

  log(`  → Grammar checked: "${checked.title}"`);
  return checked;
}

// ── PHASE 8.5: Deep score the written article ────────────────────────────────

async function deepScoreArticle(article) {
  const userMsg = `Naslov: ${article.title}\nPodnaslov: ${article.subtitle}\n\nČlanek:\n${article.body}`;
  const text = await askClaude(DEEP_SCORING_PROMPT, userMsg);
  return extractJSON(text);
}

// ── PHASE 6: Verify article ─────────────────────────────────────────────────

async function verifyArticle(article, originalContent, verifiedFacts) {
  log('Phase 6: Verifying...');

  const articleJSON = JSON.stringify(article);
  const text = await askClaude(
    VERIFICATION_PROMPT,
    `NAPISANI ČLANEK:\n${articleJSON}\n\nIZVIRNI VIR:\n${originalContent}\n\nPREVERJENA DODATNA DEJSTVA:\n${verifiedFacts || '(brez dodatnih dejstev)'}`,
    'phase6_verify'
  );
  const verification = extractJSON(text);
  log(`  → ${verification.passed ? 'PASSED' : 'FAILED'}: ${verification.summary}`);
  return verification;
}

// ── IMAGE TIER 2: Find related articles, extract their images ───────────────

// ── PHASE 6b: Repair article based on verification ─────────────────────────

async function repairArticle(article, failedClaims, repairPrompt) {
  log(`Phase 6b: Repairing ${failedClaims.length} flagged claim(s)...`);

  const issuesList = failedClaims.map((c, i) =>
    `${i + 1}. [${c.status.toUpperCase()}] ${c.claim}\n   Opomba: ${c.note || 'ni podrobnosti'}`
  ).join('\n\n');

  const userMsg = `ČLANEK:\n${JSON.stringify(article)}\n\nNAJDENE NAPAKE (${failedClaims.length}):\n${issuesList}`;

  const text = await askClaude(repairPrompt, userMsg, 'phase6b_repair');
  const repaired = extractJSON(text);

  // Safety: preserve slug
  if (!repaired.slug) repaired.slug = article.slug;

  log(`  → Repaired: "${repaired.title}"`);
  return repaired;
}

// ── PHASE 6c: Spot-check (re-fetch sources, compare hard facts) ─────────────

async function spotCheckArticle(article, references) {
  const urls = references.map(r => r.url).filter(Boolean);
  if (urls.length === 0) {
    log('Phase 6c: No source URLs to spot-check, skipping.');
    return { discrepancies: [], sources_checked: 0, sources_failed: 0, summary: 'Ni URL-jev za preverjanje' };
  }

  log(`Phase 6c: Spot-checking against ${urls.length} source(s)...`);

  const articleJSON = JSON.stringify(article);
  const urlList = urls.map((u, i) => `${i + 1}. ${u}`).join('\n');

  const text = await askClaudeWithFetch(
    SPOT_CHECK_PROMPT,
    `NAPISANI ČLANEK:\n${articleJSON}\n\nVIRI ZA PREVERJANJE:\n${urlList}`,
    urls.length + 3, // turns: 1 fetch per URL + a few for reasoning
    'phase6c_spotcheck'
  );

  const result = extractJSON(text);
  const count = result.discrepancies?.length || 0;
  log(`  → Spot-check: ${count} discrepancy(ies) found, ${result.sources_checked || 0} sources checked`);
  if (count > 0) {
    for (const d of result.discrepancies) {
      log(`    [${d.severity}] ${d.type}: "${d.article_says}" → "${d.source_says}"`);
    }
  }
  return result;
}

// ── PHASE 0: Semantic dedup ─────────────────────────────────────────────────

const RELATED_CATEGORIES = {
  SPORT: ['SPORT', 'JUNAKI'],
  JUNAKI: ['JUNAKI', 'SPORT', 'SKUPNOST'],
  NARAVA: ['NARAVA', 'ZIVALI'],
  ZIVALI: ['ZIVALI', 'NARAVA'],
  SKUPNOST: ['SKUPNOST', 'JUNAKI'],
  PODJETNISTVO: ['PODJETNISTVO', 'SLOVENIJA_V_SVETU', 'INFRASTRUKTURA'],
  SLOVENIJA_V_SVETU: ['SLOVENIJA_V_SVETU', 'PODJETNISTVO', 'SPORT'],
  INFRASTRUKTURA: ['INFRASTRUKTURA', 'PODJETNISTVO'],
  KULTURA: ['KULTURA'],
};

async function checkDuplicate(title, category, headlineId) {
  if (!title) return null;

  const sql = postgres(process.env.NEON_DB_URL, { ssl: 'require', max: 1 });

  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const relatedCats = RELATED_CATEGORIES[category] || [category || 'UNKNOWN'];

  const [articles, drafts, headlines] = await Promise.all([
    sql`SELECT title, subtitle FROM articles WHERE published_at >= ${cutoff} AND category = ANY(${relatedCats})`,
    sql`SELECT title, subtitle FROM drafts WHERE created_at >= ${cutoff} AND category = ANY(${relatedCats})`,
    headlineId
      ? sql`SELECT id, ai_headline, ai_reason FROM headlines WHERE status IN ('picked','processing') AND ai_category = ANY(${relatedCats}) AND id != ${headlineId}`
      : sql`SELECT id, ai_headline, ai_reason FROM headlines WHERE status IN ('picked','processing') AND ai_category = ANY(${relatedCats})`,
  ]);

  await sql.end();

  const pool = [
    ...(articles || []).map(a => ({ label: a.title, detail: a.subtitle || '' })),
    ...(drafts || []).map(d => ({ label: d.title, detail: d.subtitle || '' })),
    ...(headlines || []).map(h => ({ label: h.ai_headline, detail: h.ai_reason || '' })),
  ].filter(p => p.label);

  if (pool.length === 0) return null;

  log(`Phase 0: Checking "${title}" against ${pool.length} existing stories...`);

  const poolList = pool.map((p, i) => `${i + 1}. "${p.label}" — ${p.detail}`).join('\n');

  const systemPrompt = `Si pomočnik za odkrivanje duplikatov novic.
Kandidat je DUPLIKAT če gre za ISTI DOGODEK: isti akter, isti rezultat, ista zgodba, čeprav z drugačnim naslovom ali iz drugega vira.
Kandidat NI duplikat če gre za NOVEJŠI RAZVOJ iste teme ali za drugo osebo/dogodek.

Vrni SAMO JSON brez markdown:
{"isDuplicate": true/false, "duplicateOf": number | null}

duplicateOf = zaporedna številka obstoječe zgodbe, ali null če ni duplikat.`;

  const userMsg = `OBSTOJEČE ZGODBE:\n${poolList}\n\nKANDIDAT:\n"${title}"`;

  try {
    const text = await askClaude(systemPrompt, userMsg, 'phase0_dedup');
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const result = JSON.parse(cleaned.slice(start, end + 1));

    if (result.isDuplicate && result.duplicateOf !== null) {
      const idx = result.duplicateOf - 1;
      return pool[idx]?.label || 'neznana zgodba';
    }
    return null;
  } catch (e) {
    log(`Phase 0: Dedup check failed (non-fatal): ${e.message}`);
    return null; // On error, assume unique — don't block the pipeline
  }
}

// ── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const story = JSON.parse(Buffer.concat(chunks).toString());

  const content = story.fullContent || story.rawContent || '';
  const sourceUrl = story.source_url || story.sourceUrl;
  const sourceName = story.source_name || story.sourceName;
  const knownDomains = story._knownDomains || [];
  const headlineId = story.headlineId || story.storyId || null;

  // ── PHASE 0: Dedup check ──────────────────────────────────────────────────
  const storyTitle = story.ai_headline || story.aiHeadline || story.rawTitle;
  const storyCategory = story.ai_category || story.ai?.category || '';
  const dupResult = await checkDuplicate(storyTitle, storyCategory, headlineId);
  if (dupResult) {
    log(`DUPLICATE DETECTED: "${storyTitle}" → already covered by: "${dupResult}"`);
    process.stdout.write(JSON.stringify({ skipped: true, reason: `Podobna zgodba že v obdelavi: ${dupResult}` }));
    return;
  }
  log('Phase 0: Dedup check passed — story is unique.');

  // Load all skill/guideline content once at startup
  log('Loading writing skill + editorial guidelines...');
  const { skillMd, styleGuide, grammarReference } = loadSkillContent();
  const writingPrompt = createWritingPrompt();
  const polishPrompt = createPolishPrompt(skillMd, styleGuide);
  const repairPrompt = createRepairPrompt();
  const longFormPrompt = createLongFormPrompt();
  const grammarPrompt = createGrammarPrompt(grammarReference);
  log(`  → Skill loaded (${((skillMd.length + styleGuide.length) / 1024).toFixed(0)}KB K&M) → 5 prompts built`);

  log('=== PIPELINE START (subagent architecture) ===');
  log(`Model: ${process.env.PIPELINE_MODEL || 'sonnet'} | Story: "${story.rawTitle}"`);

  // PHASE 1: Generate queries
  const queries = await generateQueries(story.rawTitle, content, sourceName);

  // PHASE 2: Parallel subagent research
  const subagentResults = await parallelResearch(queries, sourceUrl, story.rawTitle, content);

  // PHASE 3: Compile facts from all subagents
  const compiled = await compileFacts(story.rawTitle, subagentResults, content);

  // verifiedFacts can be array (new) or string (legacy)
  const rawFacts = compiled.verifiedFacts || '';
  let allFacts = Array.isArray(rawFacts) ? rawFacts.join('\n') : rawFacts;
  let allReferences = compiled.references || [];
  const gaps = compiled.gaps || [];

  // PHASE 4: Fill gaps (conditional)
  const gapResult = await fillGaps(story.rawTitle, gaps, allFacts);
  if (gapResult?.additionalFacts) {
    allFacts += '\n\n--- DODATNA DEJSTVA (zapolnjevanje vrzeli) ---\n' + gapResult.additionalFacts;
  }
  if (gapResult?.references?.length) {
    allReferences = [...allReferences, ...gapResult.references];
  }

  // Build references list (original source first, deduplicated)
  const seenUrls = new Set();
  const references = [];
  if (sourceUrl) {
    references.push({ url: sourceUrl, title: sourceName });
    seenUrls.add(sourceUrl);
  }
  for (const ref of allReferences) {
    if (ref.url && !seenUrls.has(ref.url)) {
      references.push(ref);
      seenUrls.add(ref.url);
    }
  }

  // PHASE 5 + SOURCE DISCOVERY + DEPTH ASSESSMENT in parallel
  log('Phase 5 + discovery + depth assessment (parallel)...');

  const storyMeta = {
    rawTitle: story.rawTitle,
    rawContent: content,
    fullContent: story.fullContent,
    aiHeadline: story.ai_headline || story.ai?.headline_suggestion,
    aiCategory: story.ai_category || story.ai?.category,
  };

  const [rawArticle, discoveredSources, depthResult] = await Promise.all([
    writeArticle(storyMeta, allFacts, writingPrompt),
    discoverSources(compiled, story.rawTitle, knownDomains, headlineId)
      .catch(err => {
        log(`Discovery failed (non-fatal): ${err.message}`);
        return [];
      }),
    assessDepth(story.rawTitle, allFacts, content)
      .catch(err => {
        log(`Depth assessment failed (non-fatal): ${err.message}`);
        return { longForm: false };
      }),
  ]);

  // PHASE 6: Verify article (image generation moved to Phase 9)
  log('Phase 6: Verifying article...');
  const verification = await verifyArticle(rawArticle, content, allFacts);
  const imageUrl = null; // Images are AI-generated in Phase 9, not scraped from sources

  // PHASE 6b: Repair if verification found issues (conditional)
  const failedClaims = (verification.claims || []).filter(c => c.status !== 'ok');
  let verifiedArticle = rawArticle;
  if (failedClaims.length > 0) {
    verifiedArticle = await repairArticle(rawArticle, failedClaims, repairPrompt);
    verification.repaired = true;
    verification.repairedClaims = failedClaims.length;
  } else {
    log('Phase 6b: All claims OK, no repair needed.');
  }

  // PHASE 6c: Spot-check (re-fetch actual sources, compare hard facts)
  const spotCheck = await spotCheckArticle(verifiedArticle, references);

  // PHASE 6d: Repair if spot-check found discrepancies (conditional)
  const highSeverity = (spotCheck.discrepancies || []).filter(d => d.severity === 'high' || d.severity === 'medium');
  if (highSeverity.length > 0) {
    log(`Phase 6d: Repairing ${highSeverity.length} spot-check discrepancy(ies)...`);
    const issuesList = highSeverity.map((d, i) =>
      `${i + 1}. [${d.type.toUpperCase()}] Članek pravi: "${d.article_says}" — Vir pravi: "${d.source_says}" (vir: ${d.source_url})`
    ).join('\n\n');
    verifiedArticle = await repairArticle(verifiedArticle, highSeverity.map(d => ({
      status: 'napačno',
      claim: d.article_says,
      note: `Vir (${d.source_url}) pravi: ${d.source_says}`,
    })), repairPrompt);
    verification.spotCheckRepaired = true;
    verification.spotCheckIssues = highSeverity.length;
  } else {
    log('Phase 6d: Spot-check clean, no repair needed.');
  }

  // PHASE 7: K&M polish (on verified/repaired text — Content → Truth → Beauty)
  const polishedArticle = await polishArticle(verifiedArticle, polishPrompt);

  // PHASE 8: Grammar check (final mechanical pass — Beauty → Correctness)
  const finalArticle = await checkGrammar(polishedArticle, grammarPrompt);

  // PHASE 8.5: Deep Score (score the WRITTEN article, not the original headline)
  log('Phase 8.5: Deep scoring written article...');
  let deepScore = null;
  try {
    deepScore = await deepScoreArticle(finalArticle);
    log(`  → Deep score: ${deepScore.score}/10 | Antidote: ${deepScore.antidote}${deepScore.antidote_secondary ? ` + ${deepScore.antidote_secondary}` : ''} | Category: ${deepScore.category}`);
    log(`  → Reason: ${deepScore.reason}`);
  } catch (err) {
    log(`Deep scoring failed (non-fatal): ${err.message}`);
  }

  // PHASE 5-LONG: Long-form article (conditional — only if depth assessment flagged it)
  let longFormArticle = null;
  if (depthResult.longForm) {
    try {
      const rawLongForm = await writeLongFormArticle(
        storyMeta, allFacts, finalArticle, longFormPrompt, depthResult.narrativeHooks
      );
      // Same flow: K&M polish → grammar check
      const polishedLongForm = await polishArticle(rawLongForm, polishPrompt);
      longFormArticle = await checkGrammar(polishedLongForm, grammarPrompt);
      log(`  → Long-form complete: "${longFormArticle.title}"`);
    } catch (err) {
      log(`Long-form writing failed (non-fatal): ${err.message}`);
    }
  } else {
    log('Phase 5-long: Skipped (story not flagged for long-form).');
  }

  // PHASE 9: Generate AI image
  log('Phase 9: Generating AI image...');
  const imageGenResult = await generateArticleImage(
    finalArticle.title,
    finalArticle.body,
    deepScore?.category || story.ai_category || story.ai?.category || '',
    finalArticle.slug,
    story.source_url || story.sourceUrl || null,
  );
  const aiImageUrl = imageGenResult?.imageUrl || null;
  const imagePrompt = imageGenResult?.imagePrompt || null;

  if (aiImageUrl) {
    log(`✓ AI image auto-generated`);
  } else if (imagePrompt) {
    log(`⚠ No auto-image — prompt saved for manual generation`);
  }

  // Token usage summary
  const tokens = tokenTracker.summary();

  const result = {
    article: finalArticle,
    longFormArticle,
    deepScore,
    research: {
      queriesUsed: queries,
      sourcesFound: references.length,
      sourcesUsed: references.length,
      verifiedFacts: allFacts,
      references,
      gaps: gapResult?.remainingGaps || gaps,
    },
    verification,
    imageUrl,
    aiImageUrl,
    imagePrompt,
    suggestions: discoveredSources,
    tokens,
  };

  log('=== PIPELINE COMPLETE ===');
  log(`Article: "${finalArticle.title}" | Verification: ${verification.passed ? 'PASSED' : 'FAILED'}${verification.repaired ? ` (repaired ${verification.repairedClaims} claims)` : ''} | Long-form: ${longFormArticle ? 'YES' : 'no'} | Suggestions: ${discoveredSources.length}`);
  log(`Tokens: ${tokens.totalTokens} total (in: ${tokens.inputTokens}, out: ${tokens.outputTokens}) | ${tokens.webSearchRequests} web searches | $${tokens.costUSD?.toFixed(4)} USD`);
  log(`Peak context per call: ${Math.max(...Object.values(tokens.phases).map(p => (p.inputTokens || 0) + (p.outputTokens || 0)))}`);
  for (const [phase, data] of Object.entries(tokens.phases)) {
    log(`  ${phase}: ${data.inputTokens + data.outputTokens} tokens | ${data.webSearchRequests || 0} searches | ${data.turns} turns`);
  }

  process.stdout.write(JSON.stringify(result));
}

main().catch(e => {
  log(`FATAL: ${e.message}\n${e.stack}`);
  process.exit(1);
});
