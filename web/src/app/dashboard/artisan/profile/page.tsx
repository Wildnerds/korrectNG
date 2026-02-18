'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { TRADES, LOCATIONS } from '@korrectng/shared';
import type { ArtisanProfile } from '@korrectng/shared';
import Cookies from 'js-cookie';

export default function ArtisanProfileEdit() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    businessName: '',
    trade: '',
    description: '',
    location: '',
    address: '',
    whatsappNumber: '',
    phoneNumber: '',
    yearsOfExperience: '',
    workingHours: '',
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        // Use the dedicated my-profile endpoint for authenticated artisans
        const res = await apiFetch<ArtisanProfile>('/artisans/my-profile');
        const artisanProfile = res.data;

        if (artisanProfile) {
          setProfile({
            businessName: artisanProfile.businessName || '',
            trade: artisanProfile.trade || '',
            description: artisanProfile.description || '',
            location: artisanProfile.location || '',
            address: artisanProfile.address || '',
            whatsappNumber: artisanProfile.whatsappNumber || '',
            phoneNumber: artisanProfile.phoneNumber || '',
            yearsOfExperience: artisanProfile.yearsOfExperience?.toString() || '',
            workingHours: artisanProfile.workingHours || '',
          });
        }

        // Set current avatar from user
        if (user?.avatar) {
          setAvatar(user.avatar);
        }
      } catch {
        // Handle error - profile may not exist yet
      } finally {
        setLoading(false);
      }
    }

    if (user) fetchProfile();
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    try {
      // Get CSRF token
      let csrfToken = Cookies.get('csrf_token');
      if (!csrfToken) {
        const csrfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/csrf-token`, {
          credentials: 'include',
        });
        if (csrfRes.ok) {
          const csrfData = await csrfRes.json();
          csrfToken = csrfData.data?.csrfToken;
        }
      }

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'avatars');

      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/upload/single`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload image');
      }
      const imageUrl = uploadData.data.url;

      // Update user profile with new avatar
      await apiFetch('/auth/update-profile', {
        method: 'PUT',
        body: JSON.stringify({ avatar: imageUrl }),
      });

      setAvatar(imageUrl);
      if (refreshUser) refreshUser();
      setMessage({ type: 'success', text: 'Profile picture updated!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload image' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Convert yearsOfExperience to number before sending
      const profileData = {
        ...profile,
        yearsOfExperience: parseInt(profile.yearsOfExperience) || 0,
      };
      await apiFetch('/artisans/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileData),
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
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
      <div className="max-w-2xl mx-auto px-4">
        <button
          onClick={() => router.back()}
          className="mb-6 text-brand-green hover:underline"
        >
          &larr; Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold mb-8">Edit Business Profile</h1>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Profile Picture</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-brand-green"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-brand-light-gray flex items-center justify-center border-4 border-gray-200">
                    <span className="text-3xl text-gray-400">
                      {user?.firstName?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-4 py-2 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50"
                >
                  {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                </button>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max 5MB.</p>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Business Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Business Name</label>
                <input
                  type="text"
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Trade</label>
                <select
                  value={profile.trade}
                  onChange={(e) => setProfile({ ...profile, trade: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
                >
                  <option value="">Select a trade</option>
                  {TRADES.map((trade) => (
                    <option key={trade.value} value={trade.value}>
                      {trade.icon} {trade.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  rows={4}
                  placeholder="Tell customers about your experience, skills, and services..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
                  minLength={20}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 20 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Years of Experience</label>
                <input
                  type="number"
                  value={profile.yearsOfExperience}
                  onChange={(e) =>
                    setProfile({ ...profile, yearsOfExperience: e.target.value })
                  }
                  min={0}
                  max={50}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Location</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Area</label>
                <select
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
                >
                  <option value="">Select your area</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Full Address</label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="e.g., 123 Main Street, Lekki Phase 1"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  value={profile.whatsappNumber}
                  onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })}
                  placeholder="e.g., 2348012345678"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Include country code (e.g., 234 for Nigeria)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profile.phoneNumber}
                  onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                  placeholder="e.g., 08012345678"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Working Hours</label>
                <select
                  value={profile.workingHours}
                  onChange={(e) => setProfile({ ...profile, workingHours: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                >
                  <option value="">Select working hours</option>
                  <option value="Mon-Fri: 8AM - 5PM">Mon-Fri: 8AM - 5PM</option>
                  <option value="Mon-Fri: 9AM - 6PM">Mon-Fri: 9AM - 6PM</option>
                  <option value="Mon-Sat: 8AM - 5PM">Mon-Sat: 8AM - 5PM</option>
                  <option value="Mon-Sat: 8AM - 6PM">Mon-Sat: 8AM - 6PM</option>
                  <option value="Mon-Sat: 9AM - 6PM">Mon-Sat: 9AM - 6PM</option>
                  <option value="Mon-Sun: 8AM - 6PM">Mon-Sun: 8AM - 6PM</option>
                  <option value="Mon-Sun: 9AM - 9PM">Mon-Sun: 9AM - 9PM</option>
                  <option value="24/7 Available">24/7 Available</option>
                  <option value="Flexible Hours">Flexible Hours</option>
                  <option value="By Appointment Only">By Appointment Only</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50 text-lg"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
