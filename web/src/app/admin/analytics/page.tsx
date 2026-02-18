'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { getTradeLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface Analytics {
  topTrades: { _id: string; count: number }[];
  topLocations: { _id: string; count: number }[];
  totalSearches: number;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      const token = Cookies.get('token');
      try {
        const res = await apiFetch<Analytics>('/admin/analytics', { token });
        setAnalytics(res.data || null);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6">
          <p className="text-sm text-brand-gray mb-1">Total Searches (90 days)</p>
          <p className="text-4xl font-bold text-brand-green">{analytics?.totalSearches || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Top Searched Trades</h2>
          {analytics?.topTrades?.length ? (
            <div className="space-y-3">
              {analytics.topTrades.map((item, idx) => (
                <div key={item._id} className="flex justify-between items-center">
                  <span>
                    <span className="text-brand-gray mr-2">{idx + 1}.</span>
                    {getTradeLabel(item._id)}
                  </span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-brand-gray">No data yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Top Searched Locations</h2>
          {analytics?.topLocations?.length ? (
            <div className="space-y-3">
              {analytics.topLocations.map((item, idx) => (
                <div key={item._id} className="flex justify-between items-center">
                  <span>
                    <span className="text-brand-gray mr-2">{idx + 1}.</span>
                    {item._id}
                  </span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-brand-gray">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
