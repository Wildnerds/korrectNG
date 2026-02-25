'use client';

import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { useAuth } from '@/context/AuthContext';

interface WebPushState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | 'default';
  error: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

/**
 * Convert a base64 URL string to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Get ArrayBuffer from Uint8Array for applicationServerKey
 */
function getApplicationServerKey(base64String: string): ArrayBuffer {
  const uint8Array = urlBase64ToUint8Array(base64String);
  return uint8Array.buffer as ArrayBuffer;
}

export function useWebPushNotifications() {
  const { user } = useAuth();
  const token = Cookies.get('token');
  const [state, setState] = useState<WebPushState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default',
    error: null,
  });

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    return isSupported;
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!checkSupport()) {
      setState((s) => ({ ...s, isSupported: false, isLoading: false }));
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      setState((s) => ({
        ...s,
        isSupported: true,
        isSubscribed: !!subscription,
        permission: Notification.permission,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setState((s) => ({
        ...s,
        isSupported: true,
        isLoading: false,
        error: 'Failed to check notification status',
      }));
    }
  }, [checkSupport]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!checkSupport() || !user || !token) {
      setState((s) => ({ ...s, error: 'Not supported or not logged in' }));
      return false;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setState((s) => ({
          ...s,
          isLoading: false,
          permission,
          error: 'Notification permission denied',
        }));
        return false;
      }

      // Get VAPID public key from server
      const vapidResponse = await fetch(`${API_BASE_URL}/web-push/vapid-public-key`);
      const vapidData = await vapidResponse.json();

      if (!vapidData.success || !vapidData.data?.publicKey) {
        throw new Error('Failed to get VAPID public key');
      }

      const applicationServerKey = getApplicationServerKey(vapidData.data.publicKey);

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Send subscription to server
      const subscribeResponse = await fetch(`${API_BASE_URL}/web-push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      const subscribeData = await subscribeResponse.json();

      if (!subscribeData.success) {
        throw new Error(subscribeData.message || 'Failed to register subscription');
      }

      setState((s) => ({
        ...s,
        isSubscribed: true,
        isLoading: false,
        permission: 'granted',
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setState((s) => ({
        ...s,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to enable notifications',
      }));
      return false;
    }
  }, [checkSupport, user, token]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!checkSupport()) {
      return false;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Notify server
        if (token) {
          await fetch(`${API_BASE_URL}/web-push/unsubscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        }
      }

      setState((s) => ({
        ...s,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setState((s) => ({
        ...s,
        isLoading: false,
        error: 'Failed to disable notifications',
      }));
      return false;
    }
  }, [checkSupport, token]);

  // Check subscription status on mount
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Re-check when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user, checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    refresh: checkSubscription,
  };
}

export default useWebPushNotifications;
