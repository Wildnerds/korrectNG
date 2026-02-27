'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { MERCHANT_CATEGORIES, LOCATIONS, slugify } from '@korrectng/shared';
import Cookies from 'js-cookie';

const STEPS = ['business-info', 'documents', 'review'] as const;
type Step = (typeof STEPS)[number];

interface MerchantVerificationApplication {
  _id: string;
  status: string;
  currentStep: Step;
  documents: { type: string; url: string; publicId: string }[];
  adminNotes?: string;
}

export default function MerchantVerificationPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('business-info');
  const [application, setApplication] = useState<MerchantVerificationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [profile, setProfile] = useState({
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
    async function init() {
      const token = Cookies.get('token');
      try {
        // Check for existing application
        const appRes = await apiFetch<MerchantVerificationApplication>('/merchant-verification/my-application', { token });
        if (appRes.data) {
          setApplication(appRes.data);
          setCurrentStep(appRes.data.currentStep);
        }
      } catch {
        // No application yet
      }
      setLoading(false);
    }
    init();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = Cookies.get('token');

    try {
      // Create merchant profile
      const slug = slugify(`${profile.businessName} ${profile.location}`);
      await apiFetch('/merchants/my-profile', {
        method: 'PATCH',
        body: JSON.stringify({ ...profile, slug }),
        token,
      });

      // Create or get verification application
      let currentApp = application;
      if (!currentApp) {
        const appRes = await apiFetch<MerchantVerificationApplication>('/merchant-verification/apply', {
          method: 'POST',
          token,
        });
        currentApp = appRes.data || null;
      }

      // Move to next step
      const stepRes = await apiFetch<MerchantVerificationApplication>('/merchant-verification/step/documents', {
        method: 'PATCH',
        token,
      });
      if (stepRes.data) {
        setApplication(stepRes.data);
      } else {
        setApplication(currentApp);
      }
      setCurrentStep('documents');
    } catch (err: any) {
      showToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const [validating, setValidating] = useState<string | null>(null);

  const handleDocumentUpload = async (type: string, file: File) => {
    const token = Cookies.get('token');
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', 'merchant-verification');

    setValidating(type);

    try {
      const uploadRes = await apiFetch<{ url: string; publicId: string }>('/upload/single', {
        method: 'POST',
        body: formData,
        token,
      });

      if (uploadRes.data) {
        const docRes = await apiFetch<MerchantVerificationApplication>('/merchant-verification/upload-document', {
          method: 'POST',
          body: JSON.stringify({
            type,
            url: uploadRes.data.url,
            publicId: uploadRes.data.publicId,
          }),
          token,
        });

        if (docRes.data) {
          setApplication(docRes.data);
          showToast(`${type === 'govtId' ? 'Government ID' : type === 'cacDocument' ? 'CAC Document' : 'Business Permit'} uploaded successfully`, 'success');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setValidating(null);
    }
  };

  const handleSubmitApplication = async () => {
    const token = Cookies.get('token');
    setSubmitting(true);
    try {
      await apiFetch('/merchant-verification/submit', {
        method: 'POST',
        token,
      });
      router.push('/dashboard/merchant');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit application', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryToggle = (cat: string) => {
    setProfile(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleDeliveryAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const areas = e.target.value.split(',').map(a => a.trim()).filter(Boolean);
    setProfile(prev => ({ ...prev, deliveryAreas: areas }));
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
        <h1 className="text-3xl font-bold mb-2">Merchant Verification</h1>
        <p className="text-brand-gray mb-8">Complete all steps to start selling on KorrectNG Marketplace</p>

        {/* Progress Steps */}
        <div className="flex mb-8">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex-1 flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  STEPS.indexOf(currentStep) >= idx
                    ? 'bg-brand-green text-white'
                    : 'bg-gray-200 text-brand-gray'
                }`}
              >
                {idx + 1}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    STEPS.indexOf(currentStep) > idx ? 'bg-brand-green' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-6">
          {currentStep === 'business-info' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Business Information</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Business Name *</label>
                <input
                  type="text"
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  placeholder="e.g., Quality Building Supplies"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Primary Category *</label>
                <select
                  value={profile.category}
                  onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
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
                  {MERCHANT_CATEGORIES.filter(c => c.value !== profile.category).map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => handleCategoryToggle(cat.value)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        profile.categories.includes(cat.value)
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
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  rows={4}
                  placeholder="Describe your business and what products you sell..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Location *</label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    list="locations"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                    required
                  />
                  <datalist id="locations">
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CAC Number (Optional)</label>
                  <input
                    type="text"
                    value={profile.cacNumber}
                    onChange={(e) => setProfile({ ...profile, cacNumber: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                    placeholder="RC123456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Full Address *</label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp Number *</label>
                  <input
                    type="tel"
                    value={profile.whatsappNumber}
                    onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })}
                    placeholder="08012345678"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                    required
                  />
                </div>
              </div>

              <h3 className="text-lg font-semibold mt-6 pt-4 border-t">Delivery Settings</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Delivery Areas (comma-separated)</label>
                <input
                  type="text"
                  value={profile.deliveryAreas.join(', ')}
                  onChange={handleDeliveryAreaChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  placeholder="e.g., Lekki, Victoria Island, Ikoyi"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Default Delivery Fee (NGN)</label>
                  <input
                    type="number"
                    value={profile.defaultDeliveryFee || ''}
                    onChange={(e) => setProfile({ ...profile, defaultDeliveryFee: Number(e.target.value) })}
                    min={0}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Free Delivery Above (NGN)</label>
                  <input
                    type="number"
                    value={profile.freeDeliveryThreshold || ''}
                    onChange={(e) => setProfile({ ...profile, freeDeliveryThreshold: Number(e.target.value) })}
                    min={0}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                    placeholder="Leave empty for no threshold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Continue to Documents'}
              </button>
            </form>
          )}

          {currentStep === 'documents' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Upload Documents</h2>
              <p className="text-sm text-brand-gray mb-6">
                Upload clear photos of your business documents. This helps us verify your business.
              </p>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Government ID (NIN, Voter&apos;s Card, or Passport) *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={validating === 'govtId'}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleDocumentUpload('govtId', e.target.files[0]);
                    }}
                    className="w-full"
                  />
                  {validating === 'govtId' && (
                    <p className="text-sm text-brand-gray mt-1">Uploading...</p>
                  )}
                  {application?.documents.find((d) => d.type === 'govtId') && (
                    <p className="text-sm text-green-600 mt-1">Uploaded</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    CAC Document (Certificate of Incorporation)
                  </label>
                  <p className="text-xs text-brand-gray mb-2">Required if you have a registered business</p>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={validating === 'cacDocument'}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleDocumentUpload('cacDocument', e.target.files[0]);
                    }}
                    className="w-full"
                  />
                  {validating === 'cacDocument' && (
                    <p className="text-sm text-brand-gray mt-1">Uploading...</p>
                  )}
                  {application?.documents.find((d) => d.type === 'cacDocument') && (
                    <p className="text-sm text-green-600 mt-1">Uploaded</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Business Permit / Trade License
                  </label>
                  <p className="text-xs text-brand-gray mb-2">Required if you don't have CAC registration</p>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={validating === 'businessPermit'}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleDocumentUpload('businessPermit', e.target.files[0]);
                    }}
                    className="w-full"
                  />
                  {validating === 'businessPermit' && (
                    <p className="text-sm text-brand-gray mt-1">Uploading...</p>
                  )}
                  {application?.documents.find((d) => d.type === 'businessPermit') && (
                    <p className="text-sm text-green-600 mt-1">Uploaded</p>
                  )}
                </div>
              </div>

              <button
                onClick={async () => {
                  const token = Cookies.get('token');
                  await apiFetch('/merchant-verification/step/review', { method: 'PATCH', token });
                  setCurrentStep('review');
                }}
                disabled={
                  !application?.documents.find((d) => d.type === 'govtId') ||
                  (!application?.documents.find((d) => d.type === 'cacDocument') &&
                   !application?.documents.find((d) => d.type === 'businessPermit'))
                }
                className="w-full mt-6 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
              >
                Continue to Review
              </button>
              <p className="text-xs text-brand-gray text-center mt-2">
                You must upload a government ID and either a CAC document or business permit
              </p>
            </div>
          )}

          {currentStep === 'review' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Submit for Review</h2>
              {application?.status === 'in-review' ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-xl font-bold mb-2">Application Under Review</p>
                  <p className="text-brand-gray">
                    We&apos;re reviewing your business documents. You&apos;ll be notified once approved.
                  </p>
                  <p className="text-sm text-brand-gray mt-4">
                    This usually takes 24-48 hours.
                  </p>
                </div>
              ) : application?.status === 'approved' ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🎉</div>
                  <p className="text-xl font-bold text-green-600 mb-2">Approved!</p>
                  <p className="text-brand-gray mb-6">
                    Your business has been verified. You can now add products and start selling!
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/merchant')}
                    className="px-8 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
                  >
                    Go to Dashboard
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-brand-light-gray rounded-lg p-4 mb-6 text-left">
                    <p className="font-medium mb-2">What happens next?</p>
                    <ol className="text-sm text-brand-gray space-y-1 list-decimal list-inside">
                      <li>Our team reviews your documents (24-48 hours)</li>
                      <li>You&apos;ll be notified once approved</li>
                      <li>Add your products to the marketplace</li>
                      <li>Start receiving orders from customers!</li>
                    </ol>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> There is no subscription fee for merchants. We only charge a 5% platform fee on completed orders.
                    </p>
                  </div>
                  <button
                    onClick={handleSubmitApplication}
                    disabled={submitting}
                    className="px-8 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
