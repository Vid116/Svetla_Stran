/**
 * Semantic dedup — checks candidates against recently published/drafted/processing stories.
 * Uses Claude haiku for cheap, accurate same-event detection.
 * Category-aware: only compares against related categories.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

delete process.env.CLAUDECODE;
delete process.env.ANTHROPIC_API_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Related categories — a story in one might duplicate a story in another
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

const DEDUP_WINDOW_HOURS = 72; // 3 days

/**
 * Fetch the dedup pool: recent articles, drafts, and in-progress headlines.
 * Returns a flat array of { title, subtitle, category, source } objects.
 */
async function fetchDedupPool() {
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const [{ data: articles }, { data: drafts }, { data: headlines }] = await Promise.all([
    supabase
      .from('articles')
      .select('title, subtitle, category')
      .gte('published_at', cutoff),
    supabase
      .from('drafts')
      .select('title, subtitle, category')
      .gte('created_at', cutoff),
    supabase
      .from('headlines')
      .select('ai_headline, ai_reason, ai_category')
      .in('status', ['picked', 'processing'])
      .gte('created_at', cutoff),
  ]);

  const pool = [];

  for (const a of articles || []) {
    pool.push({ title: a.title, subtitle: a.subtitle || '', category: a.category, source: 'article' });
  }
  for (const d of drafts || []) {
    pool.push({ title: d.title, subtitle: d.subtitle || '', category: d.category, source: 'draft' });
  }
  for (const h of headlines || []) {
    pool.push({ title: h.ai_headline, subtitle: h.ai_reason || '', category: h.ai_category, source: 'headline' });
  }

  return pool;
}

/**
 * Check candidates against the dedup pool using Claude haiku.
 * Returns an array of { id, isDuplicate, duplicateOf } for each candidate.
 *
 * @param {Array<{id: string, title: string, category: string}>} candidates
 * @returns {Promise<Array<{id: string, isDuplicate: boolean, duplicateOf: string|null}>>}
 */
export async function checkDuplicates(candidates) {
  if (candidates.length === 0) return [];

  const pool = await fetchDedupPool();
  console.log(`[Dedup] Pool: ${pool.length} existing stories (${DEDUP_WINDOW_HOURS}h window)`);

  if (pool.length === 0) {
    console.log('[Dedup] Empty pool, all candidates are unique.');
    return candidates.map(c => ({ id: c.id, isDuplicate: false, duplicateOf: null }));
  }

  // Group candidates by category
  const categoryGroups = new Map();
  for (const c of candidates) {
    const cat = c.category || 'UNKNOWN';
    if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
    categoryGroups.get(cat).push(c);
  }

  // Import Claude agent SDK
  const { query } = await import('@anthropic-ai/claude-agent-sdk');

  async function askHaiku(systemPrompt, userMessage) {
    let result = '';
    for await (const msg of query({
      prompt: userMessage,
      options: {
        model: 'haiku',
        systemPrompt,
        maxTurns: 1,
        tools: [],
        allowedTools: [],
      },
    })) {
      if (msg.type === 'result' && msg.subtype === 'success') result = msg.result;
    }
    return result;
  }

  const SYSTEM_PROMPT = `Si pomočnik za odkrivanje duplikatov novic. Primerjaš kandidate z obstoječimi zgodbami.

Kandidat je DUPLIKAT če gre za ISTI DOGODEK: isti akter, isti rezultat, ista zgodba, čeprav z drugačnim naslovom ali iz drugega vira.
Kandidat NI duplikat če gre za NOVEJŠI RAZVOJ iste teme (npr. kvalifikacije → finale) ali za drugo osebo/dogodek v istem področju.

Vrni SAMO JSON brez markdown:
{"results": [{"id": "A", "duplicate_of": number | null}]}

duplicate_of = zaporedna številka obstoječe zgodbe, ali null če ni duplikat.`;

  const allResults = [];

  for (const [cat, group] of categoryGroups) {
    // Get related categories for this group
    const relatedCats = RELATED_CATEGORIES[cat] || [cat];

    // Filter pool to related categories only
    const relevantPool = pool.filter(p => relatedCats.includes(p.category));

    if (relevantPool.length === 0) {
      // No existing stories in related categories — all unique
      allResults.push(...group.map(c => ({ id: c.id, isDuplicate: false, duplicateOf: null })));
      continue;
    }

    // Build the prompt
    const poolList = relevantPool
      .map((p, i) => `${i + 1}. "${p.title}" — ${p.subtitle}`)
      .join('\n');

    const candidateList = group
      .map((c, i) => `${String.fromCharCode(65 + i)}. "${c.title}"`)
      .join('\n');

    const userMsg = `OBSTOJEČE ZGODBE:\n${poolList}\n\nKANDIDATI:\n${candidateList}`;

    try {
      const text = await askHaiku(SYSTEM_PROMPT, userMsg);
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      const parsed = JSON.parse(cleaned.slice(start, end + 1));

      for (const r of parsed.results || []) {
        const letterIndex = r.id.charCodeAt(0) - 65;
        const candidate = group[letterIndex];
        if (!candidate) continue;

        if (r.duplicate_of !== null && r.duplicate_of !== undefined) {
          const dupIdx = r.duplicate_of - 1;
          const dupTitle = relevantPool[dupIdx]?.title || '?';
          allResults.push({ id: candidate.id, isDuplicate: true, duplicateOf: dupTitle });
          console.log(`[Dedup] ✗ "${candidate.title}" → duplikat: "${dupTitle}"`);
        } else {
          allResults.push({ id: candidate.id, isDuplicate: false, duplicateOf: null });
        }
      }

      // Any candidates not in the response = unique
      for (let i = 0; i < group.length; i++) {
        if (!allResults.find(r => r.id === group[i].id)) {
          allResults.push({ id: group[i].id, isDuplicate: false, duplicateOf: null });
        }
      }
    } catch (e) {
      console.error(`[Dedup] Error for category ${cat}: ${e.message}`);
      // On error, assume all unique (don't block the pipeline)
      allResults.push(...group.map(c => ({ id: c.id, isDuplicate: false, duplicateOf: null })));
    }
  }

  const dupes = allResults.filter(r => r.isDuplicate).length;
  const unique = allResults.filter(r => !r.isDuplicate).length;
  console.log(`[Dedup] Result: ${unique} unique, ${dupes} duplicates`);

  return allResults;
}
