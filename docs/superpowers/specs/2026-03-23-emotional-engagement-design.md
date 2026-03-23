# Emotional Engagement & Visitor Conversion Redesign

**Date:** 2026-03-23
**Status:** Approved
**Goal:** Hook first-time visitors (arriving from search/social) by making Svetla Stran's emotional philosophy visible and actionable, and redesign the end-of-article experience to maximize retention and newsletter conversion.

## Context

Svetla Stran's scraper already collects rich emotional metadata on every story:
- `emotions`: array of PONOS, TOPLINA, OLAJŠANJE, ČUDENJE, UPANJE
- `antidote`: jeza, skrb, cinizem, osamljenost, obup, strah (nullable)
- `category`: 9 categories (JUNAKI, SPORT, etc.)

None of this emotional data is currently visible to readers. The site functions as a standard content blog — clean but undifferentiated. A first-time visitor finishes an article and sees a generic share/newsletter/comments stack identical to every other blog.

### The opportunity

The "antidote" framework — every positive story is medicine against a specific media poison — is genuinely unique. No other news site frames content this way. Surfacing this data transforms the experience from "another news site" to "a site that understands what I need."

## Design

### 1. Homepage: "Kaj potrebuješ danes?" Section

A prominent section between the hero article and the article grid. Six cards representing the emotional antidotes:

| Antidote for | Card label | One-liner |
|-------------|-----------|-----------|
| jeza | Prijaznost | Za trenutke ko svet kliče po razumu |
| skrb | Upanje | Za trenutke ko prihodnost skrbi |
| cinizem | Dobrota | Za trenutke ko dvomiš v ljudi |
| osamljenost | Povezanost | Za trenutke ko se čutiš sam |
| obup | Odpornost | Za trenutke ko je vsega preveč |
| strah | Pogum | Za trenutke ko se svet zdi nevaren |

**Behavior:** Clicking a card filters the article grid below to stories where `antidote` matches. Uses URL param `?antidote=cinizem` for shareability and back-button support. The grid heading updates to reflect the selection (e.g., "Zdravilo za cinizem — zgodbe ki dokazujejo da so ljudje dobri"). Clicking again or clicking the logo resets to all stories.

**Design:** Cards use the existing warm color palette. Not cloud-buttons — these are their own visual element. Compact, horizontally scrollable on mobile, 2x3 or 3x2 grid on desktop.

### 2. Category ↔ Emotion Toggle on Cloud Buttons

The existing category cloud filter gains a mode switch above it:

- **Po temi** (by topic) — current behavior, category clouds: JUNAKI, SPORT, NARAVA...
- **Po občutku** (by feeling) — cloud buttons become: Upanje, Toplina, Ponos, Čudenje, Olajšanje (5 buttons, matching the 5 emotions in the data model)

The toggle is a simple two-segment control. Same cloud button design, same grid filtering behavior, different data dimension. When in "Po občutku" mode, articles are filtered by their `emotions` array.

The "Kaj potrebuješ" section (above) filters by `antidote` (6 values — what poison to counteract). The cloud toggle filters by `emotions` (5 values — what feeling to receive). These are complementary dimensions.

**Risk note:** Two emotional filtering systems may confuse first-time visitors. Monitor analytics for toggle usage vs. antidote card usage. If one consistently underperforms, consider removing it and letting the stronger one carry the emotional weight alone. The antidote framing is the stronger brand differentiator — if forced to choose, keep that.

**Emotion cloud button colors:**

| Emotion | Color | Hex reference |
|---------|-------|---------------|
| Upanje | sky (blue) | `--sky` |
| Toplina | warmth (peach/amber) | `--warmth` |
| Ponos | gold (yellow) | `--gold` |
| Čudenje | lavender (purple) | `--lavender` |
| Olajšanje | nature (green) | `--nature` |

### 3. Emotion Pills on Article Cards

**Deferred to post-launch evaluation.** Emotion pills on every card risk adding visual noise to the grid without clear reader utility. The "Kaj potrebuješ" section and the emotion toggle already provide emotional navigation at the grid level.

If analytics show readers engage with the emotional dimension (clicking antidote cards, using the toggle), pills can be added later as reinforcement. For now, emotion pills appear only in these contexts:
- Article page header (Section 4)
- End-of-article emotional tag (Section 5, item 4)
- Emotion-matched next-read cards (Section 5, item 5)

**Icon mapping** (used wherever pills appear):
- ☀️ Upanje
- 💛 Toplina
- 💪 Ponos
- ✨ Čudenje
- 😌 Olajšanje

### 4. Article Page: Emotion in Header

On the individual article page (`/clanki/[slug]`), near the existing category + date + reading time header area, add:

- The antidote tag: "Zdravilo za cinizem" — small, colored text matching the antidote type
- Emotion pills inline: same small pills as on cards

This is informational, not interactive. It primes the reader to think about the story in emotional terms before they even start reading.

**Edge case:** When `antidote` is null, hide the antidote tag entirely. When `emotions` is empty/null, hide emotion pills. The category display remains as the sole metadata in those cases.

### 5. End-of-Article Flow Redesign

Current flow (top to bottom after article body):
1. Long-form deep read (expandable)
2. Sources list
3. Research & verification details
4. Share bar
5. Category navigation button
6. Related articles (3 cards, same category)
7. Newsletter signup
8. Comments

