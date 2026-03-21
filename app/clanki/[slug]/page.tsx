import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getArticleBySlug, getPublishedArticles } from "@/lib/db";
import { NewsletterSignup } from "@/components/newsletter-signup";
import type { PublishedArticle } from "@/app/page";
import {
  CATEGORY_PILL,
  CATEGORY_ACCENT_BAR,
  CATEGORY_LABELS,
  formatDate,
  readingTime,
} from "@/lib/article-helpers";
import { CategoryIcon } from "@/lib/category-icons";
import { ShareButton } from "@/components/share-button";
import { ResearchDetails } from "@/components/research-details";
import { LongFormSection } from "@/components/long-form-section";
import { CommentSection } from "@/components/comment-section";
import { SiteFooter } from "@/components/site-footer";
import { MidArticleCta } from "@/components/mid-article-cta";
import { StickySubscribeBar } from "@/components/sticky-subscribe-bar";
import { ScrollToTop } from "@/components/scroll-to-top";

export const dynamic = "force-dynamic";

function rowToArticle(s: any): PublishedArticle {
  return {
    title: s.title,
    subtitle: s.subtitle || "",
    body: s.body,
    slug: s.slug,
    imageUrl: s.image_url || undefined,
    publishedAt: s.published_at || s.created_at,
    source: {
      rawTitle: s.raw_title || undefined,
      sourceUrl: s.source_url,
      sourceName: s.source_name,
    },
    ai: {
      score: s.ai_score || 0,
      category: s.category || "",
      emotions: s.emotions || [],
      antidote_for: s.antidote || null,
    },
    references: s.research_references || undefined,
    imagePosition: s.image_position ?? 33,
    longForm: s.long_form || null,
    verification: {
      passed: s.verification_passed ?? null,
      summary: s.verification_summary || null,
      claims: s.verification_claims || [],
    },
    research: {
      queries: s.research_queries || [],
      sourcesFound: s.research_sources_found ?? null,
      sourcesUsed: s.research_sources_used ?? null,
    },
  };
}

// Metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await getArticleBySlug(slug);
  if (!row) return { title: "Zgodba ni najdena" };
  return {
    title: `${row.title} | Svetla Stran`,
    description: row.subtitle || "",
  };
}

