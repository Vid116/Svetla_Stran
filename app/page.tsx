import Link from "next/link";
import { Sun } from "lucide-react";
import { LogoLink } from "@/components/logo-link";
import { ArticleGrid } from "@/components/article-grid";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { SiteFooter } from "@/components/site-footer";
import { NavSearch } from "@/components/nav-search";
import { getPublishedArticles } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface PublishedArticle {
  title: string;
  subtitle: string;
  body: string;
  slug: string;
  imageUrl?: string;
  publishedAt: string;
  source: {
    rawTitle?: string;
    sourceUrl: string;
    sourceName: string;
  };
  ai: {
    score: number;
    category: string;
    emotions: string[];
    antidote_for: string | null;
    antidote_secondary: string | null;
  };
  references?: { url: string; title: string }[];
  imagePosition?: number;
  aiImageUrl?: string;
  longForm?: { title: string; subtitle: string; body: string; slug: string } | null;
  verification?: {
    passed: boolean | null;
    summary: string | null;
    claims: { claim: string; status: string; source?: string }[];
  };
  research?: {
    queries: string[];
    sourcesFound: number | null;
    sourcesUsed: number | null;
  };
}

function rowToArticle(s: any): PublishedArticle {
  return {
    title: s.title,
    subtitle: s.subtitle || "",
    body: s.body,
    slug: s.slug,
    imageUrl: s.ai_image_url || s.image_url || undefined,
    publishedAt: s.published_at || s.created_at,
    source: {
      sourceUrl: s.source_url,
      sourceName: s.source_name,
    },
    ai: {
      score: s.ai_score || 0,
      category: s.category || "",
      emotions: s.emotions || [],
      antidote_for: s.antidote || null,
      antidote_secondary: s.antidote_secondary || null,
    },
  };
}

export default async function HomePage() {
  const rows = await getPublishedArticles();
  const articles = rows
    .filter((s: any) => s.title && s.body)
    .map(rowToArticle);

  return (
    <main className="min-h-screen">
      {/* Nav with search */}
      <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
          <LogoLink />
          <NavSearch />
          <Link
            href="/o-nas"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            O nas
          </Link>
        </div>
      </nav>

      {/* Articles */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {articles.length === 0 ? (
          <div className="py-32 text-center text-muted-foreground">
            <Sun className="w-12 h-12 text-gold/40 mx-auto mb-6" aria-hidden />
            <p className="text-xl font-light mb-3">Zgodbe se zbirajo …</p>
            <p className="text-sm">Prve bodo tu kmalu. Vrni se čez dan ali dva.</p>
          </div>
        ) : (
          <ArticleGrid articles={articles} />
        )}

        {/* Archive link */}
        {articles.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href="/arhiv"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Starejše zgodbe
              <span aria-hidden>→</span>
            </Link>
          </div>
        )}
      </div>

      {/* Newsletter signup */}
      <div className="mx-auto max-w-3xl px-6 py-16">
        <NewsletterSignup variant="hero" />
      </div>

      <SiteFooter />
    </main>
  );
}
