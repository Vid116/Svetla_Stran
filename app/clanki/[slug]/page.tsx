import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getArticleBySlug, getEmotionMatchedArticles } from "@/lib/db";
import { NewsletterSignup } from "@/components/newsletter-signup";
import type { PublishedArticle } from "@/app/page";
import {
  CATEGORY_ACCENT_BAR,
  CATEGORY_LABELS,
  formatDate,
  readingTime,
} from "@/lib/article-helpers";
import { CategoryIcon } from "@/lib/category-icons";
import { ShareButton, ShareBar } from "@/components/share-button";
import { EmotionTag } from "@/components/emotion-tag";
import { ResearchDetails } from "@/components/research-details";
import { LongFormSection } from "@/components/long-form-section";
import { CommentSection } from "@/components/comment-section";
import { EmotionMatchedArticles } from "@/components/emotion-matched-articles";
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
    imageUrl: s.ai_image_url || s.image_url || undefined,
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
    imagePosition: s.image_position ?? 50,
    aiImageUrl: s.ai_image_url || undefined,
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

  // Emotion-matched related articles
  const emotionMatched = await getEmotionMatchedArticles(
    article.slug,
    article.ai.emotions || [],
    article.ai.category || null,
    3
  );
  const relatedArticles = emotionMatched.map(rowToArticle);

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
            style={{ objectPosition: `center ${article.imagePosition ?? 50}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute top-0 left-0 right-0 p-6">
            <Link
              href={`/?kategorija=${article.ai.category}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors group bg-black/20 backdrop-blur-sm rounded-full px-3 py-1.5"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden>←</span>
              <CategoryIcon category={article.ai.category} className="w-3.5 h-3.5" />
              {CATEGORY_LABELS[article.ai.category] ?? article.ai.category}
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
              href={`/?kategorija=${article.ai.category}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group mb-8 block"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden>←</span>
              <CategoryIcon category={article.ai.category} className="w-3.5 h-3.5" />
              {CATEGORY_LABELS[article.ai.category] ?? article.ai.category}
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

          <EmotionTag
            antidote={article.ai.antidote_for}
            emotions={article.ai.emotions}
            showAntidoteLine={true}
          />

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
              {i === 2 && paragraphs.length > 4 && <MidArticleCta category={article.ai.category} />}
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

        {/* Emotional tag section */}
        {(article.ai.antidote_for || (article.ai.emotions && article.ai.emotions.length > 0)) && (
          <div className="mt-10">
            <div className="rounded-xl border border-border/30 bg-card/50 p-6 text-center">
              {article.ai.antidote_for && (
                <p className="font-brand text-lg font-semibold text-foreground/80">
                  Ta zgodba je zdravilo za {article.ai.antidote_for}
                </p>
              )}
              <div className="mt-2 flex justify-center">
                <EmotionTag emotions={article.ai.emotions} />
              </div>
            </div>
          </div>
        )}

        {/* Share bar */}
        <div className="mt-10">
          <ShareBar title={article.title} />
        </div>
      </main>

      {/* Emotion-matched next reads */}
      {relatedArticles.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 py-8">
          <EmotionMatchedArticles articles={relatedArticles} />
        </div>
      )}

      {/* Newsletter signup */}
      <div className="mx-auto max-w-3xl px-6 pt-2 pb-8">
        <NewsletterSignup variant="inline" category={article.ai.category} />
      </div>

      {/* Comments */}
      <div className="mx-auto max-w-3xl px-6 pb-8">
        <CommentSection articleId={row.id} />
      </div>

      <SiteFooter />

      {/* Sticky mobile subscribe bar */}
      <StickySubscribeBar category={article.ai.category} />

      {/* Scroll to top — small floating button */}
      <ScrollToTop />
    </div>
  );
}
