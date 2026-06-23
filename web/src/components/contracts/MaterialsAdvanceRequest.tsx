'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { formatNaira } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface MaterialItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Props {
  escrowId: string;
  remainingBalance: number;
  onSuccess: () => void;
}

export default function MaterialsAdvanceRequest({ escrowId, remainingBalance, onSuccess }: Props) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<MaterialItem[]>([
    { name: '', quantity: 1, unitPrice: 0, totalPrice: 0 },
  ]);
  const [reason, setReason] = useState('');

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const updateItem = (index: number, field: keyof MaterialItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'name') {
      newItems[index].name = value as string;
    } else if (field === 'quantity') {
      newItems[index].quantity = Math.max(1, Number(value));
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    } else if (field === 'unitPrice') {
      newItems[index].unitPrice = Math.max(0, Number(value));
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    }
    setItems(newItems);
  };

  const addItem = () => {
    if (items.length < 20) {
      setItems([...items, { name: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
    }
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const validItems = items.filter(item => item.name.trim() && item.totalPrice > 0);
    if (validItems.length === 0) {
      showToast('Please add at least one material item', 'error');
      return;
    }

    if (!reason.trim() || reason.length < 10) {
      showToast('Please provide a reason (at least 10 characters)', 'error');
      return;
    }

    if (totalAmount > remainingBalance) {
      showToast(`Amount exceeds remaining escrow balance (${formatNaira(remainingBalance)})`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = Cookies.get('token');
      await apiFetch('/materials-advance/request', {
        method: 'POST',
        body: JSON.stringify({
          escrowId,
          items: validItems,
          reason: reason.trim(),
        }),
        token,
      });

      showToast('Materials advance request submitted', 'success');
      setIsOpen(false);
      setItems([{ name: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
      setReason('');
      onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 bg-brand-orange text-white rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Request Materials Advance
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-brand-orange">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Request Materials Advance</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-brand-gray mb-4">
        Request additional funds for materials. The customer will review and approve the itemized list.
        Available balance: <span className="font-semibold text-brand-green">{formatNaira(remainingBalance)}</span>
      </p>

      <form onSubmit={handleSubmit}>
        {/* Material Items */}
        <div className="space-y-3 mb-4">
          <label className="block text-sm font-medium">Material Items</label>
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                placeholder="Material name"
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:border-brand-green"
                required
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                min="1"
                className="w-16 px-2 py-2 border rounded-md text-sm text-center focus:outline-none focus:border-brand-green"
              />
              <input
                type="number"
                value={item.unitPrice || ''}
                onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                placeholder="Price"
                min="0"
                className="w-24 px-2 py-2 border rounded-md text-sm focus:outline-none focus:border-brand-green"
              />
              <span className="py-2 text-sm font-medium w-24 text-right">
                {formatNaira(item.totalPrice)}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {items.length < 20 && (
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-brand-green hover:underline flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add another item
            </button>
          )}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center py-3 border-t border-b mb-4">
          <span className="font-medium">Total Amount:</span>
          <span className={`text-xl font-bold ${totalAmount > remainingBalance ? 'text-red-500' : 'text-brand-green'}`}>
            {formatNaira(totalAmount)}
          </span>
        </div>

        {totalAmount > remainingBalance && (
          <p className="text-sm text-red-500 mb-4">
            Amount exceeds available escrow balance
          </p>
        )}

        {/* Reason */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Reason for Request</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you need these materials..."
            rows={3}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:border-brand-green"
            required
            minLength={10}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || totalAmount > remainingBalance || totalAmount === 0}
            className="flex-1 py-2 bg-brand-orange text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
