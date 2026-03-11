#!/usr/bin/env node
/**
 * SVETLA STRAN - Multi-Phase Research & Write Pipeline
 *
 * Phase 1: GENERATE QUERIES  (single turn, no tools)
 * Phase 2: DEEP RESEARCH     (multi-turn, WebSearch + WebFetch, 25 turns)
 * Phase 3: FILL GAPS         (conditional, multi-turn, WebSearch + WebFetch)
 * Phase 4: WRITE ARTICLE     (single turn, no tools)
 * Phase 5: VERIFY            (single turn, no tools)
 * Parallel: SOURCE DISCOVERY (runs alongside Phase 4-5)
 *
 * Usage: node lib/research-write/run.mjs < story.json > result.json
 */
delete process.env.CLAUDECODE;

import { askClaude, researchWithClaude, extractJSON, tokenTracker } from './ai.mjs';
import { findOgImage } from './search.mjs';
import { discoverSources } from './discover.mjs';
import {
  QUERY_GENERATION_PROMPT,
  RESEARCH_SYSTEM_PROMPT,
  GAP_FILL_PROMPT,
  WRITING_PROMPT,
  VERIFICATION_PROMPT,
} from './prompts.mjs';

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

// ── PHASE 2: Deep research with web tools ───────────────────────────────────

async function deepResearch(title, content, sourceUrl, sourceName, queries) {
  log('Phase 2: Deep research (up to 25 turns)...');

  const queryList = queries.map((q, i) => `  ${i + 1}. ${q}`).join('\n');

  const userMsg = `Raziskuj to zgodbo:

Naslov: ${title}
Vir: ${sourceName || 'neznan'}
URL izvirnega vira: ${sourceUrl || 'ni podan'}

Vsebina izvirnega vira:
${content}

PRIPRAVLJENE ISKALNE POIZVEDBE (uporabi VSE):
${queryList}

NAVODILO: Najprej preberi izvirni vir z WebFetch (če je URL podan). Nato uporabi VSE pripravljene poizvedbe z WebSearch. Za vsak obetaven rezultat preberi celoten članek z WebFetch. Cilj: preberi vsaj 5-8 različnih virov.`;

  const text = await researchWithClaude(RESEARCH_SYSTEM_PROMPT, userMsg, 25, 'phase2_research');
  const research = extractJSON(text);

  log(`  → ${research.sourcesUsed || 0} sources used, ${research.gaps?.length || 0} gaps identified`);
  return research;
}

// ── PHASE 3: Fill gaps (conditional) ────────────────────────────────────────

async function fillGaps(title, gaps, existingFacts) {
  if (!gaps || gaps.length === 0) {
    log('Phase 3: No gaps to fill, skipping.');
    return null;
  }

  log(`Phase 3: Filling ${gaps.length} gaps...`);

  const gapList = gaps.map((g, i) => `  ${i + 1}. ${g}`).join('\n');

  const userMsg = `Zgodba: "${title}"

Že znana dejstva:
${existingFacts}

VRZELI ki jih moraš zapolniti:
${gapList}

Za vsako vrzel poišči specifične informacije z WebSearch in preberi članke z WebFetch.`;

  const text = await researchWithClaude(GAP_FILL_PROMPT, userMsg, 15, 'phase3_gaps');
  const result = extractJSON(text);

  log(`  → Found ${result.additionalFacts ? 'additional facts' : 'nothing new'}, ${result.remainingGaps?.length || 0} gaps remain`);
  return result;
}

// ── PHASE 4: Write article ──────────────────────────────────────────────────

async function writeArticle(story, verifiedFacts) {
  log('Phase 4: Writing article...');

  const content = story.fullContent || story.rawContent;
  let userMsg = `IZVIRNI VIR:\nNaslov: ${story.rawTitle}\nVsebina:\n${content}`;

  if (verifiedFacts) {
    userMsg += `\n\nPREVERJENA DODATNA DEJSTVA (iz večih virov):\n${verifiedFacts}`;
  }
  if (story.aiHeadline) userMsg += `\n\nPredlagani naslov: ${story.aiHeadline}`;
  if (story.aiCategory) userMsg += `\nKategorija: ${story.aiCategory}`;

  const text = await askClaude(WRITING_PROMPT, userMsg, 'phase4_write');
  const article = extractJSON(text);
  log(`  → "${article.title}"`);
  return article;
}

