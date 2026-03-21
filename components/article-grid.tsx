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
} from "@/lib/article-helpers";
import { CategoryIcon } from "@/lib/category-icons";
import {
  RevealOnScroll,
  StaggerContainer,
  StaggerItem,
  HeroReveal,
} from "@/components/motion-wrappers";

// Cloud color schemes per category
const CLOUD_COLORS: Record<string, { soft: string; fill: string; text: string; activeText: string }> = {
  VSE:                { soft: "#e4e4e8", fill: "#3a3a42", text: "#555560", activeText: "#ffffff" },
  SPORT:              { soft: "#d4ecfc", fill: "#7cc4f5", text: "#1a5f8a", activeText: "#ffffff" },
  ZIVALI:             { soft: "#f8e0d0", fill: "#e8a070", text: "#7a3a1a", activeText: "#3d1800" },
  SKUPNOST:           { soft: "#e8dff5", fill: "#c4a8e8", text: "#5b2d8e", activeText: "#2a0050" },
  NARAVA:             { soft: "#d4f0d8", fill: "#7ecd8a", text: "#1f6b2f", activeText: "#0a3515" },
  INFRASTRUKTURA:     { soft: "#d0ecec", fill: "#6abfbf", text: "#1a6060", activeText: "#0a3030" },
  PODJETNISTVO:       { soft: "#f5eac8", fill: "#d4b45a", text: "#6b5010", activeText: "#3d2e00" },
  SLOVENIJA_V_SVETU:  { soft: "#d8daf8", fill: "#8088e0", text: "#2a2e7a", activeText: "#ffffff" },
  JUNAKI:             { soft: "#fce0e0", fill: "#f0a0a0", text: "#8a2020", activeText: "#400000" },
  KULTURA:            { soft: "#f5d8ee", fill: "#d88ec4", text: "#7a2060", activeText: "#3d0030" },
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
}: {
  children: React.ReactNode;
  active: boolean;
  category: string;
  shapeIndex: number;
  onClick: () => void;
}) {
  const colors = CLOUD_COLORS[category] ?? { soft: "#e8e8e8", fill: "#aaa", text: "#333", activeText: "#000" };
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
  if (articles.length === 1) return { featured: articles[0], rest: [] };

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
  const rest = articles.filter((a) => a.slug !== featured.slug);
  return { featured, rest };
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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const hasInteracted = useRef(false);

  // Read search query from URL (?q=)
  const searchQuery = searchParams.get("q") ?? "";

  function handleCategoryChange(cat: string | null) {
    hasInteracted.current = true;
    setActiveCategory(cat);
  }

  // Read ?kategorija= from URL on mount
  useEffect(() => {
    const cat = searchParams.get("kategorija");
    if (cat && articles.some((a) => a.ai.category === cat)) {
      setActiveCategory(cat);
    }
  }, [searchParams, articles]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    articles.forEach((a) => seen.add(a.ai.category));
    return Array.from(seen);
  }, [articles]);

  // Memoize counts so they don't recompute on every render
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of articles) {
      counts[a.ai.category] = (counts[a.ai.category] || 0) + 1;
    }
    return counts;
  }, [articles]);

  const filtered = useMemo(() => {
    let result = activeCategory
      ? articles.filter((a) => a.ai.category === activeCategory)
      : articles;

    if (searchQuery.trim().length >= 3) {
      result = result.filter((a) => {
        const searchText = `${a.title} ${a.subtitle} ${a.body}`;
        return matchesSearch(searchText, searchQuery);
      });
    }

    return result;
  }, [articles, activeCategory, searchQuery]);

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
                    <img
                      src={featured.imageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
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

      {/* ── Tagline + article count ── */}
      <div className="text-center mb-10">
        <p className="text-sm text-muted-foreground">
          Preverjene zgodbe o ljudeh, dosežkih in napredku.
          <span className="mx-2 text-border">·</span>
          <span className="tabular-nums">{articles.length}</span> {articles.length === 1 ? "zgodba" : articles.length === 2 ? "zgodbi" : articles.length <= 4 ? "zgodbe" : "zgodb"}
        </p>
      </div>

      {/* ── Category filter ── */}
      {categories.length > 1 && (
        <HeroReveal delay={0.4}>
          <nav
            aria-label="Filtriraj po kategoriji"
            className="mb-14"
          >
            <p className="text-center text-xs font-medium text-muted-foreground/60 uppercase tracking-widest mb-4">
              Izberi temo
            </p>
            <div className="flex flex-col items-center gap-2">
              {/* Selected — top row */}
              <div className="flex justify-center">
                {activeCategory === null ? (
                  <CloudButton
                    active
                    category="VSE"
                    shapeIndex={0}
                    onClick={() => handleCategoryChange(null)}
                  >
                    Vse zgodbe
                    <span className="text-xs opacity-50">{articles.length}</span>
                  </CloudButton>
                ) : (
                  <CloudButton
                    active
                    category={activeCategory}
                    shapeIndex={categories.indexOf(activeCategory) + 1}
                    onClick={() => handleCategoryChange(null)}
                  >
                    <CategoryIcon category={activeCategory} className="w-4 h-4" />
                    {CATEGORY_LABELS[activeCategory] ?? activeCategory}
                    <span className="text-xs opacity-50">
                      {categoryCounts[activeCategory] ?? 0}
                    </span>
                  </CloudButton>
                )}
              </div>
              {/* Rest — second row */}
              <div className="flex flex-wrap gap-5 justify-center">
                {activeCategory !== null && (
                  <CloudButton
                    active={false}
                    category="VSE"
                    shapeIndex={0}
                    onClick={() => handleCategoryChange(null)}
                  >
                    Vse zgodbe
                    <span className="text-xs opacity-50">{articles.length}</span>
                  </CloudButton>
                )}
                {categories
                  .filter((cat) => cat !== activeCategory)
                  .map((cat, i) => {
                    const count = categoryCounts[cat] ?? 0;
                    return (
                      <CloudButton
                        key={cat}
                        active={false}
                        category={cat}
                        shapeIndex={categories.indexOf(cat) + 1}
                        onClick={() => handleCategoryChange(cat)}
                      >
                        <CategoryIcon category={cat} className="w-4 h-4" />
                        {CATEGORY_LABELS[cat] ?? cat}
                        <span className="text-xs opacity-50">{count}</span>
                      </CloudButton>
                    );
                  })}
              </div>
            </div>
          </nav>
        </HeroReveal>
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
                      <img
                        src={article.imageUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
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
