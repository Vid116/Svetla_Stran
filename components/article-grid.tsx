"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { PublishedArticle } from "@/app/page";
import {
  formatDate,
  zgodbeCount,
  getThemeForCard,
  THEMES,
  TOPICAL_THEME_ORDER,
  RITUAL_THEME_ORDER,
} from "@/lib/article-helpers";
import { CategoryIcon } from "@/lib/category-icons";
import {
  RevealOnScroll,
  StaggerContainer,
  StaggerItem,
  HeroReveal,
} from "@/components/motion-wrappers";
import { SafeImage } from "@/components/safe-image";
import { NedeljskaTakeover } from "@/components/nedeljska-takeover";
import { TihoDeloSection } from "@/components/tiho-delo-section";
import { ThemeRibbon, CommentBadge } from "@/components/card-decorations";
import { OverlayCard } from "@/components/overlay-card";

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

/** Cloud-shaped link — tightly overlapping circles wrap all the way around */
function CloudLink({
  children,
  href,
  shapeIndex,
  colors,
}: {
  children: React.ReactNode;
  href: string;
  shapeIndex: number;
  colors: { soft: string; fill: string; text: string; activeText: string };
}) {
  const puffs = CLOUD_PUFFS[shapeIndex % CLOUD_PUFFS.length];
  const bg = colors.soft;
  const fg = colors.text;

  return (
    <Link
      href={href}
      className="group relative cursor-pointer transition-all duration-300 hover:-translate-y-1.5 active:translate-y-0"
      style={{ color: fg }}
    >
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
      <div
        className="absolute transition-colors duration-300"
        style={{
          inset: "10% 4%",
          borderRadius: "40%",
          backgroundColor: bg,
        }}
      />
      <span className="relative z-10 inline-flex items-center gap-2 px-8 py-4 text-sm font-medium whitespace-nowrap">
        {children}
      </span>
    </Link>
  );
}

/**
 * Pick the hero + 2 secondary stories.
 * Score = ai_score + recency_bonus (5-day decay) + image_bonus + category_diversity.
 *
 * Returns: featured (single), secondary (next 2 best, with images preferred),
 * rest (everything else, sorted by score — featured stays in for search filtering).
 */
function pickFeatured(articles: PublishedArticle[]): {
  featured: PublishedArticle | undefined;
  secondary: PublishedArticle[];
  rest: PublishedArticle[];
} {
  if (articles.length === 0) return { featured: undefined, secondary: [], rest: [] };
  if (articles.length === 1) return { featured: articles[0], secondary: [], rest: articles };

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
    if (cCount < bestCount || (cCount === bestCount && c.score > best.score)) {
      best = c;
    }
  }

  const featured = best.article;
  const sorted = scored.sort((a, b) => b.score - a.score).map((s) => s.article);

  // Secondary: next 2 by score, excluding featured. Prefer those with images;
  // fall back to anything if not enough.
  const remaining = sorted.filter((a) => a.slug !== featured.slug);
  const secondary: PublishedArticle[] = [];
  for (const a of remaining) {
    if (secondary.length >= 2) break;
    if (a.imageUrl) secondary.push(a);
  }
  if (secondary.length < 2) {
    for (const a of remaining) {
      if (secondary.length >= 2) break;
      if (!secondary.includes(a)) secondary.push(a);
    }
  }

  // Tertiary grid: everything except secondary (featured stays in for filter consistency).
  const secondarySlugs = new Set(secondary.map((s) => s.slug));
  const rest = sorted.filter((a) => !secondarySlugs.has(a.slug));

  return { featured, secondary, rest };
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

