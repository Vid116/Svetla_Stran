#!/usr/bin/env node
/**
 * SVETLA STRAN - Research & Write Pipeline
 *
 * Uses Claude Agent SDK with WebSearch + WebFetch for real research.
 * Spawned as child process by /api/research-write.
 *
 * Usage: node lib/research-write/run.mjs < story.json > result.json
 */
delete process.env.CLAUDECODE;

import { askClaude, researchWithClaude, extractJSON } from './ai.mjs';
import { findOgImage } from './search.mjs';
import { discoverSources } from './discover.mjs';
import { RESEARCH_SYSTEM_PROMPT, WRITING_PROMPT, VERIFICATION_PROMPT } from './prompts.mjs';

// ── STEP 1: Research with agent (multi-turn, web tools) ─────────────────────

async function researchStory(story) {
  const content = story.fullContent || story.rawContent;
  const sourceInfo = story.sourceName ? `\nVir: ${story.sourceName}` : '';

  const researchResult = await researchWithClaude(
    RESEARCH_SYSTEM_PROMPT,
    `Raziskuj to zgodbo:\n\nNaslov: ${story.rawTitle}${sourceInfo}\n\nVsebina:\n${content.slice(0, 3000)}`
  );

  return extractJSON(researchResult);
}

// ── STEP 2: Write enriched article ──────────────────────────────────────────

async function writeEnrichedArticle(story, research) {
  const content = story.fullContent || story.rawContent;
  let userMsg = `IZVIRNI VIR:\nNaslov: ${story.rawTitle}\nVsebina:\n${content}`;

  if (research.verifiedFacts) {
    userMsg += `\n\nPREVERJENA DODATNA DEJSTVA (iz vecih virov):\n${research.verifiedFacts}`;
  }
  if (story.aiHeadline) userMsg += `\n\nPredlagani naslov: ${story.aiHeadline}`;
  if (story.aiCategory) userMsg += `\nKategorija: ${story.aiCategory}`;

  const text = await askClaude(WRITING_PROMPT, userMsg);
  return extractJSON(text);
}

// ── STEP 3: Verify article ──────────────────────────────────────────────────

async function verifyArticle(articleBody, originalContent, verifiedFacts) {
  const text = await askClaude(
    '',
    `${VERIFICATION_PROMPT}\n\nNAPISANI CLANEK:\n${articleBody}\n\nIZVIRNI VIR:\n${originalContent.slice(0, 2000)}\n\nPREVERJENA DODATNA DEJSTVA:\n${verifiedFacts || "(brez dodatnih dejstev)"}`
  );
  return extractJSON(text);
}

// ── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const story = JSON.parse(Buffer.concat(chunks).toString());

  const content = story.fullContent || story.rawContent;
  const log = (msg) => process.stderr.write(`[Research] ${msg}\n`);

  // 1. Agent-driven research (WebSearch + WebFetch)
  log('Starting agent research...');
  const research = await researchStory({
    rawTitle: story.rawTitle,
    rawContent: content,
    fullContent: story.fullContent,
    sourceName: story.source_name || story.sourceName,
  });
  log(`Research complete: ${research.queriesUsed?.length || 0} queries, ${research.sourcesUsed || 0} sources used`);

  // Build references list (original source first)
  const sourceUrl = story.source_url || story.sourceUrl;
  const sourceName = story.source_name || story.sourceName;
  const references = [
    { url: sourceUrl, title: sourceName },
    ...(research.references || []).filter(r => r.url !== sourceUrl),
  ];

  // Known source domains (passed from API route)
  const knownDomains = story._knownDomains || [];
  const headlineId = story.headlineId || story.storyId || null;

  // 2. Write article + discover sources IN PARALLEL
  log('Writing article + discovering sources (parallel)...');

  const [article, discoveredSources] = await Promise.all([
    // Branch A: Write article
    writeEnrichedArticle(
      {
        rawTitle: story.rawTitle,
        rawContent: content,
        fullContent: story.fullContent,
        aiHeadline: story.ai_headline || story.ai?.headline_suggestion,
        aiCategory: story.ai_category || story.ai?.category,
      },
      research
    ),
    // Branch B: Source discovery
    discoverSources(research, story.rawTitle, knownDomains, headlineId)
      .catch(err => {
        log(`Discovery failed (non-fatal): ${err.message}`);
        return [];
      }),
  ]);

  // 3. Verify
  log('Verifying...');
  const verification = await verifyArticle(article.body, content, research.verifiedFacts);
  log(`${verification.passed ? 'PASSED' : 'FAILED'}: ${verification.summary}`);

  // 4. OG image from source
  const imageUrl = await findOgImage(sourceUrl);

  // Output
  const result = {
    article,
    research: {
      queriesUsed: research.queriesUsed || [],
      sourcesFound: research.sourcesFound || 0,
      sourcesUsed: research.sourcesUsed || 0,
      verifiedFacts: research.verifiedFacts || '',
      references,
    },
    verification,
    imageUrl,
    suggestions: discoveredSources,
  };

  process.stdout.write(JSON.stringify(result));
  log(`Done: "${article.title}"`);
}

main().catch(e => {
  process.stderr.write(`Fatal: ${e.message}\n`);
  process.exit(1);
});
