'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { MessageBubble, QuoteMessage, ChatInput } from '@/components/chat';
import Cookies from 'js-cookie';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  type: string;
  metadata?: Record<string, any>;
  createdAt: string;
  isRead: boolean;
}

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
    _id: string;
    businessName: string;
    slug: string;
    trade: string;
  };
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const conversationId = params.conversationId as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchConversation = useCallback(async () => {
    const token = Cookies.get('token');
    try {
      const res = await apiFetch<{
        data: {
          conversation: Conversation;
          messages: Message[];
        };
      }>(`/messages/conversations/${conversationId}`, { token });

      if (res.data?.data) {
        setConversation(res.data.data.conversation);
        setMessages(res.data.data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      if (loading) {
        showToast('Failed to load conversation', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading, showToast]);

  useEffect(() => {
    fetchConversation();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchConversation, 5000);
    return () => clearInterval(interval);
  }, [fetchConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (content: string) => {
    const token = Cookies.get('token');
    try {
      const res = await apiFetch<{ data: Message }>(
        `/messages/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          token,
          body: JSON.stringify({ content }),
        }
      );

      if (res.data?.data) {
        setMessages((prev) => [...prev, res.data!.data]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showToast('Failed to send message', 'error');
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    const token = Cookies.get('token');
    setActionLoading(quoteId);
    try {
      const res = await apiFetch(`/quotes/${quoteId}/accept`, {
        method: 'POST',
        token,
      });

      if (res.success) {
        showToast('Quote accepted! Proceed to payment.', 'success');
        // Refresh messages to show the acceptance
        await fetchConversation();
      } else {
        showToast(res.error || 'Failed to accept quote', 'error');
      }
    } catch (error) {
      console.error('Failed to accept quote:', error);
      showToast('Failed to accept quote', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    const token = Cookies.get('token');
    setActionLoading(quoteId);
    try {
      const res = await apiFetch(`/quotes/${quoteId}/reject`, {
        method: 'POST',
        token,
      });

      if (res.success) {
        showToast('Quote declined', 'info');
        await fetchConversation();
      } else {
        showToast(res.error || 'Failed to decline quote', 'error');
      }
    } catch (error) {
      console.error('Failed to reject quote:', error);
      showToast('Failed to decline quote', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getOtherParty = () => {
    if (!conversation || !user) return null;
    return user.role === 'customer' ? conversation.artisan : conversation.customer;
  };

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const renderMessages = () => {
    const elements: React.ReactNode[] = [];
    let lastDate: Date | null = null;

    messages.forEach((message, index) => {
      const messageDate = new Date(message.createdAt);

      // Add date separator if different day
      if (!lastDate || !isSameDay(lastDate, messageDate)) {
        elements.push(
          <div
            key={`date-${message._id}`}
            className="flex justify-center my-4"
          >
            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
              {formatDateSeparator(messageDate)}
            </span>
          </div>
        );
        lastDate = messageDate;
      }

      const isOwn = message.sender._id === user?._id;
      const isQuoteMessage = [
        'quote_sent',
        'quote_revised',
        'quote_accepted',
        'quote_rejected',
      ].includes(message.type);

      if (isQuoteMessage) {
        elements.push(
          <QuoteMessage
            key={message._id}
            content={message.content}
            sender={message.sender}
            createdAt={message.createdAt}
            isOwn={isOwn}
            type={message.type as any}
            metadata={message.metadata}
            onAccept={handleAcceptQuote}
            onReject={handleRejectQuote}
            showActions={
              !isOwn &&
              message.type === 'quote_sent' &&
              user?.role === 'customer'
            }
            actionLoading={actionLoading === message.metadata?.quoteId}
          />
        );
      } else {
        elements.push(
          <MessageBubble
            key={message._id}
            content={message.content}
            sender={message.sender}
            createdAt={message.createdAt}
            isOwn={isOwn}
            type={message.type}
          />
        );
      }
    });

    return elements;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            <div className="ml-3">
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading conversation...</p>
        </div>
      </div>
    );
  }

  const otherParty = getOtherParty();

  return (
    <div className="min-h-screen bg-brand-light-gray flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center">
          {/* Back button */}
          <Link
            href="/dashboard/messages"
            className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>

          {/* Avatar */}
          {otherParty?.avatar ? (
            <img
              src={otherParty.avatar}
              alt={`${otherParty.firstName} ${otherParty.lastName}`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand-green text-white flex items-center justify-center font-semibold">
              {otherParty?.firstName[0]}
              {otherParty?.lastName[0]}
            </div>
          )}

          {/* Name and info */}
          <div className="ml-3 flex-1">
            <h2 className="font-semibold text-brand-black">
              {otherParty?.firstName} {otherParty?.lastName}
            </h2>
            {user?.role === 'customer' && conversation?.artisanProfile && (
              <Link
                href={`/artisan/${conversation.artisanProfile.slug}`}
                className="text-sm text-brand-green hover:underline"
              >
                {conversation.artisanProfile.businessName}
              </Link>
            )}
          </div>

          {/* Actions */}
          {user?.role === 'customer' && conversation?.artisanProfile && (
            <Link
              href={`/artisan/${conversation.artisanProfile.slug}`}
              className="px-4 py-2 bg-brand-green text-white text-sm font-medium rounded-lg hover:bg-brand-green-dark transition-colors"
            >
              View Profile
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">👋</div>
              <p className="text-gray-500">Start a conversation!</p>
            </div>
          ) : (
            renderMessages()
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSend={handleSendMessage}
            placeholder="Type a message..."
          />
        </div>
      </div>
    </div>
  );
}
