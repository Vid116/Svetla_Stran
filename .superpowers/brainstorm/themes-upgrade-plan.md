# Themes Upgrade Plan

Brainstormed 2026-04-10. Goal: turn flat antidote filter row into real destination pages, add new "doing-mode" + "time-mode" axes, ship 3 new high-impact themes.

**Strategic principle:** Promote existing themes to pages BEFORE adding new ones. A flat filter row dilutes when you add to it; a set of destination pages compounds.

---

## Phase 0 — Decisions

**Locked:**
- [x] URL scheme: `/tema/[slug]` — leaves room for non-antidote themes
- [x] Rollout: ship Heroji (or Pogum→Heroji) first as proof-of-concept, then roll out the rest
- [x] Compact 7 antidotes → 5 topical themes (no feeling words — they make readers feel vulnerable)
- [x] Demote `antidote` field to **hidden matcher** — kept in DB, used by AI for related-articles + deep score, never shown as a button
- [x] Drop "whispers" — they re-introduce the deficit voice ("ko se svet zdi nevaren"). Topic names don't need rescue text.
- [x] Heroji theme **absorbs JUNAKI category** — one less concept in the system
- [x] Add "Iz arhiva" theme now (→ rename to "Pred letom dni" once site has 12 months of content)

**Final theme set (9 total):**

| # | Slug | Label | Replaces | Kind |
|---|---|---|---|---|
| 1 | `med-nami` | Med nami | Prijaznost + Dobrota | topical |
| 2 | `naprej` | Naprej | Upanje + Vztrajnost | topical |
| 3 | `skupaj` | Skupaj | Povezanost | topical |
| 4 | `heroji` | Heroji | Pogum + JUNAKI category | topical |
| 5 | `drobne-radosti` | Drobne radosti | Nasmeh | topical |
| 6 | `dogodki` | Dogodki | — (new) | doing |
| 7 | `tiho-delo` | Tiho delo | — (new) | ritual |
| 8 | `nedeljska-zgodba` | Nedeljska zgodba | — (new) | ritual |
| 9 | `iz-arhiva` | Iz arhiva | — (new, → "Pred letom dni" later) | time |

**Also locked:**
- [x] Categories (KULTURA, SPORT, NARAVA, ZIVALI, INFRASTRUKTURA, PODJETNISTVO, SLOVENIJA_V_SVETU, SKUPNOST) **retired to silent tags**. Field stays in DB for AI scoring, sitemap, small card icons. No category navigation. JUNAKI absorbed into Heroji theme.
- [x] Antidote → theme mapping for hidden matcher: jeza+cinizem→med-nami, skrb+obup→naprej, osamljenost→skupaj, strah→heroji, dolgcas→drobne-radosti
- [x] Manifestos **drafted** (see below) — pending review

**Still open:**
- [x] Color palette: topical themes reuse `ANTIDOTE_CLOUD_COLORS`, 4 ritual themes got hand-picked palettes (brown for Tiho delo, gold for Nedeljska, purple for Iz arhiva, green for Dogodki) so the two axes feel visually distinct
- [x] Ritual element: **daily quote** (Option A). Deterministic by day-of-year, all visitors see same quote. 62 quotes live in `lib/theme-quotes.ts` (Schulz excluded pending Slovenian Peanuts translation).
- [ ] Final review of manifesto drafts — user-facing review when first visiting theme pages in browser

### Manifesto drafts (topic voice, no feeling words)

**Med nami**
> Drobne geste med sosedi, neznanci, mimoidočimi. Stvari, ki se zgodijo, ko nihče ne gleda — in jih je veliko več, kot bi mislili.

**Naprej**
> Projekti, ki so trajali leta. Ljudje, ki niso odnehali. Začetki, ki so se izšli. Slovenija, ki gradi — počasi, vztrajno, naprej.

**Skupaj**
> Pevski zbori, gasilska društva, sosedski pikniki, skupnostni vrtovi. Tu so zgodbe o ljudeh, ki nečesa ne počnejo sami.

**Heroji**
> Reševalec, ki je skočil v reko. Učiteljica, ki ostane po pouku. Sosed, ki ga ni nihče prosil. Ljudje, ki so v ključnem trenutku rekli ja.

**Drobne radosti**
> Pes, ki vsako jutro pospremi otroke v šolo. Star nasmeh na novi fotografiji. Drobne stvari, ob katerih se nehote nasmehneš.

