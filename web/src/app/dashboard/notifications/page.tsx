'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const notificationIcons: Record<string, { icon: string; color: string }> = {
  booking_request: { icon: '📋', color: 'bg-blue-100 text-blue-600' },
  booking_accepted: { icon: '✅', color: 'bg-green-100 text-green-600' },
  booking_rejected: { icon: '❌', color: 'bg-red-100 text-red-600' },
  booking_completed: { icon: '🎉', color: 'bg-purple-100 text-purple-600' },
  quote_received: { icon: '💰', color: 'bg-yellow-100 text-yellow-600' },
  quote_accepted: { icon: '🤝', color: 'bg-green-100 text-green-600' },
  quote_declined: { icon: '👎', color: 'bg-gray-100 text-gray-600' },
  payment_received: { icon: '💵', color: 'bg-green-100 text-green-600' },
  new_review: { icon: '⭐', color: 'bg-yellow-100 text-yellow-600' },
  new_message: { icon: '💬', color: 'bg-blue-100 text-blue-600' },
  verification_approved: { icon: '✓', color: 'bg-green-100 text-green-600' },
  verification_rejected: { icon: '✗', color: 'bg-red-100 text-red-600' },
  welcome: { icon: '👋', color: 'bg-brand-green/10 text-brand-green' },
  system: { icon: '🔔', color: 'bg-gray-100 text-gray-600' },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchNotifications();
  }, [user, filter]);

  const fetchNotifications = async (skip = 0) => {
    try {
      const params = new URLSearchParams({
        limit: '20',
        skip: skip.toString(),
        ...(filter === 'unread' && { unreadOnly: 'true' }),
      });

      const res = await apiFetch<{
        notifications: Notification[];
        total: number;
        unreadCount: number;
      }>(`/notifications?${params}`);

      const newNotifications = res.data?.notifications || [];
      if (skip === 0) {
        setNotifications(newNotifications);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }
      const currentCount = skip === 0 ? newNotifications.length : notifications.length + newNotifications.length;
      setHasMore(currentCount < (res.data?.total || 0));
    } catch (error) {
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    setLoadingMore(true);
    fetchNotifications(notifications.length);
  };

  const markAsRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      // Silently fail
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      showToast('All notifications marked as read', 'success');
    } catch (error) {
      showToast('Failed to mark all as read', 'error');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationStyle = (type: string) => {
    return notificationIcons[type] || notificationIcons.system;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center py-20">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-brand-green hover:underline text-sm font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-brand-green text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-brand-green text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Unread
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">🔔</div>
            <p className="text-gray-500 mb-2">No notifications yet</p>
            <p className="text-sm text-gray-400">
              You'll be notified about bookings, quotes, and more
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notification => {
              const style = getNotificationStyle(notification.type);
              return (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                    !notification.isRead ? 'border-l-4 border-brand-green' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${style.color}`}
                    >
                      <span className="text-lg">{style.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3
                          className={`font-medium ${
                            !notification.isRead ? 'text-brand-black' : 'text-gray-600'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.link && (
                        <p className="text-xs text-brand-green mt-2">
                          Tap to view details
                        </p>
                      )}
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-brand-green rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-white text-brand-green border border-brand-green rounded-lg hover:bg-brand-green hover:text-white transition-colors font-medium disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
