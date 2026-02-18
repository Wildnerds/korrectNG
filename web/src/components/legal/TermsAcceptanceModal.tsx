'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import Cookies from 'js-cookie';
import ReactMarkdown from 'react-markdown';

interface Props {
  onAccept: () => void;
  onDecline?: () => void;
}

interface TermsData {
  version: string;
  effectiveDate: string;
  content: string;
  keyChanges?: string[];
}

export default function TermsAcceptanceModal({ onAccept, onDecline }: Props) {
  const [terms, setTerms] = useState<TermsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError('');

    try {
      const token = Cookies.get('token');
      await apiFetch('/legal/accept-terms', {
        method: 'POST',
        token,
      });
      onAccept();
    } catch (err: any) {
      setError(err.message || 'Failed to accept terms');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Updated Terms of Service</h2>
          {terms && (
            <p className="text-sm text-brand-gray mt-1">
              Version {terms.version} | Effective: {new Date(terms.effectiveDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-8 text-center text-brand-gray">Loading terms...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : terms ? (
          <>
            {/* Key Changes Banner */}
            {terms.keyChanges && terms.keyChanges.length > 0 && (
              <div className="mx-6 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 text-sm mb-1">Key Changes</h4>
                <ul className="list-disc list-inside text-xs text-blue-700 space-y-0.5">
                  {terms.keyChanges.map((change, index) => (
                    <li key={index}>{change}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Terms Content (Scrollable) */}
            <div
              className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none"
              onScroll={handleScroll}
            >
              <ReactMarkdown>{terms.content}</ReactMarkdown>
            </div>

            {/* Scroll indicator */}
            {!scrolledToBottom && (
              <div className="px-6 py-2 text-center text-sm text-brand-gray bg-gray-50 border-t">
                Please scroll to read the full terms
              </div>
            )}
          </>
        ) : null}

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-brand-gray">
              By clicking &quot;Accept&quot;, you agree to our{' '}
              <Link href="/legal/terms" target="_blank" className="text-brand-green hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/legal/privacy" target="_blank" className="text-brand-green hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="flex gap-3">
              {onDecline && (
                <button
                  onClick={onDecline}
                  className="px-4 py-2 text-sm font-medium text-brand-gray hover:text-brand-black transition-colors"
                >
                  Decline
                </button>
              )}
              <button
                onClick={handleAccept}
                disabled={accepting || !scrolledToBottom}
                className="px-6 py-2 bg-brand-green text-white rounded-md text-sm font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {accepting ? 'Accepting...' : 'Accept'}
              </button>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
