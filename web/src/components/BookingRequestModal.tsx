'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Cookies from 'js-cookie';

interface BookingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  artisanProfileId: string;
  artisanName: string;
  trade: string;
}

export function BookingRequestModal({
  isOpen,
  onClose,
  artisanProfileId,
  artisanName,
  trade,
}: BookingRequestModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [form, setForm] = useState({
    jobType: trade,
    description: '',
    location: '',
    address: '',
    scheduledDate: '',
    scheduledTime: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      showToast('Maximum 5 images allowed', 'error');
      return;
    }

    setUploadingImages(true);
    const token = Cookies.get('token');

    try {
      const newPreviews: string[] = [];
      const newUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Create preview
        const preview = URL.createObjectURL(file);
        newPreviews.push(preview);

        // Upload to server
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/upload/image`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const data = await response.json();
        if (data.success && data.data?.url) {
          newUrls.push(data.data.url);
        }
      }

      setPreviewImages([...previewImages, ...newPreviews]);
      setImages([...images, ...newUrls]);
    } catch (error) {
      showToast('Failed to upload images', 'error');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...previewImages];
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages(newImages);
    setPreviewImages(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.description || form.description.length < 10) {
      showToast('Please describe your job in at least 10 characters', 'error');
      return;
    }

    if (!form.location || !form.address) {
      showToast('Please provide your location and address', 'error');
      return;
    }

    setLoading(true);
    const token = Cookies.get('token');

    try {
      const response = await apiFetch<any>('/bookings', {
        method: 'POST',
        token,
        body: JSON.stringify({
          artisanProfileId,
          jobType: form.jobType,
          description: form.description,
          location: form.location,
          address: form.address,
          scheduledDate: form.scheduledDate || undefined,
          scheduledTime: form.scheduledTime || undefined,
          images: images.length > 0 ? images : undefined,
        }),
      });

      if (response.data) {
        showToast('Booking request sent! The artisan will send you a quote.', 'success');
        onClose();
        router.push('/dashboard/customer/bookings');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to send booking request', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Request Booking</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Requesting service from <span className="font-semibold text-brand-green">{artisanName}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Type</label>
              <input
                type="text"
                value={form.jobType}
                onChange={(e) => setForm({ ...form, jobType: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
                placeholder="e.g., Plumbing repair, AC installation"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Describe your job <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-green min-h-[120px]"
                placeholder="Describe what you need done in detail. This helps the artisan give you an accurate quote."
                required
                minLength={10}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Photos (optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Add up to 5 photos to help the artisan understand the job
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="flex flex-wrap gap-2">
                {previewImages.map((preview, index) => (
                  <div key={index} className="relative w-20 h-20">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      x
                    </button>
                  </div>
                ))}

                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-brand-green hover:text-brand-green transition-colors"
                  >
                    {uploadingImages ? (
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-brand-green rounded-full animate-spin" />
                    ) : (
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  City/Area <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
                  placeholder="e.g., Lekki, Lagos"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Full Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
                placeholder="House number, street, landmark"
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              <p className="font-medium mb-1">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-600">
                <li>You send this request</li>
                <li>The artisan reviews and sends you a price quote</li>
                <li>You accept or decline the quote</li>
                <li>If accepted, you pay into escrow (secure)</li>
                <li>Artisan completes the job</li>
                <li>You confirm and payment is released</li>
              </ol>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
