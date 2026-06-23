'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

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

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  userRole: 'customer' | 'artisan';
  emptyMessage?: string;
}

export default function ConversationList({
  conversations,
  currentUserId,
  userRole,
  emptyMessage = 'No conversations yet',
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center">
        <div className="text-5xl mb-4">💬</div>
        <p className="text-gray-500 mb-2">{emptyMessage}</p>
        <p className="text-sm text-gray-400">
          {userRole === 'customer'
            ? 'Find a professional to start a conversation'
            : 'Customers will message you when they need your services'}
        </p>
        {userRole === 'customer' && (
          <Link
            href="/search"
            className="inline-block mt-4 px-6 py-3 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark transition-colors"
          >
            Find Professionals
          </Link>
        )}
      </div>
    );
  }

  const getOtherParty = (conversation: Conversation) => {
    return userRole === 'customer' ? conversation.artisan : conversation.customer;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden divide-y divide-gray-100">
      {conversations.map((conversation) => {
        const otherParty = getOtherParty(conversation);
        const hasUnread = conversation.unreadCount > 0;
        const timeAgo = conversation.lastMessageAt
          ? formatDistanceToNow(new Date(conversation.lastMessageAt), {
              addSuffix: true,
            })
          : '';

        return (
          <Link
            key={conversation._id}
            href={`/dashboard/messages/${conversation._id}`}
            className={`flex items-center p-4 hover:bg-gray-50 transition-colors ${
              hasUnread ? 'bg-green-50' : ''
            }`}
          >
            {/* Avatar */}
            <div className="relative">
              {otherParty.avatar ? (
                <img
                  src={otherParty.avatar}
                  alt={`${otherParty.firstName} ${otherParty.lastName}`}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-green text-white flex items-center justify-center font-semibold">
                  {getInitials(otherParty.firstName, otherParty.lastName)}
                </div>
              )}
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-orange text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 ml-4 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3
                  className={`font-semibold truncate ${
                    hasUnread ? 'text-brand-black' : 'text-gray-700'
                  }`}
                >
                  {otherParty.firstName} {otherParty.lastName}
                </h3>
                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                  {timeAgo}
                </span>
              </div>

              {/* Business name / Trade for artisans */}
              {userRole === 'customer' && conversation.artisanProfile && (
                <p className="text-xs text-brand-green mb-1 truncate">
                  {conversation.artisanProfile.businessName ||
                    conversation.artisanProfile.trade}
                </p>
              )}

              {/* Last message */}
              {conversation.lastMessage && (
                <p
                  className={`text-sm truncate ${
                    hasUnread ? 'text-gray-700 font-medium' : 'text-gray-500'
                  }`}
                >
                  {conversation.lastMessage.sender === currentUserId && 'You: '}
                  {truncateMessage(conversation.lastMessage.content)}
                </p>
              )}
            </div>

            {/* Chevron */}
            <svg
              className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
