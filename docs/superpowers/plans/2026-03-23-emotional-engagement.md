# Emotional Engagement & Visitor Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface emotional metadata (antidote/emotions) throughout the site and redesign the end-of-article experience to hook first-time visitors.

**Architecture:** Add an emotional navigation layer on top of existing category-based browsing. New components render emotion data already present in the DB. The homepage gains a "Kaj potrebuješ danes?" section and a category↔emotion toggle. Article pages show emotion context in headers and use emotion-matched related articles. Newsletter touchpoints are reframed as "Dnevna doza" with three distinct voices.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind, Supabase (PostgreSQL)

**Spec:** `docs/superpowers/specs/2026-03-23-emotional-engagement-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/article-helpers.ts` | Modify | Add emotion/antidote label maps, color maps, icon maps |
| `components/emotion-tag.tsx` | Create | Reusable antidote tag + emotion pills component |
| `components/emotion-section.tsx` | Create | "Kaj potrebuješ danes?" homepage cards |
| `components/emotion-matched-articles.tsx` | Create | End-of-article emotion-matched article cards |
| `components/article-grid.tsx` | Modify | Add emotion toggle, antidote filter support, render EmotionSection |
| `app/page.tsx` | Modify | Pass antidote filter param, reframe newsletter |
| `app/clanki/[slug]/page.tsx` | Modify | Emotion header, new end-of-article flow, hybrid related articles |
| `components/newsletter-signup.tsx` | Modify | Reframe copy to "Dnevna doza" with invitation/afterglow variants |
| `components/mid-article-cta.tsx` | Rewrite | Whisper variant (minimal link, not form) |
| `components/sticky-subscribe-bar.tsx` | Delete | Removed per spec |
| `lib/db.ts` | Modify | Add emotion-matched related articles query |

---

### Task 1: Emotion Helper Constants

**Files:**
- Modify: `lib/article-helpers.ts`

- [ ] **Step 1: Add emotion label, icon, and color maps**

Add after the existing `CATEGORY_ACCENT_BAR` map (~line 49):

```typescript
// ── Emotion helpers ──────────────────────────────────────

export const EMOTION_LABELS: Record<string, string> = {
  PONOS: 'Ponos',
  TOPLINA: 'Toplina',
  OLAJSANJE: 'Olajšanje',
  CUDESENJE: 'Čudenje',
  UPANJE: 'Upanje',
};

export const EMOTION_ICONS: Record<string, string> = {
  PONOS: '💪',
  TOPLINA: '💛',
  OLAJSANJE: '😌',
  CUDESENJE: '✨',
  UPANJE: '☀️',
};

export const EMOTION_COLORS: Record<string, { bg: string; text: string; cloud: string }> = {
  UPANJE: { bg: 'bg-sky-100', text: 'text-sky-700', cloud: 'sky' },
  TOPLINA: { bg: 'bg-amber-100', text: 'text-amber-700', cloud: 'warmth' },
  PONOS: { bg: 'bg-yellow-100', text: 'text-yellow-700', cloud: 'gold' },
  CUDESENJE: { bg: 'bg-purple-100', text: 'text-purple-700', cloud: 'lavender' },
  OLAJSANJE: { bg: 'bg-green-100', text: 'text-green-700', cloud: 'nature' },
};

export const ANTIDOTE_LABELS: Record<string, { label: string; oneLiner: string }> = {
  jeza: { label: 'Prijaznost', oneLiner: 'Za trenutke ko svet kliče po razumu' },
  skrb: { label: 'Upanje', oneLiner: 'Za trenutke ko prihodnost skrbi' },
  cinizem: { label: 'Dobrota', oneLiner: 'Za trenutke ko dvomiš v ljudi' },
  osamljenost: { label: 'Povezanost', oneLiner: 'Za trenutke ko se čutiš sam' },
  obup: { label: 'Odpornost', oneLiner: 'Za trenutke ko je vsega preveč' },
  strah: { label: 'Pogum', oneLiner: 'Za trenutke ko se svet zdi nevaren' },
};

export const ANTIDOTE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  jeza: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  skrb: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  cinizem: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  osamljenost: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  obup: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  strah: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};
```

- [ ] **Step 2: Verify build passes**

