import Link from 'next/link';
import { getTradeLabel, formatRating } from '@korrectng/shared';
import type { ArtisanProfile } from '@korrectng/shared';

interface Props {
  artisan: ArtisanProfile;
}

export default function ArtisanCard({ artisan }: Props) {
  return (
    <Link href={`/artisan/${artisan.slug}`}>
      <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className="h-48 bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center">
          {artisan.user?.avatar ? (
            <img
              src={artisan.user.avatar}
              alt={artisan.businessName}
              className="w-full h-full object-cover"
            />
          ) : artisan.galleryImages?.[0] ? (
            <img
              src={artisan.galleryImages[0].url}
              alt={artisan.businessName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-5xl text-white">
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
        <div className="p-5">
          {artisan.verificationStatus === 'approved' && (
            <span className="inline-block bg-brand-green text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">
              VERIFIED
            </span>
          )}
          <h3 className="text-lg font-bold text-brand-black mb-1">{artisan.businessName}</h3>
          <p className="text-brand-gray text-sm mb-2">
            {getTradeLabel(artisan.trade)} - {artisan.location}
          </p>
          <div className="flex items-center gap-1 mb-3">
            <span className="text-brand-star">{'★'.repeat(Math.round(artisan.averageRating))}</span>
            <span className="text-sm text-brand-gray">
              {formatRating(artisan.averageRating)} ({artisan.totalReviews} reviews)
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-100 text-sm text-brand-gray">
            <span>{artisan.yearsOfExperience} years exp.</span>
            <span>{artisan.jobsCompleted}+ jobs</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
