# Deep Scoring + Frontend Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deep scoring phase after article writing so emotional metadata comes from the actual written content (not the raw headline), and simplify the frontend to one emotional dimension (antidote-only).

**Architecture:** The research-write pipeline gains a "Phase 8.5: Deep Score" after grammar check but before image generation. It scores the final written article and outputs `deep_antidote`, `deep_category`, `deep_score`. The API route saves these as the draft's authoritative metadata (replacing the headline's initial values). Both initial and deep scores are stored for future feedback loop analysis. On the frontend, the emotion toggle and emotion pills are removed — only antidote-based navigation remains. Categories stay visible on article cards and pages but are not a primary filter.

**Tech Stack:** Next.js 16, TypeScript, Supabase (PostgreSQL), Claude Agent SDK

**Spec:** `docs/superpowers/specs/2026-03-23-emotional-engagement-design.md` (updated by this plan)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/research-write/run.mjs` | Modify | Add Phase 8.5: Deep Score after grammar check |
| `app/api/research-write/route.ts` | Modify | Use deep scores for draft metadata, store initial scores too |
| `lib/db.ts` | Modify | Add `initial_score`, `initial_antidote`, `initial_category` to createDraft |
| `components/article-grid.tsx` | Modify | Remove emotion toggle, convert clouds to antidote-only, hide categories behind link |
| `components/emotion-tag.tsx` | Modify | Remove emotion pills, antidote-only display |
| `components/emotion-matched-articles.tsx` | Modify | Remove emotion pills from cards |
| `app/clanki/[slug]/page.tsx` | Modify | Remove emotion pills from header, use antidote-only tag |
| `lib/article-helpers.ts` | Modify | Remove unused EMOTION_CLOUD_COLORS, clean up |

---

### Task 1: Database Migration — Add Initial Score Columns

**Files:**
- Supabase SQL migration

- [ ] **Step 1: Add columns to drafts table**

```sql
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS initial_score integer;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS initial_antidote text;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS initial_category text;
```

- [ ] **Step 2: Add columns to articles table (for published articles feedback loop)**

```sql
ALTER TABLE articles ADD COLUMN IF NOT EXISTS initial_score integer;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS initial_antidote text;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS initial_category text;
```

- [ ] **Step 3: Verify columns exist**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'drafts' AND column_name LIKE 'initial_%';
```

---

### Task 2: Deep Scoring Phase in Pipeline

**Files:**
- Modify: `lib/research-write/run.mjs`

- [ ] **Step 1: Add the deep scoring prompt constant**

Add near the other prompt constants in the file (after the imports/setup section). The prompt should:
- Take the full written article (title, subtitle, body)
- Score it 0-10 for editorial quality/reader interest
- Assign one of the 6 antidote values based on what the article is ACTUALLY about
- Confirm or correct the category
- Be specific about what each antidote means

```javascript
const DEEP_SCORING_PROMPT = `Si uredniški ocenjevalec za Svetla Stran - SLOVENSKI portal dobrih novic.

Prebral boš DOKONČAN članek ki ga je napisala naša redakcija. Oceni ga na podlagi vsebine.

ANTIDOTE — izberi ENEGA ki NAJBOLJE opisuje jedro zgodbe:
- "jeza" = zgodba kjer nekdo izbere prijaznost, odpuščanje ali spravo NAMESTO konflikta ali maščevanja
- "skrb" = zgodba ki pokaže da so se stvari uredile, da sistem deluje, da je pomoč prišla pravočasno
- "cinizem" = zgodba ki dokaže da so ljudje nesebično dobri, brez skritih agend ali koristi
- "osamljenost" = zgodba o povezovanju, skupnosti, sosedih, tujcih ki postanejo prijatelji
- "obup" = zgodba o odpornosti, obnovi po nesreči, naravi ki se vrača, premagani oviri
- "strah" = zgodba o pogumu — običajni ljudje ki naredijo izredne stvari v težkih ali nevarnih situacijah

