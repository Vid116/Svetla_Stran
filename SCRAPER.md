# Svetla Stran - Scraper Pipeline

## Kako deluje

```
sources.ts → crawler.ts → dedup.ts → runner.ts
 (viri)      (branje)     (duplikati)  (AI + baza)
```

### Potek ob vsakem zagonu:

1. **Prebere vire** iz `lib/Scraper/sources.ts` (19 RSS + 13 HTML)
2. **Crawla vse paralelno** — RSS z `rss-parser`, HTML s `cheerio` + `fetch`
3. **Deduplicira** — preveri URL in content hash (SHA-256 naslov + prvih 100 znakov)
4. **Title filter** (AI Haiku) — ali je naslov potencialno pozitiven? DA/NE v serijah po 50
5. **Polna vsebina** — za DA kandidate pobere celoten članek z vira
6. **Scoring** (AI Haiku) — ocena 0-10 po 5 čustvih (ponos, toplina, olajšanje, čudeženje, upanje)
7. **Inbox** — zgodbe z oceno 6+ gredo v urednikov inbox, ostale v arhiv

## Datoteke

| Datoteka | Naloga |
|---|---|
| `lib/Scraper/sources.ts` | **EDINA datoteka za urejanje virov** — vse RSS in HTML naslove |
| `lib/Scraper/crawler.ts` | `crawlRSS()`, `crawlHTML()`, `crawlFullContent()`, `saveNewStories()` |
| `lib/Scraper/dedup.ts` | `contentHash()` — SHA-256 za deduplikacijo |
| `lib/Scraper/runner.ts` | `runScraper()` — celotna orkestracija pipeline-a |
| `lib/anthropic.ts` | Anthropic client + 3 prompti (title filter, scoring, pisanje) |

## Kako dodati nov vir

Uredi **samo** `lib/Scraper/sources.ts`:

```typescript
// RSS vir:
{ name: 'Ime Medija', url: 'https://example.com/rss' },

// HTML vir:
{
  name: 'Ime Medija',
  url: 'https://example.com',
  linkSelector: 'a',           // CSS selektor za linke
  linkPattern: '/novice/',     // regex za filtriranje href-ov
},

// Izklopi vir:
{ name: 'Stari Vir', url: '...', active: false },
```

Naslednji zagon scraperja avtomatsko pobere novi vir.

## Testiranje (brez baze, brez AI)

```bash
node test_sources_config.mjs    # testira vse vire iz sources.ts
```

## Viri: 32 aktivnih (mar 2026)

### RSS (19)
RTV SLO, STA, 24ur, Delo, Dnevnik, Žurnal24, Gorenjski Glas, Primorske Novice, Gov.si, DOPPS (ptice.si), ZRSVN, Smučarska zveza (sloski.si), Kolesarska zveza, ŠZIS (zsis.si), Rdeči križ, Taborniki, ZVKDS, SNG Ljubljana (drama.si), SNG Maribor

### HTML scraping (13)
Večer, Sobotainfo, Savinjske Novice, MOL Ljubljana, MOM Maribor, ZOO Ljubljana, Zavetišče Ljubljana, Zavetišče Maribor, Olympic.si, KGZS, Zadružna zveza (zzs.si), CNVOS, Prostovoljstvo.org

### Ne dela (DNS/SSL)
Koroške Novice, Štajerski Tednik, Lokalne.si, ZOO Maribor, Atletska zveza, Mlada Slovenija, URSZR
