interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
    />
  );
}

export function ArtisanCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow">
      <Skeleton className="h-32 rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function ArtisanProfileSkeleton() {
  return (
    <div className="min-h-screen bg-brand-light-gray">
      {/* Header skeleton */}
      <div className="bg-brand-green py-12">
        <div className="max-w-7xl mx-auto px-4">
          <Skeleton className="h-6 w-24 bg-white/20 mb-3" />
          <Skeleton className="h-10 w-64 bg-white/20 mb-2" />
          <Skeleton className="h-5 w-48 bg-white/20 mb-2" />
          <Skeleton className="h-5 w-32 bg-white/20" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* About skeleton */}
            <div className="bg-white rounded-xl p-6">
              <Skeleton className="h-6 w-24 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Reviews skeleton */}
            <div className="bg-white rounded-xl p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-b pb-4 mb-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6">
              <Skeleton className="h-6 w-20 mb-4" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between py-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ArtisanCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-12 w-full mb-3" />
        <Skeleton className="h-12 w-full mb-3" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
