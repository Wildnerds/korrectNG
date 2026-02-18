'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    async function verifyEmail() {
      try {
        await apiFetch('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to verify email. The link may have expired.');
      }
    }

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light-gray py-12 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="text-5xl mb-4 animate-pulse">⏳</div>
            <h1 className="text-2xl font-bold text-brand-green mb-2">Verifying Your Email</h1>
            <p className="text-brand-gray">Please wait while we verify your email address...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-brand-green mb-2">Email Verified!</h1>
            <p className="text-brand-gray mb-6">{message}</p>
            <Link
              href="/auth/login"
              className="inline-block px-6 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
            >
              Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Verification Failed</h1>
            <p className="text-brand-gray mb-6">{message}</p>
            <div className="space-y-3">
              <Link
                href="/auth/login"
                className="block px-6 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
              >
                Sign In
              </Link>
              <p className="text-sm text-brand-gray">
                Need a new verification link?{' '}
                <Link href="/dashboard" className="text-brand-green hover:underline">
                  Sign in and request one
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
