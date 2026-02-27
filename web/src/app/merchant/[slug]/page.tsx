'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getMerchantCategoryLabel, getMerchantCategoryIcon, formatRating, getProductUnitLabel, getWhatsAppLink } from '@korrectng/shared';

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  stockQuantity: number;
  brand?: string;
  images: { url: string; publicId: string }[];
  isActive: boolean;
}

interface Review {
  _id: string;
  customer: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  rating: number;
  text: string;
  createdAt: string;
}

interface Merchant {
  _id: string;
  businessName: string;
  slug: string;
  category: string;
  categories: string[];
  location: string;
  address: string;
  description: string;
  businessLogo?: string;
  whatsappNumber: string;
  phoneNumber: string;
  averageRating: number;
  totalReviews: number;
  ordersCompleted: number;
  trustLevel: string;
  trustScore: number;
  isVerified: boolean;
  deliveryAreas: string[];
  defaultDeliveryFee: number;
  freeDeliveryThreshold?: number;
  badges: { type: string; awardedAt: string }[];
}

export default function MerchantStorePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'reviews' | 'about'>('products');
  const [productCategory, setProductCategory] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch merchant profile
        const merchantRes = await apiFetch<Merchant>(`/merchants/${slug}`);
        if (!merchantRes.data) {
          return;
        }
        setMerchant(merchantRes.data);

        // Fetch products
        const productsRes = await apiFetch<{ data: Product[] }>(
          `/products?merchant=${merchantRes.data._id}&limit=50`
        );
        if (productsRes.data?.data) {
          setProducts(productsRes.data.data);
        }

        // Fetch reviews
        const reviewsRes = await apiFetch<{ data: Review[] }>(
          `/merchant-reviews/${merchantRes.data._id}?limit=10`
        );
        if (reviewsRes.data?.data) {
          setReviews(reviewsRes.data.data);
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-brand-green text-xl">Loading...</div>
      </div>
    );
  }

  if (!merchant) {
    notFound();
  }

  const filteredProducts = productCategory
    ? products.filter(p => p.category === productCategory)
    : products;

  const productCategories = Array.from(new Set(products.map(p => p.category)));

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${star <= rating ? 'text-brand-star' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-light-gray">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="w-24 h-24 bg-brand-light-gray rounded-xl flex items-center justify-center flex-shrink-0">
              {merchant.businessLogo ? (
                <img
                  src={merchant.businessLogo}
                  alt={merchant.businessName}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <span className="text-5xl">{getMerchantCategoryIcon(merchant.category)}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-1">{merchant.businessName}</h1>
                  <p className="text-brand-gray mb-2">
                    {getMerchantCategoryLabel(merchant.category)} - {merchant.location}
                  </p>
                </div>
                {merchant.isVerified && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                    Verified Merchant
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 mt-4">
                <div>
                  <div className="flex items-center gap-1">
                    {renderStars(merchant.averageRating)}
                    <span className="font-semibold ml-1">{formatRating(merchant.averageRating)}</span>
                  </div>
                  <p className="text-sm text-brand-gray">{merchant.totalReviews} reviews</p>
                </div>
                <div>
                  <p className="font-semibold">{merchant.ordersCompleted}+</p>
                  <p className="text-sm text-brand-gray">Orders Completed</p>
                </div>
                <div>
                  <p className="font-semibold capitalize">{merchant.trustLevel}</p>
                  <p className="text-sm text-brand-gray">Trust Level</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <a
                  href={getWhatsAppLink(merchant.whatsappNumber, `Hi, I found your store on KorrectNG Marketplace.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-green-500 text-white rounded-md font-medium hover:bg-green-600 transition-colors"
                >
                  WhatsApp
                </a>
                <a
                  href={`tel:${merchant.phoneNumber}`}
                  className="px-6 py-2 border-2 border-brand-green text-brand-green rounded-md font-medium hover:bg-brand-green hover:text-white transition-colors"
                >
                  Call
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'products'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-brand-gray hover:text-brand-green'
              }`}
            >
              Products ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'reviews'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-brand-gray hover:text-brand-green'
              }`}
            >
              Reviews ({merchant.totalReviews})
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'about'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-brand-gray hover:text-brand-green'
              }`}
            >
              About
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'products' && (
          <div>
            {/* Category Filter */}
            {productCategories.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setProductCategory('')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    !productCategory
                      ? 'bg-brand-green text-white'
                      : 'bg-white text-brand-gray hover:bg-gray-100'
                  }`}
                >
                  All Products
                </button>
                {productCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setProductCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize ${
                      productCategory === cat
                        ? 'bg-brand-green text-white'
                        : 'bg-white text-brand-gray hover:bg-gray-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl p-10 text-center">
                <div className="text-6xl mb-4">📦</div>
                <h2 className="text-xl font-bold mb-2">No Products Listed</h2>
                <p className="text-brand-gray">This merchant hasn't added any products yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <div key={product._id} className="bg-white rounded-xl overflow-hidden">
                    <div className="aspect-square bg-gray-100">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-sm truncate">{product.name}</h3>
                      {product.brand && (
                        <p className="text-xs text-brand-gray">{product.brand}</p>
                      )}
                      <p className="text-brand-green font-bold mt-1">
                        NGN{product.price.toLocaleString()}/{getProductUnitLabel(product.unit)}
                      </p>
                      <p className="text-xs text-brand-gray mt-1">
                        {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="bg-white rounded-xl p-10 text-center">
                <div className="text-6xl mb-4">★</div>
                <h2 className="text-xl font-bold mb-2">No Reviews Yet</h2>
                <p className="text-brand-gray">Be the first to review this merchant.</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review._id} className="bg-white rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-brand-green rounded-full flex items-center justify-center text-white font-bold">
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
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">
                            {review.customer.firstName} {review.customer.lastName}
                          </p>
                          {renderStars(review.rating)}
                        </div>
                        <p className="text-sm text-brand-gray">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="mt-2 text-brand-gray">{review.text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">About</h2>
              <p className="text-brand-gray">{merchant.description}</p>

              {merchant.categories.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Also sells:</p>
                  <div className="flex flex-wrap gap-2">
                    {merchant.categories.map((cat) => (
                      <span key={cat} className="px-3 py-1 bg-brand-light-gray rounded-full text-sm">
                        {getMerchantCategoryIcon(cat)} {getMerchantCategoryLabel(cat)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Delivery Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-brand-gray">Delivery Fee</p>
                  <p className="font-medium">
                    {merchant.defaultDeliveryFee > 0
                      ? `NGN${merchant.defaultDeliveryFee.toLocaleString()}`
                      : 'Free Delivery'}
                  </p>
                </div>
                {merchant.freeDeliveryThreshold && (
                  <div>
                    <p className="text-sm text-brand-gray">Free Delivery</p>
                    <p className="font-medium">
                      On orders above NGN{merchant.freeDeliveryThreshold.toLocaleString()}
                    </p>
                  </div>
                )}
                {merchant.deliveryAreas.length > 0 && (
                  <div>
                    <p className="text-sm text-brand-gray">Delivery Areas</p>
                    <p className="font-medium">{merchant.deliveryAreas.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Contact</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-brand-gray">Address</p>
                  <p className="font-medium">{merchant.address}</p>
                </div>
                <div>
                  <p className="text-sm text-brand-gray">Phone</p>
                  <p className="font-medium">{merchant.phoneNumber}</p>
                </div>
              </div>
            </div>

            {merchant.badges.length > 0 && (
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-lg font-bold mb-4">Badges</h2>
                <div className="flex flex-wrap gap-2">
                  {merchant.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium"
                    >
                      {badge.type.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
