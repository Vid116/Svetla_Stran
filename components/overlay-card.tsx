/** Overlay-style card — text-over-image with bottom-up dark gradient.
 *
 *  Used for secondary + tertiary tier on the homepage, theme-page grid, and
 *  emotion-matched articles. The hero (homepage + theme-page featured) uses
 *  the same visual DNA but is rendered inline with Nedeljska wrapping.
 *
 *  Hierarchy across tiers comes from size, padding, and how much metadata is
 *  shown — not from styling differences.
 */
import Link from "next/link";
import type { Theme } from "@/lib/article-helpers";
import { formatDate, readingTime, readingMinutes } from "@/lib/article-helpers";
import { SafeImage } from "@/components/safe-image";
import { ThemeRibbon, CommentBadge, GlobljeAnnotation } from "@/components/card-decorations";

export interface OverlayCardArticle {
  slug: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  publishedAt: string;
  imageUrl?: string | null;
  source?: string | null;
  longFormBody?: string | null;
  commentCount?: number;
}

const TIER_STYLES = {
  secondary: {
    height: "h-72",
    padding: "p-5 sm:p-6",
    titleSize: "text-lg sm:text-xl",
    titleClamp: "line-clamp-2",
    showSubtitle: true,
    subtitleSize: "text-xs sm:text-sm",
    subtitleClamp: "line-clamp-1",
    ribbonSize: "md" as const,
  },
  tertiary: {
    height: "h-56",
    padding: "p-4",
    titleSize: "text-sm",
    titleClamp: "line-clamp-2",
    showSubtitle: false,
    subtitleSize: "",
    subtitleClamp: "",
    ribbonSize: "sm" as const,
  },
} as const;

export function OverlayCard({
  article,
  theme,
  tier,
  imageFallback,
  hideThemeRibbon = false,
}: {
  article: OverlayCardArticle;
  theme: Theme | null;
  tier: "secondary" | "tertiary";
  imageFallback: React.ReactNode;
  /** True on theme pages where the card already shares the page's theme. */
  hideThemeRibbon?: boolean;
}) {
  const s = TIER_STYLES[tier];
  const longMin = readingMinutes(article.longFormBody);

  return (
    <Link href={`/clanki/${article.slug}`} className="group block h-full">
      <article className="relative h-full overflow-hidden rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
        <div className={`relative ${s.height} overflow-hidden`}>
          {article.imageUrl ? (
            <SafeImage
              src={article.imageUrl}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              fallback={imageFallback}
            />
          ) : (
            imageFallback
          )}

          {/* Dark gradient — guarantees text legibility regardless of image content */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

          {/* Top decorations */}
          {!hideThemeRibbon && (
            <ThemeRibbon theme={theme} size={s.ribbonSize} />
          )}
          <CommentBadge
            count={article.commentCount ?? 0}
            className="absolute top-3 right-3 z-10"
          />

          {/* Bottom text overlay */}
          <div className={`absolute bottom-0 inset-x-0 ${s.padding}`}>
            <time className="text-[11px] text-white/70 block mb-1.5 tabular-nums">
              {formatDate(article.publishedAt)}
            </time>

            <h3
              className={`${s.titleSize} font-semibold leading-snug text-white ${s.titleClamp} mb-2 group-hover:text-white/95 transition-colors`}
            >
              {article.title}
            </h3>

            {s.showSubtitle && article.subtitle && (
              <p
                className={`${s.subtitleSize} text-white/75 leading-relaxed ${s.subtitleClamp} mb-3`}
              >
                {article.subtitle}
              </p>
            )}

            <div className="flex items-center gap-2 text-[11px] text-white/65">
              {article.source && (
                <span className="truncate min-w-0">{article.source}</span>
              )}
              {article.source && article.body && (
                <span className="text-white/30 shrink-0">·</span>
              )}
              {article.body && (
                <span className="shrink-0">{readingTime(article.body)}</span>
              )}
              <GlobljeAnnotation minutes={longMin} tone="dark" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