**New flow:**
1. Long-form deep read (unchanged)
2. Sources list (unchanged)
3. Research & verification details (unchanged)
4. **NEW: Emotional tag section** — "Ta zgodba je zdravilo za cinizem" with emotion pills. Styled as a warm, distinct visual element — not just text. This is the emotional punctuation mark after reading. Hidden entirely when both `antidote` is null and `emotions` is empty.
5. **NEW: Emotion-matched next reads** — "Če te je ta zgodba ogrela..." heading, then 2-3 article cards. **Hybrid matching strategy** (in priority order):
   - **Best:** articles sharing both an emotion AND a category with the current article
   - **Good:** articles sharing at least one emotion (cross-category)
   - **Fallback:** category-only match (current behavior, used when emotions are empty)

   This prevents jarring combinations (e.g., organ donation matched with a pub quiz app just because both tagged TOPLINA). Each card shows its emotion pill. Query ordered by recency, excluding current article. Consider a GIN index on `articles.emotions` for performance.
6. Share bar (kept as-is, works well)
7. **REFRAMED: "Dnevna doza" signup** (see section 6)
8. Comments (kept at bottom)

**Removed:** Category navigation button (replaced by emotion-matched cards). Sticky mobile subscribe bar (removed entirely).

### 6. Three-Voice "Dnevna Doza" Signup

The newsletter signup is reframed from "subscribe" to "daily dose." Three placements, each with distinct voice matching the reader's headspace:

#### Homepage — The Invitation
- **Copy:** "Ena dobra zgodba na dan. Brez klikanja, brez doom-scrollinga."
- **Tone:** Calm, friendly. Like a recommendation from a friend.
- **CTA button:** "Naroči se"
- **Placement:** Replaces current newsletter hero section below article grid.
- **Layout:** One-liner + email input + button. Clean, not heavy.

#### Mid-Article — The Whisper
- **Copy:** "☀️ Všeč? Vsak dan ena taka." (link, not button)
- **Tone:** Minimal, almost a footnote. 4 words + link.
- **Behavior:** Clicking the link scrolls to or opens a compact email input (not a full section). Shows only on articles with 5+ paragraphs.
- **Placement:** After 3rd paragraph, same position as current mid-article CTA.
- **Layout:** Single line, inline with article flow. No box, no border — just text.

#### End-of-Article — The Afterglow
- **Copy:** "Svet ni tak kot ga kažejo. Dokaži si vsak dan."
- **Tone:** Intimate, philosophical. Speaks to why they came here.
- **CTA button:** "Pošlji mi" (personal, not transactional)
- **Placement:** After share bar, before comments (as in new flow).
- **Layout:** Compact card with subtle branding. Label: "Dnevna doza dobrega" in small caps above the copy.

**Backend:** All three use the existing Brevo `/api/subscribe` endpoint. The theme picker modal can still appear after any signup. No backend changes needed.

### 7. Removed Elements

- **Sticky mobile subscribe bar** — removed entirely. Feels desperate with the new emotional framing.
- **Category navigation button** (end-of-article) — replaced by emotion-matched article cards.
- **Old newsletter copy** — all instances reframed to "Dnevna doza" voice.

## Data Requirements

All emotional data already exists in the `articles` table (populated from headlines during publish). DB column names:

- `articles.emotions` — text array, for emotion pills and emotion-based filtering/matching
- `articles.antidote` — text (nullable), for antidote tags and "Kaj potrebuješ" filtering
- `articles.category` — text, for existing category features (unchanged)

The homepage query needs to support filtering by `emotions` (array contains via `@>` operator) and `antidote` (exact match) in addition to existing `category` filter. URL params: `?antidote=cinizem`, `?obcutek=UPANJE`, `?kategorija=SPORT` (existing).

The related articles query (end-of-article) needs to find articles with overlapping `emotions` arrays using the `&&` (overlap) operator, ordered by recency. A GIN index on `articles.emotions` should be added for performance.

**Paragraph count for mid-article whisper:** Count by splitting article body on double newlines (`\n\n`). This is a frontend-only check, no new DB field needed.

### "Kaj potrebuješ" section placement

The hero article is currently rendered inside `ArticleGrid`. The "Kaj potrebuješ" section should be rendered **inside** `ArticleGrid`, between the hero block and the card grid. No hero extraction refactor needed — `emotion-section.tsx` is imported and rendered within `ArticleGrid`.

## Component Changes Summary

| Component | Change |
|-----------|--------|
| `app/page.tsx` | Add "Kaj potrebuješ" section, pass emotion filter to ArticleGrid |
| `components/article-grid.tsx` | Add category↔emotion toggle, support emotion/antidote filtering, add emotion pills to cards |
| `app/clanki/[slug]/page.tsx` | Add emotion header, redesign end-of-article flow, new related articles query |
| `components/newsletter-signup.tsx` | Reframe to "Dnevna doza" — two variants: `invitation` (homepage) and `afterglow` (end-of-article) |
| `components/mid-article-cta.tsx` | Rewrite in place as standalone whisper variant (radically different UX — link not form) |
| `components/sticky-subscribe-bar.tsx` | Delete |
| `lib/db.ts` | Add queries for emotion-based filtering and emotion-matched related articles |
| **NEW** `components/emotion-section.tsx` | "Kaj potrebuješ" cards for homepage |
| **NEW** `components/emotion-tag.tsx` | Reusable antidote tag + emotion pills |
| **NEW** `components/emotion-matched-articles.tsx` | End-of-article emotion-matched cards |

## Out of Scope

- Emotional reactions / social proof (Phase 2, deferred until traffic justifies counts)
- Personalization based on reader preferences
- Push notifications
- Dark mode
- Any backend/scraper changes (emotional data already collected)
