"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";
import Link from "next/link";
import type { PublishedArticle } from "@/app/page";
import {
  CATEGORY_PILL,
  CATEGORY_ACCENT_BAR,
  CATEGORY_LABELS,
  formatDate,
  readingTime,
} from "@/lib/article-helpers";
import { CategoryIcon } from "@/lib/category-icons";

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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    const seen = new Set<string>();
    articles.forEach((a) => seen.add(a.ai.category));
    return Array.from(seen);
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

  const [featured, ...rest] = filtered;

  return (
    <>
      {/* ── Search bar ── */}
      <div className="relative max-w-md mx-auto mb-8">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Poišči zgodbe..."
          className="w-full pl-10 pr-9 py-2.5 rounded-full bg-muted/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
            aria-label="Počisti iskanje"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Category filter pills ── */}
      {categories.length > 1 && (
        <nav
          aria-label="Filtriraj po kategoriji"
          className="flex flex-wrap gap-2 justify-center mb-12"
        >
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3.5 py-2 rounded-full text-sm border transition-all cursor-pointer ${
              activeCategory === null
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            Vse
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all cursor-pointer ${
                activeCategory === cat
                  ? (CATEGORY_PILL[cat] ?? "bg-primary text-primary-foreground border-primary") +
                    " shadow-sm scale-105"
                  : (CATEGORY_PILL[cat] ?? "bg-muted text-muted-foreground border-border") +
                    " opacity-60 hover:opacity-100"
              }`}
            >
              <CategoryIcon category={cat} className="w-3.5 h-3.5" />
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </nav>
      )}

      {filtered.length === 0 && (
        <p className="py-12 text-center text-lg text-muted-foreground">
          {searchQuery.trim().length >= 3 ? "Ni zadetkov za to iskanje." : "Ni zgodb v tej kategoriji."}
        </p>
      )}

      {/* ── Featured hero article (with image) ── */}
      {featured && (
        <Link href={`/clanki/${featured.slug}`} className="group block mb-14">
          <article className="relative overflow-hidden rounded-2xl border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300">
            {/* Image or gradient background */}
            <div className="relative h-64 sm:h-80 md:h-96">
              <div className="absolute inset-0 overflow-hidden">
                {featured.imageUrl ? (
                  <img
                    src={featured.imageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                ) : (
                  <CategoryGradient category={featured.ai.category} />
                )}
              </div>
              {/* Dark gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

              {/* Content over image — anchored to bottom */}
              <div className="absolute bottom-0 inset-x-0 p-8 md:p-10">
                {/* Category + date */}
                <div className="flex items-center gap-3 mb-4">
                  <CategoryIcon category={featured.ai.category} className="w-4 h-4 text-white/70" />
                  <time className="text-xs text-white/70">
                    {formatDate(featured.publishedAt)}
                  </time>
                </div>

                {/* Title */}
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight text-white mb-3 max-w-3xl group-hover:text-white/90 transition-colors line-clamp-3">
                  {featured.title}
                </h2>

                {/* Subtitle */}
                <p className="text-sm md:text-base text-white/75 leading-relaxed max-w-2xl mb-4 line-clamp-2">
                  {featured.subtitle}
                </p>

                {/* CTA */}
                <div className="inline-flex items-center gap-2 text-sm font-medium text-white/90 group-hover:gap-3 transition-all">
                  <span>Preberi zgodbo</span>
                  <span aria-hidden>→</span>
                </div>
              </div>
            </div>
          </article>
        </Link>
      )}

      {/* ── Article card grid ── */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((article) => (
            <Link
              key={article.slug}
              href={`/clanki/${article.slug}`}
              className="group block"
            >
              <article className="relative h-full flex flex-col overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                {/* Card image */}
                <div className="relative h-44 overflow-hidden">
                  {article.imageUrl ? (
                    <img
                      src={article.imageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  ) : (
                    <CategoryGradient category={article.ai.category} />
                  )}
                  {/* Category icon overlay */}
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
                  {/* Date */}
                  <time className="text-xs text-muted-foreground/50 mb-2 tabular-nums">
                    {new Date(article.publishedAt).toLocaleDateString("sl-SI", {
                      day: "numeric",
                      month: "short",
                    })}
                  </time>

                  {/* Title */}
                  <h3 className="text-sm font-semibold leading-snug text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-3">
                    {article.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-3">
                    {getExcerpt(article.subtitle || article.body)}
                  </p>

                  {/* Card footer */}
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
          ))}
        </div>
      )}
    </>
  );
}
