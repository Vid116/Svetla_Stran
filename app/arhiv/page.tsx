import Link from "next/link";
import { getFilteredArchive } from "@/lib/db";
import { LogoLink } from "@/components/logo-link";
import { SiteFooter } from "@/components/site-footer";
import { CATEGORY_LABELS, formatDate, zgodbeCount, THEMES } from "@/lib/article-helpers";
import { SafeImage } from "@/components/safe-image";
import { CategoryIcon } from "@/lib/category-icons";
import { ArchiveSearch } from "@/components/archive-search";
import { ArchiveThemeFilter } from "@/components/archive-theme-filter";

export const revalidate = 300;

export const metadata = {
  title: "Arhiv zgodb",
  description: "Starejše zgodbe iz arhiva Svetle Strani.",
};

const PER_PAGE = 30;

function groupByMonth(articles: any[]) {
  const groups: Record<string, any[]> = {};
  for (const a of articles) {
    const date = new Date(a.published_at || a.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("sl-SI", { month: "long", year: "numeric" });
}

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function buildPageHref(
  page: number,
  base: { q?: string; theme?: string },
): string {
  const params = new URLSearchParams();
  if (base.q) params.set("q", base.q);
  if (base.theme) params.set("theme", base.theme);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/arhiv?${qs}` : "/arhiv";
}

export default async function ArhivPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = pickFirst(params.q)?.trim() || undefined;
  const theme = pickFirst(params.theme) || undefined;
  const pageStr = pickFirst(params.page);
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

  const { items, totalCount } = await getFilteredArchive({ q, theme, page, perPage: PER_PAGE });
  const articles = items.filter((a: any) => a.title && a.slug);
  const grouped = groupByMonth(articles);
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  const activeTheme = theme ? THEMES[theme] : null;
  const filterActive = !!q || !!theme;

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
        <p className="text-sm text-muted-foreground mb-8">
          {filterActive ? (
            <>
              {zgodbeCount(totalCount)} zadetkov
              {activeTheme && (
                <>
                  {" "}v temi <span style={{ color: activeTheme.colors.text }} className="font-medium">{activeTheme.label}</span>
                </>
              )}
              {q && <> za „{q}"</>}
            </>
          ) : (
            <>{zgodbeCount(totalCount)} skupaj.</>
          )}
        </p>

        <div className="mb-6">
          <ArchiveSearch />
        </div>
        <div className="mb-10">
          <ArchiveThemeFilter />
        </div>

        {grouped.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            {filterActive ? "Ni zadetkov za izbrane filtre." : "Arhiv je prazen."}
          </p>
        ) : (
          <div className="space-y-12">
            {grouped.map(([month, monthItems]) => (
              <section key={month}>
                <h2 className="text-lg font-medium text-foreground mb-4 capitalize">
                  {monthLabel(month)}
                </h2>
                <div className="space-y-3">
                  {monthItems.map((a: any) => (
                    <Link
                      key={a.id}
                      href={`/clanki/${a.slug}`}
                      className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/80 p-4 transition-all hover:shadow-md hover:border-border"
                    >
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                        {(a.ai_image_url || a.image_url) ? (
                          <SafeImage
                            src={a.ai_image_url || a.image_url}
                            alt=""
                            className="object-cover"
                            sizes="64px"
                            fallback={<div className="w-full h-full flex items-center justify-center text-muted-foreground/40"><CategoryIcon category={a.category} className="w-6 h-6" /></div>}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                            <CategoryIcon category={a.category} className="w-6 h-6" />
                          </div>
                        )}
                      </div>

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

        {totalPages > 1 && (
          <nav
            aria-label="Stran"
            className="mt-14 flex items-center justify-between border-t border-border/30 pt-6"
          >
            {page > 1 ? (
              <Link
                href={buildPageHref(page - 1, { q, theme })}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Prejšnja
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-muted-foreground tabular-nums">
              Stran {page} od {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={buildPageHref(page + 1, { q, theme })}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Naslednja →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
