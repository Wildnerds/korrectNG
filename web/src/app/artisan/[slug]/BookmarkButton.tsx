'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { apiFetch, ApiError } from '@/lib/api';
import Cookies from 'js-cookie';

export default function BookmarkButton({ artisanId }: { artisanId: string }) {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.bookmarkedArtisans?.includes(artisanId)) {
      setBookmarked(true);
    }
  }, [user, artisanId]);

  const handleToggle = async () => {
    if (!user) {
      showToast('Please sign in to save artisans', 'warning');
      return;
    }
    setLoading(true);
    try {
      const token = Cookies.get('token');
      await apiFetch(`/artisans/${artisanId}/bookmark`, {
        method: 'POST',
        token,
      });
      setBookmarked(!bookmarked);
      showToast(bookmarked ? 'Artisan removed from saved' : 'Artisan saved!', 'success');
      // Refresh user data to update bookmarkedArtisans count
      refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        showToast('Please verify your email to save artisans', 'warning');
      } else {
        showToast('Something went wrong. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-3 rounded-md font-semibold transition-all duration-200 ${
        bookmarked
          ? 'bg-brand-orange text-white'
          : 'bg-white/20 text-white hover:bg-white/30'
      } ${loading ? 'opacity-50 cursor-wait' : ''}`}
      title={bookmarked ? 'Remove from saved' : 'Save artisan'}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Saving...
        </span>
      ) : bookmarked ? '★ Saved' : '☆ Save'}
    </button>
  );
}
