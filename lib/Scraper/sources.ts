/**
 * ═══════════════════════════════════════════════════════════════
 *  SVETLA STRAN - VIRI ZGODB
 * ═══════════════════════════════════════════════════════════════
 *
 *  To je EDINA datoteka, ki jo uredniš ko dodaš ali odstraniš vir.
 *  Scraper jo prebere avtomatsko ob vsakem zagonu.
 *
 *  Kako dodati nov vir:
 *    1. Dodaj objekt v ustrezen seznam (RSS_SOURCES ali HTML_SOURCES)
 *    2. To je vse. Naslednji run ga pobere.
 *
 *  Kako umakniti vir:
 *    - Nastavi active: false  (ohrani za zgodovino)
 *    - Ali ga preprosto izbriši
 */

// ── TIPI ─────────────────────────────────────────────────────────────────────

export interface RSSSource {
  name: string;
  url: string;
  category?: string;     // Privzeta kategorija (AI jo lahko preglasi)
  active?: boolean;       // default true
}

export interface HTMLSource {
  name: string;
  url: string;
  /** CSS selektor za kontejner člankov NA STRANI */
  linkSelector: string;
  /** Regex vzorec za filtriranje href-ov člankov */
  linkPattern: string;
  category?: string;
  active?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RSS VIRI
// ═══════════════════════════════════════════════════════════════════════════════

export const RSS_SOURCES: RSSSource[] = [

  // ── Nacionalni mediji ──────────────────────────────────────────────────────

  { name: 'RTV SLO',          url: 'https://www.rtvslo.si/feeds/01.xml' },
  { name: 'STA',              url: 'https://www.sta.si/rss-0' },
  { name: '24ur',             url: 'https://www.24ur.com/rss' },
  { name: 'Delo',             url: 'https://www.delo.si/rss' },
  { name: 'Dnevnik',          url: 'https://www.dnevnik.si/rss.xml' },
  { name: 'Žurnal24',         url: 'https://www.zurnal24.si/feeds/latest' },

  // ── Regionalni mediji ──────────────────────────────────────────────────────

  { name: 'Gorenjski Glas',   url: 'https://www.gorenjskiglas.si/rss.xml' },
  { name: 'Primorske Novice', url: 'https://www.primorske.si/rss.xml' },

  // ── Vlada & uradni viri ────────────────────────────────────────────────────

  { name: 'Gov.si',           url: 'https://www.gov.si/novice/rss',           category: 'INFRASTRUKTURA' },

  // ── Živali & narava ───────────────────────────────────────────────────────

  { name: 'DOPPS',            url: 'https://ptice.si/feed/',                  category: 'ZIVALI' },
  { name: 'ZRSVN',            url: 'https://zrsvn-varstvonarave.si/feed/',    category: 'NARAVA' },

  // ── Šport ──────────────────────────────────────────────────────────────────

  { name: 'Smučarska zveza',  url: 'https://www.sloski.si/feed/',             category: 'SPORT' },
  { name: 'Kolesarska zveza', url: 'https://kolesarska-zveza.si/feed/',       category: 'SPORT' },
  { name: 'ŠZIS',             url: 'https://www.zsis.si/feed/',               category: 'SPORT' },

  // ── Civilna družba ────────────────────────────────────────────────────────

  { name: 'Rdeči križ',       url: 'https://www.rks.si/feed/',               category: 'SKUPNOST' },
  { name: 'Taborniki',        url: 'https://www.taborniki.si/feed/',          category: 'SKUPNOST' },

  // ── Kultura & dediščina ────────────────────────────────────────────────────

  { name: 'ZVKDS',            url: 'https://www.zvkds.si/feed/',             category: 'KULTURA' },
  { name: 'SNG Ljubljana',    url: 'https://www.drama.si/feed',              category: 'KULTURA' },
  { name: 'SNG Maribor',      url: 'https://www.sng-mb.si/feed/',            category: 'KULTURA' },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  HTML VIRI (scraping)
// ═══════════════════════════════════════════════════════════════════════════════

export const HTML_SOURCES: HTMLSource[] = [

  // ── Nacionalni / regionalni mediji ─────────────────────────────────────────

  {
    name: 'Večer',
    url: 'https://vecer.com',
    linkSelector: 'a',
    linkPattern: '/(slovenija|maribor|aktualno|sport|kultura)/',
  },
  {
    name: 'Sobotainfo',
    url: 'https://sobotainfo.com',
    linkSelector: 'a',
    linkPattern: '/(aktualno|lokalno|novice|sport)/',
  },
  {
    name: 'Savinjske Novice',
    url: 'https://savinjske.com',
    linkSelector: 'a',
    linkPattern: '/novica/',
  },

  // ── Občine ─────────────────────────────────────────────────────────────────

  {
    name: 'MOL Ljubljana',
    url: 'https://www.ljubljana.si/sl/aktualno/novice',
    linkSelector: 'a',
    linkPattern: '/sl/aktualno/novice/',
    category: 'INFRASTRUKTURA',
  },
  {
    name: 'MOM Maribor',
    url: 'https://www.maribor.si/novice',
    linkSelector: 'a',
    linkPattern: '/maribor_novice/',
    category: 'INFRASTRUKTURA',
  },

  // ── Živali & narava ───────────────────────────────────────────────────────

  {
    name: 'ZOO Ljubljana',
    url: 'https://www.zoo.si',
    linkSelector: 'a',
    linkPattern: '/novice/.+/.+',
    category: 'ZIVALI',
  },
  {
    name: 'Zavetišče Ljubljana',
    url: 'https://www.zavetisce-ljubljana.si',
    linkSelector: 'a',
    linkPattern: '/(blog|novice-in-obvestila)/',
    category: 'ZIVALI',
  },
  {
    name: 'Zavetišče Maribor',
    url: 'https://zavetisce-mb.si',
    linkSelector: 'a',
    linkPattern: '/(najdeni|izgubljeni|novice|posvojitev)',
    category: 'ZIVALI',
  },

  // ── Šport ──────────────────────────────────────────────────────────────────

  {
    name: 'Olympic.si',
    url: 'https://www.olympic.si',
    linkSelector: 'a',
    linkPattern: '/aktualno/',
    category: 'SPORT',
  },

  // ── Gospodarstvo & kmetijstvo ──────────────────────────────────────────────

  {
    name: 'KGZS',
    url: 'https://www.kgzs.si',
    linkSelector: 'a',
    linkPattern: '/novica/',
    category: 'PODJETNISTVO',
  },
  {
    name: 'Zadružna zveza',
    url: 'https://zzs.si',
    linkSelector: 'a',
    linkPattern: '/aktualno/',
    category: 'PODJETNISTVO',
  },

  // ── Civilna družba ────────────────────────────────────────────────────────

  {
    name: 'CNVOS',
    url: 'https://www.cnvos.si',
    linkSelector: 'a',
    linkPattern: '/(novice|nvo-sektor)',
    category: 'SKUPNOST',
  },
  {
    name: 'Prostovoljstvo.org',
    url: 'https://www.prostovoljstvo.org',
    linkSelector: 'a',
    linkPattern: '/(novice|dogodki)/',
    category: 'SKUPNOST',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  NE DELA (za referenco - DNS/SSL/firewall ali squatter)
//
//  - Koroške Novice (koroske-novice.si) - DNS fail
//  - Štajerski Tednik (st.si) - DNS fail
//  - Lokalne.si - DNS fail
//  - ZOO Maribor (zoo-maribor.si) - DNS fail
//  - Atletska zveza (atletska-zveza.si) - DNS fail, atletika.si je squatter
//  - Mlada Slovenija (mlada-slovenija.si) - DNS fail
//  - URSZR (urszr.si) - DNS fail
//  - SPIRIT Slovenija - stran deluje, 0 novic/linkov
//  - Uradni list RS - stran deluje, ni novic za scraping
//  - FURS - stran deluje, novice stran 404
//  - Aquarium Piran - stran deluje, skoraj brez vsebine
// ═══════════════════════════════════════════════════════════════════════════════

// ── HELPERS ──────────────────────────────────────────────────────────────────

export function getActiveRSSSources(): RSSSource[] {
  return RSS_SOURCES.filter(s => s.active !== false);
}

export function getActiveHTMLSources(): HTMLSource[] {
  return HTML_SOURCES.filter(s => s.active !== false);
}
