'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import { useAuth } from '@/context/AuthContext';
import { PasswordInput } from '@/components/PasswordInput';

// Dynamically import GoogleSignInButton to avoid SSR issues
const GoogleSignInButton = dynamic(
  () => import('@/components/GoogleSignInButton').then(mod => mod.GoogleSignInButton),
  { ssr: false, loading: () => <div className="h-10 bg-gray-100 rounded animate-pulse" /> }
);

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const refParam = searchParams.get('ref');
  const initialRole = roleParam === 'artisan' ? 'artisan' : roleParam === 'merchant' ? 'merchant' : 'customer';
  const { register, refreshUser } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
    role: initialRole as 'customer' | 'artisan' | 'merchant',
    referralCode: refParam || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  // Validate referral code on mount if present
  useEffect(() => {
    if (refParam && form.role === 'merchant') {
      validateReferralCode(refParam);
    }
  }, [refParam]);

  const validateReferralCode = async (code: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/referrals/validate/${code}`);
      const data = await res.json();
      if (data.success && data.data?.referrerName) {
        setReferrerName(data.data.referrerName);
        // Save to localStorage for merchant verification
        localStorage.setItem('merchantReferralCode', code.toUpperCase());
      }
    } catch {
      // Invalid code, ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ email: form.email, password: form.password, role: form.role });
      // Save referral code for merchants
      if (form.role === 'merchant' && form.referralCode) {
        localStorage.setItem('merchantReferralCode', form.referralCode.toUpperCase());
      }
      if (form.role === 'artisan') {
        router.push('/dashboard/artisan/verification');
      } else if (form.role === 'merchant') {
        router.push('/dashboard/merchant/verification');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light-gray py-12 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-brand-green mb-6 text-center">
          {form.role === 'artisan' ? 'Get Verified as an Artisan' : form.role === 'merchant' ? 'Sell on KorrectNG Marketplace' : 'Create Customer Account'}
        </h1>

        {/* Role switcher */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setForm({ ...form, role: 'customer' })}
            className={`flex-1 py-2 min-h-[44px] rounded-md font-medium transition-colors text-sm ${
              form.role === 'customer'
                ? 'bg-brand-green text-white'
                : 'bg-gray-100 text-brand-gray hover:bg-gray-200'
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, role: 'artisan' })}
            className={`flex-1 py-2 min-h-[44px] rounded-md font-medium transition-colors text-sm ${
              form.role === 'artisan'
                ? 'bg-brand-green text-white'
                : 'bg-gray-100 text-brand-gray hover:bg-gray-200'
            }`}
          >
            Artisan
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, role: 'merchant' })}
            className={`flex-1 py-2 min-h-[44px] rounded-md font-medium transition-colors text-sm ${
              form.role === 'merchant'
                ? 'bg-brand-green text-white'
                : 'bg-gray-100 text-brand-gray hover:bg-gray-200'
            }`}
          >
            Merchant
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Google Sign-up */}
        <GoogleSignInButton
          onSuccess={(user, token) => {
            Cookies.set('token', token, { expires: 30, path: '/' });
            refreshUser();
            if (form.role === 'artisan') {
              router.push('/dashboard/artisan/verification');
            } else if (form.role === 'merchant') {
              router.push('/dashboard/merchant/verification');
            } else {
              router.push('/');
            }
          }}
          onError={(errorMsg) => setError(errorMsg)}
          role={form.role}
          text="signup_with"
        />

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">or sign up with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <PasswordInput
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              required
            />
          </div>
          {form.role === 'merchant' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Referral Code <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.referralCode}
                onChange={(e) => {
                  setForm({ ...form, referralCode: e.target.value.toUpperCase() });
                  if (e.target.value.length >= 5) {
                    validateReferralCode(e.target.value);
                  } else {
                    setReferrerName(null);
                  }
                }}
                placeholder="e.g., JOH1A2B3"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green uppercase"
                maxLength={10}
              />
              {referrerName && (
                <p className="text-sm text-brand-green mt-1">
                  Referred by: {referrerName}
                </p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
          >
            {loading ? 'Creating account...' : form.role === 'artisan' ? 'Start Verification' : form.role === 'merchant' ? 'Start Selling' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-brand-gray">
            {form.role === 'merchant' ? "You'll verify your business before listing products" : "You'll complete your profile before making your first booking"}
          </p>
        </form>

        {form.role === 'artisan' && (
          <p className="text-center mt-4 text-sm text-brand-gray">
            Free to join • 10% commission on completed jobs only
          </p>
        )}

        {form.role === 'merchant' && (
          <p className="text-center mt-4 text-sm text-brand-gray">
            Free to join • 5% commission on orders only • No subscription fees
          </p>
        )}

        <p className="text-center mt-6 text-brand-gray">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-green font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-brand-light-gray py-12 px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
