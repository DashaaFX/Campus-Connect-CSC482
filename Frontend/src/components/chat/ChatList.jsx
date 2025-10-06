import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Badge } from '@/components/ui/badge';
import api from '@/utils/axios';
import { getUserDisplayName } from '@/utils/userHelpers';


export function ChatList({ users = [] }) {
  const startChatWithUser = useChatStore(state => state.startChatWithUser);
  const initConversations = useChatStore(s => s.initConversations);
  const conversations = useChatStore(s => s.conversations);
  const activeConversationId = useChatStore(s => s.activeConversationId);
  const chatError = useChatStore(s => s.error);
  const currentUser = useAuthStore(state => state.user);

  useEffect(() => { initConversations(); }, [initConversations]);

  const otherUsers = users.filter(u => u.id !== currentUser?.id);
  //lookup map for quick access
  const userIndex = React.useMemo(() => {
    const map = new Map();
    otherUsers.forEach(u => map.set(u.id, u));
    return map;
  }, [otherUsers]);

  const [peerCache, setPeerCache] = useState({}); 
  const inFlight = useRef(new Set());

  useEffect(() => {
    conversations.forEach(c => {
      const pid = c.otherUserId;
      if (!pid) return;
      if (userIndex.get(pid) || peerCache[pid] || inFlight.current.has(pid)) return;
      inFlight.current.add(pid);
      api.get(`/auth/user/${pid}`)
        .then(res => {
          const u = res.data?.user;
          if (u) setPeerCache(prev => ({ ...prev, [pid]: u }));
        })
        .catch(() => {})
        .finally(() => { inFlight.current.delete(pid); });
    });
  }, [conversations, userIndex, peerCache]);

  const onSelectConversation = (c) => {
    const otherId = c.otherUserId;
    let peer = otherUsers.find(u => u.id === otherId) || peerCache[otherId];
    if (!peer) peer = { id: otherId, name: otherId, firebaseUid: null };
    startChatWithUser(peer);
  };

  const showFallbackUsers = conversations.length === 0;

  return (
    <div className="space-y-3">
      {chatError && (
        <div className="text-[10px] text-red-600 border border-red-200 bg-red-50 rounded p-2 leading-snug">
          {chatError}
        </div>
      )}
      {conversations.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold tracking-wide text-gray-600">Conversations</h4>
          <div className="space-y-1">
            {conversations.map(c => {
              const isActive = c.conversationId === activeConversationId;
              const peer = userIndex.get(c.otherUserId) || peerCache[c.otherUserId];
              const display = peer ? getUserDisplayName(peer) : c.otherUserId;
              const unresolved = !peer;
              return (
                <button
                  key={c.conversationId}
                  onClick={() => onSelectConversation(c)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs border rounded hover:bg-gray-50 ${isActive ? 'bg-blue-50 border-blue-300' : ''}`}
                >
                  <span className="text-left truncate">
                    {display}
                    {unresolved && <span className="ml-1 text-[9px] text-gray-400">(resolving...)</span>}
                    {c.orderIds?.length > 0 && <span className="ml-1 text-[10px] text-gray-400">({c.orderIds.length} orders)</span>}
                    {c.lastMessage?.text && <span className="block mt-0.5 truncate text-[10px] text-gray-500">{c.lastMessage.text}</span>}
                  </span>
                  {c.unread > 0 && <Badge variant="secondary" className="shrink-0">{c.unread}</Badge>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showFallbackUsers && (
        <div>
          <h4 className="mb-1 text-xs font-semibold tracking-wide text-gray-600">Users</h4>
          <div className="space-y-1">
            {otherUsers.length === 0 && <div className="text-[10px] text-gray-500">No other users available.</div>}
            {otherUsers.map(u => {
              const hasUid = !!u.firebaseUid;
              return (
                <button
                  key={u.id}
                  onClick={() => startChatWithUser(u)}
                  className="w-full px-3 py-2 text-xs text-left border rounded hover:bg-gray-50"
                >
                  {u.profilePicture && <img src={u.profilePicture} alt="avatar" className="inline-block w-5 h-5 mr-2 rounded-full" />}
                  {getUserDisplayName(u)}
                  {!hasUid && <span className="ml-2 text-[9px] text-red-600">(no firebaseUid)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