export function ArticleGrid({
  articles,
  nedeljskaArticle,
  tihoDeloArticles,
}: {
  articles: PublishedArticle[];
  nedeljskaArticle?: any;
  tihoDeloArticles?: any[];
}) {
  const searchParams = useSearchParams();
  const hasInteracted = useRef(false);

  // Read search query from URL (?q=)
  const searchQuery = searchParams.get("q") ?? "";

  const filtered = useMemo(() => {
    if (searchQuery.trim().length < 3) return articles;
    return articles.filter((a) => {
      const searchText = `${a.title} ${a.subtitle} ${a.body}`;
      return matchesSearch(searchText, searchQuery);
    });
  }, [articles, searchQuery]);

  const { featured, secondary, rest } = useMemo(() => pickFeatured(filtered), [filtered]);

  return (
    <>
      {/* ── Hero: Nedeljska takeover on Sundays, normal featured otherwise ── */}
      {nedeljskaArticle ? (
        <NedeljskaTakeover article={nedeljskaArticle} />
      ) : featured ? (
        <RevealOnScroll className="mb-6" skip={hasInteracted.current}>
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

                <ThemeRibbon
                  theme={getThemeForCard({ themes: featured.themes, antidote: featured.ai.antidote_for, category: featured.ai.category })}
                  className="absolute top-4 left-4 z-10"
                />
                <CommentBadge count={featured.commentCount ?? 0} className="absolute top-4 right-4 z-10" />

                <div className="absolute bottom-0 inset-x-0 p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-4">
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
      ) : null}

      {/* ── Secondary tier: 2 medium overlay cards under the hero (no Nedeljska day) ── */}
      {!nedeljskaArticle && secondary.length > 0 && (
        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {secondary.map((article) => {
            const theme = getThemeForCard({ themes: article.themes, antidote: article.ai.antidote_for, category: article.ai.category });
            return (
              <OverlayCard
                key={article.slug}
                tier="secondary"
                theme={theme}
                article={{
                  slug: article.slug,
                  title: article.title,
                  subtitle: article.subtitle,
                  body: article.body,
                  publishedAt: article.publishedAt,
                  imageUrl: article.imageUrl,
                  source: article.source.sourceName,
                  longFormBody: article.longForm?.body,
                  commentCount: article.commentCount,
                }}
                imageFallback={<CategoryGradient category={article.ai.category} />}
              />
            );
          })}
        </div>
      )}


      {/* ── Theme navigation — 4 topical theme clouds, 2 visible ritual links (tiho-delo + nedeljska-zgodba have their own spotlight sections) ── */}
      {articles.length > 0 && (
        <HeroReveal delay={0.4}>
          <nav aria-label="Teme" className="mb-6">
            <div className="flex flex-wrap gap-5 justify-center">
              {TOPICAL_THEME_ORDER.map((slug, i) => {
                const theme = THEMES[slug];
                return (
                  <CloudLink
                    key={slug}
                    href={`/tema/${slug}`}
                    shapeIndex={i + 1}
                    colors={theme.colors}
                  >
                    {theme.label}
                  </CloudLink>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-3 justify-center">
              {RITUAL_THEME_ORDER
                .filter((slug) => slug !== "tiho-delo" && slug !== "nedeljska-zgodba")
                .map((slug) => {
                  const theme = THEMES[slug];
                  return (
                    <Link
                      key={slug}
                      href={`/tema/${slug}`}
                      className="rounded-full px-5 py-2 text-xs font-medium border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                      style={{
                        backgroundColor: theme.colors.soft,
                        color: theme.colors.text,
                        borderColor: `${theme.colors.fill}40`,
                      }}
                    >
                      {theme.label}
                    </Link>
                  );
                })}
            </div>
          </nav>
        </HeroReveal>
      )}

      {/* ── Tiho delo spotlight ── */}
      {tihoDeloArticles && tihoDeloArticles.length > 0 && (
        <TihoDeloSection articles={tihoDeloArticles} />
      )}

      {/* ── Tagline ── */}
      <div className="text-center my-4">
        <p className="text-xs text-muted-foreground/60">
          Preverjene zgodbe o ljudeh, dosežkih in napredku.
          <span className="mx-1.5 text-border/40">·</span>
          <span className="tabular-nums">{zgodbeCount(articles.length)}</span>
        </p>
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-lg text-muted-foreground">
          {searchQuery.length >= 3 ? "Ni zadetkov za to iskanje." : "Ni zgodb."}
        </p>
      )}

      {/* ── Article card grid with stagger (overlay cards) ── */}
      {rest.length > 0 && (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" skip={hasInteracted.current}>
          {rest.map((article) => {
            const theme = getThemeForCard({ themes: article.themes, antidote: article.ai.antidote_for, category: article.ai.category });
            return (
              <StaggerItem key={article.slug} skip={hasInteracted.current}>
                <OverlayCard
                  tier="tertiary"
                  theme={theme}
                  article={{
                    slug: article.slug,
                    title: article.title,
                    subtitle: article.subtitle,
                    body: article.body,
                    publishedAt: article.publishedAt,
                    imageUrl: article.imageUrl,
                    source: article.source.sourceName,
                    longFormBody: article.longForm?.body,
                    commentCount: article.commentCount,
                  }}
                  imageFallback={<CategoryGradient category={article.ai.category} />}
                />
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </>
  );
}
