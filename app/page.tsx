import Link from "next/link";
import { ArticleGrid } from "@/components/article-grid";
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
  };
  references?: { url: string; title: string }[];
}

function rowToArticle(s: any): PublishedArticle {
  return {
    title: s.title,
    subtitle: s.subtitle || "",
    body: s.body,
    slug: s.slug,
    imageUrl: s.image_url || undefined,
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
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg leading-none" aria-hidden>☀️</span>
            <span className="text-sm font-semibold tracking-wide text-foreground">
              Svetla Stran
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/clanki"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Vse zgodbe
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-soft via-background to-background" />
        <div className="absolute top-0 left-1/4 h-64 w-96 rounded-full bg-gold-soft/40 blur-3xl" />
        <div className="absolute top-0 right-1/4 h-64 w-96 rounded-full bg-lavender-soft/40 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <h1 className="text-5xl font-light tracking-tight text-foreground sm:text-6xl">
            Svetla Stran
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
            Portal pozitivnih novic iz Slovenije. Za vsak strup, ki ga mediji dajejo, imamo zdravilo.
          </p>
          {articles.length > 0 && (
            <Link
              href="/clanki"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-nature px-6 py-2.5 text-sm font-medium text-nature-foreground shadow-sm transition-all hover:opacity-90"
            >
              Preberi zgodbe &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Latest articles */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        {articles.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            <div className="text-5xl mb-6" aria-hidden>🌤️</div>
            <p className="text-xl font-light">Kmalu prihajajo zgodbe …</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-muted-foreground/70">
                Zadnje zgodbe
              </h2>
              <span className="h-px flex-1 bg-border/50" />
              <Link
                href="/clanki"
                className="text-xs font-medium text-primary hover:underline"
              >
                Vse zgodbe &rarr;
              </Link>
            </div>
            <ArticleGrid articles={articles.slice(0, 6)} />
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10 text-center space-y-1">
        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} Svetla Stran &middot; Portal pozitivnih novic iz Slovenije
        </p>
        <p className="text-xs text-muted-foreground/40">
          Vsebino pregleduje uredniška ekipa. AI pomaga pri iskanju in pisanju zgodb.
        </p>
      </footer>
    </main>
  );
}
