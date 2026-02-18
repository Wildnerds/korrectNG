'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

interface PrivacyData {
  version: string;
  effectiveDate: string;
  content: string;
}

export default function PrivacyPage() {
  const [privacy, setPrivacy] = useState<PrivacyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPrivacy() {
      try {
        const res = await apiFetch<PrivacyData>('/legal/privacy');
        if (res.data) {
          setPrivacy(res.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load privacy policy');
      } finally {
        setLoading(false);
      }
    }

    fetchPrivacy();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-20 text-brand-gray">Loading privacy policy...</div>
        </div>
      </div>
    );
  }

  if (error || !privacy) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error || 'Failed to load privacy policy'}</p>
            <Link href="/" className="text-brand-green hover:underline">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-brand-gray hover:text-brand-green mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div className="bg-white rounded-xl p-8 shadow-sm">
          <div className="mb-8 pb-6 border-b">
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-brand-gray">
              Version {privacy.version} | Effective: {new Date(privacy.effectiveDate).toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{privacy.content}</ReactMarkdown>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/legal/terms" className="text-brand-green hover:underline">
            View Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
