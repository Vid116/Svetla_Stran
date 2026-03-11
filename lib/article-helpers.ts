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

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sl-SI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
