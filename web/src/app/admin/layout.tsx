'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-brand-green text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen p-4">
          <nav className="space-y-1">
            <Link
              href="/admin"
              className="block px-4 py-2 rounded-md hover:bg-brand-light-gray transition-colors font-medium"
            >
              Dashboard
            </Link>

            <div className="pt-3 pb-1">
              <p className="px-4 text-xs font-semibold text-brand-gray uppercase tracking-wider">Artisans</p>
            </div>
            <Link
              href="/admin/verifications"
              className="block px-4 py-2 rounded-md hover:bg-brand-light-gray transition-colors font-medium"
            >
              Artisan Verifications
            </Link>

            <div className="pt-3 pb-1">
              <p className="px-4 text-xs font-semibold text-brand-gray uppercase tracking-wider">Merchants</p>
            </div>
            <Link
              href="/admin/merchants"
              className="block px-4 py-2 rounded-md hover:bg-brand-light-gray transition-colors font-medium"
            >
              All Merchants
            </Link>
            <Link
              href="/admin/merchant-verifications"
              className="block px-4 py-2 rounded-md hover:bg-brand-light-gray transition-colors font-medium"
            >
              Merchant Verifications
            </Link>
            <Link
              href="/admin/products"
              className="block px-4 py-2 rounded-md hover:bg-brand-light-gray transition-colors font-medium"
            >
              Product Approvals
            </Link>
            <Link
              href="/admin/material-orders"
              className="block px-4 py-2 rounded-md hover:bg-brand-light-gray transition-colors font-medium"
            >
              Material Orders
            </Link>

            <div className="pt-3 pb-1">
              <p className="px-4 text-xs font-semibold text-brand-gray uppercase tracking-wider">General</p>
            </div>
            <Link
              href="/admin/warranty"
              className="block px-4 py-2 rounded-md hover:bg-brand-light-gray transition-colors font-medium"
            >
              Warranty Claims
            </Link>
            <Link
              href="/admin/users"
              className="block px-4 py-2 rounded-md hover:bg-brand-light-gray transition-colors font-medium"
            >
              Users
            </Link>
            <Link
              href="/admin/analytics"
              className="block px-4 py-2 rounded-md hover:bg-brand-light-gray transition-colors font-medium"
            >
              Analytics
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
