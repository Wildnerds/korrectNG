'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTradeLabel, formatRating } from '@korrectng/shared';
import type { ArtisanProfile } from '@korrectng/shared';
import { apiFetch } from '@/lib/api';

interface SimilarArtisansProps {
  trade: string;
  excludeId: string;
}

export default function SimilarArtisans({ trade, excludeId }: SimilarArtisansProps) {
  const [artisans, setArtisans] = useState<ArtisanProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSimilar() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('trade', trade);
        params.set('exclude', excludeId);
        params.set('limit', '3');

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

    fetchSimilar();
  }, [trade, excludeId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (artisans.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Similar Artisans</h3>
        <Link
          href={`/search?trade=${trade}&sort=rating`}
          className="text-brand-green hover:underline text-xs font-medium"
        >
          View All
        </Link>
      </div>
      <div className="space-y-3">
        {artisans.map((artisan) => (
          <Link
            key={artisan._id}
            href={`/artisan/${artisan.slug}`}
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center flex-shrink-0 overflow-hidden">
              {typeof artisan.user === 'object' && artisan.user?.avatar ? (
                <img
                  src={artisan.user.avatar}
                  alt={artisan.businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl text-white">
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
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate group-hover:text-brand-green transition-colors">
                {artisan.businessName}
              </h4>
              <div className="flex items-center gap-2 text-xs text-brand-gray">
                <span>{artisan.location}</span>
                <span className="text-brand-star">{'★'.repeat(Math.round(artisan.averageRating))}</span>
                <span>{formatRating(artisan.averageRating)}</span>
              </div>
              {/* Top service */}
              {artisan.services && artisan.services.length > 0 && (
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] bg-gray-100 text-brand-gray rounded-full">
                  {artisan.services[0].label}
                </span>
              )}
            </div>
            {/* Verified badge */}
            {artisan.verificationStatus === 'approved' && (
              <span className="bg-brand-green/10 text-brand-green text-[10px] font-bold px-2 py-1 rounded flex-shrink-0">
                Verified
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
