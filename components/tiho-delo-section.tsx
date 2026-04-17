import Link from "next/link";
import { SafeImage } from "@/components/safe-image";
import { THEMES } from "@/lib/article-helpers";

interface TihoDeloArticle {
  title: string;
  subtitle?: string;
  slug: string;
  image_url?: string;
  ai_image_url?: string;
  published_at?: string;
  created_at?: string;
}

export function TihoDeloSection({ articles }: { articles: TihoDeloArticle[] }) {
  if (articles.length === 0) return null;

  const theme = THEMES["tiho-delo"];

  return (
    <section className="mb-10">
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${theme.colors.soft} 0%, color-mix(in srgb, ${theme.colors.soft} 40%, transparent) 60%, transparent 100%)`,
        }}
      >
        {/* Header — clicks to theme page */}
        <Link href="/tema/tiho-delo" className="block px-8 pt-10 pb-4 text-center group">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
            style={{ backgroundColor: `${theme.colors.fill}18` }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: theme.colors.fill }}
            />
            <span
              className="text-[11px] font-semibold tracking-[2.5px] uppercase"
              style={{ color: theme.colors.text }}
            >
              Tiha dela
            </span>
          </div>

          <p
            className="text-lg sm:text-xl font-light leading-relaxed max-w-xl mx-auto group-hover:opacity-75 transition-opacity"
            style={{ color: theme.colors.text, opacity: 0.85 }}
          >
            Medicinske sestre na nočni izmeni. Cestarji ob šestih zjutraj.
            <br className="hidden sm:block" />
            Slovenija stoji, ker nekdo zgodaj vstane.
          </p>
        </Link>

        {/* Story cards — each clicks to its own article */}
        <div className="px-6 pt-4 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {articles.map((article) => {
              const imageUrl = article.ai_image_url || article.image_url;
              return (
                <Link
                  key={article.slug}
                  href={`/clanki/${article.slug}`}
                  className="group block"
                >
                  <article className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                    <div className="relative h-28 overflow-hidden">
                      {imageUrl ? (
                        <SafeImage
                          src={imageUrl}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          fallback={
                            <div className="w-full h-full" style={{ backgroundColor: theme.colors.soft }} />
                          }
                        />
                      ) : (
                        <div className="w-full h-full" style={{ backgroundColor: theme.colors.soft }} />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-xs font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground/50 mt-2">
                        {new Date(article.published_at || article.created_at || "").toLocaleDateString("sl-SI", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>

          {/* Footer — clicks to theme page */}
          <div className="text-center mt-5">
            <Link
              href="/tema/tiho-delo"
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors group"
              style={{ color: theme.colors.text }}
            >
              Vse zgodbe tihih del
              <span aria-hidden className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