// Page
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await getArticleBySlug(slug);
  if (!row) notFound();

  const article = rowToArticle(row);

  // Related articles
  const allRows = await getPublishedArticles();
  const allArticles = allRows
    .filter((s: any) => s.title && s.body && s.slug !== slug)
    .map(rowToArticle);

  const sameCategory = allArticles.filter((a) => a.ai.category === article.ai.category);
  const related = (sameCategory.length >= 3 ? sameCategory : [...sameCategory, ...allArticles.filter((a) => a.ai.category !== article.ai.category)]).slice(0, 3);

  const paragraphs = article.body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const accentBar = CATEGORY_ACCENT_BAR[article.ai.category] ?? "bg-primary";

  return (
    <div className="min-h-screen">
      {/* Hero image */}
      {article.imageUrl && (
        <div className="relative h-64 sm:h-80 md:h-[28rem] overflow-hidden">
          <img
            src={article.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `center ${article.imagePosition ?? 33}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute top-0 left-0 right-0 p-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors group bg-black/20 backdrop-blur-sm rounded-full px-3 py-1.5"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden>←</span>
              Vse zgodbe
            </Link>
          </div>
        </div>
      )}

      {/* Article header */}
      <header className={`relative ${article.imageUrl ? "-mt-24" : "border-b border-border/30"}`}>
        {!article.imageUrl && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-heaven-glow/60 via-heaven to-background" />
            <div className="absolute -top-8 left-1/3 h-48 w-64 rounded-full bg-gold-soft/30 blur-3xl pointer-events-none" />
            <div className="absolute -top-8 right-1/3 h-48 w-64 rounded-full bg-sky-soft/25 blur-3xl pointer-events-none" />
          </>
        )}

        <div className="relative mx-auto max-w-3xl px-6 pt-8 pb-10">
          {!article.imageUrl && (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group mb-8 block"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden>←</span>
              Vse zgodbe
            </Link>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <CategoryIcon category={article.ai.category} className="w-5 h-5 text-muted-foreground" />
            <time className="text-xs text-muted-foreground" dateTime={article.publishedAt}>
              {formatDate(article.publishedAt)}
            </time>
            <span className="text-xs text-muted-foreground/50">·</span>
            <span className="text-xs text-muted-foreground/50">
              {readingTime(article.body)}
            </span>
            <div className="ml-auto">
              <ShareButton title={article.title} />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-foreground mb-5">
            {article.title}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light">
            {article.subtitle}
          </p>
        </div>
      </header>

      {/* Article body */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className={`h-[3px] w-16 rounded-full ${accentBar} opacity-50 mb-10`} />

        <div className="space-y-6">
          {paragraphs.map((p, i) => (
            <div key={i}>
              <p
                className={`leading-[1.85] text-foreground/85 ${
                  i === 0 ? "text-lg font-light" : "text-base"
                }`}
              >
                {p}
              </p>
              {i === 2 && paragraphs.length > 4 && <MidArticleCta />}
            </div>
          ))}
        </div>

        {/* Long-form deep read */}
        {article.longForm && (
          <LongFormSection longForm={article.longForm} accentBar={accentBar} />
        )}

        {/* Sources */}
        <div className="mt-10 p-5 rounded-xl bg-muted/40 border border-border/40">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/60 mb-3">
            Viri
          </p>
          <ol className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-xs font-medium text-muted-foreground/50 mt-0.5 shrink-0">1.</span>
              <div className="min-w-0">
                <p className="text-sm text-foreground/80">{article.source.sourceName}</p>
                {article.source.sourceUrl && (
                  <a
                    href={article.source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline underline-offset-2 line-clamp-1"
                  >
                    {article.source.rawTitle || article.source.sourceUrl}
                    <span className="ml-0.5" aria-hidden>↗</span>
                  </a>
                )}
              </div>
            </li>
            {article.references
              ?.filter((ref) => ref.url !== article.source.sourceUrl)
              .map((ref, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground/50 mt-0.5 shrink-0">{i + 2}.</span>
                  <div className="min-w-0">
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground/80 hover:text-primary transition-colors line-clamp-1"
                    >
                      {ref.title}
                      <span className="ml-0.5 text-xs text-primary" aria-hidden>↗</span>
                    </a>
                  </div>
                </li>
              ))}
          </ol>
        </div>

        {/* Expandable research & verification details */}
        <ResearchDetails
          verification={article.verification}
          research={article.research}
          references={article.references}
        />

        {/* End-of-article: share + 3-tier navigation */}
        <div className="mt-12 space-y-4">
          {/* Share row */}
          <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/30 px-6 py-4">
            <p className="text-sm font-medium text-foreground">
              Vam je bila zgodba všeč? Delite jo naprej.
            </p>
            <ShareButton title={article.title} />
          </div>

          {/* 3-tier back navigation: Category (biggest) → All stories → Back */}
          <div className="flex flex-col items-center gap-3 pt-4">
            {/* Tier 1: Category — largest, vibrant fill */}
            <Link
              href={`/?kategorija=${article.ai.category}`}
              className={`group inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                ({
                  SPORT: "bg-sky text-white shadow-lg shadow-sky/25 hover:shadow-sky/40",
                  ZIVALI: "bg-warmth text-amber-950 shadow-lg shadow-warmth/25 hover:shadow-warmth/40",
                  SKUPNOST: "bg-lavender text-purple-950 shadow-lg shadow-lavender/25 hover:shadow-lavender/40",
                  NARAVA: "bg-nature text-green-950 shadow-lg shadow-nature/25 hover:shadow-nature/40",
                  INFRASTRUKTURA: "bg-gold text-amber-950 shadow-lg shadow-gold/25 hover:shadow-gold/40",
                  PODJETNISTVO: "bg-gold text-amber-950 shadow-lg shadow-gold/25 hover:shadow-gold/40",
                  SLOVENIJA_V_SVETU: "bg-sky text-white shadow-lg shadow-sky/25 hover:shadow-sky/40",
                  JUNAKI: "bg-rose text-rose-950 shadow-lg shadow-rose/25 hover:shadow-rose/40",
                  KULTURA: "bg-lavender text-purple-950 shadow-lg shadow-lavender/25 hover:shadow-lavender/40",
                } as Record<string, string>)[article.ai.category] ?? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              }`}
            >
              <CategoryIcon category={article.ai.category} className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Več iz {CATEGORY_LABELS[article.ai.category] ?? article.ai.category}
              <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>

            {/* Tier 2: All stories — medium, subtle color */}
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-xl border-2 border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 hover:shadow-sm"
            >
              Vse zgodbe
              <span aria-hidden className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all">→</span>
            </Link>

            {/* Tier 3: Back — smallest, text-only */}
            <Link
              href="/"
              className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              ← Nazaj
            </Link>
          </div>
        </div>
      </main>

      {/* Newsletter signup (before comments) */}
      <div className="mx-auto max-w-3xl px-6 pt-2 pb-8">
        <NewsletterSignup variant="inline" />
      </div>

      {/* Comments */}
      <div className="mx-auto max-w-3xl px-6 pb-8">
        <CommentSection articleId={row.id} />
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="border-t border-border/30 bg-heaven/50">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-muted-foreground/70">
                Več zgodb
              </h2>
              <span className="h-px flex-1 bg-border/50" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map((rel) => (
                <Link key={rel.slug} href={`/clanki/${rel.slug}`} className="group block">
                  <article className="h-full flex flex-col overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="relative h-32 overflow-hidden bg-muted">
                      {rel.imageUrl ? (
                        <img
                          src={rel.imageUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${
                          CATEGORY_ACCENT_BAR[rel.ai.category]?.replace("bg-", "from-") ?? "from-primary"
                        }/20 to-muted`}>
                          <span className="absolute inset-0 flex items-center justify-center opacity-20">
                            <CategoryIcon category={rel.ai.category} className="w-10 h-10" />
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 p-4">
                      <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
                        {rel.title}
                      </h3>

                      <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground/50 truncate max-w-[70%]">
                          {rel.source.sourceName}
                        </span>
                        <span className="text-xs font-medium text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                          Preberi →
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />

      {/* Sticky mobile subscribe bar */}
      <StickySubscribeBar />

      {/* Scroll to top — small floating button */}
      <ScrollToTop />
    </div>
  );
}
