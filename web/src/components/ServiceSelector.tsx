'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import type { ArtisanService } from '@korrectng/shared';

interface ServiceSelectorProps {
  trade: string;
  selectedServices: ArtisanService[];
  onChange: (services: ArtisanService[]) => void;
  maxServices?: number;
}

export default function ServiceSelector({
  trade,
  selectedServices,
  onChange,
  maxServices = 15,
}: ServiceSelectorProps) {
  const [availableServices, setAvailableServices] = useState<{ value: string; label: string }[]>([]);
  const [customService, setCustomService] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch predefined services when trade changes
  const fetchServices = useCallback(async () => {
    if (!trade || trade === 'other') {
      setAvailableServices([]);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ value: string; label: string }[]>(`/services/by-trade/${trade}`);
      if (res.data) {
        setAvailableServices(res.data);
      }
    } catch {
      setAvailableServices([]);
    } finally {
      setLoading(false);
    }
  }, [trade]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const isSelected = (value: string) => {
    return selectedServices.some((s) => s.value === value);
  };

  const toggleService = (service: { value: string; label: string }) => {
    if (isSelected(service.value)) {
      onChange(selectedServices.filter((s) => s.value !== service.value));
    } else if (selectedServices.length < maxServices) {
      onChange([...selectedServices, { ...service, isCustom: false }]);
    }
  };

  const addCustomService = () => {
    const trimmed = customService.trim();
    if (!trimmed || selectedServices.length >= maxServices) return;

    // Generate value from label
    const value = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Check if already exists
    if (selectedServices.some((s) => s.value === value || s.label.toLowerCase() === trimmed.toLowerCase())) {
      setCustomService('');
      return;
    }

    onChange([
      ...selectedServices,
      {
        value,
        label: trimmed,
        isCustom: true,
      },
    ]);
    setCustomService('');
  };

  const removeService = (value: string) => {
    onChange(selectedServices.filter((s) => s.value !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomService();
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Services */}
      {selectedServices.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2 text-brand-gray">
            Selected Services ({selectedServices.length}/{maxServices})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedServices.map((service) => (
              <span
                key={service.value}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                  service.isCustom
                    ? 'bg-brand-orange/10 text-brand-orange border border-brand-orange/30'
                    : 'bg-brand-green/10 text-brand-green border border-brand-green/30'
                }`}
              >
                {service.label}
                <button
                  type="button"
                  onClick={() => removeService(service.value)}
                  className="ml-1 hover:text-red-500 transition-colors"
                  aria-label={`Remove ${service.label}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Available Services (only for standard trades) */}
      {trade && trade !== 'other' && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Available Services for Your Trade
          </label>
          {loading ? (
            <div className="flex items-center gap-2 text-brand-gray">
              <div className="w-4 h-4 border-2 border-brand-green border-t-transparent rounded-full animate-spin"></div>
              Loading services...
            </div>
          ) : availableServices.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableServices.map((service) => {
                const selected = isSelected(service.value);
                return (
                  <button
                    key={service.value}
                    type="button"
                    onClick={() => toggleService(service)}
                    disabled={!selected && selectedServices.length >= maxServices}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selected
                        ? 'bg-brand-green text-white'
                        : 'bg-gray-100 text-brand-gray hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {selected ? '- ' : '+ '}
                    {service.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-brand-gray">No predefined services available for this trade.</p>
          )}
        </div>
      )}

      {/* Custom Service Input */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Add Custom Service
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customService}
            onChange={(e) => setCustomService(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Emergency Repairs, Home Visits..."
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
            disabled={selectedServices.length >= maxServices}
          />
          <button
            type="button"
            onClick={addCustomService}
            disabled={!customService.trim() || selectedServices.length >= maxServices}
            className="px-4 py-2 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Press Enter or click Add to include a custom service not in the list
        </p>
      </div>

      {selectedServices.length >= maxServices && (
        <p className="text-sm text-brand-orange">
          Maximum of {maxServices} services reached. Remove some to add more.
        </p>
      )}
    </div>
  );
}
