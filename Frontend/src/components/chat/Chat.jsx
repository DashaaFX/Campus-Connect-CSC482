//Chat component to display chat interface
import React from 'react';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { useAuthStore } from '@/store/useAuthStore';

//Chat testing, Developing, not ready for UAT
export default function Chat({ users = [], compact = true, maxHeight = 420 }) {
  const featureEnabled = import.meta.env.VITE_ENABLE_FIREBASE_CHAT === 'true';
  const currentUser = useAuthStore(state => state.user);

  if (!featureEnabled) {
    return <div className="text-sm text-gray-500">Chat feature disabled.</div>;
  }
  if (!currentUser) {
    return <div className="text-sm text-gray-500">Login to start chatting.</div>;
  }

  const wrapperClasses = compact
    ? 'grid grid-cols-12 gap-4 w-full max-w-5xl rounded-lg border bg-white shadow-sm'
    : 'grid grid-cols-12 gap-4 w-full';
  const heightStyle = { maxHeight: `${maxHeight}px`, height: '100%' };

  return (
    <div className="relative">
      <div className={wrapperClasses} style={heightStyle}>
        <div className="flex flex-col col-span-4 overflow-hidden border-r rounded-l-lg bg-gray-50/60">
          <div className="p-2 border-b bg-white/70 backdrop-blur">
            <h3 className="text-sm font-semibold tracking-wide text-gray-700">Chats</h3>
          </div>
          <div className="flex-1 p-2 overflow-y-auto">
            <ChatList users={users} />
          </div>
        </div>
        <div className="flex flex-col col-span-8 overflow-hidden rounded-r-lg">
          <ChatWindow users={users} compact={compact} />
        </div>
      </div>
    </div>
  );
}

