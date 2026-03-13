# Svetla Stran — Advanced Plan

Reference document for the long-term vision. Born from conversation on 2026-03-12.

---

## Email List (Priority Zero — before everything else)

The email list is the most valuable asset we build. Before comments, before analytics, before auto-publish. It's ours, it's direct, it's portable to any future project.

### Why it's priority zero:

- **Day 1 asset** — start collecting from the moment the site goes live
- **Algorithm-proof** — social media reach is rented, email is owned
- **Revenue path** — sponsors, premium, partnerships later
- **Story source** — subscribers become tipsters ("my neighbor did something amazing")
- **Growth signal** — subscriber count = proof the concept works
- **Cross-project** — same list works for any future positive-media venture

### The Promise (signup copy)

Nobody subscribes to "enter your email for our newsletter." They subscribe to a promise.

**Primary CTA (hero banner or sticky footer):**
> **Dobre novice. Vsak ponedeljek. Brez clickbaita.**
> Ponedeljek ne rabi biti slab dan. 5 zgodb ki ti bodo polepšale teden — vsak ponedeljek v tvoj nabiralnik.
> [Izberi teme ki te zanimajo] [email input] [Naroči se]

**Alternative CTAs to test:**
- "Vsak ponedeljek: 5 razlogov da verjameš v Slovenijo."
- "Utrujen od slabih novic? Mi tudi. Zato pišemo samo dobre."
- "Pozitivne novice iz Slovenije. Vsak ponedeljek zjutraj. Brez spama. Brez politike."
- "Začni teden z dobro novico."

**Key principles:**
- Specific: "5 stories every Monday" not "occasional newsletter"
- Time-bound: "vsak ponedeljek" — antidote for worst day of the week
- Emotional: "polepšale teden" — it's about how they'll FEEL
- Anti-corporate: "brez clickbaita, brez spama, brez politike"
- Personalized: subscriber picks topics → gets content they care about

### What the weekly email contains:

```
Subject: "Začni teden z dobro novico ☀️"

Živjo 👋

Prejšnji teden smo našli 47 dobrih zgodb iz Slovenije.
Tu je 5 najboljših za tebe:

🦸 JUNAKI
Mariborski gasilci po 12 urah rešili družino iz poplavljene kleti
→ Preberi zgodbo

🏢 PODJETNIŠTVO
Startup iz Celja z inovacijo osvaja Evropo
→ Preberi zgodbo

🐾 ŽIVALI
V ljubljanskem živalskem vrtu se je rodil mladič risa
→ Preberi zgodbo

🏔️ NARAVA
Velikonočnice pri Ponikvi cvetijo teden prej kot običajno
→ Preberi zgodbo

⚽ ŠPORT
Pogačar po epskem boju do zmage na Tirreno-Adriatico
→ Preberi zgodbo

---

Poznate koga ki dela tihe izjemne stvari?
Odgovorite na ta email — vaš namig je lahko naslednja zgodba.

Lep teden,
Svetla Stran

P.S. Izbrane teme: Junaki, Živali, Podjetništvo
Spremeni teme → [link z preferences_token]
```

**Design principles:**
- Feels like a friend sending links, not a corporation
- One "story behind the story" line per article (not just a headline dump)
- Category emojis for quick scanning
- The reply CTA at the bottom is a story lead pipeline built into the newsletter
- No unsubscribe guilt trip — just a clean link

### Email list as story source:

The reply CTA ("Poznate koga...") is powerful:
- Subscriber replies to weekly email with a tip
- Reply lands in a shared inbox (or email provider (TBD) webhook → `story_leads` table)
- Comment agent evaluates: is this a real story? Enough detail?
- If promising → enters headline pipeline as `source_name: 'subscriber_tip'`
- Subscriber gets notified if their tip becomes an article ("Vaš namig je postal zgodba!")

This closes a loop: readers → subscribers → contributors → community.

### Personalized Topics

Signup form includes topic picker (checkboxes, friendly labels):

| DB value | Slovenian label | Emoji |
|----------|----------------|-------|
| JUNAKI | Junaki med nami | 🦸 |
| PODJETNISTVO | Podjetništvo in inovacije | 🏢 |
| SKUPNOST | Skupnost in solidarnost | 🤝 |
| SPORT | Šport | ⚽ |
| NARAVA | Narava | 🏔️ |
| ZIVALI | Živali | 🐾 |
| INFRASTRUKTURA | Infrastruktura | 🏗️ |
| SLOVENIJA_V_SVETU | Slovenija v svetu | 🌍 |
| KULTURA | Kultura | 🎭 |

