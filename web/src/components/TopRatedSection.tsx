'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTradeLabel, formatRating } from '@korrectng/shared';
import type { ArtisanProfile } from '@korrectng/shared';
import { apiFetch } from '@/lib/api';

interface TopRatedSectionProps {
  trade?: string;
  exclude?: string;
  title?: string;
  limit?: number;
  showViewAll?: boolean;
}

export default function TopRatedSection({
  trade,
  exclude,
  title,
  limit = 4,
  showViewAll = true,
}: TopRatedSectionProps) {
  const [artisans, setArtisans] = useState<ArtisanProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (trade) params.set('trade', trade);
        if (exclude) params.set('exclude', exclude);
        params.set('limit', limit.toString());

        const res = await apiFetch<ArtisanProfile[]>(`/artisans/recommendations?${params.toString()}`);
        if (res.data) {
          setArtisans(res.data);
        }
      } catch {
        setArtisans([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [trade, exclude, limit]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (artisans.length === 0) {
    return null;
  }

  const sectionTitle = title || (trade ? `Top Rated ${getTradeLabel(trade)}s` : 'Top Rated Skilled Professionals');

  return (
    <div className="bg-white rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{sectionTitle}</h2>
        {showViewAll && (
          <Link
            href={trade ? `/search?trade=${trade}&sort=rating` : '/search?sort=rating'}
            className="text-brand-green hover:underline text-sm font-medium"
          >
            View All
          </Link>
        )}
      </div>

      {/* Horizontal scrollable on mobile, grid on desktop */}
      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0 -mx-2 px-2 md:mx-0 md:px-0">
        {artisans.map((artisan) => (
          <Link
            key={artisan._id}
            href={`/artisan/${artisan.slug}`}
            className="flex-shrink-0 w-40 md:w-auto group"
          >
            <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              {/* Avatar or placeholder */}
              <div className="h-24 bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center relative">
                {typeof artisan.user === 'object' && artisan.user?.avatar ? (
                  <img
                    src={artisan.user.avatar}
                    alt={artisan.businessName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl text-white">
                    {artisan.trade === 'mechanic' ? '🔧' :
                     artisan.trade === 'electrician' ? '⚡' :
                     artisan.trade === 'plumber' ? '🔧' :
                     artisan.trade === 'ac-tech' ? '❄️' :
                     artisan.trade === 'generator-tech' ? '⚙️' :
                     artisan.trade === 'phone-repair' ? '📱' :
                     artisan.trade === 'tailor' ? '🧵' :
                     artisan.trade === 'carpenter' ? '🪚' :
                     artisan.trade === 'painter' ? '🎨' :
                     artisan.trade === 'welder' ? '🔥' : '🔧'}
                  </span>
                )}
                {artisan.verificationStatus === 'approved' && (
                  <span className="absolute top-1 right-1 bg-brand-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Verified
                  </span>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate group-hover:text-brand-green transition-colors">
                  {artisan.businessName}
                </h3>
                <p className="text-xs text-brand-gray truncate">{artisan.location}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-brand-star text-xs">{'★'.repeat(Math.round(artisan.averageRating))}</span>
                  <span className="text-xs text-brand-gray">
                    {formatRating(artisan.averageRating)}
                  </span>
                </div>
                {/* Top service tag */}
                {artisan.services && artisan.services.length > 0 && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] bg-gray-200 text-brand-gray rounded-full truncate max-w-full">
                    {artisan.services[0].label}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Server component version for static pages
export async function TopRatedSectionServer({
  trade,
  exclude,
  title,
  limit = 4,
  showViewAll = true,
  artisans,
}: TopRatedSectionProps & { artisans: ArtisanProfile[] }) {
  if (artisans.length === 0) {
    return null;
  }

  const sectionTitle = title || (trade ? `Top Rated ${getTradeLabel(trade)}s` : 'Top Rated Skilled Professionals');

  return (
    <div className="bg-white rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{sectionTitle}</h2>
        {showViewAll && (
          <Link
            href={trade ? `/search?trade=${trade}&sort=rating` : '/search?sort=rating'}
            className="text-brand-green hover:underline text-sm font-medium"
          >
            View All
          </Link>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0 -mx-2 px-2 md:mx-0 md:px-0">
        {artisans.map((artisan) => (
          <Link
            key={artisan._id}
            href={`/artisan/${artisan.slug}`}
            className="flex-shrink-0 w-40 md:w-auto group"
          >
            <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-24 bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center relative">
                {typeof artisan.user === 'object' && artisan.user?.avatar ? (
                  <img
                    src={artisan.user.avatar}
                    alt={artisan.businessName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl text-white">
                    {artisan.trade === 'mechanic' ? '🔧' :
                     artisan.trade === 'electrician' ? '⚡' :
                     artisan.trade === 'plumber' ? '🔧' :
                     artisan.trade === 'ac-tech' ? '❄️' :
                     artisan.trade === 'generator-tech' ? '⚙️' :
                     artisan.trade === 'phone-repair' ? '📱' :
                     artisan.trade === 'tailor' ? '🧵' :
                     artisan.trade === 'carpenter' ? '🪚' :
                     artisan.trade === 'painter' ? '🎨' :
                     artisan.trade === 'welder' ? '🔥' : '🔧'}
                  </span>
                )}
                {artisan.verificationStatus === 'approved' && (
                  <span className="absolute top-1 right-1 bg-brand-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Verified
                  </span>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate group-hover:text-brand-green transition-colors">
                  {artisan.businessName}
                </h3>
                <p className="text-xs text-brand-gray truncate">{artisan.location}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-brand-star text-xs">{'★'.repeat(Math.round(artisan.averageRating))}</span>
                  <span className="text-xs text-brand-gray">
                    {formatRating(artisan.averageRating)}
                  </span>
                </div>
                {artisan.services && artisan.services.length > 0 && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] bg-gray-200 text-brand-gray rounded-full truncate max-w-full">
                    {artisan.services[0].label}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
