"use client";

/**
 * Lazy wrappers for below-fold / interactive-only components used by public
 * pages. The page imports from here instead of the original module so the
 * heavy code never enters the page's edge-function bundle (Vercel's hobby
 * plan caps that at 1 MB).
 *
 * Rule: any component that's below the fold AND not LCP-critical AND not
 * needed for SEO crawlers belongs here. Above-fold or SEO-relevant components
 * (article hero, header, body, share button, top CTA) stay imported directly.
 */

import dynamic from "next/dynamic";

export const LazyCommentSection = dynamic(
  () => import("./comment-section").then((m) => ({ default: m.CommentSection })),
  { ssr: false },
);

export const LazyEmotionMatchedArticles = dynamic(
  () => import("./emotion-matched-articles").then((m) => ({ default: m.EmotionMatchedArticles })),
  { ssr: false },
);

export const LazyMidArticleCta = dynamic(
  () => import("./mid-article-cta").then((m) => ({ default: m.MidArticleCta })),
  { ssr: false },
);

export const LazyLongFormBottomCta = dynamic(
  () => import("./long-form-cta").then((m) => ({ default: m.LongFormBottomCta })),
  { ssr: false },
);

export const LazyNewsletterSignup = dynamic(
  () => import("./newsletter-signup").then((m) => ({ default: m.NewsletterSignup })),
  { ssr: false },
);

export const LazyScrollToTop = dynamic(
  () => import("./scroll-to-top").then((m) => ({ default: m.ScrollToTop })),
  { ssr: false },
);
