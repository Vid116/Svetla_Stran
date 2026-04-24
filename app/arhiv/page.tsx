import Link from "next/link";
import { getArchivedArticles } from "@/lib/db";
import { LogoLink } from "@/components/logo-link";
import { SiteFooter } from "@/components/site-footer";
import { CATEGORY_LABELS, formatDate, zgodbeCount } from "@/lib/article-helpers";
import { SafeImage } from "@/components/safe-image";
import { CategoryIcon } from "@/lib/category-icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Arhiv zgodb",
  description: "Starejše zgodbe iz arhiva Svetle Strani.",
};

// Group articles by month
function groupByMonth(articles: any[]) {
  const groups: Record<string, any[]> = {};
  for (const a of articles) {
    const date = new Date(a.published_at || a.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function monthLabel(key: string) {
  const [year, month] = key.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
}

export default async function ArhivPage() {
  const rows = await getArchivedArticles();
  const articles = (rows as any[]).filter((a: any) => a.title && a.slug);
  const grouped = groupByMonth(articles);

  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
          <LogoLink />
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Nazaj na zgodbe
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-light tracking-tight text-foreground mb-2">
          Arhiv zgodb
        </h1>
        <p className="text-sm text-muted-foreground mb-12">
          {zgodbeCount(articles.length)} iz preteklih dni.
        </p>

        {grouped.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            Arhiv je prazen.
          </p>
        ) : (
          <div className="space-y-12">
            {grouped.map(([month, items]) => (
              <section key={month}>
                <h2 className="text-lg font-medium text-foreground mb-4 capitalize">
                  {monthLabel(month)}
                </h2>
                <div className="space-y-3">
                  {items.map((a: any) => (
                    <Link
                      key={a.id}
                      href={`/clanki/${a.slug}`}
                      className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/80 p-4 transition-all hover:shadow-md hover:border-border"
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                        {(a.ai_image_url || a.image_url) ? (
                          <SafeImage
                            src={a.ai_image_url || a.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                            fallback={<div className="w-full h-full flex items-center justify-center text-muted-foreground/40"><CategoryIcon category={a.category} className="w-6 h-6" /></div>}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                            <CategoryIcon category={a.category} className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground line-clamp-2">
                          {a.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(a.published_at || a.created_at)}
                          </span>
                          <span className="text-xs text-muted-foreground/50">·</span>
                          <span className="text-xs text-muted-foreground">
                            {CATEGORY_LABELS[a.category] || a.category}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
