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
 * Phase 6: VERIFY + IMAGE       (parallel — verify + 2-tier image search)
 * Phase 6b: REPAIR              (conditional — simple factual fixes, NO K&M)
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
import { createClient } from '@supabase/supabase-js';

import { askClaude, askClaudeWithImage, researchWithClaude, extractJSON, tokenTracker } from './ai.mjs';
import { findBestImage } from './search.mjs';
import { discoverSources } from './discover.mjs';
import {
  QUERY_GENERATION_PROMPT,
  SUBAGENT_RESEARCH_PROMPT,
  COMPILE_FACTS_PROMPT,
  GAP_FILL_PROMPT,
  VERIFICATION_PROMPT,
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

  log(`Phase 4: Filling ${gaps.length} gaps with targeted subagents...`);

  // Each gap gets its own subagent (parallel)
  const tasks = gaps.slice(0, 3).map((gap, i) =>
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

// ── PHASE 6: Verify article ─────────────────────────────────────────────────

async function verifyArticle(articleBody, originalContent, verifiedFacts) {
  log('Phase 6: Verifying...');

  const text = await askClaude(
    VERIFICATION_PROMPT,
    `NAPISANI ČLANEK:\n${articleBody}\n\nIZVIRNI VIR:\n${originalContent.slice(0, 3000)}\n\nPREVERJENA DODATNA DEJSTVA:\n${verifiedFacts || '(brez dodatnih dejstev)'}`,
    'phase6_verify'
  );
  const verification = extractJSON(text);
  log(`  → ${verification.passed ? 'PASSED' : 'FAILED'}: ${verification.summary}`);
  return verification;
}

// ── IMAGE TIER 2: Find related articles, extract their images ───────────────

/**
 * Vision gate: download image candidates and ask Claude if they match the article.
 * Returns the first image URL that passes, or null.
 */
async function validateImageWithVision(candidateUrls, articleTitle, articleExcerpt) {
  const VISION_PROMPT = `Si urednik za spletni portal pozitivnih novic. Pred tabo je slika, ki bi bila naslovnica članka.

Naslov članka: "${articleTitle}"
Začetek članka: "${articleExcerpt}"

Odgovori SAMO z JSON:
{"relevant": true/false, "reason": "kratek opis kaj je na sliki in zakaj ustreza/ne ustreza"}

Pravila:
- relevant=true: slika prikazuje temo članka (ljudi, kraje, dogodke, predmete iz zgodbe)
- relevant=false: slika je NEPOVEZANA z vsebino (npr. afriški bobnarji za alpsko dediščino, logo, generična stock fotografija, prazna/bela slika, oglas)
- Slika ne rabi biti TOČNO iz članka — dovolj je da prikazuje TEMO (npr. za članek o smučanju je ok slika smučarja, čeprav ni isti smučar)
- Logotipi, ikone, banneri = VEDNO false`;

  for (const url of candidateUrls.slice(0, 5)) {
    try {
      // Download image
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SvetlaStran/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) continue;

      const contentType = resp.headers.get('content-type') || '';
      const mediaType = contentType.includes('png') ? 'image/png'
        : contentType.includes('webp') ? 'image/webp'
        : 'image/jpeg';

      const buffer = Buffer.from(await resp.arrayBuffer());
      if (buffer.length < 5000) continue; // skip tiny images

      const base64 = buffer.toString('base64');

      const text = await askClaudeWithImage(
        VISION_PROMPT,
        `Ali ta slika ustreza članku "${articleTitle}"?`,
        base64,
        mediaType,
        'phase6_vision',
      );

      const result = extractJSON(text);
      if (result.relevant) {
        log(`✓ Vision OK: ${result.reason} — ${url.slice(0, 60)}`);
        return url;
      } else {
        log(`✗ Vision rejected: ${result.reason} — ${url.slice(0, 60)}`);
      }
    } catch (err) {
      log(`Vision check failed for ${url.slice(0, 60)}: ${err.message}`);
    }
  }

  return null;
}

async function searchRelatedArticleImages(title, sourceUrl) {
  log('Image Tier 2: Finding related articles with images...');

  // Ask AI to find URLs of related articles (NOT to extract images itself)
  const text = await researchWithClaude(
    `Si pomočnik za iskanje sorodnih člankov. Tvoja EDINA naloga je najti URL-je člankov o isti zgodbi na DRUGIH portalih.

POSTOPEK:
1. Uporabi WebSearch za iskanje članka z istim naslovom ali temo
2. NE odpri člankov — samo zberi URL-je iz rezultatov iskanja
3. Vrni 5-8 URL-jev člankov o ISTI zgodbi (ne sorodnih tem, ISTI dogodek)

Vrni SAMO JSON brez markdown:
{"urls": ["https://...", "https://..."]}
Če ne najdeš ničesar: {"urls": []}`,
    `Naslov članka: ${title}\nIzvirni vir: ${sourceUrl || 'neznan'}`,
    3,
    'image_tier2_search'
  );

  try {
    const result = extractJSON(text);
    const urls = (result.urls || []).filter(u => u && u !== sourceUrl);
    log(`  → Found ${urls.length} related article URLs`);

    // Run findBestImage on each URL in parallel (max 5)
    const { findBestImage } = await import('./search.mjs');
    const imageResults = await Promise.all(
      urls.slice(0, 5).map(url =>
        findBestImage(url).catch(() => null)
      )
    );

    const found = imageResults.find(img => img !== null);
    if (found) {
      log(`  → Tier 2 image found: ${found.slice(0, 80)}...`);
      return found;
    }
    return null;
  } catch (err) {
    log(`  → Tier 2 failed: ${err.message}`);
    return null;
  }
}

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const relatedCats = RELATED_CATEGORIES[category] || [category || 'UNKNOWN'];

  let headlinesQuery = supabase.from('headlines').select('id, ai_headline, ai_reason').in('status', ['picked', 'processing']).in('ai_category', relatedCats);
  if (headlineId) headlinesQuery = headlinesQuery.neq('id', headlineId);

  const [{ data: articles }, { data: drafts }, { data: headlines }] = await Promise.all([
    supabase.from('articles').select('title, subtitle').gte('published_at', cutoff).in('category', relatedCats),
    supabase.from('drafts').select('title, subtitle').gte('created_at', cutoff).in('category', relatedCats),
    headlinesQuery,
  ]);

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

  // PHASE 6: Verify + find image (parallel)
  // Verify the PLAIN article (before K&M polish — easier to fact-check clean text)
  const referenceUrls = references.map(r => r.url).filter(Boolean);
  log(`Image: checking ${referenceUrls.length} research references + source URL...`);

  const [verification, ...refImages] = await Promise.all([
    verifyArticle(rawArticle.body, content, allFacts),
    // Check all research reference URLs in parallel (news portals = best photos)
    ...referenceUrls.slice(0, 8).map(url =>
      findBestImage(url).catch(() => null)
    ),
  ]);

  // Collect all image candidates (research refs + source URL)
  const allCandidates = refImages.filter(img => img !== null);
  log(`Found ${allCandidates.length} image candidates from research references`);

  // Also try source URL
  const sourceImage = await findBestImage(sourceUrl).catch(() => null);
  if (sourceImage) allCandidates.push(sourceImage);

  // Last resort: AI searches for related articles with images
  if (allCandidates.length === 0) {
    log('No candidates yet, trying AI web search...');
    const searchImage = await searchRelatedArticleImages(story.rawTitle, sourceUrl).catch(err => {
      log(`Image AI search failed (non-fatal): ${err.message}`);
      return null;
    });
    if (searchImage) allCandidates.push(searchImage);
  }

  // Vision gate: validate candidates against article content
  let imageUrl = null;
  if (allCandidates.length > 0) {
    log(`Validating ${allCandidates.length} image candidates with vision...`);
    imageUrl = await validateImageWithVision(
      allCandidates,
      rawArticle.title,
      rawArticle.body?.slice(0, 500) || story.rawTitle,
    );
  }

  if (imageUrl) {
    log(`✓ Final image (vision-verified): ${imageUrl.slice(0, 80)}...`);
  } else {
    log('⚠ No image passed vision check — article will need manual image via editor UI');
  }

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

  // PHASE 7: K&M polish (on verified/repaired text — Content → Truth → Beauty)
  const polishedArticle = await polishArticle(verifiedArticle, polishPrompt);

  // PHASE 8: Grammar check (final mechanical pass — Beauty → Correctness)
  const finalArticle = await checkGrammar(polishedArticle, grammarPrompt);

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

  // Token usage summary
  const tokens = tokenTracker.summary();

  const result = {
    article: finalArticle,
    longFormArticle,
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
