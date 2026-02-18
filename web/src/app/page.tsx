import Link from 'next/link';
import { Suspense } from 'react';
import SearchBox from '@/components/SearchBox';
import ArtisanCard from '@/components/ArtisanCard';
import { serverFetch } from '@/lib/api';
import type { ArtisanProfile } from '@korrectng/shared';

export default async function HomePage() {
  let featuredArtisans: ArtisanProfile[] = [];
  try {
    const res = await serverFetch<ArtisanProfile[]>('/artisans/featured');
    featuredArtisans = res.data || [];
  } catch {
    // Will show empty state
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-green to-brand-green-dark text-white py-20 md:py-28 relative z-20 overflow-visible">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Find Verified Artisans You Can Trust
          </h1>
          <p className="text-lg md:text-xl mb-10 opacity-90 max-w-2xl mx-auto">
            Mechanics, Electricians, Plumbers, AC Technicians - All Verified. All Accountable.
          </p>
          <Suspense fallback={<div className="h-40 bg-white/10 rounded-2xl animate-pulse max-w-4xl mx-auto" />}>
            <SearchBox />
          </Suspense>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 sm:py-16 bg-brand-light-gray">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="bg-white rounded-xl p-5 sm:p-8 text-center">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">&#10003;</div>
              <h3 className="text-brand-green font-bold text-base sm:text-lg mb-2">500+ Verified Artisans</h3>
              <p className="text-brand-gray text-xs sm:text-sm">
                Every artisan verified with background checks and skills tests
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 sm:p-8 text-center">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">&#11088;</div>
              <h3 className="text-brand-green font-bold text-base sm:text-lg mb-2">4.8 Average Rating</h3>
              <p className="text-brand-gray text-xs sm:text-sm">
                Real reviews from real customers just like you
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 sm:p-8 text-center">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">&#128737;&#65039;</div>
              <h3 className="text-brand-green font-bold text-base sm:text-lg mb-2">30-Day Warranty</h3>
              <p className="text-brand-gray text-xs sm:text-sm">
                Every job comes with guaranteed warranty protection
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">How KorrectNG Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { num: 1, title: 'Search', desc: 'Enter what you need and your location to find verified artisans near you' },
              { num: 2, title: 'Compare', desc: 'Check ratings, reviews, and work history before choosing' },
              { num: 3, title: 'Connect', desc: 'Contact directly via WhatsApp or phone to discuss your job' },
              { num: 4, title: 'Protected', desc: 'Get 30-day warranty and leave a review after completion' },
            ].map((step) => (
              <div key={step.num} className="text-center px-4">
                <div className="w-16 h-16 bg-brand-green text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5">
                  {step.num}
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-brand-gray text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Artisans */}
      <section className="py-12 sm:py-20 bg-brand-light-gray">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-14">
            Featured Verified Artisans
          </h2>
          {featuredArtisans.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {featuredArtisans.map((artisan) => (
                <ArtisanCard key={artisan._id} artisan={artisan} />
              ))}
            </div>
          ) : (
            <p className="text-center text-brand-gray">
              Featured artisans will appear here once the backend is connected.
            </p>
          )}
          <div className="text-center mt-10">
            <Link
              href="/search"
              className="inline-block px-8 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
            >
              View All Artisans
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-green text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">Are You A Skilled Artisan?</h2>
          <p className="text-lg mb-8 opacity-90">
            Get verified on KorrectNG and get more customers who trust quality work
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register?role=artisan"
              className="px-8 py-3 bg-white text-brand-green rounded-md hover:bg-gray-100 transition-colors font-semibold"
            >
              Get Verified Today
            </Link>
            <Link
              href="/#how-it-works"
              className="px-8 py-3 border-2 border-white text-white rounded-md hover:bg-white hover:text-brand-green transition-colors font-semibold"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
