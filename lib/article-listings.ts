/** Slim shape used by the homepage list view + search. Holds no body or
 *  long-form text — reading minutes are pre-computed server-side. */
export interface ArticleListing {
  title: string;
  subtitle: string;
  slug: string;
  imageUrl?: string;
  publishedAt: string;
  sourceName: string;
  ai: {
    score: number;
    category: string;
    antidote_for: string | null;
    antidote_secondary: string | null;
  };
  themes: string[];
  commentCount: number;
  bodyMinutes: number;
  longFormMinutes: number;
}

export function rowToListing(s: any): ArticleListing {
  return {
    title: s.title,
    subtitle: s.subtitle || "",
    slug: s.slug,
    imageUrl: s.ai_image_url || s.image_url || undefined,
    publishedAt: s.published_at || s.created_at,
    sourceName: s.source_name,
    ai: {
      score: s.ai_score || 0,
      category: s.category || "",
      antidote_for: s.antidote || null,
      antidote_secondary: s.antidote_secondary || null,
    },
    themes: s.themes || [],
    commentCount: s.comment_count ?? 0,
    bodyMinutes: s.body_minutes ?? 0,
    longFormMinutes: s.long_form_minutes ?? 0,
  };
}
