import { Suspense } from 'react';
import VerifyEmailClient from './VerifyEmailClient';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-brand-light-gray py-12 px-4">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 w-full max-w-md overflow-hidden text-center">
          <div className="text-5xl mb-4 animate-pulse">⏳</div>
          <h1 className="text-2xl font-bold text-brand-green mb-2">Loading...</h1>
        </div>
      </div>
    }>
      <VerifyEmailClient />
    </Suspense>
  );
}
