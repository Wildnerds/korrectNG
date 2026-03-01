'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { MERCHANT_CATEGORIES, LOCATIONS, getMerchantCategoryLabel, getProductUnitLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface CartItem {
  product: Product;
  quantity: number;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  stockQuantity: number;
  images: { url: string; publicId: string }[];
  merchant: {
    _id: string;
    businessName: string;
    slug: string;
    location: string;
    averageRating: number;
    isVerified: boolean;
  };
}

interface Merchant {
  _id: string;
  businessName: string;
  slug: string;
  location: string;
  businessLogo?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

type ViewMode = 'products' | 'merchants';

// Helper to safely parse materials from URL
function parseMaterials(param: string | null): string[] {
  if (!param) return [];
  try {
    const decoded = decodeURIComponent(param);
    const parsed = JSON.parse(decoded);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ShopPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  // Booking context from URL (optional - shop works without it)
  const bookingId = searchParams.get('bookingId');
  const materialsParam = searchParams.get('materials');
  const materialNames = useMemo(() => parseMaterials(materialsParam), [materialsParam]);

  const [viewMode, setViewMode] = useState<ViewMode>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Cart for material orders
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'artisan_location' | 'customer_address'>('artisan_location');
  const [customerAddress, setCustomerAddress] = useState('');

  // Add to cart function
  const addToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product._id === product._id);
      if (existing) {
        return prev.map(item =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setSelectedProduct(null);
    setOrderQuantity(1);
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product._id !== productId));
  };

  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Group cart by merchant
  const cartByMerchant = cart.reduce((acc, item) => {
    const merchantId = item.product.merchant._id;
    if (!acc[merchantId]) {
      acc[merchantId] = {
        merchant: item.product.merchant,
        items: [],
        total: 0,
      };
    }
    acc[merchantId].items.push(item);
    acc[merchantId].total += item.product.price * item.quantity;
    return acc;
  }, {} as Record<string, { merchant: Product['merchant']; items: CartItem[]; total: number }>);

  // Create material order for a merchant
  const createOrder = async (merchantId: string) => {
    if (!bookingId) {
      showToast('This feature requires a linked booking. Please start from your booking page.', 'error');
      return;
    }

    const token = Cookies.get('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const merchantCart = cartByMerchant[merchantId];
    if (!merchantCart) return;

    setCreatingOrder(true);
    try {
      // Get merchant profile ID
      const merchantRes = await apiFetch<{ _id: string }>(`/merchants/${merchantCart.merchant.slug}`, { token });
      if (!merchantRes.data) throw new Error('Merchant not found');

      const orderData = {
        merchant: merchantRes.data._id,
        items: merchantCart.items.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
        })),
        booking: bookingId,
        deliveryType,
        deliveryAddress: deliveryType === 'customer_address' ? customerAddress : undefined,
      };

      const res = await apiFetch('/material-orders', {
        method: 'POST',
        token,
        body: JSON.stringify(orderData),
      });

