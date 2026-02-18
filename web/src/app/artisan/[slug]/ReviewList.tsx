'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { apiFetch, ApiError } from '@/lib/api';
import { timeAgo, formatRating } from '@korrectng/shared';
import type { Review } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface Props {
  artisanId: string;
  initialReviews: Review[];
}

export default function ReviewList({ artisanId, initialReviews }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ rating: 5, title: '', text: '', jobType: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!user.isEmailVerified) {
      showToast('Please verify your email to leave reviews', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const token = Cookies.get('token');
      const res = await apiFetch<Review>('/reviews', {
        method: 'POST',
        body: JSON.stringify({ artisanId, ...form }),
        token,
      });
      if (res.data) {
        setReviews([res.data, ...reviews]);
        setShowForm(false);
        setForm({ rating: 5, title: '', text: '', jobType: '' });
        showToast('Review submitted successfully!', 'success');
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        showToast('Please verify your email to leave reviews', 'warning');
      } else {
        showToast(err.message || 'Failed to submit review', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canReview = user && user.role === 'customer';

  const handleDelete = async (reviewId: string) => {
    try {
      const token = Cookies.get('token');
      await apiFetch(`/reviews/${reviewId}`, {
        method: 'DELETE',
        token,
      });
      setReviews(reviews.filter((r) => r._id !== reviewId));
      showToast('Review deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete review', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div>
      {canReview && !showForm && (
        <div className="mb-6">
          {user?.isEmailVerified ? (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2.5 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
            >
              Write a Review
            </button>
          ) : (
            <div className="inline-flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-gray-600">Verify your email to leave reviews</span>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="font-bold text-lg mb-5">Write Your Review</h3>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, rating: n })}
                  className={`text-3xl transition-transform hover:scale-110 ${n <= form.rating ? 'text-brand-star' : 'text-gray-300 hover:text-gray-400'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">What service did you get?</label>
            <input
              type="text"
              value={form.jobType}
              onChange={(e) => setForm({ ...form, jobType: e.target.value })}
              placeholder="e.g., Car repair, AC installation"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
              required
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Review Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Summarize your experience in a few words"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Share details about your experience. What was great? What could be better?"
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all resize-none"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : 'Submit Review'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review._id} className="border-b border-gray-100 pb-6 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-brand-star">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </span>
                  <span className="ml-2 text-sm text-brand-gray">{review.jobType}</span>
                </div>
                <span className="text-sm text-brand-gray">{timeAgo(review.createdAt)}</span>
              </div>
              <h4 className="font-semibold mb-1">{review.title}</h4>
              <p className="text-brand-gray text-sm mb-2">{review.text}</p>
              <div className="flex justify-between items-center">
                <p className="text-xs text-brand-gray">
                  by {(review.customer as any)?.firstName || 'Customer'}
                </p>
                {user && ((review.customer as any)?._id === user._id || (review.customer as string) === user._id) && (
                  <div className="relative">
                    {showDeleteConfirm === review._id ? (
                      <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded-md">
                        <span className="text-xs text-red-700">Delete?</span>
                        <button
                          onClick={() => handleDelete(review._id)}
                          className="text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded hover:bg-gray-300 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(review._id)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
              {review.artisanResponse && (
                <div className="mt-3 pl-4 border-l-2 border-brand-green bg-green-50 p-3 rounded-r-md">
                  <p className="text-sm font-medium text-brand-green mb-1">Artisan Response:</p>
                  <p className="text-sm text-brand-gray">{review.artisanResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-brand-gray">No reviews yet. Be the first to review!</p>
      )}
    </div>
  );
}
