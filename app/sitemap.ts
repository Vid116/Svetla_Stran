import { MetadataRoute } from 'next';
import { getPublishedArticlesLight } from '@/lib/db';
import { TOPICAL_THEME_ORDER } from '@/lib/article-helpers';

// Only index themes that have content and are actively navigable
const SITEMAP_THEMES = [...TOPICAL_THEME_ORDER, 'tiho-delo', 'nedeljska-zgodba'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://svetlastran.si';

  const articles = await getPublishedArticlesLight();

  const articleEntries = articles
    .filter((a: any) => a.slug && a.title)
    .map((a: any) => ({
      url: `${baseUrl}/clanki/${a.slug}`,
      lastModified: new Date(a.published_at || a.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

  const themeEntries = SITEMAP_THEMES.map((slug) => ({
    url: `${baseUrl}/tema/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/o-nas`, lastModified: new Date('2026-03-01'), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/arhiv`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
    ...themeEntries,
    ...articleEntries,
  ];
}
