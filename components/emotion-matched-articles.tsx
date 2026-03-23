import Link from 'next/link';
import { SafeImage } from '@/components/safe-image';
import { EmotionTag } from '@/components/emotion-tag';
import { CATEGORY_LABELS, CATEGORY_PILL, formatDate, readingTime } from '@/lib/article-helpers';
import type { PublishedArticle } from '@/app/page';

/** Gradient fallback when no image available */
function CategoryGradient({ category }: { category: string }) {
  const gradients: Record<string, string> = {
    SPORT: "from-sky/20 to-sky-soft/40",
    ZIVALI: "from-warmth/20 to-gold-soft/40",
    SKUPNOST: "from-lavender/20 to-lavender-soft/40",
    NARAVA: "from-nature/20 to-nature-soft/40",
    INFRASTRUKTURA: "from-gold/20 to-gold-soft/40",
    PODJETNISTVO: "from-gold/20 to-gold-soft/40",
    SLOVENIJA_V_SVETU: "from-sky/20 to-lavender-soft/40",
    JUNAKI: "from-rose/20 to-rose-soft/40",
    KULTURA: "from-lavender/20 to-rose-soft/40",
  };
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${gradients[category] ?? "from-muted to-muted/50"}`} />
  );
}

export function EmotionMatchedArticles({ articles, heading }: { articles: PublishedArticle[]; heading?: string }) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className="py-8">
      <h3 className="mb-4 font-brand text-lg font-semibold text-foreground/80">
        {heading || 'Če te je ta zgodba ogrela...'}
      </h3>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map(article => {
          const imageUrl = article.imageUrl || article.aiImageUrl;
          const catLabel = article.ai.category ? CATEGORY_LABELS[article.ai.category] : null;
          const catPill = article.ai.category ? CATEGORY_PILL[article.ai.category] : null;

          return (
            <Link key={article.slug} href={`/clanki/${article.slug}`}
              className="group overflow-hidden rounded-xl border border-border/30 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative h-40 bg-gradient-to-br from-heaven via-heaven-glow/30 to-sky/10 overflow-hidden">
                {imageUrl ? (
                  <SafeImage
                    src={imageUrl}
                    alt={article.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                    fallback={<CategoryGradient category={article.ai.category} />}
                  />
                ) : (
                  <CategoryGradient category={article.ai.category} />
                )}
                {catLabel && catPill && (
                  <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${catPill}`}>
                    {catLabel}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h4 className="mb-1 font-brand text-base font-semibold leading-snug text-foreground/90 line-clamp-2">
                  {article.title}
                </h4>
                <EmotionTag emotions={article.ai.emotions} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(article.publishedAt)} · {readingTime(article.body)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