**Dogodki**
> Festivali, koncerti, predstave, pohodi, odprtja. Tukaj zbiramo, kaj se ta teden dogaja po Sloveniji — in kam je vredno iti.

**Tiho delo**
> Medicinske sestre na nočni izmeni. Cestarji ob šestih zjutraj. Knjižničarke, vzgojiteljice, voznice rešilcev. Slovenija stoji, ker nekdo zgodaj vstane.

**Nedeljska zgodba**
> Ena zgodba, vsako nedeljo. Dolga, počasi napisana, vredna kave. Za jutra, ki se jim ne mudi.

**Iz arhiva**
> Dobre zgodbe ne zastarajo. Tu se vračajo tiste, ki so nas pred meseci ali leti premaknile — in še vedno držijo.

---

## Move 1 — Themes become real pages

### 1.1 Routing + data layer
- [x] Add `/tema/[slug]/page.tsx` dynamic route
- [x] Add `THEMES` registry in `lib/article-helpers.ts`: slug → { kind, label, manifesto, colors, antidoteMatch[], categoryMatch[], minAgeDays? }
- [x] Add `getArticlesByTheme(theme)` to `lib/db.ts` — single function, dispatches by `theme.kind`: topical → antidote+category; tagged → `slug = ANY(articles.themes)`; archive → date cutoff; events → empty
- [ ] Add `getHeroForTheme(slug)` — returns single editor's pick (newest high-score, or manually flagged) — deferred, hero is currently just `articles[0]`
- [x] Redirect old `?antidote=X` query param on homepage → `/tema/{slug}` (307)
- [x] Antidote→theme mapping: jeza+cinizem→med-nami, skrb+obup→naprej, osamljenost→skupaj, strah→heroji, dolgcas→drobne-radosti

### 1.2 Page layout
- [x] Hero section: theme color gradient wash, label, manifesto, daily quote ritual
- [x] One large hero story (not a grid) — full image, title, subtitle, "Preberi zgodbo" CTA
- [x] Below hero: archive grid for that theme (paginated deferred — LIMIT 72)
- [x] Per-theme color palette (inline styles from `theme.colors`, reused from `ANTIDOTE_CLOUD_COLORS` for topical + hand-picked for ritual)
- [x] Back-to-home link in nav
- [x] Share metadata (OG + Twitter, per-theme manifesto as description)

### 1.3 Manifesto + ritual content
**Voice rule:** topic voice ("Tu so zgodbe o…"), never deficit voice ("Ko si…"). Never name a feeling. Describe the world.
- [x] Manifesto: Med nami
- [x] Manifesto: Naprej
- [x] Manifesto: Skupaj
- [x] Manifesto: Heroji
- [x] Manifesto: Drobne radosti
- [x] Manifesto: Dogodki
- [x] Manifesto: Tiho delo
- [x] Manifesto: Nedeljska zgodba
- [x] Manifesto: Iz arhiva
- [x] Ritual = daily quote, deterministic by day-of-year. 62 quotes seeded in `lib/theme-quotes.ts`
- [x] Placement: below manifesto in the theme hero section, separated by a thin border

