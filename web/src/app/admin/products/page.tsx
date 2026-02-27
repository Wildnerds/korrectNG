'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { getMerchantCategoryLabel, getProductUnitLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  stockQuantity: number;
  images: { url: string }[];
  isActive: boolean;
  isApproved: boolean;
  merchant: {
    _id: string;
    businessName: string;
    verificationStatus: string;
  };
  createdAt: string;
}

export default function ProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  async function fetchProducts() {
    const token = Cookies.get('token');
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Product[] }>(
        `/admin/products?approval=${filter}`,
        { token }
      );
      setProducts(res.data?.data || []);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    const token = Cookies.get('token');
    try {
      await apiFetch(`/admin/products/${id}/approve`, {
        method: 'POST',
        token,
      });
      showToast('Product approved', 'success');
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve', 'error');
    }
  }

  async function handleReject(id: string) {
    const token = Cookies.get('token');
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      await apiFetch(`/admin/products/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
        token,
      });
      showToast('Product rejected', 'success');
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject', 'error');
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Product Approvals</h1>

      <div className="flex gap-2 mb-6">
        {[
          { value: 'pending', label: 'Pending Approval' },
          { value: 'approved', label: 'Approved' },
          { value: 'all', label: 'All Products' },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value as any)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === s.value
                ? 'bg-brand-orange text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product._id} className="bg-white rounded-xl overflow-hidden">
              <div className="h-40 bg-gray-100 relative">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-4xl">📦</div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {product.isApproved ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Approved
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      Pending
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold truncate">{product.name}</h3>
                <p className="text-sm text-brand-gray truncate">{product.description}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="font-bold text-brand-green">
                    ₦{product.price.toLocaleString()}/{getProductUnitLabel(product.unit)}
                  </span>
                  <span className="text-xs text-brand-gray">
                    Stock: {product.stockQuantity}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-brand-gray">
                    Merchant: <span className="font-medium">{product.merchant?.businessName}</span>
                  </p>
                  <p className="text-xs text-brand-gray">
                    Category: {getMerchantCategoryLabel(product.category)}
                  </p>
                </div>

                {!product.isApproved && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleApprove(product._id)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(product._id)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-brand-gray">
          {filter === 'pending' ? 'No products pending approval' : 'No products found'}
        </div>
      )}
    </div>
  );
}