KATEGORIJA — potrdi ali popravi:
ZIVALI, SKUPNOST, SPORT, NARAVA, INFRASTRUKTURA, PODJETNISTVO, SLOVENIJA_V_SVETU, JUNAKI, KULTURA

OCENA 0-10:
- Ali bi ta zgodba bralca GANILA, NAVDUŠILA ali PRESENETILA?
- Ali je dobro napisana, zanimiva, vredna branja?
- Ali bi jo povedal prijatelju?

Vrni SAMO JSON brez markdown:
{
  "score": number,
  "antidote": "jeza"|"skrb"|"cinizem"|"osamljenost"|"obup"|"strah",
  "category": "ZIVALI" | "SKUPNOST" | "SPORT" | "NARAVA" | "INFRASTRUKTURA" | "PODJETNISTVO" | "SLOVENIJA_V_SVETU" | "JUNAKI" | "KULTURA",
  "reason": "max 2 stavka zakaj ta ocena in ta antidote"
}`;
```

- [ ] **Step 2: Add the deep scoring function**

Add a `deepScoreArticle` function that calls Claude with the written article:

```javascript
async function deepScoreArticle(article) {
  const userMsg = `Naslov: ${article.title}\nPodnaslov: ${article.subtitle}\n\nČlanek:\n${article.body}`;
  const text = await askClaude(DEEP_SCORING_PROMPT, userMsg);
  return extractJSON(text);
}
```

- [ ] **Step 3: Insert Phase 8.5 in the pipeline**

After the grammar check (Phase 8, which produces `finalArticle`) and BEFORE image generation (currently Phase 9), add:

```javascript
// PHASE 9.5: Deep Score (score the WRITTEN article, not the original headline)
log('Phase 8.5: Deep scoring written article...');
let deepScore = null;
try {
  deepScore = await deepScoreArticle(finalArticle);
  log(`  → Deep score: ${deepScore.score}/10 | Antidote: ${deepScore.antidote} | Category: ${deepScore.category}`);
  log(`  → Reason: ${deepScore.reason}`);
} catch (err) {
  log(`Deep scoring failed (non-fatal): ${err.message}`);
}
```

- [ ] **Step 4: Add deepScore to the pipeline output**

In the final `result` object (around line 571), add:

```javascript
deepScore,
```

So the result includes `result.deepScore` with `{ score, antidote, category, reason }`.

- [ ] **Step 5: Verify the pipeline still runs**

Test with a dry run or check that the file parses:
```bash
node -c lib/research-write/run.mjs && echo "syntax OK"
```

- [ ] **Step 6: Commit**

```bash
git add lib/research-write/run.mjs
git commit -m "feat: add deep scoring phase to research-write pipeline"
```

---

### Task 3: API Route — Use Deep Scores for Draft Metadata

**Files:**
- Modify: `app/api/research-write/route.ts`

- [ ] **Step 1: Update createDraft call to use deep scores**

Currently lines 63-65 use headline initial scores:
```typescript
category: story.ai?.category || story.ai_category,
emotions: story.ai?.emotions || story.ai_emotions || [],
antidote: story.ai?.antidote_for || story.ai_antidote,
```

Change to prefer deep scores, falling back to initial:
```typescript
// Deep scores (from written article) override initial headline scores
category: result.deepScore?.category || story.ai?.category || story.ai_category,
emotions: story.ai?.emotions || story.ai_emotions || [],
antidote: result.deepScore?.antidote || story.ai?.antidote_for || story.ai_antidote,
// Store initial scores for feedback loop
initial_score: story.ai?.score || story.ai_score || null,
initial_antidote: story.ai?.antidote_for || story.ai_antidote || null,
initial_category: story.ai?.category || story.ai_category || null,
```

Note: `emotions` stays from the initial score for now — it's not used on the frontend anymore (Task 5+6 remove it), but we keep it in the data.

Also store the deep score value:
```typescript
ai_score: result.deepScore?.score || story.ai?.score || story.ai_score || null,
```

