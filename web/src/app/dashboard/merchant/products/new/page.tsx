'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { MERCHANT_CATEGORIES, PRODUCT_UNITS, TRADES } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  unit: string;
  minOrderQuantity: number;
  maxOrderQuantity: number;
  stockQuantity: number;
  lowStockThreshold: number;
  brand: string;
  sku: string;
  tags: string;
  compatibleTrades: string[];
  images: File[];
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    price: 0,
    unit: 'piece',
    minOrderQuantity: 1,
    maxOrderQuantity: 0,
    stockQuantity: 0,
    lowStockThreshold: 10,
    brand: '',
    sku: '',
    tags: '',
    compatibleTrades: [],
    images: [],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['price', 'minOrderQuantity', 'maxOrderQuantity', 'stockQuantity', 'lowStockThreshold'].includes(name)
        ? Number(value)
        : value,
    }));
  };

  const handleTradesChange = (trade: string) => {
    setFormData(prev => ({
      ...prev,
      compatibleTrades: prev.compatibleTrades.includes(trade)
        ? prev.compatibleTrades.filter(t => t !== trade)
        : [...prev.compatibleTrades, trade],
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formData.images.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files],
    }));
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = Cookies.get('token');

    try {
      // First upload images if any
      const uploadedImages: { url: string; publicId: string }[] = [];

      for (const file of formData.images) {
        const imageFormData = new FormData();
        imageFormData.append('image', file);
        imageFormData.append('folder', 'products');

        const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/single`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: imageFormData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadData = await uploadRes.json();
        uploadedImages.push({
          url: uploadData.data.url,
          publicId: uploadData.data.publicId,
        });
      }

      // Create product
      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        price: formData.price,
        unit: formData.unit,
        minOrderQuantity: formData.minOrderQuantity,
        maxOrderQuantity: formData.maxOrderQuantity || undefined,
        stockQuantity: formData.stockQuantity,
        lowStockThreshold: formData.lowStockThreshold,
        brand: formData.brand || undefined,
        sku: formData.sku || undefined,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        compatibleTrades: formData.compatibleTrades,
        images: uploadedImages,
      };

      const res = await apiFetch('/products', {
        method: 'POST',
        token,
        body: JSON.stringify(productData),
      });

      if (res.data) {
        router.push('/dashboard/merchant/products');
      } else {
        throw new Error(res.error || 'Failed to create product');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-brand-gray hover:text-brand-green transition-colors"
          >
            Back to Products
          </button>
          <h1 className="text-2xl font-bold mt-2">Add New Product</h1>
          <p className="text-brand-gray">Products require admin approval before being visible to customers.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium mb-1">Product Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="e.g., Cement (Dangote 50kg)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="Describe your product..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  {MERCHANT_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Subcategory</label>
                <input
                  type="text"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  placeholder="e.g., Roofing"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pricing & Units</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Price (NGN) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price || ''}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unit *</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                >
                  {PRODUCT_UNITS.map(unit => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Min Order Quantity</label>
                <input
                  type="number"
                  name="minOrderQuantity"
                  value={formData.minOrderQuantity || ''}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Order Quantity</label>
                <input
                  type="number"
                  name="maxOrderQuantity"
                  value={formData.maxOrderQuantity || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  placeholder="Leave empty for no limit"
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Inventory</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  name="stockQuantity"
                  value={formData.stockQuantity || ''}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Low Stock Alert Threshold</label>
                <input
                  type="number"
                  name="lowStockThreshold"
                  value={formData.lowStockThreshold || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Additional Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  placeholder="e.g., Dangote"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  placeholder="Your product code"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="e.g., cement, construction, building"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Compatible Trades</label>
              <p className="text-xs text-brand-gray mb-2">Select which artisan trades typically use this product</p>
              <div className="flex flex-wrap gap-2">
                {TRADES.map(trade => (
                  <button
                    key={trade.value}
                    type="button"
                    onClick={() => handleTradesChange(trade.value)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      formData.compatibleTrades.includes(trade.value)
                        ? 'bg-brand-green text-white'
                        : 'bg-gray-100 text-brand-gray hover:bg-gray-200'
                    }`}
                  >
                    {trade.icon} {trade.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Product Images</h2>
            <p className="text-sm text-brand-gray">Upload up to 5 images. First image will be the main image.</p>

            <div className="grid grid-cols-5 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm hover:bg-red-600"
                  >
                    x
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-brand-green text-white text-xs rounded">
                      Main
                    </span>
                  )}
                </div>
              ))}

              {imagePreviews.length < 5 && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-brand-green transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    multiple
                  />
                  <span className="text-3xl text-gray-300">+</span>
                </label>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
