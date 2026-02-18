'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

interface TermsData {
  version: string;
  effectiveDate: string;
  content: string;
  keyChanges?: string[];
}

export default function TermsPage() {
  const [terms, setTerms] = useState<TermsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTerms() {
      try {
        const res = await apiFetch<TermsData>('/legal/terms');
        if (res.data) {
          setTerms(res.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load terms');
      } finally {
        setLoading(false);
      }
    }

    fetchTerms();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-20 text-brand-gray">Loading terms...</div>
        </div>
      </div>
    );
  }

  if (error || !terms) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error || 'Failed to load terms'}</p>
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
            <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
            <p className="text-brand-gray">
              Version {terms.version} | Effective: {new Date(terms.effectiveDate).toLocaleDateString()}
            </p>
          </div>

          {terms.keyChanges && terms.keyChanges.length > 0 && (
            <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Key Changes in This Version</h3>
              <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                {terms.keyChanges.map((change, index) => (
                  <li key={index}>{change}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{terms.content}</ReactMarkdown>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/legal/privacy" className="text-brand-green hover:underline">
            View Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