Currently `ai_score` on published articles comes from the headline (fetched during `publishDraft`). We need `publishDraft` to prefer the draft's `ai_score` over the headline's. See Step 3.

- [ ] **Step 2: Update createDraft type in lib/db.ts**

In `lib/db.ts`, update the `createDraft` function's parameter type to accept:
```typescript
ai_score?: number | null;
initial_score?: number | null;
initial_antidote?: string | null;
initial_category?: string | null;
```

And include them in the insert object. If the `drafts` table doesn't have an `ai_score` column yet, add it:
```sql
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS ai_score integer;
```

- [ ] **Step 3: Update publishDraft to use draft's ai_score and copy initial_* fields**

In `lib/db.ts`, find `publishDraft()`. Currently it fetches `ai_score` from the linked headline record. Change it to prefer the draft's `ai_score` (which now has the deep score), falling back to the headline's score:

```typescript
// Before: ai_score comes from headline only
// After: prefer draft.ai_score (deep score), fallback to headline
ai_score: draft.ai_score || headlineScore || 0,
```

Also add `initial_score`, `initial_antidote`, `initial_category` to the fields copied from draft to article.

- [ ] **Step 4: Verify build passes**

```bash
cd C:\Svetla_Stran\Code && npx next build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add app/api/research-write/route.ts lib/db.ts
git commit -m "feat: use deep scores for draft metadata, store initial scores for feedback loop"
```

---

### Task 4: Simplify ArticleGrid — Antidote-Only Navigation

**Files:**
- Modify: `components/article-grid.tsx`

This is the key frontend simplification. Remove the emotion toggle and emotion clouds. The cloud buttons become the 6 antidote values. Categories are hidden behind a small link.

- [ ] **Step 1: Remove emotion toggle state and imports**

Remove:
- `filterMode` state (`useState<'temi' | 'obcutku'>`)
- `activeEmotion` state
- `EMOTION_CLOUD_COLORS` map
- `emotionCounts` memoization
- `handleEmotionChange` handler
- `useEffect` for `?obcutek=` URL param
- Imports for `EMOTION_LABELS`, `EMOTION_ICONS`, `EMOTION_COLORS`

Keep:
- `activeAntidote` state
- `EmotionSection` import and render
- `handleAntidoteSelect` handler
- `useEffect` for `?antidote=` URL param
- `ANTIDOTE_LABELS` import (for the heading)

- [ ] **Step 2: Remove the "Po temi / Po občutku" toggle from JSX**

Remove the toggle buttons and the conditional rendering (`filterMode === 'temi' ? ... : ...`). The cloud buttons should ALWAYS show categories.

- [ ] **Step 3: Add a "Po temi ›" reveal link for categories**

Replace the always-visible category clouds with a collapsible section. Categories are hidden by default, revealed by clicking "Po temi ›":

```tsx
const [showCategories, setShowCategories] = useState(false);
```

After the EmotionSection and before the article grid, add:
```tsx
<div className="flex justify-center mb-4">
  <button
    onClick={() => setShowCategories(!showCategories)}
    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
  >
    {showCategories ? '✕ Skrij teme' : '📂 Po temi ›'}
  </button>
</div>
{showCategories && (
  /* existing category cloud buttons here */
)}
```

- [ ] **Step 4: Remove emotion filtering from the filtered memoization**

Remove the `activeEmotion` filter branch. Keep only `activeCategory`, `activeAntidote`, and `searchQuery` filters.

- [ ] **Step 5: Clean up antidote heading**

The antidote heading (when a filter is active) should use the ANTIDOTE_LABELS to show the positive label, not the poison name:
```tsx
{activeAntidote && ANTIDOTE_LABELS[activeAntidote] && (
  <p className="mb-4 text-center text-sm text-muted-foreground">
    {ANTIDOTE_LABELS[activeAntidote].label} — {filtered.length} {filtered.length === 1 ? 'zgodba' : 'zgodb'}
  </p>
)}
```

- [ ] **Step 6: Verify visually**

