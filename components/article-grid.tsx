"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { PublishedArticle } from "@/app/page";
import {
  CATEGORY_PILL,
  CATEGORY_ACCENT_BAR,
  CATEGORY_LABELS,
  formatDate,
  readingTime,
  ANTIDOTE_LABELS,
} from "@/lib/article-helpers";
import { EmotionSection } from "@/components/emotion-section";
import { CategoryIcon } from "@/lib/category-icons";
import {
  RevealOnScroll,
  StaggerContainer,
  StaggerItem,
  HeroReveal,
} from "@/components/motion-wrappers";
import { SafeImage } from "@/components/safe-image";

// ── Display groups: 6 reader-facing buttons → multiple DB categories each ──
const DISPLAY_GROUPS: { key: string; label: string; categories: string[] }[] = [
  { key: "junaki",     label: "Junaki",     categories: ["JUNAKI"] },
  { key: "sport",      label: "Šport",      categories: ["SPORT"] },
  { key: "divjina",    label: "Divjina",    categories: ["NARAVA", "ZIVALI"] },
  { key: "sosedje",    label: "Sosedje",    categories: ["SKUPNOST", "KULTURA"] },
  { key: "napredek",   label: "Napredek",   categories: ["PODJETNISTVO", "INFRASTRUKTURA"] },
  { key: "ponos",      label: "Ponos",      categories: ["SLOVENIJA_V_SVETU"] },
];

// Cloud color schemes per display group
const CLOUD_COLORS: Record<string, { soft: string; fill: string; text: string; activeText: string }> = {
  VSE:       { soft: "#f0ebe0", fill: "#d4b878", text: "#7a6530", activeText: "#3d3010" },
  junaki:    { soft: "#fce0e0", fill: "#f0a0a0", text: "#8a2020", activeText: "#400000" },
  sport:     { soft: "#d4ecfc", fill: "#7cc4f5", text: "#1a5f8a", activeText: "#ffffff" },
  divjina:   { soft: "#d4f0d8", fill: "#7ecd8a", text: "#1f6b2f", activeText: "#0a3515" },
  sosedje:   { soft: "#e8dff5", fill: "#c4a8e8", text: "#5b2d8e", activeText: "#2a0050" },
  napredek:  { soft: "#f5eac8", fill: "#d4b45a", text: "#6b5010", activeText: "#3d2e00" },
  ponos:     { soft: "#d8daf8", fill: "#8088e0", text: "#2a2e7a", activeText: "#ffffff" },
};

