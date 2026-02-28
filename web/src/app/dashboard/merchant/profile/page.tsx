'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { MERCHANT_CATEGORIES, LOCATIONS } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface MerchantProfile {
  _id: string;
  businessName: string;
  slug: string;
  category: string;
  categories: string[];
  description: string;
  location: string;
  address: string;
  whatsappNumber: string;
  phoneNumber: string;
  cacNumber?: string;
  businessLogo?: string;
  deliveryAreas: string[];
  defaultDeliveryFee: number;
  freeDeliveryThreshold?: number;
}

export default function MerchantProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
  });

  const [formData, setFormData] = useState({
    businessName: '',
    category: '',
    categories: [] as string[],
    description: '',
    location: '',
    address: '',
    whatsappNumber: '',
    phoneNumber: '',
    cacNumber: '',
    deliveryAreas: [] as string[],
    defaultDeliveryFee: 0,
    freeDeliveryThreshold: 0,
  });

  useEffect(() => {
    async function fetchProfile() {
      const token = Cookies.get('token');
      try {
        const res = await apiFetch<MerchantProfile>('/merchants/my-profile', { token });
        if (res.data) {
          setProfile(res.data);
          setFormData({
            businessName: res.data.businessName || '',
            category: res.data.category || '',
            categories: res.data.categories || [],
            description: res.data.description || '',
            location: res.data.location || '',
            address: res.data.address || '',
            whatsappNumber: res.data.whatsappNumber || '',
            phoneNumber: res.data.phoneNumber || '',
            cacNumber: res.data.cacNumber || '',
            deliveryAreas: res.data.deliveryAreas || [],
            defaultDeliveryFee: res.data.defaultDeliveryFee || 0,
            freeDeliveryThreshold: res.data.freeDeliveryThreshold || 0,
          });
          if (res.data.businessLogo) {
            setLogoPreview(res.data.businessLogo);
          }
        }
      } catch {
        // No profile
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // Set personal info from user
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
    }
  }, [user]);

  const handlePersonalInfoSave = async () => {
    setSavingPersonal(true);
    const token = Cookies.get('token');

    try {
      await apiFetch('/auth/update-profile', {
        method: 'PUT',
        token,
        body: JSON.stringify(personalInfo),
      });
      if (refreshUser) refreshUser();
      showToast('Personal information updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update personal information', 'error');
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['defaultDeliveryFee', 'freeDeliveryThreshold'].includes(name) ? Number(value) : value,
    }));
  };

  const handleCategoryToggle = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleDeliveryAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const areas = e.target.value.split(',').map(a => a.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, deliveryAreas: areas }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = Cookies.get('token');
    const uploadFormData = new FormData();
    uploadFormData.append('image', file);
    uploadFormData.append('folder', 'merchant-logos');

    try {
      // Use raw fetch for file uploads (avoid CSRF/header issues with FormData)
      const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/single`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadRes.json();

      if (uploadData.data) {
        setLogoPreview(uploadData.data.url);
        // Save to profile immediately
        await apiFetch('/merchants/my-profile', {
          method: 'PATCH',
          body: JSON.stringify({ businessLogo: uploadData.data.url }),
          token,
        });
        showToast('Logo updated', 'success');
      }
    } catch {
      showToast('Failed to upload logo', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = Cookies.get('token');

    try {
      await apiFetch('/merchants/my-profile', {
        method: 'PATCH',
        body: JSON.stringify(formData),
        token,
      });
      showToast('Profile updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
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
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-brand-gray hover:text-brand-green transition-colors"
          >
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold mt-2">Store Profile</h1>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Personal Information</h2>
          <p className="text-sm text-brand-gray mb-4">Your real name helps build trust with customers.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                value={personalInfo.firstName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="Your first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={personalInfo.lastName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="Your last name"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handlePersonalInfoSave}
            disabled={savingPersonal}
            className="mt-4 px-6 py-2 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50"
          >
            {savingPersonal ? 'Saving...' : 'Update Name'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 space-y-6">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium mb-2">Business Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🏪</span>
                )}
              </div>
              <label className="px-4 py-2 border border-brand-green text-brand-green rounded-md cursor-pointer hover:bg-brand-green hover:text-white transition-colors">
                Upload Logo
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium mb-1">Business Name</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Primary Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
              >
                <option value="">Select category</option>
                {MERCHANT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Additional Categories</label>
              <div className="flex flex-wrap gap-2">
                {MERCHANT_CATEGORIES.filter(c => c.value !== formData.category).map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.value)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      formData.categories.includes(cat.value)
                        ? 'bg-brand-green text-white'
                        : 'bg-gray-100 text-brand-gray hover:bg-gray-200'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Location & Contact</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  list="locations"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
                <datalist id="locations">
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CAC Number</label>
                <input
                  type="text"
                  name="cacNumber"
                  value={formData.cacNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Full Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Delivery Settings</h2>

            <div>
              <label className="block text-sm font-medium mb-1">Delivery Areas (comma-separated)</label>
              <input
                type="text"
                value={formData.deliveryAreas.join(', ')}
                onChange={handleDeliveryAreaChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                placeholder="e.g., Lekki, Victoria Island, Ikoyi"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Default Delivery Fee (NGN)</label>
                <input
                  type="number"
                  name="defaultDeliveryFee"
                  value={formData.defaultDeliveryFee || ''}
                  onChange={handleChange}
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Free Delivery Above (NGN)</label>
                <input
                  type="number"
                  name="freeDeliveryThreshold"
                  value={formData.freeDeliveryThreshold || ''}
                  onChange={handleChange}
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
