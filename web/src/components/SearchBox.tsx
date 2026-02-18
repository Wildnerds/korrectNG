'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TRADES, LOCATIONS } from '@korrectng/shared';

interface Props {
  initialTrade?: string;
  initialLocation?: string;
  variant?: 'hero' | 'compact';
}

export default function SearchBox({ initialTrade = '', initialLocation = '', variant = 'hero' }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trade, setTrade] = useState(initialTrade);
  const [location, setLocation] = useState(initialLocation);
  const [showTradeDropdown, setShowTradeDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [locationQuery, setLocationQuery] = useState(initialLocation);

  const tradeRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Get current trade label
  const selectedTrade = TRADES.find(t => t.value === trade);

  // Filter locations based on input
  const filteredLocations = LOCATIONS.filter(loc =>
    loc.toLowerCase().includes(locationQuery.toLowerCase())
  );

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tradeRef.current && !tradeRef.current.contains(event.target as Node)) {
        setShowTradeDropdown(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-search with debounce
  const performSearch = useCallback((newTrade: string, newLocation: string) => {
    setIsSearching(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (newTrade) params.set('trade', newTrade);
      if (newLocation) params.set('location', newLocation);

      // Preserve sort if on search page
      const currentSort = searchParams.get('sort');
      if (currentSort) params.set('sort', currentSort);

      router.push(`/search?${params.toString()}`);
      setIsSearching(false);
    }, 400);
  }, [router, searchParams]);

  // Trigger search when trade or location changes
  const handleTradeSelect = (value: string) => {
    setTrade(value);
    setShowTradeDropdown(false);
    performSearch(value, location);
  };

  const handleLocationSelect = (value: string) => {
    setLocation(value);
    setLocationQuery(value);
    setShowLocationDropdown(false);
    performSearch(trade, value);
  };

  const handleLocationInput = (value: string) => {
    setLocationQuery(value);
    setShowLocationDropdown(true);

    // If it's an exact match, set it
    const exactMatch = LOCATIONS.find(loc => loc.toLowerCase() === value.toLowerCase());
    if (exactMatch) {
      setLocation(exactMatch);
      performSearch(trade, exactMatch);
    } else if (value === '') {
      setLocation('');
      performSearch(trade, '');
    }
  };

  const clearFilters = () => {
    setTrade('');
    setLocation('');
    setLocationQuery('');
    router.push('/search');
  };

  const isCompact = variant === 'compact';

  return (
    <div className={`${isCompact ? 'bg-white rounded-xl shadow-lg' : 'bg-white/10 backdrop-blur-sm rounded-2xl'} p-4 md:p-6 max-w-4xl mx-auto overflow-visible`}>
      <div className="flex flex-col md:flex-row gap-4 overflow-visible">
        {/* Trade Selector */}
        <div className="flex-1" ref={tradeRef}>
          <label className={`block text-sm font-semibold mb-2 ${isCompact ? 'text-brand-black' : 'text-white/90'}`}>
            What do you need?
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTradeDropdown(!showTradeDropdown)}
              className={`w-full px-4 py-3.5 rounded-xl text-left flex items-center justify-between transition-all ${
                isCompact
                  ? 'bg-gray-50 border-2 border-gray-200 hover:border-brand-green focus:border-brand-green text-brand-black'
                  : 'bg-white text-brand-black hover:shadow-md'
              }`}
            >
              <span className="flex items-center gap-3">
                {selectedTrade ? (
                  <>
                    <span className="text-xl">{selectedTrade.icon}</span>
                    <span className="font-medium">{selectedTrade.label}</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🔍</span>
                    <span className="text-gray-500">Select a service</span>
                  </>
                )}
              </span>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${showTradeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Trade Dropdown */}
            {showTradeDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-white text-brand-black rounded-xl shadow-xl border border-gray-100 py-2 max-h-80 overflow-y-auto animate-fade-in animate-slide-down">
                <button
                  onClick={() => handleTradeSelect('')}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <span className="text-xl">🔍</span>
                  <span className="text-gray-600">All Services</span>
                </button>
                {TRADES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => handleTradeSelect(t.value)}
                    className={`w-full px-4 py-3 text-left hover:bg-brand-green/5 flex items-center gap-3 transition-colors ${
                      trade === t.value ? 'bg-brand-green/10 text-brand-green' : ''
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="font-medium">{t.label}</span>
                    {trade === t.value && (
                      <svg className="w-5 h-5 ml-auto text-brand-green" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Location Input */}
        <div className="flex-1" ref={locationRef}>
          <label className={`block text-sm font-semibold mb-2 ${isCompact ? 'text-brand-black' : 'text-white/90'}`}>
            Where?
          </label>
          <div className="relative">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => handleLocationInput(e.target.value)}
                onFocus={() => setShowLocationDropdown(true)}
                placeholder="Enter your area"
                className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-all ${
                  isCompact
                    ? 'bg-gray-50 border-2 border-gray-200 hover:border-brand-green focus:border-brand-green focus:outline-none text-brand-black'
                    : 'bg-white text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-green/50'
                }`}
              />
              {location && (
                <button
                  onClick={() => {
                    setLocation('');
                    setLocationQuery('');
                    performSearch(trade, '');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Location Dropdown */}
            {showLocationDropdown && filteredLocations.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white text-brand-black rounded-xl shadow-xl border border-gray-100 py-2 max-h-60 overflow-y-auto animate-fade-in animate-slide-down">
                {filteredLocations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => handleLocationSelect(loc)}
                    className={`w-full px-4 py-3 text-left hover:bg-brand-green/5 flex items-center gap-3 transition-colors ${
                      location === loc ? 'bg-brand-green/10 text-brand-green' : ''
                    }`}
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span>{loc}</span>
                    {location === loc && (
                      <svg className="w-5 h-5 ml-auto text-brand-green" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search indicator / Clear button */}
        <div className="flex items-end">
          {isSearching ? (
            <div className={`px-6 py-3.5 rounded-xl flex items-center gap-2 ${isCompact ? 'bg-brand-green/10' : 'bg-white/20'}`}>
              <div className="w-5 h-5 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
              <span className={isCompact ? 'text-brand-green' : 'text-white'}>Searching...</span>
            </div>
          ) : (trade || location) ? (
            <button
              onClick={clearFilters}
              className={`px-6 py-3.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                isCompact
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {/* Quick Trade Filters - Only show on hero variant */}
      {variant === 'hero' && (
        <div className="mt-4 sm:mt-6">
          <p className="text-white/70 text-xs sm:text-sm text-center mb-2 sm:mb-3">Popular Services:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {TRADES.slice(0, 5).map((t) => (
              <button
                key={t.value}
                onClick={() => handleTradeSelect(t.value)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                  trade === t.value
                    ? 'bg-white text-brand-green'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <span className="text-sm sm:text-base">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
