'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { FormTextarea, FormSelect } from '@/components/FormInput';
import Cookies from 'js-cookie';
import { DISPUTE_CATEGORIES } from '@korrectng/shared';

interface DisputeFormProps {
  contractId: string;
  contractTitle: string;
  onSuccess?: (disputeId: string) => void;
}

export default function DisputeForm({ contractId, contractTitle, onSuccess }: DisputeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!category) {
      setError('Please select a dispute category');
      return;
    }

    if (description.length < 50) {
      setError('Description must be at least 50 characters');
      return;
    }

    setLoading(true);

    try {
      const token = Cookies.get('token');
      const res = await apiFetch<{ _id: string }>('/disputes', {
        method: 'POST',
        token,
        body: JSON.stringify({
          contractId,
          category,
          description,
        }),
      });

      if (res.data?._id) {
        if (onSuccess) {
          onSuccess(res.data._id);
        } else {
          router.push(`/dashboard/customer/disputes/${res.data._id}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Open a Dispute</h2>
      <p className="text-brand-gray text-sm mb-6">
        Contract: {contractTitle}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">Before opening a dispute:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Try to resolve the issue directly with the artisan first</li>
          <li>• Gather evidence (photos, messages) to support your claim</li>
          <li>• The artisan has 48 hours to respond after you open a dispute</li>
        </ul>
      </div>

      <div className="mb-4">
        <FormSelect
          label="Dispute Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Select a category...</option>
          {DISPUTE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </FormSelect>
      </div>

      <div className="mb-6">
        <FormTextarea
          label="Describe the issue"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please provide a detailed description of the issue. Include what was agreed upon, what was delivered, and why you are unsatisfied..."
          rows={6}
          required
          hint={`${description.length}/50 characters minimum`}
        />
      </div>

      <button
        type="submit"
        disabled={loading || description.length < 50 || !category}
        className="w-full py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-semibold disabled:opacity-50"
      >
        {loading ? 'Opening Dispute...' : 'Open Dispute'}
      </button>

      <p className="text-xs text-center text-brand-gray mt-4">
        Opening a dispute will pause any pending payments until the matter is resolved.
      </p>
    </form>
  );
}
