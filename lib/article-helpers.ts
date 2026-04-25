// Shared helpers for article display — usable in both server and client components.

export const CATEGORY_LABELS: Record<string, string> = {
  SPORT: "Šport",
  ZIVALI: "Živali",
  SKUPNOST: "Skupnost",
  NARAVA: "Narava",
  INFRASTRUKTURA: "Infrastruktura",
  PODJETNISTVO: "Podjetništvo",
  SLOVENIJA_V_SVETU: "Slovenija v svetu",
  JUNAKI: "Junaki",
  KULTURA: "Kultura",
};

export const CATEGORY_ICONS: Record<string, string> = {
  SPORT: "🏅",
  ZIVALI: "🐾",
  SKUPNOST: "🤝",
  NARAVA: "🌿",
  INFRASTRUKTURA: "🏗️",
  PODJETNISTVO: "💼",
  SLOVENIJA_V_SVETU: "🌍",
  JUNAKI: "⭐",
  KULTURA: "🎭",
};

export const CATEGORY_PILL: Record<string, string> = {
  SPORT: "bg-sky-soft text-sky-700 border-sky/40",
  ZIVALI: "bg-warmth text-amber-700 border-amber-200",
  SKUPNOST: "bg-lavender-soft text-purple-700 border-lavender/40",
  NARAVA: "bg-nature-soft text-green-700 border-nature/40",
  INFRASTRUKTURA: "bg-gold-soft text-amber-800 border-gold/40",
  PODJETNISTVO: "bg-gold-soft text-amber-800 border-gold/40",
  SLOVENIJA_V_SVETU: "bg-sky-soft text-sky-700 border-sky/40",
  JUNAKI: "bg-rose-soft text-rose-700 border-rose/40",
  KULTURA: "bg-lavender-soft text-purple-700 border-lavender/40",
};

export const CATEGORY_ACCENT_BAR: Record<string, string> = {
  SPORT: "bg-sky",
  ZIVALI: "bg-warmth",
  SKUPNOST: "bg-lavender",
  NARAVA: "bg-nature",
  INFRASTRUKTURA: "bg-gold",
  PODJETNISTVO: "bg-gold",
  SLOVENIJA_V_SVETU: "bg-sky",
  JUNAKI: "bg-rose",
  KULTURA: "bg-lavender",
};

// ── Antidote helpers ────────────────────────────────────

export const ANTIDOTE_LABELS: Record<string, { label: string; oneLiner: string }> = {
  jeza: { label: 'Prijaznost', oneLiner: 'ko svet kliče po razumu' },
  skrb: { label: 'Upanje', oneLiner: 'ko prihodnost skrbi' },
  cinizem: { label: 'Dobrota', oneLiner: 'ko dvomiš v ljudi' },
  osamljenost: { label: 'Povezanost', oneLiner: 'ko potrebuješ toplo zgodbo' },
  obup: { label: 'Vztrajnost', oneLiner: 'ko pozabiš da je vse možno' },
  strah: { label: 'Pogum', oneLiner: 'ko se svet zdi nevaren' },
  dolgcas: { label: 'Nasmeh', oneLiner: 'ko rabiš razlog za nasmeh' },
};

export const ANTIDOTE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  jeza: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  skrb: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  cinizem: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  osamljenost: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  obup: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  strah: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  dolgcas: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
};

