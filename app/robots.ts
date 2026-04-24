import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://svetlastran.si';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/urednik', '/api', '/prijava'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