// Cloud puffs: [leftPercent, topPercent, size(px)]
// Circle centers sit ON the button edge (0/100%) — half sticks out, half fills in.
// Tightly spaced so they merge into one continuous fluffy outline.
const CLOUD_PUFFS: [number, number, number][][] = [
  // Circle centers on the fill border: top=10%, bottom=90%, left=4%, right=96%
  // Even spacing: top/bottom every ~13%, sides every ~16%. Max size diff between neighbors: 2px.
  // All sizes now in % of button width. ~18% ≈ what 28px was on a medium button.
  // shape 0 — slightly bigger top
  [
    [7,10,16], [20,10,18], [33,10,20], [46,10,20], [59,10,20], [72,10,18], [85,10,16],
    [96,38,18], [96,62,18],
    [85,90,16], [72,90,16], [59,90,16], [46,90,16], [33,90,16], [20,90,16],
    [4,62,18], [4,38,18],
  ],
  // shape 1 — bigger left-top, smaller right
  [
    [7,10,18], [20,10,20], [33,10,20], [46,10,18], [59,10,16], [72,10,16], [85,10,14],
    [96,38,16], [96,62,16],
    [85,90,16], [72,90,16], [59,90,16], [46,90,16], [33,90,16], [20,90,16],
    [4,62,20], [4,38,20],
  ],
  // shape 2 — bigger right-top, smaller left
  [
    [7,10,14], [20,10,14], [33,10,16], [46,10,18], [59,10,20], [72,10,20], [85,10,18],
    [96,38,20], [96,62,20],
    [85,90,16], [72,90,16], [59,90,16], [46,90,16], [33,90,16], [20,90,16],
    [4,62,16], [4,38,16],
  ],
  // shape 3 — twin bumps top
  [
    [7,10,16], [20,10,18], [33,10,20], [46,10,16], [59,10,16], [72,10,20], [85,10,18],
    [96,38,18], [96,62,18],
    [85,90,16], [72,90,16], [59,90,16], [46,90,16], [33,90,16], [20,90,16],
    [4,62,18], [4,38,18],
  ],
  // shape 4 — dome top, flatter bottom
  [
    [7,10,14], [20,10,16], [33,10,18], [46,10,20], [59,10,20], [72,10,18], [85,10,16],
    [96,38,18], [96,62,18],
    [85,90,14], [72,90,14], [59,90,14], [46,90,14], [33,90,14], [20,90,14],
    [4,62,18], [4,38,18],
  ],
  // shape 5 — bumpy sides
  [
    [7,10,16], [20,10,18], [33,10,18], [46,10,16], [59,10,16], [72,10,18], [85,10,16],
    [96,38,20], [96,62,20],
    [85,90,16], [72,90,18], [59,90,16], [46,90,16], [33,90,18], [20,90,16],
    [4,62,20], [4,38,20],
  ],
  // shape 6 — bigger bottom
  [
    [7,10,14], [20,10,16], [33,10,16], [46,10,18], [59,10,18], [72,10,16], [85,10,14],
    [96,38,18], [96,62,18],
    [85,90,18], [72,90,20], [59,90,20], [46,90,20], [33,90,20], [20,90,18],
    [4,62,18], [4,38,18],
  ],
  // shape 7 — even all around
  [
    [7,10,18], [20,10,18], [33,10,18], [46,10,18], [59,10,18], [72,10,18], [85,10,18],
    [96,38,18], [96,62,18],
    [85,90,18], [72,90,18], [59,90,18], [46,90,18], [33,90,18], [20,90,18],
    [4,62,18], [4,38,18],
  ],
  // shape 8 — one bigger bump center-top
  [
    [7,10,16], [20,10,16], [33,10,18], [46,10,20], [59,10,18], [72,10,16], [85,10,16],
    [96,38,18], [96,62,18],
    [85,90,16], [72,90,16], [59,90,16], [46,90,16], [33,90,16], [20,90,16],
    [4,62,18], [4,38,18],
  ],
];

