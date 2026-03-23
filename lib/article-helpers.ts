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
};

export const ANTIDOTE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  jeza: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  skrb: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  cinizem: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  osamljenost: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  obup: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  strah: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

// Cloud-style colors for antidote buttons (same format as CLOUD_COLORS in article-grid)
export const ANTIDOTE_CLOUD_COLORS: Record<string, { soft: string; fill: string; text: string; activeText: string; whisper: string }> = {
  jeza:         { soft: "#fce0e0", fill: "#f0a0a0", text: "#8a2020", activeText: "#400000", whisper: "#c08080" },
  skrb:         { soft: "#d4ecfc", fill: "#7cc4f5", text: "#1a5f8a", activeText: "#ffffff", whisper: "#80a8c0" },
  cinizem:      { soft: "#f5eac8", fill: "#d4b45a", text: "#6b5010", activeText: "#3d2e00", whisper: "#b0a070" },
  osamljenost:  { soft: "#e8dff5", fill: "#c4a8e8", text: "#5b2d8e", activeText: "#2a0050", whisper: "#a090c0" },
  obup:         { soft: "#d4f0d8", fill: "#7ecd8a", text: "#1f6b2f", activeText: "#0a3515", whisper: "#80b088" },
  strah:        { soft: "#f8e0d0", fill: "#e8a070", text: "#7a3a1a", activeText: "#3d1800", whisper: "#c09878" },
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
