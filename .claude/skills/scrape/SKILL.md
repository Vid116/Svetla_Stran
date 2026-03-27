---
name: scrape
description: Run scrapers to fetch and score new headlines from configured sources
argument-hint: [all | parallel | 1 | 2 | 3]
allowed-tools: Bash(node scripts/scrape-cycle.mjs *)
---

# Run Scrapers

## IMPORTANT: Flag syntax
The tier flag uses a SPACE, not equals: `--tier 1` NOT `--tier=1`. Using `=` silently runs ALL tiers.

## Commands

Based on the argument, run from `C:\Svetla_Stran\Code`:

**`/scrape` or `/scrape all`** — Run all tiers in one process:
```bash
node scripts/scrape-cycle.mjs
```

**`/scrape parallel`** — Run all 3 tiers in parallel (fastest):
```bash
# Launch all 3 in parallel using background Bash calls:
node scripts/scrape-cycle.mjs --tier 1
node scripts/scrape-cycle.mjs --tier 2
node scripts/scrape-cycle.mjs --tier 3
```

**`/scrape 1`** — Tier 1 only (critical sources):
```bash
node scripts/scrape-cycle.mjs --tier 1
```

**`/scrape 2`** — Tier 2 only (medium sources):
```bash
node scripts/scrape-cycle.mjs --tier 2
```

**`/scrape 3`** — Tier 3 only (low-volume sources):
```bash
node scripts/scrape-cycle.mjs --tier 3
```

## What the scraper does
1. Crawls 73 RSS + 30 HTML sources
2. Deduplicates by content_hash
3. Filters titles
4. Checks etag/last-modified cache
5. Scores headlines via Claude API
6. Saves to `headlines` table with status="new"

## Notes
- Run from project root: `C:\Svetla_Stran\Code`
- NEVER run multiple full scrapes (`/scrape all`) in parallel — they hit the same sources and compete for API rate limits
- `/scrape parallel` is safe because each process handles different sources
- Timeout: allow up to 5 minutes per tier
