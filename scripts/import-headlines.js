const fs = require('fs');
const crypto = require('crypto');

const SUPABASE_URL = 'https://qrhlbzbcosnddilaxlwi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

async function supabaseInsert(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/headlines`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(rows)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insert failed (${res.status}): ${text}`);
  }
  return rows.length;
}

async function main() {
  const data = JSON.parse(fs.readFileSync('C:/Svetla_Stran/Code/output/inbox.json', 'utf8'));
  console.log(`Loaded ${data.length} stories from inbox.json`);

  const mapped = data.map(s => ({
    raw_title: s.rawTitle,
    raw_content: s.rawContent || null,
    full_content: s.fullContent || null,
    source_url: s.sourceUrl,
    source_name: s.sourceName,
    content_hash: crypto.createHash('sha256').update(s.sourceUrl).digest('hex'),
    ai_score: s.ai?.score ?? null,
    ai_emotions: s.ai?.emotions || [],
    ai_reason: s.ai?.reason || null,
    ai_category: s.ai?.category || s.category || null,
    ai_headline: s.ai?.headline_suggestion || null,
    ai_antidote: s.ai?.antidote_for || null,
    ai_rejected_because: s.ai?.rejected_because || null,
    status: 'new'
  }));

  // Insert in batches of 20
  const BATCH = 20;
  let total = 0;
  for (let i = 0; i < mapped.length; i += BATCH) {
    const batch = mapped.slice(i, i + BATCH);
    const count = await supabaseInsert(batch);
    total += count;
    console.log(`  Batch ${Math.floor(i/BATCH)+1}: inserted ${count} (total: ${total})`);
  }

  console.log(`\nDone! Inserted ${total} headlines.`);
}

main().catch(e => { console.error(e); process.exit(1); });
