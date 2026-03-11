# Svetla Stran

Slovenian "good news only" portal. AI scrapes sources, scores stories, writes articles, editor approves, public reads.

## Tech Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Anthropic SDK (Haiku for filtering/scoring, Sonnet for writing), Prisma/PostgreSQL (Supabase).

## Quick Start

```bash
npm install
npm run dev          # http://localhost:7200
```

## Scrape Cycle

The scraping pipeline runs as a standalone script. It crawls 32 Slovenian news sources, deduplicates, filters titles, scores stories (0-10), and auto-writes articles for stories scoring 8+.

```bash
# Full cycle (crawl + filter + score + write)
node scripts/scrape-cycle.mjs

# Dry run (crawl + dedup only, no AI calls)
node scripts/scrape-cycle.mjs --dry-run
```

### Run on a loop with Claude Code

```bash
/loop 2h node scripts/scrape-cycle.mjs
```

This runs the full pipeline every 2 hours. Each run takes ~1 minute and only processes new stories.

### What happens each cycle

| Step | What | Time |
|------|------|------|
| 1. Crawl | Fetch all 32 RSS + HTML sources | ~15s |
| 2. Dedup | Skip already-seen URLs/hashes via `output/scrape-state.json` | ~instant |
| 3. Title filter | AI quick pass on new headlines | ~2s |
| 4. Full content | Fetch article body for candidates | ~5s |
| 5. Score | AI scores 0-10 with emotions/category | ~3s |
| 6. Auto-write | AI writes articles for score >= 8, fetches OG image | ~30s |

New articles land in `output/articles/` and appear on the site automatically.

## Project Structure

```
lib/
  Scraper/
    sources.ts       # 32 sources (19 RSS + 13 HTML)
    crawler.ts       # RSS + HTML crawling
    runner.ts        # DB-backed pipeline (for API route)
    dedup.ts         # SHA-256 content hashing
  anthropic.ts       # Anthropic client + prompts
  article-helpers.ts # Shared constants (categories, formatting)
  prisma.ts          # Prisma client singleton

scripts/
  scrape-cycle.mjs   # Standalone scrape pipeline (for /loop)

app/
  page.tsx           # Editorial inbox dashboard
  clanki/
    page.tsx         # Public articles grid
    [slug]/page.tsx  # Individual article pages
  api/
    write/route.ts   # AI article writing endpoint
    publish/route.ts # Save article to output/
    articles/route.ts # List published articles

components/
  story-card.tsx     # Inbox story card with write/publish flow
  inbox-view.tsx     # Category filtering and sorting
  article-grid.tsx   # Public article grid with images
  article-preview.tsx # Modal for reviewing AI drafts

output/
  inbox.json         # Scored stories for editorial review
  scrape-state.json  # Dedup state (seen URLs + hashes)
  articles/          # Published article JSON files
```

## Sources

32 sources across 9 categories: national media (RTV, STA, 24ur, Delo, Dnevnik), regional (Gorenjski Glas, Primorske, Savinjske), municipalities (Ljubljana, Maribor), sports federations, nature/animal orgs, civil society, and culture institutions. Configured in `lib/Scraper/sources.ts`.
