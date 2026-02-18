import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/api';
import {
  getTradeLabel,
  formatRating,
  getWhatsAppLink,
  getPhoneLink,
  BRAND,
} from '@korrectng/shared';
import type { ArtisanProfile, Review, PaginatedResponse } from '@korrectng/shared';
import ReviewList from './ReviewList';
import BookmarkButton from './BookmarkButton';
import WarrantyClaimButton from './WarrantyClaimButton';
import ShareButton from './ShareButton';
import ContactButtons, { ContactButtonsHeader } from './ContactButtons';
import GallerySection from './GallerySection';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const res = await serverFetch<ArtisanProfile>(`/artisans/${params.slug}`);
    const artisan = res.data;
    if (!artisan) return { title: 'Artisan Not Found' };

    return {
      title: `${artisan.businessName} - ${getTradeLabel(artisan.trade)} in ${artisan.location}`,
      description: artisan.description,
      openGraph: {
        title: `${artisan.businessName} - Verified ${getTradeLabel(artisan.trade)}`,
        description: artisan.description,
        type: 'profile',
      },
    };
  } catch {
    return { title: 'Artisan Not Found' };
  }
}

export default async function ArtisanProfilePage({ params }: Props) {
  let artisan: ArtisanProfile | null = null;
  let reviews: Review[] = [];

  try {
    const res = await serverFetch<ArtisanProfile>(`/artisans/${params.slug}`);
    artisan = res.data || null;
  } catch {
    notFound();
  }

  if (!artisan) notFound();

  try {
    const reviewRes = await serverFetch<PaginatedResponse<Review>>(
      `/reviews/artisan/${artisan._id}?limit=10`
    );
    reviews = reviewRes.data?.data || [];
  } catch {
    // Show empty reviews
  }

  const whatsappLink = getWhatsAppLink(
    artisan.whatsappNumber,
    `Hi, I found you on KorrectNG. I need a ${getTradeLabel(artisan.trade)}.`
  );
  const phoneLink = getPhoneLink(artisan.phoneNumber);

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: artisan.businessName,
    description: artisan.description,
    telephone: artisan.phoneNumber,
    address: {
      '@type': 'PostalAddress',
      addressLocality: artisan.location,
      addressCountry: 'NG',
    },
    aggregateRating: artisan.totalReviews > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: artisan.averageRating,
          reviewCount: artisan.totalReviews,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    url: `${BRAND.name}/${artisan.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-brand-light-gray">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-green to-brand-green-dark text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                {artisan.verificationStatus === 'approved' && (
                  <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    VERIFIED
                  </span>
                )}
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{artisan.businessName}</h1>
                <p className="text-lg opacity-90">
                  {getTradeLabel(artisan.trade)} - {artisan.location}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-brand-star text-lg">
                    {'★'.repeat(Math.round(artisan.averageRating))}
                  </span>
                  <span>
                    {formatRating(artisan.averageRating)} ({artisan.totalReviews} reviews)
                  </span>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <ContactButtonsHeader whatsappLink={whatsappLink} phoneLink={phoneLink} />
                <BookmarkButton artisanId={artisan._id} />
                <ShareButton artisanName={artisan.businessName} slug={artisan.slug} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">About</h2>
                <p className="text-brand-gray leading-relaxed">{artisan.description}</p>
              </div>

              {/* Gallery */}
              {artisan.galleryImages.length > 0 && (
                <GallerySection images={artisan.galleryImages} />
              )}

              {/* Reviews */}
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">
                  Reviews ({artisan.totalReviews})
                </h2>
                <ReviewList artisanId={artisan._id} initialReviews={reviews} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6">
                <h3 className="font-bold mb-4">Details</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-brand-gray">Trade</dt>
                    <dd className="font-medium">{getTradeLabel(artisan.trade)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-brand-gray">Location</dt>
                    <dd className="font-medium">{artisan.location}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-brand-gray">Experience</dt>
                    <dd className="font-medium">{artisan.yearsOfExperience} years</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-brand-gray">Jobs Completed</dt>
                    <dd className="font-medium">{artisan.jobsCompleted}+</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-brand-gray">Working Hours</dt>
                    <dd className="font-medium">{artisan.workingHours}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white rounded-xl p-6">
                <h3 className="font-bold mb-4">Contact</h3>
                <ContactButtons
                  whatsappLink={whatsappLink}
                  phoneLink={phoneLink}
                  phoneNumber={artisan.phoneNumber}
                />
                <WarrantyClaimButton artisanId={artisan._id} artisanName={artisan.businessName} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
