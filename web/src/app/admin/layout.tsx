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
          <nav className="space-y-2">
            <Link
              href="/admin"
              className="block px-4 py-2 rounded-md hover:bg-brand-light-gray transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/verifications"
              className="block px-4 py-2 rounded-md hover:bg-brand-light-gray transition-colors font-medium"
            >
              Verifications
            </Link>
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
