import Link from "next/link";
import { ArticleGrid } from "@/components/article-grid";
import { getPublishedArticles } from "@/lib/db";
import type { PublishedArticle } from "@/app/page";

export { type PublishedArticle };

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

export default async function ClanekPage() {
  const rows = await getPublishedArticles();
  const articles = rows
    .filter((s: any) => s.title && s.body)
    .map(rowToArticle);

  return (
    <main className="min-h-screen">
      {/* Compact nav bar */}
      <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none" aria-hidden>☀️</span>
            <span className="text-sm font-semibold tracking-wide text-foreground">
              Svetla Stran
            </span>
          </div>
          <span className="text-xs text-muted-foreground/50">
            Pozitivne novice iz Slovenije
          </span>
        </div>
      </nav>

      {/* Articles */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {articles.length === 0 ? (
          <div className="py-32 text-center text-muted-foreground">
            <div className="text-5xl mb-6" aria-hidden>🌤️</div>
            <p className="text-xl font-light mb-3">Kmalu prihajajo zgodbe …</p>
            <p className="text-sm">
              Pojdi v{" "}
              <Link href="/urednik" className="text-primary hover:underline">
                uredniški inbox
              </Link>{" "}
              in odobri prve zgodbe.
            </p>
          </div>
        ) : (
          <ArticleGrid articles={articles} />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10 text-center space-y-1">
        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} Svetla Stran &middot; Portal pozitivnih novic iz Slovenije
        </p>
        <p className="text-xs text-muted-foreground/40">
          Vsebino pregleduje uredniška ekipa. UI pomaga pri iskanju in pisanju zgodb.
        </p>
      </footer>
    </main>
  );
}
