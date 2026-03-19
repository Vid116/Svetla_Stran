#!/usr/bin/env node
/**
 * Batch research runner — triggers research pipeline for headlines by ID.
 * Bypasses API auth, reads from DB, saves drafts directly.
 *
 * Usage:
 *   node scripts/research-batch.mjs <headline-id> [<headline-id> ...]
 *   node scripts/research-batch.mjs --score 8    # all new headlines with score >= N
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env
config({ path: '.env.local' });
config({ path: '.env' });

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function getHeadline(id) {
  const { data, error } = await supabase.from('headlines').select('*').eq('id', id).single();
  if (error) throw new Error(`Headline ${id}: ${error.message}`);
  return data;
}

async function getSources() {
  const { data } = await supabase.from('sources').select('url').eq('active', true);
  return (data || []).map(s => {
    try { return new URL(s.url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }).filter(Boolean);
}

async function runPipeline(headline, knownDomains) {
  const story = {
    rawTitle: headline.raw_title,
    rawContent: headline.raw_content || '',
    fullContent: headline.full_content || '',
    sourceUrl: headline.source_url,
    sourceName: headline.source_name,
    headlineId: headline.id,
    ai: {
      category: headline.ai_category,
      emotions: headline.ai_emotions,
      antidote_for: headline.ai_antidote,
    },
    _knownDomains: knownDomains,
  };

  return new Promise((resolve, reject) => {
    const child = spawn('node', [join(__dirname, '..', 'lib', 'research-write', 'run.mjs')], {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: { ...process.env },
    });

    child.stdin.write(JSON.stringify(story));
    child.stdin.end();

    const chunks = [];
    child.stdout.on('data', c => chunks.push(c));
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`Pipeline exited with code ${code}`));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (e) {
        reject(new Error(`Failed to parse pipeline output: ${e.message}`));
      }
    });
  });
}

async function saveDraft(headline, result) {
  const draft = {
    headline_id: headline.id,
    title: result.article.title,
    subtitle: result.article.subtitle,
    body: result.article.body,
    slug: result.article.slug,
    image_url: result.imageUrl || null,
    category: headline.ai_category,
    emotions: headline.ai_emotions || [],
    antidote: headline.ai_antidote,
    source_name: headline.source_name,
    source_url: headline.source_url,
    research_queries: result.research?.queriesUsed || [],
    research_sources_found: result.research?.sourcesFound || 0,
    research_sources_used: result.research?.sourcesUsed || 0,
    research_references: result.research?.references || [],
    verification_passed: result.verification?.passed ?? null,
    verification_summary: result.verification?.summary || null,
    verification_claims: result.verification?.claims || [],
    long_form: result.longFormArticle || null,
    status: 'ready',
  };

  // Delete old drafts for this headline
  await supabase.from('drafts').delete().eq('headline_id', headline.id);

  const { error } = await supabase.from('drafts').insert(draft);
  if (error) throw new Error(`Draft save failed: ${error.message}`);

  // Mark headline as picked
  await supabase.from('headlines').update({ status: 'picked' }).eq('id', headline.id);

  // Save source suggestions
  if (result.suggestions?.length > 0) {
    for (const s of result.suggestions) {
      await supabase.from('source_suggestions').upsert(s, { onConflict: 'domain', ignoreDuplicates: true });
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  let headlineIds = [];
  if (args[0] === '--score') {
    const minScore = parseInt(args[1]) || 8;
    const { data } = await supabase
      .from('headlines')
      .select('id, ai_headline, ai_score')
      .eq('status', 'new')
      .gte('ai_score', minScore)
      .order('ai_score', { ascending: false });

    // Filter out ones that already have drafts
    for (const h of (data || [])) {
      const { data: existing } = await supabase.from('drafts').select('id').eq('headline_id', h.id).limit(1);
      if (!existing?.length) headlineIds.push(h.id);
    }
    console.log(`Found ${headlineIds.length} headlines with score >= ${minScore} without drafts`);
    (data || []).forEach(h => console.log(`  [${h.ai_score}] ${h.ai_headline}`));
  } else {
    headlineIds = args;
  }

  if (headlineIds.length === 0) {
    console.log('No headlines to process.');
    return;
  }

  const knownDomains = await getSources();
  console.log(`\nStarting research for ${headlineIds.length} headlines...\n`);

  for (const id of headlineIds) {
    try {
      const headline = await getHeadline(id);
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`  RESEARCHING: ${headline.ai_headline || headline.raw_title}`);
      console.log(`  Source: ${headline.source_name} | Score: ${headline.ai_score}`);
      console.log(`${'═'.repeat(60)}\n`);

      // Mark as processing
      await supabase.from('headlines').update({ status: 'processing' }).eq('id', id);

      const result = await runPipeline(headline, knownDomains);
      await saveDraft(headline, result);

      console.log(`\n✓ Draft saved: "${result.article.title}"`);
      console.log(`  Image: ${result.imageUrl ? '✓' : '✗'}`);
      console.log(`  Tokens: ${result.tokens?.totalTokens || '?'}`);
    } catch (err) {
      console.error(`\n✗ FAILED: ${id} — ${err.message}`);
      // Reset to new so it can be retried
      await supabase.from('headlines').update({ status: 'new' }).eq('id', id);
    }
  }

  console.log('\n✓ Batch complete.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
