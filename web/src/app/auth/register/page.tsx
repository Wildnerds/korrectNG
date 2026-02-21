'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { TRADES } from '@korrectng/shared';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'artisan' ? 'artisan' : 'customer';
  const { register } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                required
              />
            </div>
          </div>
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
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g., 08012345678"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
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
        </form>

        {form.role === 'artisan' && (
          <p className="text-center mt-4 text-sm text-brand-gray">
            Verification fee: ₦10,000 (one-time) + ₦5,000/month subscription
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
