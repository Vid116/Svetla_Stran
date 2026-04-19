#!/usr/bin/env node
/**
 * VPS Worker — HTTP server that runs the research-write pipeline.
 * Called by Vercel when user clicks "Raziskuj in napiši".
 *
 * Usage: node scripts/worker.mjs
 * Listens on PORT (default 3001).
 *
 * Endpoints:
 *   POST /research-write  — run pipeline for a headline (auth required)
 *   GET  /health           — health check
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import http from 'node:http';
import { spawn } from 'node:child_process';
import postgres from 'postgres';
import { reconcileSundayReserve } from '../lib/research-write/sunday-reserve.mjs';

const PORT = process.env.WORKER_PORT || 3001;
const SECRET = process.env.WORKER_SECRET;
const sql = postgres(process.env.NEON_DB_URL, { ssl: 'require', max: 3 });

if (!SECRET) {
  console.error('Missing WORKER_SECRET in .env.local');
  process.exit(1);
}

// ── DB helpers (same logic as lib/db.ts) ─────────────────────────────────────

async function setHeadlineProcessing(id) {
  await sql`UPDATE headlines SET status = 'processing' WHERE id = ${id}`;
}

async function pickHeadline(id) {
  await sql`UPDATE headlines SET status = 'picked' WHERE id = ${id}`;
}

async function deleteDraftsByHeadlineId(id) {
  await sql`DELETE FROM drafts WHERE headline_id = ${id}`;
}

async function getSources() {
  return sql`SELECT * FROM sources WHERE active = true`;
}

async function getHeadlineScore(id) {
  const rows = await sql`SELECT ai_score FROM headlines WHERE id = ${id}`;
  return rows[0]?.ai_score ?? null;
}

async function dismissHeadline(id, reason) {
  await sql`UPDATE headlines SET status = 'dismissed', dismissed_reason = ${reason} WHERE id = ${id}`;
}

async function resetHeadline(id) {
  await sql`UPDATE headlines SET status = 'new' WHERE id = ${id}`;
}

async function createDraft(draft) {
  // Sanitize slug
  if (draft.slug) {
    draft.slug = draft.slug
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  const rows = await sql`
    INSERT INTO drafts (
      headline_id, title, subtitle, body, slug, image_url, category, emotions, antidote,
      antidote_secondary, source_name, source_url, research_queries, research_sources_found,
      research_sources_used, research_references, verification_passed, verification_summary,
      verification_claims, long_form, ai_image_url, image_prompt, ai_score,
      initial_score, initial_antidote, initial_category, themes, status,
      sunday_fit_score, sunday_fit_dimensions
    ) VALUES (
      ${draft.headline_id}, ${draft.title}, ${draft.subtitle || null}, ${draft.body}, ${draft.slug},
      ${draft.image_url || null}, ${draft.category || null}, ${draft.emotions || []}, ${draft.antidote || null},
      ${draft.antidote_secondary ?? null}, ${draft.source_name || null}, ${draft.source_url || null},
      ${draft.research_queries || []}, ${draft.research_sources_found ?? null},
      ${draft.research_sources_used ?? null}, ${draft.research_references ? (typeof draft.research_references === 'string' ? draft.research_references : JSON.stringify(draft.research_references)) : null}::jsonb,
      ${draft.verification_passed ?? null}, ${draft.verification_summary || null},
      ${draft.verification_claims ? (typeof draft.verification_claims === 'string' ? draft.verification_claims : JSON.stringify(draft.verification_claims)) : null}::jsonb,
      ${draft.long_form ? (typeof draft.long_form === 'string' ? draft.long_form : JSON.stringify(draft.long_form)) : null}::jsonb,
      ${draft.ai_image_url || null}, ${draft.image_prompt || null}, ${draft.ai_score != null ? Math.round(draft.ai_score) : null},
      ${draft.initial_score ?? null}, ${draft.initial_antidote ?? null}, ${draft.initial_category ?? null},
      ${draft.themes || []},
      'ready',
      ${draft.sunday_fit_score ?? null},
      ${draft.sunday_fit_dimensions ? JSON.stringify(draft.sunday_fit_dimensions) : null}::jsonb
    ) RETURNING id
  `;
  return rows[0]?.id || null;
}

async function addSourceSuggestion(s) {
  const existing = await sql`SELECT id, status, confidence FROM source_suggestions WHERE domain = ${s.domain}`;
  if (existing.length > 0) {
    if (existing[0].status === 'pending') {
      const newConf = Math.min(1.0, (existing[0].confidence || 0) + 0.15);
      await sql`UPDATE source_suggestions SET confidence = ${newConf}, reason = ${s.reason || null} WHERE id = ${existing[0].id}`;
    }
    return;
  }
  await sql`
    INSERT INTO source_suggestions (domain, name, url, rss_url, suggested_type, category, reason, confidence, headline_id)
    VALUES (${s.domain}, ${s.name || null}, ${s.url}, ${s.rss_url || null}, ${s.suggested_type || 'unknown'},
            ${s.category || null}, ${s.reason || null}, ${s.confidence || 0}, ${s.headline_id || null})
    ON CONFLICT (domain) DO NOTHING
  `;
}

// ── Pipeline runner ──────────────────────────────────────────────────────────

function runResearchScript(story) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['lib/research-write/run.mjs'], {
      cwd: '/opt/svetla-stran',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: Object.fromEntries(
        Object.entries(process.env).filter(([k]) => k !== 'CLAUDECODE' && k !== 'ANTHROPIC_API_KEY')
      ),
    });

    child.stdin.write(JSON.stringify(story));
    child.stdin.end();

    const stdout = [];
    const stderr = [];

    child.stdout.on('data', (d) => stdout.push(d));
    child.stderr.on('data', (d) => {
      stderr.push(d);
      process.stderr.write(d);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Pipeline failed (code ${code}): ${Buffer.concat(stderr).toString().slice(-300)}`));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(stdout).toString()));
      } catch (e) {
        reject(new Error(`Failed to parse output: ${e.message}`));
      }
    });

    child.on('error', (err) => reject(new Error(`Spawn failed: ${err.message}`)));
  });
}

// ── Handle research-write job ────────────────────────────────────────────────

async function handleResearchWrite(story) {
  const headlineId = story.headlineId || story.storyId;

  try {
    // Prep
    if (headlineId) {
      await deleteDraftsByHeadlineId(headlineId);
      await setHeadlineProcessing(headlineId);
    }

    // Add known domains
    const sources = await getSources();
    story._knownDomains = sources.map(s => {
      try { return new URL(s.url).hostname.replace(/^www\./, ''); } catch { return ''; }
    }).filter(Boolean);

    // Get initial score
    const headlineInitialScore = headlineId ? await getHeadlineScore(headlineId) : null;

    // Run pipeline
    const result = await runResearchScript(story);

    // Dedup: skip
    if (result.skipped) {
      if (headlineId) await dismissHeadline(headlineId, result.reason);
      console.log(`[Worker] Skipped (dedup): ${story.rawTitle?.slice(0, 50)}`);
      return;
    }

    // Save draft
    if (headlineId && result.article) {
      await pickHeadline(headlineId);
      const draftId = await createDraft({
        headline_id: headlineId,
        title: result.article.title,
        subtitle: result.article.subtitle,
        body: result.article.body,
        slug: result.article.slug,
        image_url: result.imageUrl || null,
        ai_image_url: result.aiImageUrl || null,
        image_prompt: result.imagePrompt || null,
        category: result.deepScore?.category || story.ai_category,
        emotions: story.ai_emotions || [],
        antidote: result.deepScore?.antidote || story.ai_antidote,
        antidote_secondary: result.deepScore?.antidote_secondary || null,
        ai_score: Math.round(result.deepScore?.score || headlineInitialScore || 0) || null,
        initial_score: headlineInitialScore,
        initial_antidote: story.ai_antidote || null,
        initial_category: story.ai_category || null,
        source_name: story.source_name,
        source_url: story.source_url,
        research_queries: result.research?.queriesUsed || [],
        research_sources_found: result.research?.sourcesFound || 0,
        research_sources_used: result.research?.sourcesUsed || 0,
        research_references: result.research?.references || [],
        verification_passed: result.verification?.passed ?? null,
        verification_summary: result.verification?.summary || null,
        verification_claims: result.verification?.claims || [],
        long_form: result.longFormArticle || null,
        themes: Array.isArray(result.deepScore?.themes) ? result.deepScore.themes : [],
        sunday_fit_score: result.sundayFit?.score ?? null,
        sunday_fit_dimensions: result.sundayFit
          ? { dimensions: result.sundayFit.dimensions, rationale: result.sundayFit.rationale }
          : null,
      });

      // Reconcile Sunday reserve if this draft has long-form + positive score
      if (draftId && result.longFormArticle && result.sundayFit?.score > 0) {
        try {
          const outcome = await reconcileSundayReserve(sql, draftId, result.sundayFit.score);
          console.log(`[Worker] Sunday reserve: ${outcome.action} (score ${outcome.score}/100, target ${outcome.targetDate || 'n/a'})`);
        } catch (err) {
          console.error(`[Worker] Sunday reserve reconcile failed: ${err.message}`);
        }
      }
    }

    // Source suggestions
    if (result.suggestions?.length) {
      for (const s of result.suggestions) {
        try { await addSourceSuggestion(s); } catch {}
      }
    }

    console.log(`[Worker] Done: "${result.article?.title?.slice(0, 50)}"`);
  } catch (err) {
    console.error(`[Worker] Error: ${err.message}`);
    if (headlineId) {
      try { await resetHeadline(headlineId); } catch {}
    }
  }
}

// ── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
    return;
  }

  // Auth check
  if (req.headers['x-worker-secret'] !== SECRET) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  // Research-write endpoint
  if (req.method === 'POST' && req.url === '/research-write') {
    let body = '';
    for await (const chunk of req) body += chunk;

    let story;
    try {
      story = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    // Respond immediately — job runs in background
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, queued: true }));

    // Run in background
    handleResearchWrite(story);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[Worker] Listening on port ${PORT}`);
  console.log(`[Worker] Health: http://localhost:${PORT}/health`);
});
