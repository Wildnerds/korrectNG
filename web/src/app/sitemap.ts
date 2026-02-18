import { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://korrectng.com';

interface Artisan {
  slug: string;
  updatedAt: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${SITE_URL}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${SITE_URL}/auth/register`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
  ];

  let artisanPages: MetadataRoute.Sitemap = [];

  try {
    const res = await fetch(`${API_BASE}/artisans?limit=1000`);
    const data = await res.json();
    const artisans: Artisan[] = data.data?.data || [];

    artisanPages = artisans.map((artisan) => ({
      url: `${SITE_URL}/artisan/${artisan.slug}`,
      lastModified: new Date(artisan.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));
  } catch {
    // Return static pages only if API fails
  }

  return [...staticPages, ...artisanPages];
}
