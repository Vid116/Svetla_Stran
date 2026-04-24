import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LogoLink } from "@/components/logo-link";
import { NavSearch } from "@/components/nav-search";
import { SiteFooter } from "@/components/site-footer";
import { SafeImage } from "@/components/safe-image";
import { getArticlesByTheme } from "@/lib/db";
import {
  getTheme,
  THEMES,
  TOPICAL_THEME_ORDER,
  RITUAL_THEME_ORDER,
  formatDate,
  readingTime,
  readingMinutes,
  getThemeForCard,
} from "@/lib/article-helpers";
import { getQuoteForToday } from "@/lib/theme-quotes";
import { ThemeRibbon, CommentBadge, GlobljeAnnotation } from "@/components/card-decorations";

const SUB_NAV_THEMES = [...TOPICAL_THEME_ORDER, ...RITUAL_THEME_ORDER];

export const dynamic = "force-dynamic";

// Merged/retired themes → redirect to their new home
const THEME_REDIRECTS: Record<string, string> = {
  skupaj: "med-nami",
};

export async function generateStaticParams() {
  return Object.keys(THEMES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (THEME_REDIRECTS[slug]) return {};
  const theme = getTheme(slug);
  if (!theme) return { title: "Tema ni najdena" };
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://svetlastran.si";
  return {
    title: theme.label,
    description: theme.manifesto,
    openGraph: {
      title: theme.label,
      description: theme.manifesto,
      url: `${baseUrl}/tema/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: theme.label,
      description: theme.manifesto,
    },
  };
}

function getExcerpt(text: string, chars = 120) {
  if (!text) return "";
  const plain = text.replace(/\n+/g, " ").trim();
  if (plain.length <= chars) return plain;
  return plain.slice(0, chars).replace(/\s+\S*$/, "") + " …";
}

export default async function ThemePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const searchQuery = sp.q?.trim() || "";
  if (THEME_REDIRECTS[slug]) redirect(`/tema/${THEME_REDIRECTS[slug]}`);
  const theme = getTheme(slug);
  if (!theme) notFound();

  const allArticles = (await getArticlesByTheme(theme)) as any[];
  const quote = getQuoteForToday(slug);

  // Filter by search query if present
  const articles = searchQuery.length >= 2
    ? allArticles.filter((a: any) => {
        const haystack = `${a.title} ${a.subtitle || ""} ${a.body || ""}`.toLowerCase();
        return searchQuery.toLowerCase().split(/\s+/).every((word) => haystack.includes(word));
      })
    : allArticles;

  const featured = articles[0];
  const rest = articles.slice(1);

  const { soft, text: textColor } = theme.colors;

  return (
    <main className="min-h-screen">
      <nav
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{
          backgroundColor: `color-mix(in srgb, ${soft} 85%, transparent)`,
          borderColor: `${theme.colors.fill}25`,
        }}
      >
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
          <LogoLink />
          <NavSearch basePath={`/tema/${slug}`} />
          <Link
            href="/"
            className="text-xs hover:opacity-70 transition-opacity shrink-0"
            style={{ color: textColor }}
          >
            ← Vse zgodbe
          </Link>
        </div>

        {/* Sub-nav: jump between themes without going home */}
        <div
          className="border-t"
          style={{ borderColor: `${theme.colors.fill}20` }}
        >
          <div className="mx-auto max-w-6xl px-6 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {SUB_NAV_THEMES.map((s) => {
              const t = THEMES[s];
              const active = s === slug;
              return (
                <Link
                  key={s}
                  href={`/tema/${s}`}
                  className="shrink-0 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide transition-all whitespace-nowrap"
                  style={
                    active
                      ? { backgroundColor: t.colors.fill, color: t.colors.activeText }
                      : { color: theme.colors.text, opacity: 0.6 }
                  }
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Hero — theme color wash, manifesto, daily quote */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${soft} 0%, transparent 100%)`,
        }}
      >
        <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-16 text-center">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight mb-6"
            style={{ color: textColor }}
          >
            {theme.label}
          </h1>
          <p
            className="text-lg md:text-xl leading-relaxed max-w-2xl mx-auto"
            style={{ color: textColor, opacity: 0.85 }}
          >
            {theme.manifesto}
          </p>

          {quote && (
            <div
              className="mt-12 pt-10 border-t"
              style={{ borderColor: `${textColor}25` }}
            >
              <p
                className="text-base md:text-lg italic leading-relaxed max-w-xl mx-auto"
                style={{ color: textColor, opacity: 0.75 }}
              >
                „{quote.text}"
              </p>
              {(quote.attribution || quote.source) && (
                <p
                  className="mt-3 text-xs tracking-wide"
                  style={{ color: textColor, opacity: 0.55 }}
                >
                  — {quote.attribution || quote.source}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Featured story */}
      {featured && (
        <div className="mx-auto max-w-6xl px-6 pt-10">
          <Link href={`/clanki/${featured.slug}`} className="group block">
            <article className="relative overflow-hidden rounded-2xl border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="relative h-64 sm:h-80 md:h-[26rem]">
                <div className="absolute inset-0 overflow-hidden">
                  {featured.ai_image_url || featured.image_url ? (
                    <SafeImage
                      src={featured.ai_image_url || featured.image_url}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                      fallback={<div className="w-full h-full" style={{ backgroundColor: soft }} />}
                    />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: soft }} />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <CommentBadge count={featured.comment_count ?? 0} className="absolute top-4 right-4 z-10" />
                <div className="absolute bottom-0 inset-x-0 p-8 md:p-10">
                  <time className="text-xs text-white/70 block mb-4">
                    {formatDate(featured.published_at || featured.created_at)}
                  </time>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight text-white mb-3 max-w-3xl line-clamp-3">
                    {featured.title}
                  </h2>
                  {featured.subtitle && (
                    <p className="text-sm md:text-base text-white/75 leading-relaxed max-w-2xl mb-4 line-clamp-2">
                      {featured.subtitle}
                    </p>
                  )}
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-white/90 group-hover:gap-3 transition-all">
                    <span>Preberi zgodbo</span>
                    <span aria-hidden>→</span>
                  </div>
                </div>
              </div>
            </article>
          </Link>
        </div>
      )}

      {/* Archive grid */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        {articles.length === 0 ? (
          <div className="py-20 text-center">
            {theme.kind === "events" ? (
              <>
                <p className="text-muted-foreground mb-2">
                  Kmalu bomo tukaj zbirali dogodke po Sloveniji.
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Festivali, koncerti, pohodi, odprtja, predavanja — vse na enem mestu.
                </p>
              </>
            ) : theme.kind === "archive" ? (
              <p className="text-muted-foreground">
                Arhiv se nabira. Starejše zgodbe se bodo tukaj pojavile, ko bodo minili trije meseci.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Zgodbe se zbirajo. Vrni se kmalu.
              </p>
            )}
          </div>
        ) : rest.length > 0 ? (
          <>
            <p className="text-xs tracking-wider uppercase text-muted-foreground/60 mb-6 text-center">
              Več zgodb iz teme
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((article) => {
                const cardTheme = getThemeForCard({ themes: article.themes, antidote: article.antidote, category: article.category });
                const longMin = readingMinutes(article.long_form?.body);
                return (
                  <Link
                    key={article.slug}
                    href={`/clanki/${article.slug}`}
                    className="group block h-full"
                  >
                    <article className="relative h-full flex flex-col overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                      <div className="relative h-44 overflow-hidden">
                        {article.ai_image_url || article.image_url ? (
                          <SafeImage
                            src={article.ai_image_url || article.image_url}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            fallback={<div className="w-full h-full" style={{ backgroundColor: soft }} />}
                          />
                        ) : (
                          <div className="w-full h-full" style={{ backgroundColor: soft }} />
                        )}
                        {/* Theme ribbon only when the article belongs to a different theme than this page */}
                        {cardTheme && cardTheme.slug !== slug && (
                          <ThemeRibbon theme={cardTheme} size="sm" />
                        )}
                        <CommentBadge count={article.comment_count ?? 0} />
                      </div>
                      <div className="flex flex-col flex-1 p-5">
                        <time className="text-xs text-muted-foreground/50 mb-2 tabular-nums">
                          {new Date(article.published_at || article.created_at).toLocaleDateString("sl-SI", {
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
                        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground/50 truncate min-w-0">
                            {article.source_name}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground/40">
                              {readingTime(article.body || "")}
                            </span>
                            <GlobljeAnnotation minutes={longMin} />
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      <SiteFooter />
    </main>
  );
}