// ── PHASE 5: Verify article ─────────────────────────────────────────────────

async function verifyArticle(articleBody, originalContent, verifiedFacts) {
  log('Phase 5: Verifying...');

  const text = await askClaude(
    '',
    `${VERIFICATION_PROMPT}\n\nNAPISANI ČLANEK:\n${articleBody}\n\nIZVIRNI VIR:\n${originalContent}\n\nPREVERJENA DODATNA DEJSTVA:\n${verifiedFacts || '(brez dodatnih dejstev)'}`,
    'phase5_verify'
  );
  const verification = extractJSON(text);
  log(`  → ${verification.passed ? 'PASSED' : 'FAILED'}: ${verification.summary}`);
  return verification;
}

// ── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const story = JSON.parse(Buffer.concat(chunks).toString());

  const content = story.fullContent || story.rawContent;
  const sourceUrl = story.source_url || story.sourceUrl;
  const sourceName = story.source_name || story.sourceName;
  const knownDomains = story._knownDomains || [];
  const headlineId = story.headlineId || story.storyId || null;

  log('=== PIPELINE START ===');
  log(`Story: "${story.rawTitle}"`);

  // PHASE 1: Generate queries
  const queries = await generateQueries(story.rawTitle, content, sourceName);

  // PHASE 2: Deep research
  const research = await deepResearch(story.rawTitle, content, sourceUrl, sourceName, queries);

  // PHASE 3: Fill gaps (if any)
  let allFacts = research.verifiedFacts || '';
  let allReferences = research.references || [];

  const gapResult = await fillGaps(story.rawTitle, research.gaps, allFacts);
  if (gapResult) {
    if (gapResult.additionalFacts) {
      allFacts += '\n\n--- DODATNA DEJSTVA (2. krog) ---\n' + gapResult.additionalFacts;
    }
    if (gapResult.references?.length) {
      allReferences = [...allReferences, ...gapResult.references];
    }
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

  // PHASE 4 + 5 + SOURCE DISCOVERY in parallel
  log('Phases 4-5 + discovery (parallel)...');

  const [article, discoveredSources] = await Promise.all([
    // Branch A: Write article
    writeArticle(
      {
        rawTitle: story.rawTitle,
        rawContent: content,
        fullContent: story.fullContent,
        aiHeadline: story.ai_headline || story.ai?.headline_suggestion,
        aiCategory: story.ai_category || story.ai?.category,
      },
      allFacts
    ),
    // Branch B: Source discovery
    discoverSources(research, story.rawTitle, knownDomains, headlineId)
      .catch(err => {
        log(`Discovery failed (non-fatal): ${err.message}`);
        return [];
      }),
  ]);

  // Verify AFTER article is written (needs article.body)
  const verification = await verifyArticle(article.body, content, allFacts);

  // OG image from source
  const imageUrl = await findOgImage(sourceUrl);

  // Token usage summary
  const tokens = tokenTracker.summary();

  // Output
  const result = {
    article,
    research: {
      queriesUsed: [...(research.queriesUsed || []), ...(queries || [])],
      sourcesFound: research.sourcesFound || 0,
      sourcesUsed: research.sourcesUsed || 0,
      verifiedFacts: allFacts,
      references,
      gaps: gapResult?.remainingGaps || research.gaps || [],
    },
    verification,
    imageUrl,
    suggestions: discoveredSources,
    tokens,
  };

  log('=== PIPELINE COMPLETE ===');
  log(`Article: "${article.title}" | Verification: ${verification.passed ? 'PASSED' : 'FAILED'} | Suggestions: ${discoveredSources.length}`);
  log(`Tokens: ~${tokens.totalTokens} total (input: ${tokens.inputTokens}, output: ${tokens.outputTokens})`);
  for (const [phase, data] of Object.entries(tokens.phases)) {
    log(`  ${phase}: ~${data.input + data.output} tokens (${data.calls} calls)`);
  }

  process.stdout.write(JSON.stringify(result));
}

main().catch(e => {
  log(`FATAL: ${e.message}\n${e.stack}`);
  process.exit(1);
});