- Default: all selected (if they don't pick, they get everything)
- Can change preferences via link in every email ("Spremeni nastavitve")
- Minimum 1 topic required

### How "top 5" is determined (evolves over time):

**Stage 1-2 (simple):** Editor-picked articles from the week, sorted by AI score within subscriber's selected categories. If subscriber picked 3 topics and we have 2 from each → take highest-scored from each, fill to 5.

**Stage 3 (engagement-weighted):**
```
article_rank = (ai_score * 0.3) + (editor_picked * 0.2) + (read_depth_avg * 0.25) + (comment_engagement * 0.25)
```
Pick top 5 per subscriber's categories.

**Stage 4 (fully personalized):** Collaborative filtering — subscribers who like similar topics tend to engage with similar articles. "Readers like you loved this story." But that's way later.

### DB Schema: `subscribers`

```sql
CREATE TABLE subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,                               -- optional, for personalization
  status text NOT NULL DEFAULT 'active',   -- active / unsubscribed / bounced
  source text DEFAULT 'website',           -- website / social / referral / import
  categories text[] DEFAULT ARRAY['JUNAKI','PODJETNISTVO','SKUPNOST','SPORT','NARAVA','ZIVALI','INFRASTRUKTURA','SLOVENIJA_V_SVETU','KULTURA'],
  brevo_contact_id text,                   -- email provider (TBD) API contact ID for sync
  preferences_token uuid DEFAULT gen_random_uuid(),  -- for edit-preferences link (no login)
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);

CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_token ON subscribers(preferences_token);
```

### Implementation:

| Component | Effort | Details |
|-----------|--------|---------|
| `subscribers` table + RLS | 30min | Migration, public can INSERT (subscribe), no read access |
| `POST /api/subscribe` | 2h | Validate email, insert to DB, sync to email provider (TBD) contact list, send welcome email via email provider (TBD) |
| `POST /api/unsubscribe` | 1h | Token-based unsubscribe link in every email |
| Signup form component | 2h | Reusable component: input + button + success/error state. Place in: homepage hero, article footer, sticky mobile bar |
| Email sending integration | TBD | Sending provider to be decided later. DB + API + UI are provider-agnostic. |
| Weekly digest script | 1 day | `scripts/send-weekly-digest.mjs`: for each subscriber, query top 5 articles from their selected categories (ranked by ai_score initially, engagement-weighted later). Render personalized email, send via email provider (TBD) API. Run via cron every Monday at 7:00. |
| Preferences page | 4h | `/nastavitve/[token]` — public page (no login), loads subscriber by `preferences_token`. Shows category checkboxes, save button. Same form as signup but for editing. |
| Welcome email | 2h | email provider (TBD) transactional template: "Dobrodošli na Svetlo Stran! Od zdaj boste vsak petek prejeli 5 zgodb..." Include link to latest 3 articles so they get value immediately. |
| Signup placement A/B | Later | Test: hero banner vs floating bar vs post-article vs exit-intent popup. Track conversion per placement. |

### Signup placement strategy:

| Location | Type | When to show |
|----------|------|-------------|
| Homepage hero | Permanent banner below header | Always — first thing visitors see |
| Article footer | After finishing article | Reader just got value → high conversion moment |
| Sticky mobile bar | Bottom bar on mobile | After 30s on site (not immediately — let them read first) |
| Mid-article | Inline CTA between paragraphs | After paragraph 3 (they're engaged but not done) |
| Exit intent (desktop) | Popup on mouse leaving viewport | Only once per session, only if not subscribed |

### Growth tactics:

1. **Social proof:** "Pridruži se 247 bralcem ki vsak petek prejmejo dobre novice" (show count)
2. **Referral program (later):** "Povabi prijatelja → oba dobita bonus zgodbo" — extra article only for referred subscribers
3. **Content upgrade:** "Želiš celotno zgodbo? Naroči se za polno verzijo." — teaser on social, full in email
4. **Cross-promotion:** Share subscriber count milestones as stories ("Svetla Stran presegla 1000 naročnikov!")

### email provider (TBD) setup (what we need):

1. **Contact list:** "Svetla Stran — Weekly"
2. **Transactional templates:** Welcome email, unsubscribe confirmation
3. **Campaign template:** Weekly digest (HTML, responsive, simple)
4. **API key:** In env vars as `BREVO_API_KEY`
5. **Sender:** `novice@svetlastran.si` (verified domain)
6. **Webhook (later):** Reply-to emails → `story_leads` table

### Timeline:

- **Stage 1 (NOW):** Signup form + DB + email provider (TBD) sync + welcome email. Start collecting DAY ONE.
- **Stage 2:** Weekly digest automation (cron script). First manual send to validate template.
- **Stage 3:** Reply-to pipeline (subscriber tips → story leads). Referral program.
- **Stage 4:** Personalized digests (preferred categories), A/B subject lines, engagement-based send time optimization.

---

## Autonomy Roadmap

The goal is full autonomy. The portal runs itself. Human involvement starts at 100% and drops to near-zero.

---

## Stage 1: Training Wheels (NOW)

**Human involvement: 100%**
*Purpose:* Build training data. Every pick/dismiss/edit is a lesson for the system.

### What we HAVE:

| Component | Status | Files |
|-----------|--------|-------|
| Scraper v2 (6-stage pipeline) | DONE | `scripts/scrape-cycle.mjs` |
| Tiered scraping (--tier 1/2/3) | DONE | `scripts/scrape-cycle.mjs` |
| Conditional HTTP (ETag/304) | DONE | `scripts/scrape-cycle.mjs` |
| Source failure tracking | DONE | `sources` table: consecutive_failures, timestamps |
| Content dedup (URL + hash) | DONE | State file + DB check |
| Title filter (batch AI) | DONE | `TITLE_FILTER_PROMPT` in scrape-cycle |
| Scoring (per-story AI) | DONE | `SCORING_PROMPT` in scrape-cycle, 8 critical rules |
| Eager content caching | DONE | Fetches full text before scoring |
| Research-write pipeline (6 phases) | DONE | `lib/research-write/run.mjs` + submodules |
| Source auto-discovery | DONE | `lib/research-write/discover.mjs` (runs during research) |
| Editor inbox UI | DONE | `/urednik` — filter, sort, dismiss, trigger research |
| Drafts review UI | DONE | `/urednik/osnutki` — preview, edit, verify, publish |
| Source management UI | DONE | `/urednik/viri` — add/edit/remove RSS+HTML sources |
| Editor team management | DONE | `/urednik/ekipa` — CRUD editors (admin only) |
| Auth system (Supabase) | DONE | Username-based, role-based (admin/urednik) |
| Public homepage | DONE | `/` — hero + latest articles grid |
| Public article list | DONE | `/clanki` — all published articles |
| Public article page | DONE | `/clanki/[slug]` — individual article |
| Publish flow | DONE | Editor clicks publish → draft moves to articles |
| DB schema (6 tables) | DONE | headlines, drafts, articles, editors, sources, source_suggestions |

### What's MISSING for Stage 1:

| Missing | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Cron/scheduler for scraper | HIGH | 1h | Need external cron or Vercel cron to run `scrape-cycle.mjs` on schedule. Currently manual. |
| .gitignore + clean commit | HIGH | 1h | Dead files to remove: lib/auth.ts, schema.prisma, old NextAuth routes. Need clean git state before Vercel deploy. |
| Vercel deployment | HIGH | 2h | Set env vars, deploy, connect domain svetlastran.si |
| Source suggestion review UI | LOW | Done? | `/api/source-suggestions` exists, need to verify UI in sources page |
| Dead code cleanup | LOW | 1h | `lib/Scraper/` (old), `components/password-form.tsx`, `components/session-provider.tsx` |

### Stage 1 data we're collecting (feeds future stages):

Every editor action is training data:
- **Picked headlines** → "this is good, score more like this"
- **Dismissed headlines** → "this is bad, score less like this"
- **Edited drafts** → "the AI wrote X, I changed it to Y" (tone/style signal)
- **Published vs rejected drafts** → "verification passed but I still rejected" (quality bar)

---

## Learning System (spans all stages)

The system learns from editorial decisions. This is the foundation that makes Stages 2-4 work.

### Philosophy

1. **Reasons > scores.** The number isn't the lesson. "Dismissed score-7 INFRASTRUKTURA" says *what*. "vladni PR, ni človeške zgodbe" says *why*. The coach needs the *why* to improve.

2. **No time tracking.** Editor might not review for 3 days — that's life, not signal. Measuring review speed would teach wrong lessons. We only care about the decision itself, not when it happened.

3. **Preserve AI originals.** When editor changes a title or body, keep the AI version alongside. The *diff* between AI output and editor edit is a style lesson.

4. **Rejections need reasons.** Dismiss without a reason = lost signal. The UI must require a short note on dismiss (even 2-3 words). Examples: "vladni PR", "ni slovenske povezave", "napovednik ne zgodba", "preveč splošno".

5. **Edits are implicit feedback.** If editor publishes without editing → AI nailed it. If editor rewrites the title → AI's title style needs adjustment. If editor cuts 2 paragraphs → AI is too verbose. No explicit feedback needed — the diff speaks.

### DB Schema: `editorial_decisions`

```sql
CREATE TABLE editorial_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was acted on
  headline_id uuid REFERENCES headlines(id),
  draft_id uuid,                              -- no FK (drafts get deleted)
  article_id uuid REFERENCES articles(id),
  editor_id uuid REFERENCES editors(id),

  -- The decision
  action text NOT NULL,
    -- 'headline_picked'     — editor picked headline for research-write
    -- 'headline_dismissed'  — editor dismissed headline (reason required)
    -- 'draft_published'     — editor published draft as-is
    -- 'draft_edited'        — editor edited draft then published
    -- 'draft_rejected'      — editor rejected draft (reason required)
    -- 'article_corrected'   — editor corrected published article
    -- 'article_unpublished' — editor unpublished article

  -- Editor's reasoning (REQUIRED for dismissals and rejections)
  reason text,

  -- Snapshot of AI state at time of decision
  ai_snapshot jsonb,
    -- For headlines: {score, category, emotions, headline_suggestion, reason, antidote_for}
    -- For drafts: {title, subtitle, body_length, verification_passed, verification_summary}

  -- Snapshot of editor's changes (only for edits)
  editor_changes jsonb,
    -- For draft_edited: {title_changed: bool, old_title, new_title, body_changed: bool, old_body, new_body}
    -- Captures the DIFF so scoring coach can learn style preferences

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_decisions_action ON editorial_decisions(action);
CREATE INDEX idx_decisions_headline ON editorial_decisions(headline_id);
CREATE INDEX idx_decisions_created ON editorial_decisions(created_at);
```

### What the scoring coach reads from this:

**Pattern: Category misjudgment**
```sql
-- Headlines editor dismissed with reason containing "PR" or "napovednik"
SELECT ai_snapshot->>'category' as cat, ai_snapshot->>'score' as score, reason
FROM editorial_decisions
WHERE action = 'headline_dismissed' AND reason IS NOT NULL
-- Result: INFRASTRUKTURA score 7 "vladni PR" x12 → lower INFRASTRUKTURA PR ceiling
```

**Pattern: Underscored category**
```sql
-- Headlines editor picked that AI scored low (6)
SELECT ai_snapshot->>'category' as cat, ai_snapshot->>'score' as score
FROM editorial_decisions
WHERE action = 'headline_picked' AND (ai_snapshot->>'score')::int <= 6
-- Result: JUNAKI score 6 picked x8 → bump JUNAKI base score
```

**Pattern: Title style**
```sql
-- Drafts where editor changed the title
SELECT ai_snapshot->>'title' as ai_title, editor_changes->>'new_title' as editor_title
FROM editorial_decisions
WHERE action = 'draft_edited' AND editor_changes->>'title_changed' = 'true'
-- Result: AI writes "Uspeh slovenskega podjetja", editor changes to "Mariborčan z inovacijo osvaja svet"
-- Lesson: editor prefers concrete (person + place) over generic
```

**Pattern: Draft quality**
```sql
-- Ratio of draft_published (no edits) vs draft_edited vs draft_rejected
SELECT action, count(*) FROM editorial_decisions
WHERE action IN ('draft_published', 'draft_edited', 'draft_rejected')
GROUP BY action
-- Result: 60% published as-is, 30% edited, 10% rejected → system is pretty good
```

### Changes needed to existing code:

| File | Change | Details |
|------|--------|---------|
| `lib/db.ts` → `dismissHeadline()` | Add `reason` parameter + log decision | Must accept reason string, save to editorial_decisions with ai_snapshot from headline |
| `lib/db.ts` → `pickHeadline()` | Log decision | Save to editorial_decisions with ai_snapshot |
| `lib/db.ts` → `publishDraft()` | Compare AI vs final, log decision | Before deleting draft, snapshot AI original vs editor-modified version. Log as `draft_published` or `draft_edited` based on diff. |
| `lib/db.ts` → `deleteDraft()` | Add `reason` parameter + log decision | Don't just delete — log as `draft_rejected` with reason + ai_snapshot first, then delete. |
| `lib/db.ts` → `updateDraft()` | Preserve AI originals | On first edit, save AI's original title/body to `ai_snapshot` on the draft row (new column: `ai_original jsonb`). Subsequent edits don't overwrite this. |
| `/api/stories` PUT (dismiss) | Require reason in request body | Frontend sends `{id, reason}`. API validates reason is non-empty. |
| `components/inbox-view.tsx` | Dismiss modal with reason input | Instead of one-click dismiss, show small modal: "Zakaj zavračaš?" with text input. Quick suggestions as pills: "vladni PR", "ni povezave s SLO", "napovednik", "preveč negativno". Custom text allowed. |
| `components/drafts-view.tsx` | Reject modal with reason input | Same pattern: "Zakaj zavračaš osnutek?" with text + quick suggestions. |

### What we DON'T track (editor behavior):

- Time between headline appearing and editor acting (irrelevant — editor might be sleeping)
- Number of times editor viewed a headline before deciding (noise)
- Order of decisions (editor might review bottom-up, top-down, random)
- Session duration (editor might check for 2 min or 2 hours)

### What we DO track (reader behavior): Reader Analytics

Reader engagement is real signal — it tells us what the *audience* wants, not just what the editor thinks they want.

#### DB Schema: `article_views`

```sql
CREATE TABLE article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  session_id text NOT NULL,           -- anonymous cookie-based, no login needed
  referrer text,                      -- where they came from (google, social, direct, newsletter)
  read_depth float,                   -- 0.0 to 1.0 — how far they scrolled (0.8 = read 80%)
  time_on_page integer,               -- seconds spent on article
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_views_article ON article_views(article_id);
CREATE INDEX idx_views_created ON article_views(created_at);
```

#### What we measure per article:

| Metric | What it tells us | How collected |
|--------|-----------------|---------------|
| **View count** | Raw popularity | Page load → insert row |
| **Read depth** | Did they actually read or just bounce? | Scroll listener, reports on page leave |
| **Time on page** | Engagement depth | Timer, reports on page leave |
| **Referrer** | Where readers come from | `document.referrer` or UTM params |
| **Comment count** | Engagement/reaction | Count from `comments` table |
| **Comment sentiment** | Did they love it? | AI sentiment from comment agent |

#### Lightweight client tracking (no cookies banner needed):

```javascript
// Small script on /clanki/[slug] — no external analytics, no PII
const sessionId = localStorage.getItem('ss_sid') || crypto.randomUUID();
localStorage.setItem('ss_sid', sessionId);

let maxScroll = 0;
const startTime = Date.now();

window.addEventListener('scroll', () => {
  const depth = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
  maxScroll = Math.max(maxScroll, depth);
});

// Report on page leave
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    navigator.sendBeacon('/api/analytics', JSON.stringify({
      article_id: ARTICLE_ID,
      session_id: sessionId,
      read_depth: maxScroll,
      time_on_page: Math.round((Date.now() - startTime) / 1000),
      referrer: document.referrer || 'direct',
    }));
  }
});
```

No cookies, no login, no external services, no GDPR issues (anonymous session ID in localStorage, no PII stored). Just: "someone read 80% of this article and spent 3 minutes on it."

#### What the scoring coach learns from reader data:

**Category engagement ranking:**
```sql
SELECT a.category,
  count(DISTINCT v.id) as views,
  round(avg(v.read_depth)::numeric, 2) as avg_depth,
  round(avg(v.time_on_page)::numeric, 0) as avg_seconds,
  count(DISTINCT c.id) as comments
FROM articles a
LEFT JOIN article_views v ON v.article_id = a.id
LEFT JOIN comments c ON c.article_id = a.id AND c.status = 'visible'
WHERE a.published_at > now() - interval '30 days'
GROUP BY a.category
ORDER BY avg_depth DESC
-- Result: JUNAKI avg 85% depth, ZIVALI avg 78%, INFRASTRUKTURA avg 42%
-- Lesson: readers actually READ hero stories, skim infrastructure
```

**Viral detection:**
```sql
-- Articles with 3x average views in first 24 hours
SELECT a.title, a.category, count(v.id) as views
FROM articles a
JOIN article_views v ON v.article_id = a.id
WHERE v.created_at < a.published_at + interval '24 hours'
GROUP BY a.id
HAVING count(v.id) > (SELECT avg(c) * 3 FROM (
  SELECT count(*) as c FROM article_views GROUP BY article_id) x)
-- Lesson: these types of stories spread — score similar ones higher
```

**Read depth vs score correlation:**
```sql
-- Do high AI scores actually predict reader engagement?
SELECT h.ai_score, round(avg(v.read_depth)::numeric, 2) as avg_depth
FROM articles a
JOIN headlines h ON h.id = a.headline_id
JOIN article_views v ON v.article_id = a.id
GROUP BY h.ai_score
ORDER BY h.ai_score
-- If score 9 articles get 90% depth but score 7 articles also get 85%
-- → scoring is too conservative, good stories are stuck at 7
```

#### Three input signals for the scoring coach (ranked):

1. **Editor decisions with reasons** (strongest) — the editor's *taste* and *judgment*
2. **Reader engagement** (strong) — what the *audience* actually wants
3. **Comment insights** (enriching) — *why* readers react the way they do

The coach weighs these: if editor and readers agree (editor picks JUNAKI, readers love JUNAKI) → strong signal, adjust fast. If they disagree (editor dismisses, but similar published stories get high engagement) → flag for editor review, don't auto-adjust.

#### Implementation timeline:

| Component | Stage | Effort |
|-----------|-------|--------|
| `article_views` table + API endpoint | Stage 2 | 2h |
| Client tracking script on article pages | Stage 2 | 2h |
| Basic dashboard (views per article) | Stage 2 | 4h |
| Category engagement report | Stage 3 | 4h |
| Scoring coach reads analytics | Stage 3 | 1 day |
| Viral detection + auto-boost | Stage 4 | 1 day |

---

## Stage 2: Assisted (weeks 2-4)

**Human involvement: ~60%**
*Purpose:* System starts showing initiative. Editor validates its judgment.

### What we HAVE:

| Component | Status | Notes |
|-----------|--------|-------|
| `AUTO_WRITE_MIN_SCORE = 8` constant | EXISTS (unused) | Defined in scrape-cycle.mjs line 40, only used for star icon |
| Research-write can run standalone | YES | `node lib/research-write/run.mjs < story.json` works as subprocess |
| Draft creation from research | YES | `lib/research-write/insert-draft.mjs` or via `/api/research-write` route |
| Verification in pipeline | YES | Phase 6 returns passed/failed + claims + evidence chain |
| email provider (TBD) SDK installed | YES | `sib-api-v3-sdk` in package.json, zero implementation |

### What's MISSING for Stage 2:

| Missing | Priority | Effort | Details |
|---------|----------|--------|---------|
| **Auto-write trigger in scraper** | CRITICAL | 1 day | After scoring step, if score >= 8: pipe story to research-write pipeline. Add ~30 lines to scrape-cycle.mjs after step 5. Need to spawn `run.mjs` as child process, pass story via stdin, read result from stdout, save draft to DB. |
| **Rate limiter for auto-write** | CRITICAL | 2h | Max 3-5 auto-writes per scrape cycle. Prevents runaway Agent SDK costs ($0.20-0.50 per pipeline run). Simple counter in main loop. |
| **`auto_generated` column on drafts** | HIGH | 30min | `ALTER TABLE drafts ADD COLUMN auto_generated boolean DEFAULT false`. UI should show badge "Auto-napisano" on auto-generated drafts so editor knows. |
| **Draft status "needs_review"** | HIGH | 1h | Currently only `ready` and `editing`. Add `needs_review` for auto-generated drafts where verification failed. UI shows warning badge + verification failure details. |
| **Comment system — DB schema** | HIGH | 1h | Create `comments` table (see schema below). Migration + RLS policies. |
| **Comment system — API routes** | HIGH | 1 day | `POST /api/comments` (create, public), `GET /api/comments?article_id=X` (list, public), `PUT /api/comments/:id` (hide/flag, auth required). AI spam check on POST. |
| **Comment system — public UI** | HIGH | 2 days | Comment form at bottom of `/clanki/[slug]`. Comment list with threading. Author name + body + timestamp. No login required. Simple, warm design matching portal tone. |
| **Comment system — editor moderation UI** | MEDIUM | 1 day | Section in `/urednik` or new `/urednik/komentarji` page. List all comments, filter by status, hide/flag actions. Bulk moderation. |
| **Comment AI pre-screening** | MEDIUM | 4h | On POST, quick AI check: spam? hate speech? If flagged → status: 'pending_review' instead of 'visible'. Editor approves. |
| **Scoring coach v1 (report only)** | MEDIUM | 1 day | Script that runs weekly: queries `editorial_decisions` table. Groups dismissal *reasons* by category and score range. Groups picks by category. Outputs report: "INFRASTRUKTURA: 12 dismissals, top reasons: 'vladni PR' x7, 'ni človeške zgodbe' x3. JUNAKI: 8 picks at score 6 — you're finding heroes AI misses." Coach learns from *reasons*, not just pick/dismiss counts. |
| **Editor daily digest email** | LOW | 4h | email provider (TBD) integration: daily email with "X new headlines, Y auto-written drafts, Z published articles". Simple summary. |
| **Notification in UI** | LOW | 4h | Badge on `/urednik/osnutki` tab showing count of new auto-generated drafts. |

### Comment system schema:

```sql
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_email text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'visible',  -- visible / hidden / pending_review
  ai_sentiment text,      -- positive / neutral / negative / correction
  ai_summary text,        -- one-line AI extract
  ip_address inet,        -- for rate limiting
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_article ON comments(article_id, created_at);
CREATE INDEX idx_comments_status ON comments(status);
```

### Stage 2 flow (after implementation):

```
Scrape cycle runs (cron every 15/30/60 min)
  → Crawl → Dedup → Title filter → Cache → Score
  → Score 8+: auto-trigger research-write (max 5 per cycle)
    → Pipeline: research → write → verify
    → If verification passed: draft (status: ready, auto_generated: true)
    → If verification failed: draft (status: needs_review, auto_generated: true)
  → Score 6-7: save to inbox as usual
  → Score <6: dismissed

Editor opens /urednik/osnutki
  → Sees auto-generated drafts with badge
  → Quick review: approve (publish) / reject (delete) / edit
  → 5 minutes instead of 30 minutes per story

Readers comment on published articles
  → AI pre-screens for spam
  → Comments visible on article page
  → Editor moderates from /urednik/komentarji

Weekly: scoring coach report arrives
  → Editor reads: "bump JUNAKI, reduce INFRASTRUKTURA PR"
  → Editor says "yes" → we adjust SCORING_PROMPT manually
```

---

## Stage 3: Supervised Autonomy (months 2-3)

**Human involvement: ~20%**
*Purpose:* System runs daily operations. Editor is curator, not gatekeeper.

### What we HAVE (after Stage 2):

Everything from Stage 1 + 2, plus the training data from weeks of editor picks/dismissals/comments.

### What's MISSING for Stage 3:

| Missing | Priority | Effort | Details |
|---------|----------|--------|---------|
| **Auto-publish for 9+ scores** | CRITICAL | 1 day | If score 9+ AND verification passed → skip draft, publish directly to articles table. Add `auto_published: true` column. Article appears on public site immediately. Editor reviews post-publish (within 24h). |
| **Auto-publish for 8 scores (with flag)** | CRITICAL | 4h | Score 8 + verification passed → publish with `needs_review_by` timestamp (24h from now). If editor doesn't review within 24h, stays published. If editor rejects → unpublish (move back to drafts or mark hidden). |
| **Unpublish mechanism** | HIGH | 4h | `PUT /api/articles/:id` with status: 'hidden'. Article no longer shows on public site. Needed for post-publish corrections. Currently no way to unpublish. |
| **Article versioning** | HIGH | 1 day | `article_versions` table: stores previous body/title before each edit. If article is corrected, old version is preserved. Public-facing: "Popravljeno: [datum]" notice. |
| **Comment agent — reader engagement** | HIGH | 2 days | Agent that runs periodically (hourly?), reads new comments, decides whether to reply. Rules: corrections → acknowledge + flag for review. Story leads → log. Gratitude → warm reply. Trolls → hide, no reply. Signs as "Uredništvo Svetla Stran". Uses Agent SDK. |
| **Comment agent — insight extraction** | HIGH | 1 day | Weekly batch: reads all comments, extracts corrections, resonance signals, story leads, scoring feedback. Outputs structured JSON. Feeds scoring coach. |
| **Scoring coach v2 (auto-apply)** | HIGH | 2 days | Evolves from v1 report to active `scoring-dna.md` management. Reads editor picks/dismissals + comment insights. Generates scoring adjustments. Auto-applies if confidence > 0.8 (based on consistent pattern over 2+ weeks). Editor gets weekly digest of changes, can override. Scoring prompt in scraper reads `scoring-dna.md` at startup. |
| **`scoring-dna.md` file** | HIGH | 2h | Create initial file from current hardcoded rules. Scraper loads it at startup and injects into SCORING_PROMPT. Coach agent updates it. |
| **Source auto-approval** | MEDIUM | 4h | Source suggestions with confidence > 0.85 AND from a .si domain → auto-approve after 48h if editor hasn't reviewed. Creates source with tier 3 (conservative). |
| **Source health monitoring** | MEDIUM | 4h | Daily job: check sources with consecutive_failures >= 5. Auto-disable. Notify editor. Try to find alternative URL (redirect check). |
| **Audit log table** | MEDIUM | 1 day | `audit_logs` table: every AI decision logged. Score assigned, category chosen, auto-write triggered, auto-published, comment agent replied. Editor can browse. Essential for trust + debugging. |
| **Kill switch** | MEDIUM | 2h | Single toggle in `/urednik` (or env var): pauses all auto-publishing. Scraper still runs, drafts still created, but nothing goes live without editor. |
| **Reader newsletter** | LOW | 1 day | email provider (TBD) integration: subscribe form on public site. Weekly digest of best articles (top 5 by score). Auto-generated, auto-sent. |

### Stage 3 flow:

```
Scrape cycle (automated, cron)
  → Score 9+: auto-research → auto-write → verify → AUTO-PUBLISH (if passed)
  → Score 8:  auto-research → auto-write → verify → auto-publish with 24h review flag
  → Score 6-7: inbox, editor picks when available
  → Score <6: dismissed

Comment agent (hourly)
  → Reads new comments
  → Replies to corrections, gratitude, questions
  → Hides spam/trolls
  → Logs story leads

Scoring coach (weekly)
  → Analyzes editor actions + reader engagement
  → Updates scoring-dna.md
  → Sends digest to editor

Editor (20% — weekly curator role)
  → Scans weekly digest email
  → Reviews any flagged articles (verification failures, reader corrections)
  → Overrides scoring coach if needed ("no, I want more KULTURA this month")
  → Reviews comment agent replies occasionally
  → Approves/rejects source suggestions
```

---

## Stage 4: Full Autonomy (months 4+)

**Human involvement: ~5% (strategic only)**
*Purpose:* The portal is alive. Finds, writes, publishes, engages, learns — all on its own.

### What we HAVE (after Stage 3):

Everything from Stages 1-3 plus months of training data, a refined scoring-dna.md, proven auto-publish track record, active reader community, and tested comment agent.

### What's MISSING for Stage 4:

| Missing | Priority | Effort | Details |
|---------|----------|--------|---------|
| **All scores 6+ auto-publish** | HIGH | 2h | Lower auto-publish threshold. Score 6-7 now auto-research + auto-write + auto-publish (with longer review window: 48h). System has proven reliable enough at this point. |
| **Story lead pipeline** | HIGH | 3 days | When comment agent identifies story lead: 1) Save to `story_leads` table. 2) Background agent researches: is this real? Enough for article? 3) If promising → create headline with `source_name: 'reader_tip'`, auto-score, enter pipeline. Reader tips become articles. |
| **`story_leads` table** | HIGH | 1h | Schema: id, comment_id, article_id, lead_text, ai_assessment, status (new/researching/promoted/rejected), headline_id (if promoted), created_at. |
| **Self-healing corrections** | HIGH | 2 days | If comment agent detects factual correction confirmed by 2+ readers or verified via web search: 1) Flag article. 2) Re-run research pipeline with correction context. 3) Update article body. 4) Add "Popravljeno" notice. 5) Notify editor in digest. |
| **Source lifecycle automation** | MEDIUM | 2 days | Full cycle: discover → evaluate → add (tier 3) → monitor health → promote to tier 2 if quality confirmed → promote to tier 1 if essential → auto-disable if dead → auto-remove after 30 days dead. No human needed. |
| **Content calendar awareness** | MEDIUM | 1 day | Agent knows Slovenian holidays, seasons, events. Boosts relevant categories: Christmas → SKUPNOST/JUNAKI, summer → NARAVA/ZIVALI, school year → KULTURA. Adjusts scoring-dna.md seasonally. |
| **Reader engagement analytics** | MEDIUM | 2 days | Track: page views per article (simple analytics), comment count, comment sentiment distribution, time on page. Feed into scoring coach: articles that get high engagement = "this type of story works, find more." |
| **Multi-channel publishing** | LOW | 3 days | Auto-post to: RSS feed (/feed.xml), social media (Twitter/X, Facebook), newsletter (weekly email provider (TBD) digest). Each channel slightly adapted (shorter for social, teaser for newsletter). |
| **A/B headline testing** | LOW | 2 days | For auto-published articles: generate 2 headline variants. Show variant A to 50% readers, B to 50%. After 24h, keep the one with better engagement. Scoring coach learns which headline patterns work. |
| **Emergency brake** | LOW | 4h | If 3+ articles in 24h get negative comment sentiment OR manual flag: auto-pause all publishing, alert editor, enter Stage 3 mode until editor manually re-enables Stage 4. |

