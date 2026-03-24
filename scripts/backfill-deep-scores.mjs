#!/usr/bin/env node
/**
 * Backfill deep scores for drafts that don't have one yet.
 * Reads each draft's article text and runs the deep scoring prompt.
 *
 * Usage: node scripts/backfill-deep-scores.mjs [--dry-run] [--limit N]
 */
delete process.env.CLAUDECODE;
delete process.env.ANTHROPIC_API_KEY;

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config({ path: '.env' });

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit'));
const LIMIT = LIMIT_ARG ? parseInt(process.argv[process.argv.indexOf(LIMIT_ARG) + 1]) : 999;
const DELAY_MS = 3000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Import Agent SDK
const { query } = await import('@anthropic-ai/claude-agent-sdk');

const DEEP_SCORING_PROMPT = `Si uredniški ocenjevalec za Svetla Stran - SLOVENSKI portal dobrih novic.

Prebral boš DOKONČAN članek ki ga je napisala naša redakcija. Oceni ga na podlagi vsebine.

ANTIDOTE — izberi ENEGA ki NAJBOLJE opisuje jedro zgodbe, in opcijsko SEKUNDARNEGA:
- "jeza" = zgodba kjer nekdo izbere prijaznost, odpuščanje ali spravo NAMESTO konflikta ali maščevanja
- "skrb" = zgodba ki pokaže da so se stvari uredile, da sistem deluje, da je pomoč prišla pravočasno
- "cinizem" = zgodba ki dokaže da so ljudje nesebično dobri, brez skritih agend ali koristi
- "osamljenost" = zgodba o povezovanju, skupnosti, sosedih, tujcih ki postanejo prijatelji
- "obup" = zgodba o vztrajnosti, obnovi po nesreči, naravi ki se vrača, premagani oviri
- "strah" = zgodba o pogumu — običajni ljudje ki naredijo izredne stvari v težkih ali nevarnih situacijah
- "dolgcas" = zgodba ki te nasmeje, ogreje srce, instant smile — živali, otroci, simpatični trenutki

KATEGORIJA — potrdi ali popravi:
ZIVALI, SKUPNOST, SPORT, NARAVA, INFRASTRUKTURA, PODJETNISTVO, SLOVENIJA_V_SVETU, JUNAKI, KULTURA

OCENA 0-10:
- Ali bi ta zgodba bralca GANILA, NAVDUŠILA ali PRESENETILA?
- Ali je dobro napisana, zanimiva, vredna branja?
- Ali bi jo povedal prijatelju?

Vrni SAMO JSON brez markdown:
{
  "score": number,
  "antidote": "jeza"|"skrb"|"cinizem"|"osamljenost"|"obup"|"strah"|"dolgcas",
  "antidote_secondary": null | "jeza"|"skrb"|"cinizem"|"osamljenost"|"obup"|"strah"|"dolgcas",
  "category": "ZIVALI"|"SKUPNOST"|"SPORT"|"NARAVA"|"INFRASTRUKTURA"|"PODJETNISTVO"|"SLOVENIJA_V_SVETU"|"JUNAKI"|"KULTURA",
  "reason": "max 2 stavka zakaj ta ocena in ta antidote"
}`;

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

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  BACKFILL DEEP SCORES`);
  console.log(`  ${new Date().toLocaleString('sl-SI')}`);
  if (DRY_RUN) console.log(`  ** DRY RUN **`);
  console.log(`${'═'.repeat(60)}\n`);

  const { data: drafts, error } = await supabase
    .from('drafts')
    .select('id, title, subtitle, body, category, antidote, ai_score')
    .eq('status', 'ready')
    .order('created_at', { ascending: false });

  if (error) { console.error('DB error:', error.message); process.exit(1); }

  const needsScore = drafts.filter(d => d.ai_score == null).slice(0, LIMIT);
  console.log(`Found ${needsScore.length} drafts without deep scores (of ${drafts.length} total)\n`);

  if (needsScore.length === 0) { console.log('Nothing to do.'); return; }

  let success = 0, failed = 0;

  for (let i = 0; i < needsScore.length; i++) {
    const draft = needsScore[i];
    const prefix = `[${i + 1}/${needsScore.length}]`;
    console.log(`${prefix} "${draft.title.slice(0, 55)}..."`);

    if (DRY_RUN) { console.log(`${prefix} → DRY RUN`); continue; }

    try {
      const userMsg = `Naslov: ${draft.title}\nPodnaslov: ${draft.subtitle || ''}\n\nČlanek:\n${draft.body}`;
      const text = await askClaude(DEEP_SCORING_PROMPT, userMsg);
      const score = extractJSON(text);

      console.log(`${prefix} → ${score.score}/10 | ${score.antidote}${score.antidote_secondary ? ' + ' + score.antidote_secondary : ''} | ${score.category} | ${score.reason?.slice(0, 60)}`);

      const { error: updateErr } = await supabase.from('drafts').update({
        ai_score: score.score,
        antidote: score.antidote,
        antidote_secondary: score.antidote_secondary || null,
        category: score.category,
        // Store old values as initial (for feedback loop)
        initial_score: draft.ai_score || null,
        initial_antidote: draft.antidote || null,
        initial_category: draft.category || null,
      }).eq('id', draft.id);

      if (updateErr) { console.error(`${prefix} ✗ DB: ${updateErr.message}`); failed++; }
      else { success++; }
    } catch (err) {
      console.error(`${prefix} ✗ ${err.message}`);
      failed++;
    }

    if (i + 1 < needsScore.length) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  DONE: ${success} scored, ${failed} failed, ${needsScore.length} total`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
