'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { formatRating, timeAgo } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface Review {
  _id: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  order: {
    _id: string;
    orderNumber: string;
  };
  rating: number;
  title?: string;
  text: string;
  productQualityRating: number;
  deliveryRating: number;
  merchantResponse?: string;
  merchantRespondedAt?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function MerchantReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [currentPage]);

  async function fetchReviews() {
    const token = Cookies.get('token');
    try {
      const res = await apiFetch<{ data: Review[]; pagination: Pagination }>(
        `/merchant-reviews/my-reviews/list?page=${currentPage}&limit=10`,
        { token }
      );
      if (res.data) {
        setReviews(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  const handleRespond = async (reviewId: string) => {
    if (!responseText.trim()) return;

    const token = Cookies.get('token');
    try {
      await apiFetch(`/merchant-reviews/${reviewId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response: responseText }),
        token,
      });
      setRespondingTo(null);
      setResponseText('');
      fetchReviews();
    } catch {
      // Handle error
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${star <= rating ? 'text-brand-star' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-brand-green text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Customer Reviews</h1>
          <p className="text-brand-gray">
            {pagination?.total || 0} reviews from your customers
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center">
            <div className="text-6xl mb-4">★</div>
            <h2 className="text-xl font-bold mb-2">No Reviews Yet</h2>
            <p className="text-brand-gray">
              Reviews will appear here once customers rate their orders.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review._id} className="bg-white rounded-xl p-6">
                <div className="flex items-start gap-4">
                  {/* Customer Avatar */}
                  <div className="w-12 h-12 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {review.customer.avatar ? (
                      <img
                        src={review.customer.avatar}
                        alt={review.customer.firstName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      review.customer.firstName[0]
                    )}
                  </div>

                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">
                          {review.customer.firstName} {review.customer.lastName}
                        </p>
                        <p className="text-xs text-brand-gray">
                          Order {review.order.orderNumber} - {timeAgo(review.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        {renderStars(review.rating)}
                        <p className="text-sm font-bold">{formatRating(review.rating)}</p>
                      </div>
                    </div>

                    {/* Sub-ratings */}
                    <div className="flex gap-6 mb-3 text-sm">
                      <div>
                        <span className="text-brand-gray">Product Quality: </span>
                        <span className="font-medium">{formatRating(review.productQualityRating)}</span>
                      </div>
                      <div>
                        <span className="text-brand-gray">Delivery: </span>
                        <span className="font-medium">{formatRating(review.deliveryRating)}</span>
                      </div>
                    </div>

                    {/* Review Content */}
                    {review.title && (
                      <h3 className="font-semibold mb-1">{review.title}</h3>
                    )}
                    <p className="text-brand-gray">{review.text}</p>

                    {/* Merchant Response */}
                    {review.merchantResponse ? (
                      <div className="mt-4 bg-brand-light-gray rounded-lg p-4">
                        <p className="text-sm font-medium mb-1">Your Response</p>
                        <p className="text-sm text-brand-gray">{review.merchantResponse}</p>
                        <p className="text-xs text-brand-gray mt-2">
                          Responded {review.merchantRespondedAt ? timeAgo(review.merchantRespondedAt) : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4">
                        {respondingTo === review._id ? (
                          <div className="space-y-2">
                            <textarea
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder="Write your response..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRespond(review._id)}
                                className="px-4 py-2 bg-brand-green text-white rounded-md text-sm font-medium hover:bg-brand-green-dark transition-colors"
                              >
                                Submit Response
                              </button>
                              <button
                                onClick={() => {
                                  setRespondingTo(null);
                                  setResponseText('');
                                }}
                                className="px-4 py-2 bg-gray-100 text-brand-gray rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRespondingTo(review._id)}
                            className="text-brand-green text-sm font-medium hover:underline"
                          >
                            Respond to this review
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {currentPage} of {pagination.pages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
              disabled={currentPage === pagination.pages}
              className="px-4 py-2 bg-white rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
