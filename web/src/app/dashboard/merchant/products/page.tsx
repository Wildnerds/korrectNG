'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getProductUnitLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isApproved: boolean;
  images: { url: string; publicId: string }[];
  createdAt: string;
}

export default function MerchantProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');

  useEffect(() => {
    async function fetchProducts() {
      const token = Cookies.get('token');
      try {
        const res = await apiFetch<{ data: Product[] }>('/products/my-products?limit=100', { token });
        if (res.data?.data) {
          setProducts(res.data.data);
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const toggleProductStatus = async (productId: string) => {
    const token = Cookies.get('token');
    try {
      await apiFetch(`/products/${productId}/toggle-active`, {
        method: 'PATCH',
        token,
      });
      // Update local state
      setProducts(products.map(p =>
        p._id === productId ? { ...p, isActive: !p.isActive } : p
      ));
    } catch {
      // Handle error
    }
  };

  const filteredProducts = products.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'active') return p.isActive && p.isApproved;
    if (filter === 'inactive') return !p.isActive;
    if (filter === 'pending') return !p.isApproved;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-brand-green text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Your Products</h1>
            <p className="text-brand-gray">{products.length} products total</p>
          </div>
          <Link
            href="/dashboard/merchant/products/new"
            className="px-4 py-2 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-medium"
          >
            Add New Product
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'inactive', label: 'Inactive' },
            { key: 'pending', label: 'Pending Approval' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === key
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-brand-gray hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold mb-2">No Products Yet</h2>
            <p className="text-brand-gray mb-6">Start adding products to your store.</p>
            <Link
              href="/dashboard/merchant/products/new"
              className="inline-block px-6 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-medium"
            >
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div key={product._id} className="bg-white rounded-xl overflow-hidden">
                {/* Product Image */}
                <div className="aspect-square bg-gray-100 relative">
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
                  {/* Status badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {!product.isApproved && (
                      <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded font-medium">
                        Pending Approval
                      </span>
                    )}
                    {!product.isActive && product.isApproved && (
                      <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded font-medium">
                        Inactive
                      </span>
                    )}
                    {product.stockQuantity <= product.lowStockThreshold && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded font-medium">
                        Low Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1 truncate">{product.name}</h3>
                  <p className="text-brand-green font-bold text-xl mb-2">
                    NGN{product.price.toLocaleString()}/{getProductUnitLabel(product.unit)}
                  </p>
                  <p className="text-sm text-brand-gray mb-4">
                    Stock: {product.stockQuantity} {getProductUnitLabel(product.unit)}
                  </p>

                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/merchant/products/${product._id}/edit`}
                      className="flex-1 px-3 py-2 border border-brand-green text-brand-green rounded text-center text-sm font-medium hover:bg-brand-green hover:text-white transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => toggleProductStatus(product._id)}
                      disabled={!product.isApproved}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        !product.isApproved
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : product.isActive
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {product.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