Run: `cd C:\Svetla_Stran\Code && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds (no type errors from new exports)

- [ ] **Step 3: Commit**

```bash
git add lib/article-helpers.ts
git commit -m "feat: add emotion and antidote helper constants"
```

---

### Task 2: EmotionTag Component

**Files:**
- Create: `components/emotion-tag.tsx`

- [ ] **Step 1: Create the EmotionTag component**

This component renders:
- An antidote tag line ("Zdravilo za cinizem") when `antidote` is provided
- Emotion pills (☀️ Upanje, 💛 Toplina, etc.) when `emotions` array is non-empty
- Nothing when both are absent

```tsx
import { EMOTION_LABELS, EMOTION_ICONS, EMOTION_COLORS, ANTIDOTE_LABELS, ANTIDOTE_COLORS } from '@/lib/article-helpers';

interface EmotionTagProps {
  antidote?: string | null;
  emotions?: string[];
  showAntidoteLine?: boolean; // full "Zdravilo za X" line vs compact
}

export function EmotionTag({ antidote, emotions, showAntidoteLine = false }: EmotionTagProps) {
  const hasAntidote = antidote && ANTIDOTE_LABELS[antidote];
  const validEmotions = (emotions || []).filter(e => EMOTION_LABELS[e]);

  if (!hasAntidote && validEmotions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasAntidote && showAntidoteLine && (
        <span className={`text-sm font-medium ${ANTIDOTE_COLORS[antidote!].text}`}>
          Zdravilo za {antidote}
        </span>
      )}
      {validEmotions.map(emotion => (
        <span
          key={emotion}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${EMOTION_COLORS[emotion]?.bg || 'bg-gray-100'} ${EMOTION_COLORS[emotion]?.text || 'text-gray-700'}`}
        >
          {EMOTION_ICONS[emotion]} {EMOTION_LABELS[emotion]}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd C:\Svetla_Stran\Code && npx next build --no-lint 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add components/emotion-tag.tsx
git commit -m "feat: create EmotionTag component for antidote and emotion pills"
```

---

### Task 3: EmotionSection Component ("Kaj potrebuješ danes?")

**Files:**
- Create: `components/emotion-section.tsx`

- [ ] **Step 1: Create the EmotionSection component**

Six antidote cards in a responsive grid. Clicking one calls `onSelect(antidoteKey)`. Active state highlighted.

```tsx
'use client';

import { ANTIDOTE_LABELS, ANTIDOTE_COLORS } from '@/lib/article-helpers';
import { motion } from 'motion/react';

const ANTIDOTE_ICONS: Record<string, string> = {
  jeza: '🕊️',
  skrb: '☀️',
  cinizem: '💛',
  osamljenost: '🤝',
  obup: '🌱',
  strah: '🦁',
};

interface EmotionSectionProps {
  activeAntidote: string | null;
  onSelect: (antidote: string | null) => void;
}

export function EmotionSection({ activeAntidote, onSelect }: EmotionSectionProps) {
  const antidotes = Object.entries(ANTIDOTE_LABELS);

  return (
    <section className="py-8">
      <h2 className="mb-1 text-center font-brand text-xl font-semibold text-foreground/90 sm:text-2xl">
        Kaj potrebuješ danes?
      </h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Izberi zdravilo za to, kar ti mediji stresajo
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {antidotes.map(([key, { label, oneLiner }]) => {
          const isActive = activeAntidote === key;
          const colors = ANTIDOTE_COLORS[key];
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(isActive ? null : key)}
              className={`flex flex-col items-center rounded-xl border p-4 text-center transition-all ${
                isActive
                  ? `${colors.bg} ${colors.border} border-2 shadow-md`
                  : 'border-border/30 bg-card hover:border-border/60 hover:shadow-sm'
              }`}
            >
              <span className="mb-1 text-2xl">{ANTIDOTE_ICONS[key]}</span>
              <span className={`text-sm font-semibold ${isActive ? colors.text : 'text-foreground/80'}`}>
                {label}
              </span>
              <span className="mt-1 text-xs leading-tight text-muted-foreground">
                {oneLiner}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd C:\Svetla_Stran\Code && npx next build --no-lint 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add components/emotion-section.tsx
git commit -m "feat: create EmotionSection homepage component"
```

---

### Task 4: Integrate EmotionSection + Emotion Toggle into ArticleGrid

**Files:**
- Modify: `components/article-grid.tsx`

This is the largest task. Three changes:
1. Import and render EmotionSection between hero and cloud buttons
2. Add a "Po temi" / "Po občutku" toggle above cloud buttons
3. Support antidote and emotion filtering

- [ ] **Step 1: Add imports and emotion cloud colors**

At the top of `article-grid.tsx`, add imports for `EmotionSection`, `EMOTION_LABELS`, `EMOTION_ICONS`, `EMOTION_COLORS`. Add an `EMOTION_CLOUD_COLORS` map mirroring the structure of existing `CLOUD_COLORS` but for the 5 emotions.

- [ ] **Step 2: Add filter state for antidote, emotion mode, and active emotion**

In the `ArticleGrid` component, alongside the existing `activeCategory` state, add:
```typescript
const [activeAntidote, setActiveAntidote] = useState<string | null>(null);
const [filterMode, setFilterMode] = useState<'temi' | 'obcutku'>('temi');
const [activeEmotion, setActiveEmotion] = useState<string | null>(null);
```

Read initial `antidote` and `obcutek` from URL search params (same pattern as existing `kategorija` param).

- [ ] **Step 3: Update article filtering logic**

Update the `filtered` memoization to also apply antidote and emotion filters:
- If `activeAntidote` is set: filter articles where `article.ai.antidote_for === activeAntidote`
- If `activeEmotion` is set: filter articles where `article.ai.emotions?.includes(activeEmotion)`
- These compose with existing category and search filters.

- [ ] **Step 4: Render EmotionSection between hero and cloud buttons**

After the hero section (~line 371) and before the cloud buttons (~line 382), render:
```tsx
<EmotionSection activeAntidote={activeAntidote} onSelect={handleAntidoteSelect} />
```

Where `handleAntidoteSelect` sets the antidote state and updates the URL param.

- [ ] **Step 5: Add the mode toggle above cloud buttons**

Before the cloud button grid, add a two-segment toggle:
```tsx
<div className="flex items-center justify-center gap-2 mb-4">
  <button onClick={() => setFilterMode('temi')}
    className={filterMode === 'temi' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
    📂 Po temi
  </button>
  <span className="text-border">|</span>
  <button onClick={() => setFilterMode('obcutku')}
    className={filterMode === 'obcutku' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
    💛 Po občutku
  </button>
</div>
```

- [ ] **Step 6: Render emotion cloud buttons when in "Po občutku" mode**

When `filterMode === 'obcutku'`, render cloud buttons for the 5 emotions instead of 9 categories. Use the same `CloudButton` component with emotion keys, labels, icons, and `EMOTION_CLOUD_COLORS`. Count articles per emotion (articles where `article.ai.emotions` array includes the key).

- [ ] **Step 7: Update grid heading when antidote filter is active**

When `activeAntidote` is set, update the article count / heading area above the grid to show contextual text, e.g.:
```tsx
{activeAntidote && ANTIDOTE_LABELS[activeAntidote] && (
  <p className="mb-4 text-center text-sm text-muted-foreground">
    Zdravilo za {activeAntidote} — {filtered.length} {filtered.length === 1 ? 'zgodba' : 'zgodb'}
  </p>
)}
```

- [ ] **Step 8: Verify visually**

Run: `cd C:\Svetla_Stran\Code && npm run dev`
Check homepage:
- EmotionSection renders 6 cards between hero and cloud buttons
- Clicking an antidote card filters the grid
- Toggle switches between category clouds and emotion clouds
- Emotion clouds filter correctly
- URL params update (`?antidote=`, `?obcutek=`)

- [ ] **Step 9: Commit**

```bash
git add components/article-grid.tsx
git commit -m "feat: add emotion section, toggle, and emotion filtering to article grid"
```

---

### Task 5: Article Page — Emotion Header

**Files:**
- Modify: `app/clanki/[slug]/page.tsx`

- [ ] **Step 1: Import EmotionTag and add to article header**

Import `EmotionTag` from `@/components/emotion-tag`.

In the article header section (around line 152-164), after the reading time span and before the title, add:

```tsx
<EmotionTag
  antidote={article.ai.antidote_for}
  emotions={article.ai.emotions}
  showAntidoteLine={true}
/>
```

This renders inline with the existing category/date metadata.

- [ ] **Step 2: Verify visually**

Run dev server, navigate to an article that has emotion/antidote data. Confirm:
- Antidote line appears: "Zdravilo za cinizem"
- Emotion pills appear below it
- Nothing renders for articles without emotion data

- [ ] **Step 3: Commit**

```bash
git add app/clanki/\\[slug\\]/page.tsx
git commit -m "feat: show emotion tags in article page header"
```

---

### Task 6: Emotion-Matched Related Articles Query

**Files:**
- Modify: `lib/db.ts`

- [ ] **Step 1: Add getEmotionMatchedArticles function**

Add a new query function that implements the hybrid matching strategy:

```typescript
export async function getEmotionMatchedArticles(
  currentSlug: string,
  emotions: string[],
  category: string | null,
  limit: number = 3
): Promise<any[]> {
  const supabase = getSupabaseAdmin();

  if (!emotions || emotions.length === 0) {
    // Fallback: category-only match
    const { data } = await supabase
      .from('articles')
      .select('*')
      .neq('slug', currentSlug)
      .eq('category', category)
      .order('published_at', { ascending: false })
      .limit(limit);
    return data || [];
  }

  // Best: emotion + category overlap
  const { data: bestMatch } = await supabase
    .from('articles')
    .select('*')
    .neq('slug', currentSlug)
    .eq('category', category)
    .overlaps('emotions', emotions)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (bestMatch && bestMatch.length >= limit) return bestMatch;

  // Good: emotion overlap (cross-category)
  const excludeSlugs = [currentSlug, ...(bestMatch || []).map((a: any) => a.slug)];
  const { data: emotionMatch } = await supabase
    .from('articles')
    .select('*')
    .not('slug', 'in', `(${excludeSlugs.join(',')})`)
    .overlaps('emotions', emotions)
    .order('published_at', { ascending: false })
    .limit(limit - (bestMatch?.length || 0));

  const combined = [...(bestMatch || []), ...(emotionMatch || [])];
  if (combined.length >= limit) return combined.slice(0, limit);

  // Fallback: fill remaining with category-only
  const usedSlugs = [currentSlug, ...combined.map((a: any) => a.slug)];
  const { data: categoryFill } = await supabase
    .from('articles')
    .select('*')
    .not('slug', 'in', `(${usedSlugs.join(',')})`)
    .eq('category', category)
    .order('published_at', { ascending: false })
    .limit(limit - combined.length);

  return [...combined, ...(categoryFill || [])].slice(0, limit);
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd C:\Svetla_Stran\Code && npx next build --no-lint 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add hybrid emotion-matched related articles query"
```

---

### Task 7: EmotionMatchedArticles Component

**Files:**
- Create: `components/emotion-matched-articles.tsx`

- [ ] **Step 1: Create the component**

Renders 2-3 emotion-matched article cards with a warm heading. Receives pre-fetched articles (query runs server-side in the page component).

Uses `PublishedArticle` type (imported from `app/page.tsx`) since articles are passed through `rowToArticle()`:

```tsx
import Link from 'next/link';
import { SafeImage } from '@/components/safe-image';
import { EmotionTag } from '@/components/emotion-tag';
import { CATEGORY_LABELS, CATEGORY_PILL, formatDate, readingTime } from '@/lib/article-helpers';
import type { PublishedArticle } from '@/app/page';

export function EmotionMatchedArticles({ articles, heading }: { articles: PublishedArticle[]; heading?: string }) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className="py-8">
      <h3 className="mb-4 font-brand text-lg font-semibold text-foreground/80">
        {heading || 'Če te je ta zgodba ogrela...'}
      </h3>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map(article => {
          const imageUrl = article.imageUrl || article.aiImageUrl;
          const catLabel = article.ai.category ? CATEGORY_LABELS[article.ai.category] : null;
          const catPill = article.ai.category ? CATEGORY_PILL[article.ai.category] : null;

          return (
            <Link key={article.slug} href={`/clanki/${article.slug}`}
              className="group overflow-hidden rounded-xl border border-border/30 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative h-40 bg-gradient-to-br from-heaven via-heaven-glow/30 to-sky/10">
                {imageUrl && (
                  <SafeImage src={imageUrl} alt={article.title}
                    fill className="object-cover transition-transform group-hover:scale-[1.02]" />
                )}
                {catLabel && catPill && (
                  <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${catPill}`}>
                    {catLabel}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h4 className="mb-1 font-brand text-base font-semibold leading-snug text-foreground/90 line-clamp-2">
                  {article.title}
                </h4>
                <EmotionTag emotions={article.ai.emotions} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(article.publishedAt)} · {readingTime(article.body)} min
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd C:\Svetla_Stran\Code && npx next build --no-lint 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add components/emotion-matched-articles.tsx
git commit -m "feat: create EmotionMatchedArticles component"
```

---

### Task 8: End-of-Article Flow Redesign

**Files:**
- Modify: `app/clanki/[slug]/page.tsx`

This task rearranges the end-of-article sections into the new flow and integrates the emotion-matched articles.

- [ ] **Step 1: Import new components**

Add imports for `EmotionMatchedArticles` and `getEmotionMatchedArticles` from their respective files.

- [ ] **Step 2: Replace related articles query**

Replace the current category-based related articles logic (around lines 89-96) with a call to `getEmotionMatchedArticles`:

```typescript
const emotionMatched = await getEmotionMatchedArticles(
  article.slug,
  article.ai.emotions || [],
  article.ai.category || null,
  3
);
const relatedArticles = emotionMatched.map(rowToArticle);
```

- [ ] **Step 3: Add emotional tag section after research details**

After the research/verification section and before the share bar, add:

```tsx
{/* Emotional punctuation */}
{(article.ai.antidote_for || (article.ai.emotions && article.ai.emotions.length > 0)) && (
  <div className="mx-auto max-w-3xl px-6 py-6">
    <div className="rounded-xl border border-border/30 bg-card/50 p-6 text-center">
      {article.ai.antidote_for && (
        <p className="font-brand text-lg font-semibold text-foreground/80">
          Ta zgodba je zdravilo za {article.ai.antidote_for}
        </p>
      )}
      <div className="mt-2 flex justify-center">
        <EmotionTag emotions={article.ai.emotions} />
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Rearrange end-of-article flow**

Reorder the sections to match the spec:
1. Long-form / Sources / Research (unchanged)
2. Emotional tag section (new, from step 3)
3. Emotion-matched next reads (replace old related articles)
4. Share bar (keep)
5. "Dnevna doza" afterglow signup (Task 9 will handle the copy)
6. Comments (keep at bottom)

Remove: category navigation button, old related articles section.

- [ ] **Step 5: Verify visually**

Run dev server, check an article page:
- Emotional tag renders after research section
- Emotion-matched articles appear with correct heading
- Share bar follows
- Newsletter signup follows
- Comments at bottom
- No duplicate sections

- [ ] **Step 6: Commit**

```bash
git add app/clanki/\\[slug\\]/page.tsx
git commit -m "feat: redesign end-of-article flow with emotion-first ordering"
```

---

### Task 9: Newsletter "Dnevna Doza" Reframe

**Files:**
- Modify: `components/newsletter-signup.tsx`

- [ ] **Step 1: Update the "hero" variant copy (homepage — The Invitation)**

Change the heading and description in the hero variant:
- Heading: "Dnevna doza dobrega"
- Subheading: "Ena dobra zgodba na dan. Brez klikanja, brez doom-scrollinga."
- CTA button text: "Naroči se"

- [ ] **Step 2: Add "afterglow" variant (end-of-article)**

Update the variant type to `"hero" | "inline" | "afterglow"`. Add a new rendering branch for `afterglow`:
- Small caps label: "Dnevna doza dobrega"
- Copy: "Svet ni tak kot ga kažejo. Dokaži si vsak dan."
- CTA button text: "Pošlji mi"
- Compact card styling, intimate tone

- [ ] **Step 3: Update article page to use afterglow variant**

In `app/clanki/[slug]/page.tsx`, change the newsletter signup from `variant="inline"` to `variant="afterglow"`.

- [ ] **Step 4: Verify visually**

Check both placements:
- Homepage: warm invitation tone, "Naroči se" button
- End-of-article: intimate afterglow tone, "Pošlji mi" button
- Both still open theme picker modal and submit to Brevo

- [ ] **Step 5: Commit**

```bash
git add components/newsletter-signup.tsx app/clanki/\\[slug\\]/page.tsx
git commit -m "feat: reframe newsletter as Dnevna Doza with three voices"
```

---

### Task 10: Mid-Article Whisper Rewrite

**Files:**
- Rewrite: `components/mid-article-cta.tsx`

- [ ] **Step 1: Rewrite as minimal whisper**

Replace the current form-based CTA with a minimal text link:

```tsx
'use client';

import { useState } from 'react';
import { NewsletterSignup } from './newsletter-signup';

export function MidArticleCta({ category }: { category?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <div className="my-4">
        <NewsletterSignup variant="inline" category={category} />
      </div>
    );
  }

  return (
    <p className="my-4 text-sm text-muted-foreground">
      <span>☀️ Všeč? </span>
      <button
        onClick={() => setExpanded(true)}
        className="text-primary underline underline-offset-2 hover:text-primary/80"
      >
        Vsak dan ena taka.
      </button>
    </p>
  );
}
```

- [ ] **Step 2: Update paragraph threshold**

In `app/clanki/[slug]/page.tsx`, ensure the mid-article CTA only renders when the article has 5+ paragraphs (count by splitting body on `\n\n`). Check current threshold and update if needed.

- [ ] **Step 3: Verify visually**

Check a long article:
- Subtle whisper line appears after 3rd paragraph
- Clicking "Vsak dan ena taka." expands to inline signup form
- Short articles (<5 paragraphs) show no mid-article CTA

- [ ] **Step 4: Commit**

```bash
git add components/mid-article-cta.tsx app/clanki/\\[slug\\]/page.tsx
git commit -m "feat: rewrite mid-article CTA as minimal whisper"
```

---

### Task 11: Delete Sticky Subscribe Bar

**Files:**
- Delete: `components/sticky-subscribe-bar.tsx`
- Modify: `app/clanki/[slug]/page.tsx` (remove import and usage)

- [ ] **Step 1: Remove import and usage from article page**

In `app/clanki/[slug]/page.tsx`, remove the `StickySubscribeBar` import and the `<StickySubscribeBar />` render (around line 349-354).

- [ ] **Step 2: Delete the component file (if it still exists)**

```bash
rm -f components/sticky-subscribe-bar.tsx
```

Note: File may already be deleted. The `-f` flag handles this gracefully.

- [ ] **Step 3: Verify build passes**

Run: `cd C:\Svetla_Stran\Code && npx next build --no-lint 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove sticky subscribe bar"
```

---

### Task 12: GIN Index for Emotions Query Performance

**Files:**
- Supabase migration

- [ ] **Step 1: Add GIN index on articles.emotions**

Run via Supabase SQL or apply as migration:

```sql
CREATE INDEX IF NOT EXISTS idx_articles_emotions_gin ON articles USING GIN (emotions);
```

- [ ] **Step 2: Verify index exists**

```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'articles' AND indexname = 'idx_articles_emotions_gin';
```

- [ ] **Step 3: Commit migration if applicable**

---

### Task 13: Final Integration Verification

- [ ] **Step 1: Full build check**

Run: `cd C:\Svetla_Stran\Code && npx next build --no-lint`
Expected: Clean build, no errors.

- [ ] **Step 2: Visual smoke test — Homepage**

Check:
- "Kaj potrebuješ danes?" section renders between hero and cloud buttons
- All 6 antidote cards display with correct labels and one-liners
- Clicking a card filters the article grid
- "Po temi" / "Po občutku" toggle switches cloud button sets
- Emotion cloud buttons filter by emotion
- URL params update correctly
- "Dnevna doza" newsletter section at bottom with invitation voice

- [ ] **Step 3: Visual smoke test — Article page**

Check:
- Emotion tags appear in article header (antidote line + emotion pills)
- Articles without emotion data show no emotion elements
- Mid-article whisper appears on long articles (5+ paragraphs)
- Clicking whisper link expands to signup form
- End-of-article flow: emotional tag → emotion-matched articles → share bar → afterglow signup → comments
- No sticky subscribe bar on mobile
- No category navigation button

- [ ] **Step 4: Edge case checks**

- Article with no antidote and no emotions: no emotion elements render, category-based related articles used
- Article with antidote but empty emotions: antidote tag shows, category fallback for related articles
- Very few published articles: related articles section still renders (may show fewer than 3)
- Homepage with antidote filter active + search query: both filters compose correctly

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "fix: integration fixes from smoke testing"
```
