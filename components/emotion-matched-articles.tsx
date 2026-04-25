import { getThemeForCard } from '@/lib/article-helpers';
import { OverlayCard } from '@/components/overlay-card';
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
        {heading || 'Če te je ta zgodba ogrela…'}
      </h3>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map(article => {
          const theme = getThemeForCard({ themes: article.themes, antidote: article.ai.antidote_for, category: article.ai.category });
          return (
            <OverlayCard
              key={article.slug}
              tier="tertiary"
              theme={theme}
              article={{
                slug: article.slug,
                title: article.title,
                subtitle: article.subtitle,
                body: article.body,
                publishedAt: article.publishedAt,
                imageUrl: article.imageUrl || article.aiImageUrl,
                source: article.source.sourceName,
                longFormBody: article.longForm?.body,
                commentCount: article.commentCount,
              }}
              imageFallback={<CategoryGradient category={article.ai.category} />}
            />
          );
        })}
      </div>
    </section>
  );
}
