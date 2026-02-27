'use client';

import { useState } from 'react';
import { DELIVERY_TYPES, getProductUnitLabel } from '@korrectng/shared';

interface OrderItem {
  product: {
    _id: string;
    name: string;
    price: number;
    unit: string;
    images?: { url: string }[];
  };
  quantity: number;
  totalPrice: number;
}

interface MerchantInfo {
  _id: string;
  businessName: string;
  deliveryAreas: string[];
  defaultDeliveryFee: number;
  freeDeliveryThreshold?: number;
}

interface MaterialOrderFormProps {
  merchant: MerchantInfo;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  bookingId?: string;
  artisanAddress?: string;
  onSubmit: (data: {
    deliveryType: string;
    deliveryAddress: string;
    deliveryInstructions?: string;
    scheduledDeliveryDate?: string;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function MaterialOrderForm({
  merchant,
  items,
  subtotal,
  deliveryFee,
  totalAmount,
  bookingId,
  artisanAddress,
  onSubmit,
  onCancel,
  loading = false,
}: MaterialOrderFormProps) {
  const [deliveryType, setDeliveryType] = useState<string>(
    bookingId ? 'job_site' : 'customer_address'
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    bookingId && artisanAddress ? artisanAddress : ''
  );
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      deliveryType,
      deliveryAddress: deliveryType === 'pickup' ? merchant.businessName : deliveryAddress,
      deliveryInstructions: deliveryInstructions || undefined,
      scheduledDeliveryDate: scheduledDate || undefined,
    });
  };

  const actualDeliveryFee =
    deliveryType === 'pickup'
      ? 0
      : merchant.freeDeliveryThreshold && subtotal >= merchant.freeDeliveryThreshold
        ? 0
        : deliveryFee;

  const actualTotal = subtotal + actualDeliveryFee;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Order Summary</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                {item.product.images?.[0] ? (
                  <img
                    src={item.product.images[0].url}
                    alt={item.product.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <span className="text-lg">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product.name}</p>
                <p className="text-xs text-brand-gray">
                  {item.quantity} {getProductUnitLabel(item.product.unit)} @ NGN{item.product.price.toLocaleString()}
                </p>
              </div>
              <p className="font-medium">NGN{item.totalPrice.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Options */}
      <div>
        <label className="block text-sm font-medium mb-2">Delivery Option</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {bookingId && (
            <button
              type="button"
              onClick={() => setDeliveryType('job_site')}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                deliveryType === 'job_site'
                  ? 'border-brand-green bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium">Job Site</p>
              <p className="text-xs text-brand-gray">Deliver to artisan's work location</p>
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeliveryType('customer_address')}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${
              deliveryType === 'customer_address'
                ? 'border-brand-green bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="font-medium">My Address</p>
            <p className="text-xs text-brand-gray">Deliver to your location</p>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryType('pickup')}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${
              deliveryType === 'pickup'
                ? 'border-brand-green bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="font-medium">Pickup</p>
            <p className="text-xs text-brand-gray">Collect from merchant</p>
          </button>
        </div>
      </div>

      {/* Delivery Address */}
      {deliveryType !== 'pickup' && (
        <div>
          <label className="block text-sm font-medium mb-1">Delivery Address</label>
          <textarea
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Enter full delivery address..."
            rows={2}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
          />
          {merchant.deliveryAreas.length > 0 && (
            <p className="text-xs text-brand-gray mt-1">
              Delivery areas: {merchant.deliveryAreas.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Delivery Instructions */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Delivery Instructions (Optional)
        </label>
        <input
          type="text"
          value={deliveryInstructions}
          onChange={(e) => setDeliveryInstructions(e.target.value)}
          placeholder="e.g., Call when arriving, gate code is 1234..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
        />
      </div>

      {/* Scheduled Date */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Preferred Delivery Date (Optional)
        </label>
        <input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
        />
      </div>

      {/* Price Breakdown */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>NGN{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Delivery Fee</span>
          <span>
            {actualDeliveryFee > 0 ? (
              `NGN${actualDeliveryFee.toLocaleString()}`
            ) : (
              <span className="text-green-600">Free</span>
            )}
          </span>
        </div>
        {merchant.freeDeliveryThreshold && subtotal < merchant.freeDeliveryThreshold && (
          <p className="text-xs text-brand-gray">
            Add NGN{(merchant.freeDeliveryThreshold - subtotal).toLocaleString()} more for free delivery
          </p>
        )}
        <div className="flex justify-between font-bold text-lg pt-2 border-t">
          <span>Total</span>
          <span className="text-brand-green">NGN{actualTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Escrow Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        <strong>Secure Payment:</strong> Your payment will be held in escrow until you confirm
        receipt of the materials. This protects both you and the merchant.
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-md font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || (deliveryType !== 'pickup' && !deliveryAddress.trim())}
          className="flex-1 px-4 py-3 bg-brand-green text-white rounded-md font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating Order...' : 'Place Order'}
        </button>
      </div>
    </form>
  );
}

export default MaterialOrderForm;
