'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { TRADES, LOCATIONS, formatNaira, slugify } from '@korrectng/shared';
import type { VerificationApplication, ArtisanProfile } from '@korrectng/shared';
import Cookies from 'js-cookie';

const STEPS = ['personal-info', 'documents', 'payment', 'review'] as const;
type Step = (typeof STEPS)[number];

export default function VerificationPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<Step>('personal-info');
  const [application, setApplication] = useState<VerificationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [profile, setProfile] = useState({
    businessName: '',
    trade: '',
    description: '',
    location: '',
    address: '',
    whatsappNumber: '',
    phoneNumber: '',
    yearsOfExperience: 0,
  });

  useEffect(() => {
    async function init() {
      const token = Cookies.get('token');
      try {
        // Check for existing application
        const appRes = await apiFetch<VerificationApplication>('/verification/my-application', { token });
        if (appRes.data) {
          setApplication(appRes.data);
          setCurrentStep(appRes.data.currentStep);
        }
      } catch {
        // No application yet
      }

      // Check for payment callback
      const reference = searchParams.get('reference');
      if (reference) {
        try {
          await apiFetch(`/verification/verify-payment?reference=${reference}`, { token });
          const newAppRes = await apiFetch<VerificationApplication>('/verification/my-application', { token });
          if (newAppRes.data) {
            setApplication(newAppRes.data);
            setCurrentStep(newAppRes.data.currentStep);
          }
        } catch {
          // Payment verification failed
        }
      }

      setLoading(false);
    }
    init();
  }, [searchParams]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = Cookies.get('token');

    try {
      // Create artisan profile if not exists
      const slug = slugify(`${profile.businessName} ${profile.location}`);
      await apiFetch('/artisans/profile', {
        method: 'PATCH',
        body: JSON.stringify({ ...profile, slug }),
        token,
      });

      // Create or get verification application
      let currentApp = application;
      if (!currentApp) {
        const appRes = await apiFetch<VerificationApplication>('/verification/apply', {
          method: 'POST',
          token,
        });
        currentApp = appRes.data || null;
      }

      // Move to next step and update application state with response
      const stepRes = await apiFetch<VerificationApplication>('/verification/step/documents', {
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
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});

  const handleDocumentUpload = async (type: string, file: File) => {
    const token = Cookies.get('token');
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', 'verification');

    setValidating(type);

    try {
      const uploadRes = await apiFetch<{ url: string; publicId: string }>('/upload/single', {
        method: 'POST',
        body: formData,
        token,
      });

      if (uploadRes.data) {
        // Validate the document
        let validationResult = null;
        try {
          const validateRes = await apiFetch<any>('/verification/validate-document', {
            method: 'POST',
            body: JSON.stringify({
              imageUrl: uploadRes.data.url,
              documentType: type,
            }),
            token,
          });
          validationResult = validateRes.data;
          setValidationResults((prev) => ({ ...prev, [type]: validateRes.data }));
        } catch {
          // Validation failed, continue without it
        }

        const docRes = await apiFetch<VerificationApplication>('/verification/upload-document', {
          method: 'POST',
          body: JSON.stringify({
            type,
            url: uploadRes.data.url,
            publicId: uploadRes.data.publicId,
            validationResult,
          }),
          token,
        });

        // Use the response from upload-document which already contains updated application
        if (docRes.data) {
          setApplication(docRes.data);
          showToast(`${type === 'govtId' ? 'Government ID' : type === 'tradeCredential' ? 'Trade credential' : 'Work photo'} uploaded successfully`, 'success');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setValidating(null);
    }
  };

  const handlePayment = async () => {
    const token = Cookies.get('token');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ authorization_url: string }>('/verification/init-payment', {
        method: 'POST',
        token,
      });
      if (res.data?.authorization_url) {
        window.location.href = res.data.authorization_url;
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitApplication = async () => {
    const token = Cookies.get('token');
    setSubmitting(true);
    try {
      await apiFetch('/verification/submit', {
        method: 'POST',
        token,
      });
      router.push('/dashboard/artisan');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit application', 'error');
    } finally {
      setSubmitting(false);
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
        <h1 className="text-3xl font-bold mb-2">Verification</h1>
        <p className="text-brand-gray mb-8">Complete all steps to get verified on KorrectNG</p>

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
          {currentStep === 'personal-info' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Business Information</h2>
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
                  <option value="">Select trade</option>
                  {TRADES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
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
                  placeholder="Describe your services and expertise..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
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
                  <label className="block text-sm font-medium mb-1">Years of Experience</label>
                  <input
                    type="number"
                    value={profile.yearsOfExperience}
                    onChange={(e) =>
                      setProfile({ ...profile, yearsOfExperience: parseInt(e.target.value) || 0 })
                    }
                    min={0}
                    max={50}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Full Address</label>
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
                  <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
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
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                    required
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
                Upload clear photos of your documents. Our system will automatically check if
                they meet our requirements.
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
                    <p className="text-sm text-brand-gray mt-1">Uploading and validating...</p>
                  )}
                  {application?.documents.find((d) => d.type === 'govtId') && (
                    <div className="mt-2">
                      <p className="text-sm text-green-600">✓ Uploaded</p>
                      {(() => {
                        const doc = application.documents.find((d) => d.type === 'govtId') as any;
                        if (doc?.validationResult) {
                          return (
                            <div className="mt-1">
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  doc.validationResult.isValid
                                    ? doc.validationResult.confidence === 'high'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {doc.validationResult.isValid
                                  ? `Document looks valid (${doc.validationResult.confidence} confidence)`
                                  : 'Document may have issues'}
                              </span>
                              {doc.validationResult.warnings?.map((w: string, i: number) => (
                                <p key={i} className="text-xs text-yellow-600 mt-1">
                                  ⚠️ {w}
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Trade Credential/Certificate *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={validating === 'tradeCredential'}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleDocumentUpload('tradeCredential', e.target.files[0]);
                    }}
                    className="w-full"
                  />
                  {validating === 'tradeCredential' && (
                    <p className="text-sm text-brand-gray mt-1">Uploading and validating...</p>
                  )}
                  {application?.documents.find((d) => d.type === 'tradeCredential') && (
                    <div className="mt-2">
                      <p className="text-sm text-green-600">✓ Uploaded</p>
                      {(() => {
                        const doc = application.documents.find((d) => d.type === 'tradeCredential') as any;
                        if (doc?.validationResult) {
                          return (
                            <div className="mt-1">
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  doc.validationResult.isValid
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {doc.validationResult.isValid
                                  ? 'Document looks valid'
                                  : 'Document uploaded (will be reviewed manually)'}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Work Photos (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={validating === 'workPhotos'}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleDocumentUpload('workPhotos', e.target.files[0]);
                    }}
                    className="w-full"
                  />
                  {validating === 'workPhotos' && (
                    <p className="text-sm text-brand-gray mt-1">Uploading...</p>
                  )}
                  {application?.documents.find((d) => d.type === 'workPhotos') && (
                    <p className="text-sm text-green-600 mt-1">✓ Uploaded</p>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  const token = Cookies.get('token');
                  await apiFetch('/verification/step/review', { method: 'PATCH', token });
                  setCurrentStep('review');
                }}
                disabled={
                  !application?.documents.find((d) => d.type === 'govtId') ||
                  !application?.documents.find((d) => d.type === 'tradeCredential')
                }
                className="w-full mt-6 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
              >
                Continue to Review
              </button>
            </div>
          )}

          {currentStep === 'review' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Submit for Review</h2>
              {application?.status === 'in-review' ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">⏳</div>
                  <p className="text-xl font-bold mb-2">Application Under Review</p>
                  <p className="text-brand-gray">
                    We&apos;re reviewing your application. You&apos;ll be notified once approved.
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
                    Your verification has been approved. Subscribe from your dashboard to get listed and start receiving customers.
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/artisan')}
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
                      <li>Subscribe from your dashboard to get listed</li>
                      <li>Start receiving customers!</li>
                    </ol>
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
