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