### Stage 4 flow:

```
CONTINUOUS (every 15-60 min):
  Scrape → Score → Research → Write → Verify → Publish
  No human in the loop. Portal publishes 5-15 articles per day.

HOURLY:
  Comment agent reads + replies + extracts insights
  Source health check
  Story lead evaluation

DAILY:
  Editor digest email: "published 12 articles, 45 comments, 2 corrections, 1 new source"
  Analytics rollup

WEEKLY:
  Scoring coach updates scoring-dna.md
  Source lifecycle review
  Content calendar adjustment

MONTHLY:
  Editor sets strategic direction: "more rural stories", "focus on JUNAKI in healthcare"
  System adjusts scoring-dna.md accordingly
```

---

## Safety Rails (all stages, forever)

These NEVER get removed, even at full autonomy:

1. **Verification must pass** — no article publishes without fact-check passing
2. **Kill switch** — one toggle pauses all auto-publishing instantly
3. **No AI deletions** — AI can publish, edit, hide. Only humans delete permanently.
4. **Audit log** — every AI decision logged: score, category, auto-write, auto-publish, comment reply
5. **Correction transparency** — "Popravljeno: [datum]" visible to readers
6. **Reader trust signals** — negative comment sentiment → auto-flag for review
7. **Daily digest** — editor always informed, even if they do nothing
8. **Rate limits** — max auto-publishes per day (prevents runaway)
9. **Emergency brake** — auto-pause if things go wrong

---

## The Vision

Svetla Stran is not a website with an AI backend. It's an autonomous good-news organism.

It wakes up every 15 minutes, scans Slovenia for good news, finds the stories that matter, researches them deeply, writes about them with warmth, publishes them, talks to its readers, learns from their reactions, and gets better at finding the next story.

The founder's role evolves:
1. **Now:** Hands on everything. Teaching the system what "good" means.
2. **Soon:** Quick daily review. "Yes, yes, yes, no not that one, yes."
3. **Later:** Weekly curator. "More stories about rural communities this month."
4. **Eventually:** Visionary. Set the direction, the system executes.

The portal doesn't replace human judgment — it *absorbed* it during Stage 1-2 and carries it forward. Every pick, every dismiss, every edit was a lesson. The scoring-dna.md file is a living document of one editor's taste, amplified to run 24/7 without sleep.
