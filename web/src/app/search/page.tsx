import type { Metadata } from 'next';
import { Suspense } from 'react';
import { serverFetch } from '@/lib/api';
import { getTradeLabel, ARTISAN_SORT_OPTIONS } from '@korrectng/shared';
import type { ArtisanProfile, PaginatedResponse } from '@korrectng/shared';
import ArtisanCard from '@/components/ArtisanCard';
import SearchBox from '@/components/SearchBox';
import Link from 'next/link';

interface Props {
  searchParams: { trade?: string; location?: string; sort?: string; page?: string; q?: string };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const trade = searchParams.trade ? getTradeLabel(searchParams.trade) : '';
  const location = searchParams.location || '';
  const title = trade
    ? `${trade}${location ? ` in ${location}` : ''} - KorrectNG`
    : 'Find Verified Artisans - KorrectNG';
  return {
    title,
    description: `Find verified ${trade || 'artisans'}${location ? ` in ${location}` : ''} on KorrectNG. Trusted professionals with reviews and warranty protection.`,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { trade, location, sort, page, q } = searchParams;
  const currentPage = parseInt(page || '1');

  const params = new URLSearchParams();
  if (trade) params.set('trade', trade);
  if (location) params.set('location', location);
  if (sort) params.set('sort', sort);
  if (q) params.set('q', q);
  params.set('page', currentPage.toString());
  params.set('limit', '12');

  let artisans: ArtisanProfile[] = [];
  let pagination = { page: 1, limit: 12, total: 0, pages: 0 };

  try {
    const res = await serverFetch<PaginatedResponse<ArtisanProfile>>(
      `/artisans?${params.toString()}`
    );
    if (res.data) {
      artisans = res.data.data;
      pagination = res.data.pagination;
    }
  } catch {
    // Show empty state
  }

  function buildPageLink(p: number) {
    const ps = new URLSearchParams();
    if (trade) ps.set('trade', trade);
    if (location) ps.set('location', location);
    if (sort) ps.set('sort', sort);
    if (q) ps.set('q', q);
    ps.set('page', p.toString());
    return `/search?${ps.toString()}`;
  }

  function buildSortLink(s: string) {
    const ps = new URLSearchParams();
    if (trade) ps.set('trade', trade);
    if (location) ps.set('location', location);
    if (q) ps.set('q', q);
    ps.set('sort', s);
    return `/search?${ps.toString()}`;
  }

  return (
    <div className="min-h-screen bg-brand-light-gray">
      <div className="bg-gradient-to-r from-brand-green to-brand-green-dark py-8 relative z-20 overflow-visible">
        <div className="max-w-7xl mx-auto px-4">
          <Suspense fallback={<div className="h-24 bg-white/10 rounded-xl animate-pulse" />}>
            <SearchBox initialTrade={trade} initialLocation={location} variant="compact" />
          </Suspense>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Results header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">
            {trade ? getTradeLabel(trade) : 'All Artisans'}
            {location ? ` in ${location}` : ''}
            <span className="text-brand-gray text-base font-normal ml-2">
              ({pagination.total} results)
            </span>
          </h1>
          <div className="flex gap-2">
            {ARTISAN_SORT_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={buildSortLink(opt.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  sort === opt.value
                    ? 'bg-brand-green text-white'
                    : 'bg-white text-brand-gray hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Results grid */}
        {artisans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artisans.map((artisan) => (
              <ArtisanCard key={artisan._id} artisan={artisan} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-brand-gray mb-4">No artisans found</p>
            <p className="text-brand-gray mb-6">Try adjusting your search filters</p>
            <Link
              href="/search"
              className="inline-block px-6 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
            >
              Clear Filters
            </Link>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {currentPage > 1 && (
              <Link
                href={buildPageLink(currentPage - 1)}
                className="px-4 py-2 bg-white rounded-md text-brand-gray hover:bg-gray-100"
              >
                Previous
              </Link>
            )}
            {Array.from({ length: pagination.pages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === pagination.pages)
              .map((p, i, arr) => (
                <span key={p}>
                  {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2 text-brand-gray">...</span>}
                  <Link
                    href={buildPageLink(p)}
                    className={`px-4 py-2 rounded-md ${
                      p === currentPage
                        ? 'bg-brand-green text-white'
                        : 'bg-white text-brand-gray hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </Link>
                </span>
              ))}
            {currentPage < pagination.pages && (
              <Link
                href={buildPageLink(currentPage + 1)}
                className="px-4 py-2 bg-white rounded-md text-brand-gray hover:bg-gray-100"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