// Cloud-style colors for antidote buttons (same format as CLOUD_COLORS in article-grid)
export const ANTIDOTE_CLOUD_COLORS: Record<string, { soft: string; fill: string; text: string; activeText: string; whisper: string }> = {
  jeza:         { soft: "#fce0e0", fill: "#f0a0a0", text: "#8a2020", activeText: "#400000", whisper: "#c08080" },
  skrb:         { soft: "#d4ecfc", fill: "#7cc4f5", text: "#1a5f8a", activeText: "#ffffff", whisper: "#80a8c0" },
  cinizem:      { soft: "#f5eac8", fill: "#d4b45a", text: "#6b5010", activeText: "#3d2e00", whisper: "#b0a070" },
  osamljenost:  { soft: "#e8dff5", fill: "#c4a8e8", text: "#5b2d8e", activeText: "#2a0050", whisper: "#a090c0" },
  obup:         { soft: "#d4f0d8", fill: "#7ecd8a", text: "#1f6b2f", activeText: "#0a3515", whisper: "#80b088" },
  strah:        { soft: "#f8e0d0", fill: "#e8a070", text: "#7a3a1a", activeText: "#3d1800", whisper: "#c09878" },
  dolgcas:      { soft: "#fce8f0", fill: "#f0a0c0", text: "#8a2050", activeText: "#400020", whisper: "#c08098" },
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sl-SI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min branja`;
}

/**
 * Slovenian plural — pick form based on count.
 * forms = [singular(1), dual(2), few(3-4), many(5+)]
 * e.g. pluralize(3, ["zgodba","zgodbi","zgodbe","zgodb"]) → "zgodbe"
 */
export function pluralize(n: number, forms: [string, string, string, string]): string {
  const abs = Math.abs(n);
  if (abs === 1) return forms[0];
  if (abs === 2) return forms[1];
  if (abs === 3 || abs === 4) return forms[2];
  return forms[3];
}

const ZGODBA_FORMS: [string, string, string, string] = ["zgodba", "zgodbi", "zgodbe", "zgodb"];
const KOMENTAR_FORMS: [string, string, string, string] = ["komentar", "komentarja", "komentarji", "komentarjev"];

export function zgodbeCount(n: number): string {
  return `${n} ${pluralize(n, ZGODBA_FORMS)}`;
}

export function komentarjiCount(n: number): string {
  return `${n} ${pluralize(n, KOMENTAR_FORMS)}`;
}

// ── Themes (reader-facing destination pages) ────────────────────────
//
// Themes live on two axes:
//   topical — emotional/subject-based, matched via hidden antidote tags + legacy categories
//   ritual  — format-based, matched via manual tags in articles.themes[] or date cutoffs
//
// Antidote is the hidden matcher: the AI tags each article with one, but readers
// never see the word. Categories are retired to silent tags (kept in DB for the
// legacy pipeline, not surfaced in nav).

export type ThemeKind = "topical" | "tagged" | "archive" | "events";

export interface Theme {
  slug: string;
  label: string;
  manifesto: string;
  colors: { soft: string; fill: string; text: string; activeText: string; whisper: string };
  kind: ThemeKind;
  // topical: match by antidote (primary or secondary) OR category
  antidoteMatch: string[];
  categoryMatch: string[];
  // archive: articles older than this cutoff qualify
  minAgeDays?: number;
}

export const THEMES: Record<string, Theme> = {
  "med-nami": {
    slug: "med-nami",
    label: "Med nami",
    manifesto: "Drobne geste med sosedi, neznanci, mimoidočimi. Stvari, ki se zgodijo, ko nihče ne gleda — in jih je veliko več, kot bi mislili.",
    colors: ANTIDOTE_CLOUD_COLORS.jeza,
    kind: "topical",
    antidoteMatch: ["jeza", "cinizem", "osamljenost"],
    categoryMatch: [],
  },
  "naprej": {
    slug: "naprej",
    label: "Napredek",
    manifesto: "Projekti, ki so trajali leta. Ljudje, ki niso odnehali. Začetki, ki so se izšli. Slovenija, ki gradi — počasi, vztrajno, naprej.",
    colors: ANTIDOTE_CLOUD_COLORS.skrb,
    kind: "topical",
    antidoteMatch: ["skrb", "obup"],
    categoryMatch: [],
  },
  "heroji": {
    slug: "heroji",
    label: "Heroji",
    manifesto: "Reševalec, ki je skočil v reko. Učiteljica, ki ostane po pouku. Sosed, ki ga ni nihče prosil. Ljudje, ki so v ključnem trenutku rekli ja.",
    colors: ANTIDOTE_CLOUD_COLORS.strah,
    kind: "topical",
    antidoteMatch: ["strah"],
    categoryMatch: ["JUNAKI"],
  },
  "drobne-radosti": {
    slug: "drobne-radosti",
    label: "Drobne radosti",
    manifesto: "Pes, ki vsako jutro pospremi otroke v šolo. Star nasmeh na novi fotografiji. Drobne stvari, ob katerih se nehote nasmehneš.",
    colors: ANTIDOTE_CLOUD_COLORS.dolgcas,
    kind: "topical",
    antidoteMatch: ["dolgcas"],
    categoryMatch: [],
  },

  // Ritual themes — tagged manually by editors or computed from dates

  "tiho-delo": {
    slug: "tiho-delo",
    label: "Tiha dela",
    manifesto: "Medicinske sestre na nočni izmeni. Cestarji ob šestih zjutraj. Knjižničarke, vzgojiteljice, voznice rešilcev. Slovenija stoji, ker nekdo zgodaj vstane.",
    colors: { soft: "#ebedf0", fill: "#c0c4ca", text: "#50545c", activeText: "#25282e", whisper: "#898e96" },
    kind: "tagged",
    antidoteMatch: [],
    categoryMatch: [],
  },
  "nedeljska-zgodba": {
    slug: "nedeljska-zgodba",
    label: "Nedeljska zgodba",
    manifesto: "Ena zgodba, vsako nedeljo. Dolga, počasi napisana, vredna kave. Za jutra, ki se jim ne mudi.",
    colors: { soft: "#f5ead0", fill: "#d4af37", text: "#5a4220", activeText: "#2a1d08", whisper: "#b89a35" },
    kind: "tagged",
    antidoteMatch: [],
    categoryMatch: [],
  },
  "iz-arhiva": {
    slug: "iz-arhiva",
    label: "Iz arhiva",
    manifesto: "Dobre zgodbe ne zastarajo. Tu se vračajo tiste, ki so nas pred meseci ali leti premaknile — in še vedno držijo.",
    colors: { soft: "#e4dce8", fill: "#9888a8", text: "#4a3a5a", activeText: "#2a1d3a", whisper: "#88789a" },
    kind: "archive",
    antidoteMatch: [],
    categoryMatch: [],
    minAgeDays: 90,
  },
  "dogodki": {
    slug: "dogodki",
    label: "Dogodki",
    manifesto: "Festivali, koncerti, predstave, pohodi, odprtja. Tukaj zbiramo, kaj se ta teden dogaja po Sloveniji — in kam je vredno iti.",
    colors: { soft: "#d8e8e0", fill: "#78b098", text: "#204a38", activeText: "#102a18", whisper: "#70a088" },
    kind: "events",
    antidoteMatch: [],
    categoryMatch: [],
  },
};

export const TOPICAL_THEME_ORDER = ["med-nami", "naprej", "heroji", "drobne-radosti"];
export const RITUAL_THEME_ORDER = ["tiho-delo", "nedeljska-zgodba", "iz-arhiva", "dogodki"];
export const ALL_THEME_SLUGS = [...TOPICAL_THEME_ORDER, ...RITUAL_THEME_ORDER];

export function getTheme(slug: string): Theme | null {
  return THEMES[slug] ?? null;
}

// Find the primary theme an article belongs to. Antidote wins over category when
// both match (the article was tagged emotionally, so the emotional axis is truer).
// Only topical themes are candidates — ritual themes come from manual tags.
export function getThemeForArticle(antidote: string | null, category: string | null): Theme | null {
  if (antidote) {
    for (const slug of TOPICAL_THEME_ORDER) {
      if (THEMES[slug].antidoteMatch.includes(antidote)) return THEMES[slug];
    }
  }
  if (category) {
    for (const slug of TOPICAL_THEME_ORDER) {
      if (THEMES[slug].categoryMatch.includes(category)) return THEMES[slug];
    }
  }
  return null;
}

// Pick the theme to display on a card. Ritual tags (tiho-delo, nedeljska-zgodba)
// win — they're explicit editorial choices. Falls back to the topical match.
export function getThemeForCard(args: {
  themes?: string[] | null;
  antidote?: string | null;
  category?: string | null;
}): Theme | null {
  if (args.themes && args.themes.length > 0) {
    for (const slug of args.themes) {
      if (THEMES[slug]) return THEMES[slug];
    }
  }
  return getThemeForArticle(args.antidote ?? null, args.category ?? null);
}

// Reading time in whole minutes for a body of text. Returns 0 for empty.
export function readingMinutes(text: string | null | undefined): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / 200));
}
