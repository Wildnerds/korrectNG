'use client';

import { useState, useEffect } from 'react';
import { useWebPushNotifications } from '@/hooks/useWebPushNotifications';
import { useAuth } from '@/context/AuthContext';

interface NotificationPromptProps {
  variant?: 'banner' | 'button' | 'inline';
  showDismiss?: boolean;
  className?: string;
}

export function NotificationPrompt({
  variant = 'banner',
  showDismiss = true,
  className = '',
}: NotificationPromptProps) {
  const { user } = useAuth();
  const { isSupported, isSubscribed, isLoading, permission, error, subscribe, unsubscribe } =
    useWebPushNotifications();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user has dismissed the prompt before
  useEffect(() => {
    const dismissed = localStorage.getItem('notification-prompt-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setIsDismissed(true);
    }
  };

  const handleDisable = async () => {
    await unsubscribe();
  };

  // Don't show if not supported, not logged in, or dismissed
  if (!isSupported || !user || (isDismissed && !isSubscribed)) {
    return null;
  }

  // Banner variant - shows at top/bottom of page
  if (variant === 'banner' && !isSubscribed && permission !== 'denied') {
    return (
      <div
        className={`bg-brand-green text-white px-4 py-3 flex items-center justify-between gap-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🔔</span>
          <p className="text-sm">
            <strong>Stay updated!</strong> Enable notifications to get instant updates on bookings,
            messages, and more.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEnable}
            disabled={isLoading}
            className="bg-white text-brand-green px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
          >
            {isLoading ? 'Enabling...' : 'Enable'}
          </button>
          {showDismiss && (
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white p-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  // Button variant - for settings page or header
  if (variant === 'button') {
    if (permission === 'denied') {
      return (
        <div className={`text-sm text-gray-500 ${className}`}>
          <p>Notifications blocked. Please enable in browser settings.</p>
        </div>
      );
    }

    return (
      <button
        onClick={isSubscribed ? handleDisable : handleEnable}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isSubscribed
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-brand-green text-white hover:bg-brand-green/90'
        } disabled:opacity-50 ${className}`}
      >
        <span>{isSubscribed ? '🔔' : '🔕'}</span>
        {isLoading
          ? 'Processing...'
          : isSubscribed
            ? 'Notifications On'
            : 'Enable Notifications'}
      </button>
    );
  }

  // Inline variant - for settings page
  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg ${className}`}>
        <div>
          <h4 className="font-medium text-gray-900">Push Notifications</h4>
          <p className="text-sm text-gray-500">
            {isSubscribed
              ? 'You will receive notifications for bookings, messages, and updates.'
              : 'Get instant updates about your bookings and messages.'}
          </p>
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          {permission === 'denied' && (
            <p className="text-sm text-amber-600 mt-1">
              Notifications are blocked. Please enable in your browser settings.
            </p>
          )}
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isSubscribed}
            onChange={(e) => (e.target.checked ? handleEnable() : handleDisable())}
            disabled={isLoading || permission === 'denied'}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green peer-disabled:opacity-50"></div>
        </label>
      </div>
    );
  }

  return null;
}

// Small bell icon button for header
export function NotificationBell({ className = '' }: { className?: string }) {
  const { user } = useAuth();
  const { isSupported, isSubscribed, subscribe } = useWebPushNotifications();
  const [showTooltip, setShowTooltip] = useState(false);

  if (!isSupported || !user || isSubscribed) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => subscribe()}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative p-2 text-gray-500 hover:text-brand-green transition-colors"
        aria-label="Enable notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
      </button>
      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap">
          Enable notifications
        </div>
      )}
    </div>
  );
}

export default NotificationPrompt;
