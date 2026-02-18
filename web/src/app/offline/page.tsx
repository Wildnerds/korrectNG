export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-brand-light-gray flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">📶</div>
        <h1 className="text-3xl font-bold mb-4">You're Offline</h1>
        <p className="text-brand-gray mb-8">
          It looks like you've lost your internet connection. Some features may not be available until
          you're back online.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors font-semibold"
        >
          Try Again
        </button>
        <p className="text-sm text-brand-gray mt-6">
          Don't worry - your saved artisans and recent searches are still available.
        </p>
      </div>
    </div>
  );
}