Run dev server. Homepage should show:
- "Kaj potrebuješ danes?" with 6 antidote cards
- Small "Po temi ›" link below (categories hidden by default)
- Clicking antidote card filters the grid
- Clicking "Po temi ›" reveals category clouds
- NO emotion toggle, NO emotion clouds

- [ ] **Step 7: Commit**

```bash
git add components/article-grid.tsx
git commit -m "feat: simplify to antidote-only navigation, hide categories behind reveal link"
```

---

### Task 5: Simplify EmotionTag — Antidote Only

**Files:**
- Modify: `components/emotion-tag.tsx`

- [ ] **Step 1: Remove emotion pills rendering**

The component should ONLY render the antidote line ("Zdravilo za cinizem"). Remove the emotion pills loop entirely. Rename the component to `AntidoteTag` for clarity (update all imports).

Actually — simpler: keep the name `EmotionTag` to avoid import churn, but strip the emotion pills:

```tsx
import { ANTIDOTE_LABELS, ANTIDOTE_COLORS } from '@/lib/article-helpers';

interface EmotionTagProps {
  antidote?: string | null;
}

export function EmotionTag({ antidote }: EmotionTagProps) {
  if (!antidote || !ANTIDOTE_LABELS[antidote]) return null;

  return (
    <span className={`text-sm font-medium ${ANTIDOTE_COLORS[antidote].text}`}>
      Zdravilo za {antidote}
    </span>
  );
}
```

- [ ] **Step 2: Update all EmotionTag usages**

Find all places EmotionTag is used and remove `emotions` and `showAntidoteLine` props:
- `app/clanki/[slug]/page.tsx` header — change `<EmotionTag antidote={article.ai.antidote_for} emotions={article.ai.emotions} showAntidoteLine={true} />` to `<EmotionTag antidote={article.ai.antidote_for} />`
- End-of-article emotional tag section in same file — the section currently has BOTH a `<p>` tag with "Ta zgodba je zdravilo za {antidote}" AND an `<EmotionTag>`. Since the simplified EmotionTag now renders the same text, remove the standalone `<p>` tag and keep only `<EmotionTag antidote={article.ai.antidote_for} />`. Or simplify the entire block to just use EmotionTag centered in the card.
- `components/emotion-matched-articles.tsx` — remove `<EmotionTag emotions={article.ai.emotions} />` line entirely (no emotion pills on cards per user request)

- [ ] **Step 3: Verify build passes**

```bash
cd C:\Svetla_Stran\Code && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add components/emotion-tag.tsx app/clanki/\\[slug\\]/page.tsx components/emotion-matched-articles.tsx
git commit -m "feat: simplify EmotionTag to antidote-only, remove emotion pills"
```

---

### Task 6: Clean Up Unused Emotion Constants

**Files:**
- Modify: `lib/article-helpers.ts`
- Modify: `components/article-grid.tsx` (remove unused imports)

- [ ] **Step 1: Remove unused exports from article-helpers.ts**

Remove these constants (no longer used on frontend after Tasks 4-5):
- `EMOTION_ICONS` — only if grep confirms no remaining imports
- `EMOTION_COLORS` — only if grep confirms no remaining imports

Keep:
- `EMOTION_LABELS` — still used for the emotion cloud colors mapping? Check. If NOT used anywhere, remove.
- `ANTIDOTE_LABELS` — used by EmotionSection and ArticleGrid
- `ANTIDOTE_COLORS` — used by EmotionSection and EmotionTag

**Before removing, grep each export to verify no remaining usage:**
```bash
grep -r "EMOTION_ICONS" --include="*.tsx" --include="*.ts" components/ app/ lib/
grep -r "EMOTION_COLORS" --include="*.tsx" --include="*.ts" components/ app/ lib/
grep -r "EMOTION_LABELS" --include="*.tsx" --include="*.ts" components/ app/ lib/
```

Only remove constants with zero remaining imports.

- [ ] **Step 2: Remove EMOTION_CLOUD_COLORS from article-grid.tsx**

This map was added in Task 4 of the previous plan and is no longer needed.

