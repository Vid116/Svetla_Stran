import Link from "next/link";
import { SafeImage } from "@/components/safe-image";
import { THEMES, formatDate } from "@/lib/article-helpers";
import { getQuoteForToday } from "@/lib/theme-quotes";

interface NedeljskaArticle {
  title: string;
  subtitle?: string;
  slug: string;
  image_url?: string;
  ai_image_url?: string;
  published_at?: string;
  created_at?: string;
}

export function NedeljskaTakeover({ article }: { article: NedeljskaArticle }) {
  const theme = THEMES["nedeljska-zgodba"];
  const quote = getQuoteForToday("nedeljska-zgodba");
  const imageUrl = article.ai_image_url || article.image_url;

  return (
    <section className="mb-10">
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(180deg, ${theme.colors.soft} 0%, transparent 100%)`,
        }}
      >
        {/* Top: badge + daily quote */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
            style={{ backgroundColor: `${theme.colors.fill}18` }}
          >
            <span
              className="relative flex h-1.5 w-1.5"
            >
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ backgroundColor: theme.colors.fill }}
              />
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: theme.colors.fill }}
              />
            </span>
            <span
              className="text-[11px] font-semibold tracking-[2.5px] uppercase"
              style={{ color: theme.colors.text }}
            >
              Nedeljska zgodba
            </span>
          </div>

          {quote && (
            <p
              className="text-sm italic leading-relaxed max-w-lg mx-auto"
              style={{ color: theme.colors.text, opacity: 0.6 }}
            >
              „{quote.text}"
            </p>
          )}
        </div>

        {/* Hero image + article overlay */}
        <Link href={`/clanki/${article.slug}`} className="group block mx-6 mb-6">
          <div className="relative overflow-hidden rounded-2xl h-72 sm:h-80 md:h-[22rem]">
            {imageUrl ? (
              <SafeImage
                src={imageUrl}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                fallback={
                  <div className="absolute inset-0" style={{ backgroundColor: theme.colors.soft }} />
                }
              />
            ) : (
              <div className="absolute inset-0" style={{ backgroundColor: theme.colors.soft }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            <div className="absolute bottom-0 inset-x-0 p-8 md:p-10">
              <time className="text-xs text-white/60 block mb-3">
                {formatDate(article.published_at || article.created_at || "")}
              </time>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight text-white mb-3 max-w-3xl line-clamp-3">
                {article.title}
              </h2>
              {article.subtitle && (
                <p className="text-sm md:text-base text-white/75 leading-relaxed max-w-2xl mb-5 line-clamp-2">
                  {article.subtitle}
                </p>
              )}
              <span className="inline-flex items-center gap-2 bg-white text-[#3a2410] px-5 py-2.5 rounded-xl text-sm font-semibold group-hover:gap-3 transition-all">
                Preberi nedeljsko zgodbo
                <span aria-hidden>&rarr;</span>
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
