'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useAuth } from '@/context/AuthContext';
import { PasswordInput } from '@/components/PasswordInput';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'artisan' ? 'artisan' : 'customer';
  const { register, refreshUser } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
    role: initialRole as 'customer' | 'artisan',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      if (form.role === 'artisan') {
        router.push('/dashboard/artisan/verification');
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
          {form.role === 'artisan' ? 'Get Verified as an Artisan' : 'Create Customer Account'}
        </h1>

        {/* Role switcher */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setForm({ ...form, role: 'customer' })}
            className={`flex-1 py-3 min-h-[44px] rounded-md font-medium transition-colors ${
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
            className={`flex-1 py-3 min-h-[44px] rounded-md font-medium transition-colors ${
              form.role === 'artisan'
                ? 'bg-brand-green text-white'
                : 'bg-gray-100 text-brand-gray hover:bg-gray-200'
            }`}
          >
            Artisan
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
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
          >
            {loading ? 'Creating account...' : form.role === 'artisan' ? 'Start Verification' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-brand-gray">
            You'll complete your profile before making your first booking
          </p>
        </form>

        {form.role === 'artisan' && (
          <p className="text-center mt-4 text-sm text-brand-gray">
            Free to join • 10% commission on completed jobs only
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
