'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const dashboardLink =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'artisan'
        ? '/dashboard/artisan'
        : '/dashboard/customer';

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-brand-green">Korrect</span>
            <span className="text-brand-orange">NG</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/#how-it-works" className="text-brand-black hover:text-brand-green font-medium">
              How It Works
            </Link>
            <Link href="/search" className="text-brand-black hover:text-brand-green font-medium">
              Find Artisans
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <span className="text-brand-gray">
                  Hi, <span className="font-medium text-brand-black">{user.firstName}</span>
                </span>
                <Link
                  href={dashboardLink}
                  className="text-brand-black hover:text-brand-green font-medium"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 border-2 border-brand-green text-brand-green rounded-md hover:bg-brand-green hover:text-white transition-colors font-semibold"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 border-2 border-brand-green text-brand-green rounded-md hover:bg-brand-green hover:text-white transition-colors font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register?role=artisan"
                  className="px-6 py-2 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
                >
                  Get Verified
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-3 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t">
            <div className="flex flex-col gap-2 pt-4">
              <Link href="/search" className="px-4 py-3 text-brand-black hover:text-brand-green hover:bg-gray-50 font-medium min-h-[44px] flex items-center">
                Find Artisans
              </Link>
              {user ? (
                <>
                  <span className="px-4 py-3 text-brand-gray min-h-[44px] flex items-center">
                    Hi, <span className="font-medium text-brand-black ml-1">{user.firstName}</span>
                  </span>
                  <Link href={dashboardLink} className="px-4 py-3 text-brand-black hover:text-brand-green hover:bg-gray-50 font-medium min-h-[44px] flex items-center">
                    Dashboard
                  </Link>
                  <button
                    onClick={logout}
                    className="mx-4 mt-2 px-4 py-3 border-2 border-brand-green text-brand-green rounded-md font-semibold min-h-[44px]"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="mx-4 mt-2 px-4 py-3 border-2 border-brand-green text-brand-green rounded-md text-center font-semibold min-h-[44px] flex items-center justify-center">
                    Sign In
                  </Link>
                  <Link href="/auth/register?role=artisan" className="mx-4 px-4 py-3 bg-brand-green text-white rounded-md text-center font-semibold min-h-[44px] flex items-center justify-center">
                    Get Verified
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