### 1.4 Homepage integration
- [x] `DISPLAY_GROUPS` category clouds retired entirely. Homepage now shows 5 topical theme clouds (big fluffy) + 4 ritual theme pills (small text). All are `<Link>` to `/tema/{slug}`.
- [x] `EmotionSection` component deleted (functionality absorbed into ArticleGrid's new nav)
- [x] `activeGroup`/filter state removed from ArticleGrid (no more in-place filtering, only search)

### 1.5 SEO + discoverability
- [x] Add all 9 theme pages to `sitemap.ts` (via `ALL_THEME_SLUGS`)
- [ ] Per-theme OG image (currently just text metadata — deferred)
- [x] Internal linking: end-of-article "Več iz teme **{label}** →" link below share bar, themed color

---

## Move 2 — New axes (the infrastructure for non-antidote themes) ✅

- [x] `THEMES` registry supports `kind: 'topical' | 'tagged' | 'archive' | 'events'`
- [x] `getArticlesByTheme` dispatches on `theme.kind`
- [x] Theme pages don't assume antidote color palette — each theme defines its own colors (topical reuses cloud colors; ritual has hand-picked palettes: brown/gold for Tiho delo + Nedeljska, purple for Iz arhiva, green for Dogodki)
- [x] Navigation: 5 topical themes as fluffy clouds + 4 ritual themes as small pills below, all on homepage
- [x] DB: `articles.themes TEXT[]` and `drafts.themes TEXT[]` columns added for manual tagging (tiho-delo, nedeljska-zgodba)

---

## Move 3 — Ship the top 3 new themes

### 3.1 Dogodki (stubbed — page exists, data model deferred)
- [x] `/tema/dogodki` route exists via generic `/tema/[slug]` — renders hero + manifesto + empty grid
- [x] `getArticlesByTheme` returns `[]` for `kind: 'events'` (dormant until events table ships)
- [ ] DB: new table `events` (title, description, date, location, url, source, tags, image_url, created_at) — OR reuse `articles` with `kind: 'event'` field
- [ ] Decide: scrape events automatically (festival calendars, občine sites) or manual editorial entry only?
- [ ] If scraped: add 3–5 event sources to scraper, write event-specific scoring prompt
- [ ] Editorial UI: add "events" tab to `/urednik` for manual entry/approval
- [ ] Update `/tema/dogodki` page layout to calendar/list view once data exists (current generic layout works for empty state)
- [ ] Card design: date badge, title, location pin, "Več" link
- [ ] "Ta teden" / "Ta mesec" sections at top
- [ ] Past events archive (do they disappear or stay?)
- [ ] Add to homepage: small "Dogodki ta teden" widget? Decide.

### 3.2 Tiho delo (sharpest brand differentiator) ✅
- [x] Custom theme approach chosen (cuts across categories)
- [x] DB: `articles.themes TEXT[]` array added — 'tiho-delo' tag on articles
- [x] Page `/tema/tiho-delo` shipped (via generic `/tema/[slug]` route)
- [x] Manifesto written
- [x] Research-write Phase 8.5 `DEEP_SCORING_PROMPT` now asks for `themes: ["tiho-delo"]` with explicit criteria. `result.deepScore.themes` propagates through worker.mjs → `createDraft` → `drafts.themes` → `publishDraft` → `articles.themes`
- [x] Editorial UI: `DraftThemeTags` component on `/urednik/osnutki/[id]` — toggle buttons for tiho-delo + nedeljska-zgodba. PUT `/api/drafts` with `{id, themes: [...]}` persists via `updateDraft`
- [x] Backfill: 9 volunteer-themed articles hand-tagged as tiho-delo (all prostovoljci stories)

### 3.4 Iz arhiva (time-machine, future "Pred letom dni") ✅
- [x] Cutoff: 90 days (in `theme.minAgeDays`)
- [x] Page `/tema/iz-arhiva` shipped via generic route — filters by `published_at < NOW() - 90 days`
- [x] Manifesto written
- [ ] Auto-rename to "Pred letom dni" once site has 12+ months of content — just flip `label` in the THEMES registry
- [ ] Optional: editorial flag `featured_in_archive: boolean` so editors can hand-pick standout old stories (not needed v1)

### 3.3 Nedeljska zgodba (ritual, retention play) ✅
- [x] Approach chosen: manual tag on curated editor picks (not a new long-form flag)
- [x] Stored in `articles.themes` array — same mechanism as Tiho delo
- [x] Page `/tema/nedeljska-zgodba` shipped via generic route — filters by `'nedeljska-zgodba' = ANY(themes)`
- [x] Manifesto written
- [x] Editorial UI: `DraftThemeTags` component — second toggle alongside Tiho delo
- [x] Seed article tagged: "Oddaja Ambienti po desetletjih združila brata in sestro" (ai_score 9, long-form)
- [ ] Newsletter integration: Sunday variant features the Nedeljska zgodba prominently (part of Move 4.2 — deferred)
- [x] Decide: editor's call (any article can be flagged — no long-form requirement)

---

## Move 4 — Newsletter overhaul

**The problem we're fixing:** the homepage filters by antidotes, the newsletter signup picks categories. Two vocabularies for the same act. The theme rename collapses both to one.

### 4.1 Unify the vocabulary ✅
- [x] Replaced `CATEGORIES` array in `components/newsletter-signup.tsx` with `THEMES` from registry
- [x] Updated `ThemePickerModal` to show all 9 themes with theme colors
- [x] `/api/subscribe` route accepts `themes` array, validates against `ALL_THEME_SLUGS`, stores in DB
- [x] DB migration: added `subscribers.themes TEXT[]` column alongside existing `categories` (kept for backwards compat — send jobs still read `categories` until Move 4.2 updates them)
- [ ] Brevo: re-map subscriber list attributes for existing subscribers (deferred — requires Brevo-side template work)
- [x] `NewsletterSignup` `category` prop renamed to `theme` throughout (mid-article CTA, article page afterglow signup all pass theme slug)

### 4.2 New cadence variants (not started — big scope, needs Brevo + cron work)
Reader picks any combo of these. Not just one weekly digest.

| Variant | Cadence | Themes covered | Voice |
|---|---|---|---|
| **Dnevna doza** | daily morning | reader-picked from 5 topical themes | invitation |
| **Nedeljska zgodba** | Sunday morning | only Nedeljska zgodba | afterglow / long-read |
| **Dogodki ta teden** | Thursday | only Dogodki | utility, brief |
| **Iz arhiva** | monthly (or annual once "Pred letom dni" is real) | only Iz arhiva | reflective |

- [ ] DB schema: `subscribers.variants` — array of variant slugs (`['dnevna', 'nedeljska']`)
- [ ] Newsletter signup UI: 4 toggles, default = Dnevna doza only
- [ ] Cron / send job per variant — each one assembles its own email
- [ ] Sunday cron: send Nedeljska to all subscribers who opted in
- [ ] Thursday cron: send Dogodki digest (skip if no events that week)
- [ ] Monthly cron: send Iz arhiva digest
- [ ] Brevo template per variant (4 templates total)

### 4.3 Migration of existing subscribers
- [ ] Map old `categories` → new `themes` (KULTURA→? — decide where each retired category lands)
- [ ] Default all existing subscribers to Dnevna doza variant only
- [ ] One-time email: "Naročnine smo posodobili" — announce new themes + variants, link to preferences page
- [ ] Build / find preferences page (`/nastavitve` or token-link from email) so subscribers can change variants without re-subscribing

---

## Phase 5 — Polish + measure

- [ ] Analytics: track per-theme page views, scroll depth, time-on-page (which themes pull readers in?)
- [ ] After 4 weeks of data: which themes deserve more editorial focus? Which manifestos need rewriting?
- [ ] A/B: cloud row links to filter vs to theme page — which converts more reads?
- [ ] Consider: do all 7 antidote pages need to ship at once, or roll out 1–2 to test format first? **Recommend:** ship Pogum first as proof-of-concept, then roll out the rest.

---

## Open questions / parking lot

- Do we want a `/teme` index page that lists all themes as one big landing? (probably yes, but later)
- Should "Dogodki" use a totally different visual identity from antidote themes? (probably yes — it's not medicine, it's a calendar)
- Is "Tiho delo" something the AI can detect reliably during deep scoring, or does it need human curation forever?
- Do follow-up themes ("Vztrajneži", "Pred letom dni") deserve a v2 after the first 3 ship?
- Newsletter angle: each theme could have its own micro-newsletter eventually. Not now.

---

## Suggested order of work

1. ✅ **Finish Phase 0** — 9 manifestos written, colors picked, ritual = daily quote
2. ✅ **Move 1.1 + 1.2** — routing + page layout, `/tema/heroji` + 4 other topical themes shipped
3. ✅ **Move 1.4 + 1.5** — `EmotionSection` + `DISPLAY_GROUPS` retired, sitemap + redirects + end-of-article link shipped
4. ✅ **Move 2** — THEMES registry generalized, 4 theme kinds dispatching in `getArticlesByTheme`
5. ✅ **Move 3.2 Tiho delo** — page shipped, still needs editorial UI toggle + backfill
6. ✅ **Move 3.4 Iz arhiva** — page shipped, 90-day cutoff active
7. ✅ **Move 3.3 Nedeljska zgodba** — page shipped, still needs editorial UI toggle
8. 🟡 **Move 4.1 Newsletter vocabulary unification** — signup components + subscribe API swapped to themes; `subscribers.themes` column exists
9. ⏳ **Move 4.2/4.3 Cadence variants + migration** — NOT STARTED. Needs Brevo template work + cron jobs + preferences page + existing-subscriber announcement email.
10. ⏳ **Move 3.1 Dogodki data model** — page stub exists but returns empty. Needs events table or `articles.kind='event'` decision + scraper sources or manual editorial entry.
11. ✅ **Editorial UI toggles** — `DraftThemeTags` component added to `/urednik/osnutki/[id]`
12. ✅ **Research-write pipeline** — Phase 8.5 DEEP_SCORING_PROMPT now returns `themes: ["tiho-delo"]` when criteria match; propagates end-to-end
13. ✅ **Backfill** — 9 prostovoljci stories tagged Tiho delo, 1 reunion story tagged Nedeljska zgodba
14. ⏳ **Phase 5** — measure, iterate