- [ ] **Step 3: Verify build passes**

```bash
cd C:\Svetla_Stran\Code && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add lib/article-helpers.ts components/article-grid.tsx
git commit -m "chore: remove unused emotion constants and imports"
```

---

### Task 7: Update Emotion-Matched Articles Query

**Files:**
- Modify: `lib/db.ts`

- [ ] **Step 1: Update getEmotionMatchedArticles to use antidote instead of emotions**

The hybrid matching strategy should now use `antidote` (single value) instead of `emotions` (array overlap). This is simpler and matches the frontend's antidote-only navigation:

```typescript
export async function getEmotionMatchedArticles(
  currentSlug: string,
  antidote: string | null,
  category: string | null,
  limit: number = 3
): Promise<any[]> {
  const supabase = getSupabaseAdmin();

  if (!antidote) {
    // Fallback: category-only
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .neq('slug', currentSlug)
      .eq('category', category)
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  // Best: same antidote + same category
  const { data: bestMatch, error: e1 } = await supabase
    .from('articles')
    .select('*')
    .neq('slug', currentSlug)
    .eq('antidote', antidote)
    .eq('category', category)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (e1) throw e1;

  if (bestMatch && bestMatch.length >= limit) return bestMatch;

  // Good: same antidote, any category
  const excludeSlugs = [currentSlug, ...(bestMatch || []).map((a: any) => a.slug)];
  const { data: antidoteMatch, error: e2 } = await supabase
    .from('articles')
    .select('*')
    .not('slug', 'in', `(${excludeSlugs.join(',')})`)
    .eq('antidote', antidote)
    .order('published_at', { ascending: false })
    .limit(limit - (bestMatch?.length || 0));
  if (e2) throw e2;

  const combined = [...(bestMatch || []), ...(antidoteMatch || [])];
  if (combined.length >= limit) return combined.slice(0, limit);

  // Fallback: category-only
  const usedSlugs = [currentSlug, ...combined.map((a: any) => a.slug)];
  const { data: categoryFill, error: e3 } = await supabase
    .from('articles')
    .select('*')
    .not('slug', 'in', `(${usedSlugs.join(',')})`)
    .eq('category', category)
    .order('published_at', { ascending: false })
    .limit(limit - combined.length);
  if (e3) throw e3;

  return [...combined, ...(categoryFill || [])].slice(0, limit);
}
```

- [ ] **Step 2: Update the caller in article page**

In `app/clanki/[slug]/page.tsx`, update the call:
```typescript
// Before:
const emotionMatched = await getEmotionMatchedArticles(
  article.slug,
  article.ai.emotions || [],
  article.ai.category || null,
  3
);

// After:
const emotionMatched = await getEmotionMatchedArticles(
  article.slug,
  article.ai.antidote_for,
  article.ai.category || null,
  3
);
```

- [ ] **Step 3: Verify build passes**

```bash
cd C:\Svetla_Stran\Code && npx next build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add lib/db.ts app/clanki/\\[slug\\]/page.tsx
git commit -m "feat: switch related articles matching from emotions to antidote"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Full build check**

```bash
cd C:\Svetla_Stran\Code && npx next build 2>&1 | tail -15
```

- [ ] **Step 2: Visual smoke test — Homepage**

Check:
- "Kaj potrebuješ danes?" with 6 antidote cards
- NO emotion toggle, NO "Po temi / Po občutku"
- Small "Po temi ›" link below antidote section
- Clicking link reveals category clouds
- Clicking antidote card filters grid
- Articles still show category pills on cards (unchanged)
- "Dnevna doza" newsletter at bottom

- [ ] **Step 3: Visual smoke test — Article page**

Check:
- "Zdravilo za X" text in header (no emotion pills)
- End-of-article: antidote tag → related articles (no emotion pills on cards) → share → afterglow signup → comments
- Mid-article whisper still works

- [ ] **Step 4: Pipeline syntax check**

```bash
node -c lib/research-write/run.mjs && echo "syntax OK"
```

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: final integration fixes"
```