/** Cloud-shaped button — tightly overlapping circles wrap all the way around */
function CloudButton({
  children,
  active,
  category,
  shapeIndex,
  onClick,
  colors: colorsProp,
}: {
  children: React.ReactNode;
  active: boolean;
  category: string;
  shapeIndex: number;
  onClick: () => void;
  colors?: { soft: string; fill: string; text: string; activeText: string };
}) {
  const colors = colorsProp ?? CLOUD_COLORS[category] ?? { soft: "#e8e8e8", fill: "#aaa", text: "#333", activeText: "#000" };
  const puffs = CLOUD_PUFFS[shapeIndex % CLOUD_PUFFS.length];
  const bg = active ? colors.fill : colors.soft;
  const fg = active ? colors.activeText : colors.text;

  return (
    <button
      onClick={onClick}
      className="group relative cursor-pointer transition-all duration-300 hover:-translate-y-1.5 active:translate-y-0"
      style={{ color: fg }}
    >
      {/* Puffs — circles all around the edge, sizes in % so they scale with button */}
      {puffs.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full transition-colors duration-300"
          style={{
            left: `${p[0]}%`,
            top: `${p[1]}%`,
            width: `${p[2]}%`,
            aspectRatio: "1",
            backgroundColor: bg,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
      {/* Inner fill — solid center, fully rounded so no straight edges show */}
      <div
        className="absolute transition-colors duration-300"
        style={{
          inset: "10% 4%",
          borderRadius: "40%",
          backgroundColor: bg,
        }}
      />
      {/* Content */}
      <span className="relative z-10 inline-flex items-center gap-2 px-8 py-4 text-sm font-medium whitespace-nowrap">
        {children}
      </span>
    </button>
  );
}

/**
 * Pick the best article for the hero spot.
 * Score = ai_score + recency_bonus (5-day decay) + image_bonus + category_diversity.
 */
function pickFeatured(articles: PublishedArticle[]): {
  featured: PublishedArticle | undefined;
  rest: PublishedArticle[];
} {
  if (articles.length === 0) return { featured: undefined, rest: [] };
  if (articles.length === 1) return { featured: articles[0], rest: articles };

  const now = Date.now();

  const scored = articles.map((a) => {
    const daysOld = (now - new Date(a.publishedAt).getTime()) / 86400000;
    const recencyBonus = Math.max(0, 5 - daysOld);
    const imageBonus = a.imageUrl ? 1 : 0;
    const score = (a.ai.score || 5) + recencyBonus + imageBonus;
    return { article: a, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Top 5 candidates
  const candidates = scored.slice(0, 5);

  // Category diversity: count how often each category appears in the 3 most recent articles
  const recentCategories = articles.slice(0, 3).map((a) => a.ai.category);

  let best = candidates[0];
  for (const c of candidates) {
    const cCount = recentCategories.filter((rc) => rc === c.article.ai.category).length;
    const bestCount = recentCategories.filter((rc) => rc === best.article.ai.category).length;
    // Prefer less-represented category, or higher score if tied
    if (cCount < bestCount || (cCount === bestCount && c.score > best.score)) {
      best = c;
    }
  }

  const featured = best.article;
  // Sort all articles by the same score logic (score + recency + image)
  // Featured stays in the list so it shows up in filtered results too
  const sorted = scored.sort((a, b) => b.score - a.score).map((s) => s.article);
  return { featured, rest: sorted };
}

function getExcerpt(text: string, chars = 120) {
  const plain = text.replace(/\n+/g, " ").trim();
  if (plain.length <= chars) return plain;
  return plain.slice(0, chars).replace(/\s+\S*$/, "") + " …";
}

/** Gradient fallback when no image available */
function CategoryGradient({ category }: { category: string }) {
  const gradients: Record<string, string> = {
    SPORT: "from-sky/20 to-sky-soft/40",
    ZIVALI: "from-warmth/20 to-gold-soft/40",
    SKUPNOST: "from-lavender/20 to-lavender-soft/40",
    NARAVA: "from-nature/20 to-nature-soft/40",
    INFRASTRUKTURA: "from-gold/20 to-gold-soft/40",
    PODJETNISTVO: "from-gold/20 to-gold-soft/40",
    SLOVENIJA_V_SVETU: "from-sky/20 to-lavender-soft/40",
    JUNAKI: "from-rose/20 to-rose-soft/40",
    KULTURA: "from-lavender/20 to-rose-soft/40",
  };
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${gradients[category] ?? "from-muted to-muted/50"}`}>
      <span className="absolute inset-0 flex items-center justify-center opacity-20">
        <CategoryIcon category={category} className="w-16 h-16" />
      </span>
    </div>
  );
}

/** Generate search variants for a word — trim last 1-2 chars for Slovenian declensions */
function searchVariants(word: string): string[] {
  const w = word.toLowerCase();
  if (w.length < 3) return [];
  const variants = [w];
  if (w.length >= 5) variants.push(w.slice(0, -1));
  if (w.length >= 6) variants.push(w.slice(0, -2));
  return variants;
}

/** Check if text matches all search words (AND logic, with declension variants) */
function matchesSearch(searchText: string, query: string): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = searchText.toLowerCase();
  return words.every((word) => {
    const variants = searchVariants(word);
    if (variants.length === 0) return true;
    return variants.some((v) => haystack.includes(v));
  });
}

export function ArticleGrid({ articles }: { articles: PublishedArticle[] }) {
  const searchParams = useSearchParams();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeAntidote, setActiveAntidote] = useState<string | null>(null);
  const hasInteracted = useRef(false);

  // Read search query from URL (?q=)
  const searchQuery = searchParams.get("q") ?? "";

  function handleGroupChange(groupKey: string | null) {
    hasInteracted.current = true;
    setActiveGroup(groupKey);
  }

  function handleAntidoteSelect(antidote: string | null) {
    hasInteracted.current = true;
    setActiveAntidote(antidote);
  }

  // Sync group from URL (?tema=)
  useEffect(() => {
    const tema = searchParams.get("tema");
    if (tema && DISPLAY_GROUPS.some((g) => g.key === tema)) {
      setActiveGroup(tema);
    } else if (!tema) {
      setActiveGroup(null);
    }
  }, [searchParams]);

  // Sync antidote from URL (?antidote=)
  useEffect(() => {
    const antidote = searchParams.get("antidote");
    if (antidote && ANTIDOTE_LABELS[antidote]) {
      setActiveAntidote(antidote);
    } else if (!antidote) {
      setActiveAntidote(null);
    }
  }, [searchParams]);

  // Listen for logo click reset
  useEffect(() => {
    function onReset() {
      hasInteracted.current = true;
      setActiveGroup(null);
    }
    window.addEventListener("svetla-reset", onReset);
    return () => window.removeEventListener("svetla-reset", onReset);
  }, []);

  // Count articles per display group
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of DISPLAY_GROUPS) {
      counts[g.key] = articles.filter((a) => g.categories.includes(a.ai.category)).length;
    }
    return counts;
  }, [articles]);

  const filtered = useMemo(() => {
    const group = DISPLAY_GROUPS.find((g) => g.key === activeGroup);
    let result = group
      ? articles.filter((a) => group.categories.includes(a.ai.category))
      : articles;

    if (activeAntidote) {
      result = result.filter((a) => a.ai.antidote_for === activeAntidote || a.ai.antidote_secondary === activeAntidote);
    }

    if (searchQuery.trim().length >= 3) {
      result = result.filter((a) => {
        const searchText = `${a.title} ${a.subtitle} ${a.body}`;
        return matchesSearch(searchText, searchQuery);
      });
    }

    return result;
  }, [articles, activeGroup, activeAntidote, searchQuery]);

  const { featured, rest } = useMemo(() => pickFeatured(filtered), [filtered]);

  return (
    <>
      {/* ── Featured hero article ── */}
      {featured && (
        <RevealOnScroll className="mb-10" skip={hasInteracted.current}>
          <Link href={`/clanki/${featured.slug}`} className="group block">
            <article className="relative overflow-hidden rounded-2xl border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="relative h-64 sm:h-80 md:h-[26rem]">
                <div className="absolute inset-0 overflow-hidden">
                  {featured.imageUrl ? (
                    <SafeImage
                      src={featured.imageUrl}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                      fallback={<CategoryGradient category={featured.ai.category} />}
                    />
                  ) : (
                    <CategoryGradient category={featured.ai.category} />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                <div className="absolute bottom-0 inset-x-0 p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-4">
                    <CategoryIcon category={featured.ai.category} className="w-4 h-4 text-white/70" />
                    <time className="text-xs text-white/70">
                      {formatDate(featured.publishedAt)}
                    </time>
                  </div>

                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight text-white mb-3 max-w-3xl group-hover:text-white/90 transition-colors line-clamp-3">
                    {featured.title}
                  </h2>

                  <p className="text-sm md:text-base text-white/75 leading-relaxed max-w-2xl mb-4 line-clamp-2">
                    {featured.subtitle}
                  </p>

                  <div className="inline-flex items-center gap-2 text-sm font-medium text-white/90 group-hover:gap-3 transition-all">
                    <span>Preberi zgodbo</span>
                    <span aria-hidden>→</span>
                  </div>
                </div>
              </div>
            </article>
          </Link>
        </RevealOnScroll>
      )}


      {/* ── Category filter ── */}
      {articles.length > 0 && (
        <HeroReveal delay={0.4}>
          <nav
            aria-label="Filtriraj po kategoriji"
            className="mb-6"
          >
            {/* Category groups — always visible */}
            <div className="flex flex-col items-center gap-2">
              {/* Selected — top row */}
              <div className="flex justify-center">
                {activeGroup === null ? (
                  <CloudButton
                    active
                    category="VSE"
                    shapeIndex={0}
                    onClick={() => handleGroupChange(null)}
                  >
                    Vse zgodbe
                    <span className="text-xs opacity-50">{articles.length}</span>
                  </CloudButton>
                ) : (
                  <CloudButton
                    active
                    category={activeGroup}
                    shapeIndex={DISPLAY_GROUPS.findIndex((g) => g.key === activeGroup) + 1}
                    onClick={() => handleGroupChange(null)}
                  >
                    {DISPLAY_GROUPS.find((g) => g.key === activeGroup)?.label}
                    <span className="text-xs opacity-50">
                      {groupCounts[activeGroup] ?? 0}
                    </span>
                  </CloudButton>
                )}
              </div>
              {/* Rest — second row */}
              <div className="flex flex-wrap gap-5 justify-center">
                {activeGroup !== null && (
                  <CloudButton
                    active={false}
                    category="VSE"
                    shapeIndex={0}
                    onClick={() => handleGroupChange(null)}
                  >
                    Vse zgodbe
                    <span className="text-xs opacity-50">{articles.length}</span>
                  </CloudButton>
                )}
                {DISPLAY_GROUPS
                  .filter((g) => g.key !== activeGroup)
                  .map((g, i) => (
                    <CloudButton
                      key={g.key}
                      active={false}
                      category={g.key}
                      shapeIndex={i + 1}
                      onClick={() => handleGroupChange(g.key)}
                    >
                      {g.label}
                      <span className="text-xs opacity-50">{groupCounts[g.key] ?? 0}</span>
                    </CloudButton>
                  ))}
              </div>
            </div>
          </nav>
        </HeroReveal>
      )}

      {/* ── Tagline ── */}
      <div className="text-center my-4">
        <p className="text-xs text-muted-foreground/60">
          Preverjene zgodbe o ljudeh, dosežkih in napredku.
          <span className="mx-1.5 text-border/40">·</span>
          <span className="tabular-nums">{articles.length}</span> zgodb
        </p>
      </div>

      {/* ── Antidote pill slider ── */}
      <div className="mb-8">
        <EmotionSection activeAntidote={activeAntidote} onSelect={handleAntidoteSelect} />
      </div>

      {/* ── Antidote filter heading ── */}
      {activeAntidote && ANTIDOTE_LABELS[activeAntidote] && (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          {ANTIDOTE_LABELS[activeAntidote].label} — {filtered.length} {filtered.length === 1 ? 'zgodba' : 'zgodb'}
        </p>
      )}

      {filtered.length === 0 && (
        <p className="py-12 text-center text-lg text-muted-foreground">
          {searchQuery.length >= 3 ? "Ni zadetkov za to iskanje." : "Ni zgodb v tej kategoriji."}
        </p>
      )}

      {/* ── Article card grid with stagger ── */}
      {rest.length > 0 && (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" skip={hasInteracted.current}>
          {rest.map((article) => (
            <StaggerItem key={article.slug} skip={hasInteracted.current}>
              <Link
                href={`/clanki/${article.slug}`}
                className="group block h-full"
              >
                <article className="relative h-full flex flex-col overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                  {/* Card image */}
                  <div className="relative h-44 overflow-hidden">
                    {article.imageUrl ? (
                      <SafeImage
                        src={article.imageUrl}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        fallback={<CategoryGradient category={article.ai.category} />}
                      />
                    ) : (
                      <CategoryGradient category={article.ai.category} />
                    )}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border backdrop-blur-sm bg-white/80 ${
                          CATEGORY_PILL[article.ai.category] ?? "bg-muted text-foreground border-border"
                        }`}
                      >
                        <CategoryIcon category={article.ai.category} className="w-3 h-3" />
                        {CATEGORY_LABELS[article.ai.category] ?? ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 p-5">
                    <time className="text-xs text-muted-foreground/50 mb-2 tabular-nums">
                      {new Date(article.publishedAt).toLocaleDateString("sl-SI", {
                        day: "numeric",
                        month: "short",
                      })}
                    </time>

                    <h3 className="text-sm font-semibold leading-snug text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-3">
                      {article.title}
                    </h3>

                    <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-3">
                      {getExcerpt(article.subtitle || article.body)}
                    </p>

                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground/50 truncate max-w-[50%]">
                        {article.source.sourceName}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground/40">
                          {readingTime(article.body)}
                        </span>
                        <span className="text-xs font-medium text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          Preberi →
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </>
  );
}
