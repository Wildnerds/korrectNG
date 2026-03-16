'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConversationList } from '@/components/chat';
import Cookies from 'js-cookie';

interface Conversation {
  _id: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  artisan: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  artisanProfile?: {
    businessName: string;
    slug: string;
    trade: string;
  };
  lastMessage?: {
    content: string;
    sender: string;
    createdAt: string;
  };
  unreadCount: number;
  lastMessageAt: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchConversations();
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    const token = Cookies.get('token');
    try {
      const res = await apiFetch<{ data: { conversations: Conversation[] } }>(
        '/messages/conversations?limit=50',
        { token }
      );
      if (res.data?.data?.conversations) {
        setConversations(res.data.data.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      if (loading) {
        showToast('Failed to load messages', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = filter === 'unread'
    ? conversations.filter((c) => c.unreadCount > 0)
    : conversations;

  const unreadCount = conversations.filter((c) => c.unreadCount > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
            <div className="bg-white rounded-xl p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-48" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-black">Messages</h1>
            <p className="text-gray-500 text-sm">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              {unreadCount > 0 && `, ${unreadCount} unread`}
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-brand-orange text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conversations list */}
        <ConversationList
          conversations={filteredConversations}
          currentUserId={user?._id || ''}
          userRole={(user?.role as 'customer' | 'artisan') || 'customer'}
          emptyMessage={
            filter === 'unread'
              ? 'No unread messages'
              : 'No conversations yet'
          }
        />
      </div>
    </div>
  );
}
