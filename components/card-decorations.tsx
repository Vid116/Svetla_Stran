/** Shared card overlays — theme ribbon (top-left), comment count (bottom-right),
 *  inline "globlje +X min" annotation for the metadata footer.
 *
 *  Server-renderable. No hooks.
 */
import type { Theme } from "@/lib/article-helpers";

const COMMENT_ICON = (
  <svg
    viewBox="0 0 24 24"
    width={11}
    height={11}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

/** All-caps theme tag — sits over the card image, top-left.
 *
 *  Padding rules for rounded-full pills with uppercase tracked text:
 *  - horizontal padding ≥ ~1.2× font size (to clear the curve eating the corners)
 *  - vertical padding ≥ ~0.5× font size
 *  - tracking in em, not px (px tracking on small text is too aggressive)
 *  - leading-none so the box height is predictable from padding
 */
export function ThemeRibbon({
  theme,
  className = "absolute top-3 left-3 z-10",
  size = "md",
}: {
  theme: Theme | null;
  className?: string;
  size?: "sm" | "md";
}) {
  if (!theme) return null;
  // With leading-none (line-height: 1), all vertical air must come from padding.
  // Cap height is ~70% of font size, so for breathing, vertical padding ≥ ~0.7× font size.
  // Horizontal padding ≥ ~1.4× font size to clear the rounded-full corner curve.
  // Bump fonts up — text-[9px] is squinty regardless of padding.
  const sizing = size === "sm"
    ? "px-3 py-1.5 text-[10px]"
    : "px-4 py-2 text-[11px]";
  return (
    <span
      className={`${className} inline-flex items-center rounded-full font-semibold tracking-[0.1em] uppercase leading-none shadow-sm backdrop-blur-sm`}
      style={{
        backgroundColor: theme.colors.fill,
        color: theme.colors.activeText,
      }}
    >
      {theme.label}
    </span>
  );
}

/** Comment count pill — sits over the card image, bottom-right. Hidden when 0. */
export function CommentBadge({
  count,
  className = "absolute bottom-3 right-3 z-10",
}: {
  count: number;
  className?: string;
}) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={`${className} inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1.5 text-[10px] font-medium leading-none text-white backdrop-blur-sm`}
      aria-label={`${count} komentarjev`}
    >
      {COMMENT_ICON}
      <span className="tabular-nums">{count}</span>
    </span>
  );
}

/** Inline "+X min globlje" annotation — for card metadata footer. */
export function GlobljeAnnotation({ minutes }: { minutes: number }) {
  if (!minutes || minutes <= 0) return null;
  return (
    <span className="text-[11px] text-amber-700/80 whitespace-nowrap">
      +{minutes} min globlje
    </span>
  );
}
