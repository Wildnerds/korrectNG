'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import Cookies from 'js-cookie';

interface Props {
  artisanId: string;
  artisanName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WarrantyClaimModal({ artisanId, artisanName, isOpen, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    jobDescription: '',
    issueDescription: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const token = Cookies.get('token');
      if (!token) {
        setError('Please sign in to submit a warranty claim');
        return;
      }

      await apiFetch('/warranty/claim', {
        method: 'POST',
        body: JSON.stringify({
          artisanId,
          ...form,
        }),
        token,
      });

      setForm({ jobDescription: '', issueDescription: '' });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit warranty claim');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">Submit Warranty Claim</h2>
            <p className="text-sm text-brand-gray">Against {artisanName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-700">
            If you've had work done by this artisan and there's an issue with the quality or service,
            you can submit a warranty claim. The artisan will be notified and can respond.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">What job was done?</label>
            <input
              type="text"
              value={form.jobDescription}
              onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
              placeholder="e.g., AC repair, car brake replacement"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
              required
              minLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">What's the issue?</label>
            <textarea
              value={form.issueDescription}
              onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
              placeholder="Describe the problem in detail..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
              required
              minLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 10 characters</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-brand-orange text-white rounded-md hover:opacity-90 transition-colors font-semibold disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
