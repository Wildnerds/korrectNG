'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { TRADES, LOCATIONS, formatCustomTradeLabel } from '@korrectng/shared';
import type { ArtisanProfile, ArtisanService } from '@korrectng/shared';
import ServiceSelector from '@/components/ServiceSelector';
import Cookies from 'js-cookie';
import { NotificationPrompt } from '@/components/NotificationPrompt';
import { BankAccountForm } from '@/components/BankAccountForm';

export default function ArtisanProfileEdit() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
  });
  const [savingPersonal, setSavingPersonal] = useState(false);

  const [profile, setProfile] = useState({
    businessName: '',
    trade: '',
    customTrade: '',
    description: '',
    location: '',
    address: '',
    whatsappNumber: '',
    phoneNumber: '',
    yearsOfExperience: '',
    workingHours: '',
  });
  const [services, setServices] = useState<ArtisanService[]>([]);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [suggestedDescription, setSuggestedDescription] = useState<string | null>(null);

  // Custom trade suggestions
  const [customTradeSuggestions, setCustomTradeSuggestions] = useState<{ value: string; label: string }[]>([]);
  const [showCustomTradeSuggestions, setShowCustomTradeSuggestions] = useState(false);
  const [customTradeQuery, setCustomTradeQuery] = useState('');
  const customTradeRef = useRef<HTMLDivElement>(null);

  // Fetch custom trade suggestions
  const fetchCustomTradeSuggestions = useCallback(async () => {
    try {
      const res = await apiFetch<{ value: string; label: string }[]>('/services/custom-trades');
      if (res.data) {
        setCustomTradeSuggestions(res.data);
      }
    } catch {
      // Ignore errors - suggestions are optional
    }
  }, []);

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
            customTrade: (artisanProfile as any).customTrade || '',
            description: artisanProfile.description || '',
            location: artisanProfile.location || '',
            address: artisanProfile.address || '',
            whatsappNumber: artisanProfile.whatsappNumber || '',
            phoneNumber: artisanProfile.phoneNumber || '',
            yearsOfExperience: artisanProfile.yearsOfExperience?.toString() || '',
            workingHours: artisanProfile.workingHours || '',
          });
          // Set services
          if (artisanProfile.services && Array.isArray(artisanProfile.services)) {
            setServices(artisanProfile.services);
          }
          // Set the display value for custom trade input
          if ((artisanProfile as any).customTrade) {
            setCustomTradeQuery(formatCustomTradeLabel((artisanProfile as any).customTrade));
          }
        }

        // Set current avatar and personal info from user
        if (user?.avatar) {
          setAvatar(user.avatar);
        }
        if (user) {
          setPersonalInfo({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
          });
        }
      } catch {
        // Handle error - profile may not exist yet
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchProfile();
      fetchCustomTradeSuggestions();
    }
  }, [user, fetchCustomTradeSuggestions]);

  // Close custom trade suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customTradeRef.current && !customTradeRef.current.contains(event.target as Node)) {
        setShowCustomTradeSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePersonalInfoSave = async () => {
    setSavingPersonal(true);
    setMessage(null);

    try {
      const token = Cookies.get('token');
      await apiFetch('/auth/update-profile', {
        method: 'PUT',
        token,
        body: JSON.stringify(personalInfo),
      });
      if (refreshUser) refreshUser();
      setMessage({ type: 'success', text: 'Personal information updated!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update personal information' });
    } finally {
      setSavingPersonal(false);
    }
  };

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
      // Get auth token
      const token = Cookies.get('token');

      // Upload to Cloudinary using apiFetch (handles credentials and CORS properly)
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'avatars');

      const uploadRes = await apiFetch<{ url: string; publicId: string }>('/upload/single', {
        method: 'POST',
        body: formData,
        token,
      });

      if (!uploadRes.data?.url) {
        throw new Error('Failed to upload image');
      }
      const imageUrl = uploadRes.data.url;

      // Update user profile with new avatar
      await apiFetch('/auth/update-profile', {
        method: 'PUT',
        token,
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

    // Validate customTrade when trade is 'other'
    if (profile.trade === 'other' && !profile.customTrade.trim()) {
      setMessage({ type: 'error', text: 'Please specify your custom service type' });
      setSaving(false);
      return;
    }

    try {
      // Convert yearsOfExperience to number before sending
      const profileData: Record<string, any> = {
        ...profile,
        yearsOfExperience: parseInt(profile.yearsOfExperience) || 0,
        services,
      };

      // Only include customTrade if trade is 'other'
      if (profile.trade !== 'other') {
        delete profileData.customTrade;
      }

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

  // Handle trade change - clear customTrade when switching away from 'other'
  const handleTradeChange = (value: string) => {
    setProfile({
      ...profile,
      trade: value,
      customTrade: value === 'other' ? profile.customTrade : '',
    });
    if (value !== 'other') {
      setCustomTradeQuery('');
    }
  };

  // Handle custom trade input change
  const handleCustomTradeInput = (value: string) => {
    setCustomTradeQuery(value);
    setProfile({ ...profile, customTrade: value.toLowerCase().trim() });
    setShowCustomTradeSuggestions(true);
  };

  // Handle custom trade suggestion selection
  const handleCustomTradeSelect = (suggestion: { value: string; label: string }) => {
    setCustomTradeQuery(suggestion.label);
    setProfile({ ...profile, customTrade: suggestion.value });
    setShowCustomTradeSuggestions(false);
  };

  // Generate description suggestion
  const handleGenerateDescription = async () => {
    if (!profile.trade || !profile.location) {
      setMessage({ type: 'error', text: 'Please select a trade and location first' });
      return;
    }

    setGeneratingDescription(true);
    setSuggestedDescription(null);

    try {
      const res = await apiFetch<{ description: string; shortDescription: string }>('/services/generate-description', {
        method: 'POST',
        body: JSON.stringify({
          trade: profile.trade,
          customTrade: profile.customTrade,
          services,
          yearsOfExperience: parseInt(profile.yearsOfExperience) || 0,
          location: profile.location,
          businessName: profile.businessName,
        }),
      });

      if (res.data?.description) {
        setSuggestedDescription(res.data.description);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to generate description' });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const useSuggestedDescription = () => {
    if (suggestedDescription) {
      setProfile({ ...profile, description: suggestedDescription });
      setSuggestedDescription(null);
      setMessage({ type: 'success', text: 'Description applied! Feel free to edit it.' });
    }
  };

  // Filter suggestions based on input
  const filteredSuggestions = customTradeSuggestions.filter((s) =>
    s.label.toLowerCase().includes(customTradeQuery.toLowerCase())
  );

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

          {/* Personal Information */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Personal Information</h2>
            <p className="text-sm text-brand-gray mb-4">Your real name helps build trust with customers.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input
                  type="text"
                  value={personalInfo.firstName}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  placeholder="Your first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input
                  type="text"
                  value={personalInfo.lastName}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
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
                  onChange={(e) => handleTradeChange(e.target.value)}
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

              {/* Custom Trade Input - shown when 'other' is selected */}
              {profile.trade === 'other' && (
                <div ref={customTradeRef} className="relative">
                  <label className="block text-sm font-medium mb-1">
                    Custom Service Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customTradeQuery}
                    onChange={(e) => handleCustomTradeInput(e.target.value)}
                    onFocus={() => setShowCustomTradeSuggestions(true)}
                    placeholder="e.g., Catering, Event Planning, Photography..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Describe your service. Type a new one or select from suggestions below.
                  </p>

                  {/* Autocomplete suggestions dropdown */}
                  {showCustomTradeSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                      {filteredSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.value}
                          type="button"
                          onClick={() => handleCustomTradeSelect(suggestion)}
                          className={`w-full px-4 py-2 text-left hover:bg-brand-green/5 flex items-center gap-2 transition-colors ${
                            profile.customTrade === suggestion.value
                              ? 'bg-brand-green/10 text-brand-green'
                              : ''
                          }`}
                        >
                          <span className="text-lg">✨</span>
                          <span>{suggestion.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

          {/* Services */}
          {profile.trade && (
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-xl font-bold mb-2">Services Offered</h2>
              <p className="text-sm text-brand-gray mb-4">
                Select the services you offer to help customers find you. You can add custom services too.
              </p>
              <ServiceSelector
                trade={profile.trade}
                selectedServices={services}
                onChange={setServices}
                maxServices={15}
              />
            </div>
          )}

          {/* Description with Generate Button */}
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Description</h2>
              {profile.trade && profile.location && (
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-orange/10 text-brand-orange rounded-md hover:bg-brand-orange/20 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {generatingDescription ? (
                    <>
                      <div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Suggestion
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Suggested Description Preview */}
            {suggestedDescription && (
              <div className="mb-4 p-4 bg-brand-green/5 border border-brand-green/20 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-green mb-2">Suggested Description:</p>
                    <p className="text-sm text-brand-gray">{suggestedDescription}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={useSuggestedDescription}
                      className="px-3 py-1.5 bg-brand-green text-white rounded-md text-sm font-medium hover:bg-brand-green-dark transition-colors"
                    >
                      Use This
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuggestedDescription(null)}
                      className="px-3 py-1.5 bg-gray-200 text-brand-gray rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            <textarea
              value={profile.description}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              rows={4}
              placeholder="Tell customers about your experience, skills, and services..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
              required
              minLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 20 characters. Tip: Click "Generate Suggestion" for a professional description based on your services.</p>
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

        {/* Bank Account for Payouts */}
        <div className="mt-8">
          <BankAccountForm />
        </div>

        {/* Notifications */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Notifications</h2>
          <NotificationPrompt variant="inline" />
        </div>
      </div>
    </div>
  );
}
