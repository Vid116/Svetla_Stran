import Link from "next/link";
import { Sun } from "lucide-react";
import { LogoLink } from "@/components/logo-link";
import { ArticleGrid } from "@/components/article-grid";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { SiteFooter } from "@/components/site-footer";
import { NavSearch } from "@/components/nav-search";
import { NedeljskaTakeover } from "@/components/nedeljska-takeover";
import { getPublishedArticleListings, getArticlesByTag } from "@/lib/db";
import { rowToListing } from "@/lib/article-listings";

export const runtime = "edge";
export const revalidate = 300;

/** Full article shape — still used by /clanki/[slug] and emotion-matched cards.
 *  Homepage no longer ships this (see ArticleListing in lib/article-listings). */
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

export default async function HomePage() {
  // Check if today is Sunday in Slovenia
  const now = new Date();
  const dayInSlovenia = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Europe/Ljubljana",
  }).format(now);
  const isSunday = dayInSlovenia === "Sun";

  // Fetch data in parallel
  const [rows, nedeljskaRows] = await Promise.all([
    getPublishedArticleListings(),
    isSunday ? getArticlesByTag("nedeljska-zgodba", 1) : Promise.resolve([]),
  ]);

  const articles = (rows as any[])
    .filter((s) => s.title)
    .map(rowToListing);

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
