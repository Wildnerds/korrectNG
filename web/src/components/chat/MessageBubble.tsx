'use client';

import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
  content: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  isOwn: boolean;
  type?: string;
}

export default function MessageBubble({
  content,
  sender,
  createdAt,
  isOwn,
  type = 'text',
}: MessageBubbleProps) {
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  // System messages are centered
  if (type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender name for non-own messages */}
        {!isOwn && (
          <p className="text-xs text-gray-500 mb-1 ml-2">
            {sender.firstName} {sender.lastName}
          </p>
        )}

        {/* Message bubble */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-brand-green text-white rounded-br-md'
              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>

        {/* Timestamp */}
        <p
          className={`text-xs text-gray-400 mt-1 ${
            isOwn ? 'text-right mr-2' : 'ml-2'
          }`}
        >
          {timeAgo}
        </p>
      </div>
    </div>
  );
}
