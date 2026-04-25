import Link from "next/link";
import { redirect } from "next/navigation";
import { Sun } from "lucide-react";
import { LogoLink } from "@/components/logo-link";
import { ArticleGrid } from "@/components/article-grid";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { SiteFooter } from "@/components/site-footer";
import { NavSearch } from "@/components/nav-search";
import { NedeljskaTakeover } from "@/components/nedeljska-takeover";
import { getPublishedArticles, getArticlesByTag } from "@/lib/db";

export const dynamic = "force-dynamic";

// Legacy ?antidote=X query param → /tema/{slug} (antidote is now hidden matcher)
const ANTIDOTE_TO_THEME: Record<string, string> = {
  jeza: "med-nami",
  cinizem: "med-nami",
  skrb: "naprej",
  obup: "naprej",
  osamljenost: "med-nami",
  strah: "heroji",
  dolgcas: "drobne-radosti",
};

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
  themes?: string[];
  commentCount?: number;
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
    themes: s.themes || [],
    commentCount: s.comment_count ?? 0,
    longForm: s.long_form || null,
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ antidote?: string }>;
}) {
  const params = (await searchParams) || {};
  if (params.antidote && ANTIDOTE_TO_THEME[params.antidote]) {
    redirect(`/tema/${ANTIDOTE_TO_THEME[params.antidote]}`);
  }

  // Check if today is Sunday in Slovenia
  const now = new Date();
  const dayInSlovenia = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Europe/Ljubljana",
  }).format(now);
  const isSunday = dayInSlovenia === "Sun";

  // Fetch data in parallel
  const [rows, nedeljskaRows] = await Promise.all([
    getPublishedArticles(),
    isSunday ? getArticlesByTag("nedeljska-zgodba", 1) : Promise.resolve([]),
  ]);

  const articles = rows
    .filter((s: any) => s.title && s.body)
    .map(rowToArticle);

  const nedeljskaArticle = (nedeljskaRows as any[])[0] || null;

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
          <ArticleGrid
            articles={articles}
            nedeljskaArticle={nedeljskaArticle}
          />
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
