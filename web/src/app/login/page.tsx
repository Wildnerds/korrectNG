'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { PasswordInput } from '@/components/PasswordInput';
import Cookies from 'js-cookie';

// Dynamically import GoogleSignInButton to avoid SSR issues
const GoogleSignInButton = dynamic(
  () => import('@/components/GoogleSignInButton').then(mod => mod.GoogleSignInButton),
  { ssr: false, loading: () => <div className="h-10 bg-gray-100 rounded animate-pulse" /> }
);

export default function LoginPage() {
  const router = useRouter();
  const { login, refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'customer' | 'artisan' | 'merchant'>('customer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light-gray py-12 px-4">
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 w-full max-w-md overflow-hidden">
        <h1 className="text-2xl font-bold text-brand-green mb-6 text-center">
          Sign In to KorrectNG
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Role selector for new Google users */}
        {showRoleSelector && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-3 font-medium">
              First time signing in with Google? Select your account type:
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('customer')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedRole === 'customer'
                    ? 'bg-brand-green text-white'
                    : 'bg-white text-brand-gray hover:bg-gray-100 border'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('artisan')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedRole === 'artisan'
                    ? 'bg-brand-green text-white'
                    : 'bg-white text-brand-gray hover:bg-gray-100 border'
                }`}
              >
                Artisan
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('merchant')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedRole === 'merchant'
                    ? 'bg-brand-green text-white'
                    : 'bg-white text-brand-gray hover:bg-gray-100 border'
                }`}
              >
                Merchant
              </button>
            </div>
          </div>
        )}

        {/* Google Sign-in */}
        <GoogleSignInButton
          onSuccess={(user, token) => {
            Cookies.set('token', token, { expires: 30, path: '/' });
            refreshUser();
            // Redirect based on role
            if (user.role === 'artisan') {
              router.push('/dashboard/artisan');
            } else if (user.role === 'merchant') {
              router.push('/dashboard/merchant');
            } else {
              router.push('/');
            }
          }}
          onError={(errorMsg) => setError(errorMsg)}
          role={selectedRole}
          text="signin_with"
        />

        {/* Toggle for first-time users */}
        {!showRoleSelector && (
          <button
            type="button"
            onClick={() => setShowRoleSelector(true)}
            className="w-full mt-2 text-sm text-brand-green hover:underline"
          >
            First time with Google? Click here to choose account type
          </button>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </div>
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-brand-green hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-6 text-brand-gray">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-brand-green font-medium hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
