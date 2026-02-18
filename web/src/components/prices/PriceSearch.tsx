'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface SearchResult {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  qualityTier: string;
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  sourceCount: number;
}

interface Props {
  trade?: string;
  onSelect?: (item: SearchResult) => void;
}

export default function PriceSearch({ trade, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (query.length < 2) return;

    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams({ q: query });
      if (trade) params.append('trade', trade);

      const res = await apiFetch<SearchResult[]>(`/prices/search?${params}`);
      setResults(res.data || []);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const tierLabels: Record<string, string> = {
    budget: 'Budget',
    standard: 'Standard',
    premium: 'Premium',
    oem: 'OEM/Original',
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Check Market Prices</h3>

      {/* Search Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for parts or materials..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          disabled={loading || query.length < 2}
          className="px-4 py-2 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {searched && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="text-brand-gray text-sm text-center py-4">
              No items found. Try a different search term.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((item) => (
                <div
                  key={item._id}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onSelect?.(item)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-brand-gray">
                        {item.category}
                        {item.brand && ` • ${item.brand}`}
                        {' • '}
                        <span className="capitalize">{tierLabels[item.qualityTier] || item.qualityTier}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-green">
                        ₦{item.currentPrice.toLocaleString()}
                      </p>
                      <p className="text-xs text-brand-gray">
                        Range: ₦{item.minPrice.toLocaleString()} - ₦{item.maxPrice.toLocaleString()}
                      </p>
                      <p className="text-xs text-brand-gray">
                        {item.sourceCount} source{item.sourceCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-brand-gray mt-4">
        Prices are updated regularly from verified suppliers and market data.
        Use this to verify quotes from artisans.
      </p>
    </div>
  );
}
