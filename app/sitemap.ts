import { MetadataRoute } from 'next';
import { getPublishedArticlesLight } from '@/lib/db';

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

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/o-nas`, lastModified: new Date('2026-03-01'), changeFrequency: 'monthly', priority: 0.5 },
    ...articleEntries,
  ];
}