      if (res.data) {
        // Remove ordered items from cart
        setCart(prev => prev.filter(item => item.product.merchant._id !== merchantId));
        showToast('Order created! The artisan will verify your selection.', 'success');
        router.push(`/dashboard/customer/material-orders/${(res.data as any)._id}`);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to create order', 'error');
    } finally {
      setCreatingOrder(false);
    }
  };

  // Track if initial search has been set
  const [initialSearchSet, setInitialSearchSet] = useState(false);

  // Pre-fill search with first material name when coming from booking
  useEffect(() => {
    if (materialNames.length > 0 && !initialSearchSet) {
      setSearchQuery(materialNames[0]);
      setInitialSearchSet(true);
    }
  }, [materialNames, initialSearchSet]);

  // Fetch data when filters change
  useEffect(() => {
    if (viewMode === 'products') {
      fetchProducts();
    } else {
      fetchMerchants();
    }
  }, [currentPage, categoryFilter, locationFilter, sortBy, viewMode]);

  // Debounced search - only fetch when user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewMode === 'products') {
        fetchProducts();
      } else {
        fetchMerchants();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(categoryFilter && { category: categoryFilter }),
        ...(locationFilter && { location: locationFilter }),
        ...(searchQuery && { q: searchQuery }),
        ...(sortBy && { sort: sortBy }),
      });

      const res = await apiFetch<{ data: Product[]; pagination: Pagination }>(
        `/products?${params}`
      );

      if (res.data) {
        setProducts(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  async function fetchMerchants() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(categoryFilter && { category: categoryFilter }),
        ...(locationFilter && { location: locationFilter }),
        ...(searchQuery && { q: searchQuery }),
      });

      const res = await apiFetch<{ data: Merchant[]; pagination: Pagination }>(
        `/merchants?${params}`
      );

      if (res.data) {
        setMerchants(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    if (viewMode === 'products') {
      fetchProducts();
    } else {
      fetchMerchants();
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-brand-light-gray">
      {/* Booking Context Banner */}
      {bookingId && materialNames.length > 0 && (
        <div className="bg-blue-600 text-white py-4">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium flex items-center gap-2">
                  <span className="text-xl">🔗</span>
                  Shopping for your booking
                </p>
                <p className="text-blue-100 text-sm mt-1">
                  Materials needed: {materialNames.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {cart.length > 0 && (
                  <button
                    onClick={() => setShowCart(true)}
                    className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span>🛒</span>
                    Cart ({cart.length})
                    <span className="font-bold">NGN{cartTotal.toLocaleString()}</span>
                  </button>
                )}
                <Link
                  href={`/dashboard/customer/bookings/${bookingId}`}
                  className="px-4 py-2 bg-blue-500 rounded-lg font-medium hover:bg-blue-400 text-sm"
                >
                  Back to Booking
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-brand-green text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Shop Materials</h1>
          <p className="text-green-100 mb-6">
            Browse building materials, electrical supplies, plumbing equipment and more from verified merchants
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={viewMode === 'products' ? 'Search products...' : 'Search merchants...'}
              className="flex-1 px-4 py-3 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-brand-green rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Material search chips when coming from booking */}
          {materialNames.length > 0 && (
            <div className="mt-4">
              <p className="text-green-100 text-sm mb-2">Quick search for your materials:</p>
              <div className="flex flex-wrap gap-2">
                {materialNames.map((material, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery(material);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      searchQuery === material
                        ? 'bg-white text-brand-green'
                        : 'bg-green-600 text-white hover:bg-green-500'
                    }`}
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleViewModeChange('products')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'products'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            Browse Products
          </button>
          <button
            onClick={() => handleViewModeChange('merchants')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'merchants'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            Shop by Merchant
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
          >
            <option value="">All Categories</option>
            {MERCHANT_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
          >
            <option value="">All Locations</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          {viewMode === 'products' && (
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => {
              setCategoryFilter('');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !categoryFilter
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            All
          </button>
          {MERCHANT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setCategoryFilter(cat.value === categoryFilter ? '' : cat.value);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat.value
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-brand-gray hover:bg-gray-100'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-brand-green text-xl">Loading...</div>
          </div>
        ) : viewMode === 'products' ? (
          /* Products Grid */
          products.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-xl font-bold mb-2">No Products Found</h2>
              <p className="text-brand-gray">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            <>
              <p className="text-brand-gray mb-4">
                {pagination?.total || 0} products found
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div
                    key={product._id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setCurrentImageIndex(0);
                    }}
                    className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
                  >
                    {/* Product Image */}
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {product.images?.[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">
                          📦
                        </div>
                      )}
                      {product.images && product.images.length > 1 && (
                        <span className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                          +{product.images.length - 1} more
                        </span>
                      )}
                      {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
                        <span className="absolute top-2 right-2 px-2 py-1 bg-orange-500 text-white text-xs rounded">
                          Low Stock
                        </span>
                      )}
                      {product.stockQuantity === 0 && (
                        <span className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
                          Out of Stock
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1 truncate">{product.name}</h3>
                      <p className="text-brand-green font-bold text-xl mb-2">
                        NGN{product.price.toLocaleString()}/{getProductUnitLabel(product.unit)}
                      </p>
                      <p className="text-sm text-brand-gray line-clamp-2 mb-3">
                        {product.description}
                      </p>

                      {/* Merchant Info */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <div className="w-6 h-6 bg-brand-light-gray rounded-full flex items-center justify-center text-xs">
                          🏪
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.merchant.businessName}</p>
                          <p className="text-xs text-brand-gray">{product.merchant.location}</p>
                        </div>
                        {product.merchant.isVerified && (
                          <span className="text-green-500 text-sm">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          /* Merchants Grid */
          merchants.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center">
              <div className="text-6xl mb-4">🏪</div>
              <h2 className="text-xl font-bold mb-2">No Merchants Found</h2>
              <p className="text-brand-gray">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            <>
              <p className="text-brand-gray mb-4">
                {pagination?.total || 0} verified merchants
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {merchants.map((merchant) => (
                  <Link
                    key={merchant._id}
                    href={`/merchant/${merchant.slug}`}
                    className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-brand-light-gray rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {merchant.businessLogo ? (
                          <img
                            src={merchant.businessLogo}
                            alt={merchant.businessName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl">🏪</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{merchant.businessName}</h3>
                        <p className="text-sm text-brand-gray">{merchant.location}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-brand-green font-medium">
                      View Products &rarr;
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
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

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button - fixed at top */}
            <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold truncate pr-4">{selectedProduct.name}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200 text-xl flex-shrink-0"
              >
                &times;
              </button>
            </div>

            {/* Product Info & Action - FIRST */}
            <div className="p-6 bg-brand-light-gray">
              <p className="text-3xl font-bold text-brand-green mb-2">
                NGN{selectedProduct.price.toLocaleString()}/{getProductUnitLabel(selectedProduct.unit)}
              </p>
              <p className={`text-sm font-medium mb-4 ${selectedProduct.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {selectedProduct.stockQuantity > 0 ? `In Stock (${selectedProduct.stockQuantity} available)` : 'Out of Stock'}
              </p>

              {/* Add to Cart Section - PROMINENT */}
              {bookingId && selectedProduct.stockQuantity > 0 && (
                <div className="bg-white rounded-xl p-4 border-2 border-brand-green">
                  <p className="text-sm font-medium text-brand-gray mb-3">Add to your material order:</p>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOrderQuantity(q => Math.max(1, q - 1))}
                        className="w-12 h-12 bg-gray-100 rounded-lg hover:bg-gray-200 font-bold text-xl"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={selectedProduct.stockQuantity}
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(Math.min(selectedProduct.stockQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-20 text-center border-2 rounded-lg py-3 text-lg font-bold"
                      />
                      <button
                        onClick={() => setOrderQuantity(q => Math.min(selectedProduct.stockQuantity, q + 1))}
                        className="w-12 h-12 bg-gray-100 rounded-lg hover:bg-gray-200 font-bold text-xl"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xl font-bold text-brand-green">
                      = NGN{(selectedProduct.price * orderQuantity).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => addToCart(selectedProduct, orderQuantity)}
                    className="w-full py-4 bg-brand-green text-white rounded-lg font-bold text-lg hover:bg-brand-green-dark transition-colors"
                  >
                    Add to Material Order
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Items will be verified by your artisan before checkout
                  </p>
                </div>
              )}

              {/* Show message if not from booking */}
              {!bookingId && selectedProduct.stockQuantity > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Want to order?</strong> Start from your booking page to add materials to your order with artisan verification and escrow protection.
                  </p>
                </div>
              )}
            </div>

            {/* Image Gallery - Below action */}
            <div className="relative">
              <div className="aspect-video bg-gray-100">
                {selectedProduct.images?.[currentImageIndex]?.url ? (
                  <img
                    src={selectedProduct.images[currentImageIndex].url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">
                    📦
                  </div>
                )}
              </div>

              {/* Image navigation */}
              {selectedProduct.images && selectedProduct.images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((i) => (i > 0 ? i - 1 : selectedProduct.images!.length - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70"
                  >
                    &larr;
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((i) => (i < selectedProduct.images!.length - 1 ? i + 1 : 0))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70"
                  >
                    &rarr;
                  </button>

                  {/* Image indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {selectedProduct.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {selectedProduct.images && selectedProduct.images.length > 1 && (
              <div className="flex gap-2 p-4 overflow-x-auto bg-gray-50">
                {selectedProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      idx === currentImageIndex ? 'border-brand-green' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Product Details */}
            <div className="p-6">
              <h3 className="font-bold text-lg mb-2">Description</h3>
              <p className="text-brand-gray mb-6">{selectedProduct.description}</p>

              {/* Merchant Info */}
              <div className="pt-4 border-t">
                <p className="text-sm text-brand-gray mb-2">Sold by</p>
                <Link
                  href={`/merchant/${selectedProduct.merchant.slug}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  onClick={() => setSelectedProduct(null)}
                >
                  <div className="w-10 h-10 bg-brand-light-gray rounded-full flex items-center justify-center">
                    🏪
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedProduct.merchant.businessName}</p>
                    <p className="text-sm text-brand-gray">{selectedProduct.merchant.location}</p>
                  </div>
                  {selectedProduct.merchant.isVerified && (
                    <span className="text-green-500">✓ Verified</span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setShowCart(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Your Cart</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                >
                  &times;
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-4">🛒</p>
                  <p>Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(cartByMerchant).map(([merchantId, { merchant, items, total }]) => (
                    <div key={merchantId} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                        <div className="w-8 h-8 bg-brand-light-gray rounded-full flex items-center justify-center text-sm">
                          🏪
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{merchant.businessName}</p>
                          <p className="text-xs text-gray-500">{merchant.location}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {items.map((item) => (
                          <div key={item.product._id} className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {item.product.images?.[0]?.url ? (
                                <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>📦</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.product.name}</p>
                              <p className="text-xs text-gray-500">
                                {item.quantity} × NGN{item.product.price.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">NGN{(item.product.price * item.quantity).toLocaleString()}</p>
                              <button
                                onClick={() => removeFromCart(item.product._id)}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t flex items-center justify-between">
                        <span className="font-medium">Subtotal</span>
                        <span className="font-bold text-brand-green">NGN{total.toLocaleString()}</span>
                      </div>

                      <button
                        onClick={() => createOrder(merchantId)}
                        disabled={creatingOrder}
                        className="w-full mt-4 py-3 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark disabled:opacity-50"
                      >
                        {creatingOrder ? 'Creating Order...' : 'Create Order with This Merchant'}
                      </button>
                    </div>
                  ))}

                  {/* Delivery Options */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <p className="font-medium mb-3">Deliver to:</p>
                    <div className="space-y-3">
                      <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        deliveryType === 'artisan_location' ? 'border-brand-green bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="deliveryType"
                          checked={deliveryType === 'artisan_location'}
                          onChange={() => setDeliveryType('artisan_location')}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium">Artisan Location</p>
                          <p className="text-sm text-gray-500">Materials delivered directly to your artisan for the job</p>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        deliveryType === 'customer_address' ? 'border-brand-green bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="deliveryType"
                          checked={deliveryType === 'customer_address'}
                          onChange={() => setDeliveryType('customer_address')}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium">My Address</p>
                          <p className="text-sm text-gray-500 mb-2">I want to receive the materials myself</p>
                          {deliveryType === 'customer_address' && (
                            <textarea
                              value={customerAddress}
                              onChange={(e) => setCustomerAddress(e.target.value)}
                              placeholder="Enter your delivery address..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-green"
                              rows={2}
                            />
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                    <p className="font-medium mb-1">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-700">
                      <li>Create orders with each merchant</li>
                      <li>Your artisan verifies the items</li>
                      <li>Merchant confirms availability</li>
                      <li>You pay securely via escrow</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button - Shows when shopping for booking with items in cart */}
      {bookingId && cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-brand-green text-white px-6 py-4 rounded-full shadow-lg hover:bg-brand-green-dark transition-all hover:scale-105 flex items-center gap-3 z-40"
        >
          <span className="text-xl">🛒</span>
          <span className="font-medium">{cart.length} items</span>
          <span className="font-bold">NGN{cartTotal.toLocaleString()}</span>
        </button>
      )}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-light-gray flex items-center justify-center">
        <div className="text-brand-green text-xl">Loading shop...</div>
      </div>
    }>
      <ShopPageContent />
    </Suspense>
  );
}
