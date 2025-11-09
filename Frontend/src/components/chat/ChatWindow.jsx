//Chat window component
//Dashnyam
//Used Co-Pilot for throttle function and optimizations of useEffect for faster rendering
// Prompt : how to optimize a React chat window component to avoid excessive re-renders when marking messages as read and scrolling?

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { Badge } from '@/components/ui/badge';
import { getUserDisplayName } from '@/utils/userHelpers';

export function ChatWindow({ users = [], compact = true, maxBodyHeight = 360 }) {
  const activeMessages = useChatStore(s => s.activeMessages);
  const sendActiveMessage = useChatStore(s => s.sendActiveMessage);
  const activeConversationId = useChatStore(s => s.activeConversationId);
  const loading = useChatStore(s => s.loading);
  const error = useChatStore(s => s.error);
  const loadOlder = useChatStore(s => s.loadOlder);
  const hasMoreHistory = useChatStore(s => s.hasMoreHistory);
  const orderContext = useChatStore(s => s.orderContext);
  const meetingLocation = useChatStore(s => s.meetingLocation);
  const meetingLocationConfirmedBy = useChatStore(s => s.meetingLocationConfirmedBy) || [];
  const meetingDateTime = useChatStore(s => s.meetingDateTime);
  const meetingDateTimeConfirmedBy = useChatStore(s => s.meetingDateTimeConfirmedBy) || [];
  const markActiveRead = useChatStore(s => s.markActiveRead);
  const currentUser = useAuthStore(s => s.user);

  const [text, setText] = useState('');
  const [showMap, setShowMap] = useState(false); 
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const scrollRef = useRef(null);
  const atBottomRef = useRef(true);
  // Track last markRead call to avoid repeated state updates
  const lastMarkRef = useRef({ convoId: null, msgCount: 0, lastTime: 0 });

  // Throttle markActiveRead to avoid rapid successive updates (e.g., burst loads)
  //Generated with ChatGPT for a more efficient throttle implementation - Messaging Best Practice
  const throttledMarkRead = useCallback(() => {
    const now = Date.now();
    if (now - lastMarkRef.current.lastTime < 500) return; // 0.5s throttle
    markActiveRead();
    lastMarkRef.current.lastTime = now;
  }, [markActiveRead]);

  useEffect(() => {
    if (!activeConversationId) return;
    const msgCount = activeMessages.length;
    const changedConversation = lastMarkRef.current.convoId !== activeConversationId;
    const increasedMessages = msgCount > lastMarkRef.current.msgCount;
    if (changedConversation || increasedMessages) {
      throttledMarkRead();
      lastMarkRef.current.convoId = activeConversationId;
      lastMarkRef.current.msgCount = msgCount;
    }
  }, [activeMessages, activeConversationId, throttledMarkRead]);

  // Track whether user is scrolled near bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      atBottomRef.current = distance < 40; // threshold
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-scroll only if user was already near bottom
  useEffect(() => {
    if (scrollRef.current && atBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages]);

  const onSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await sendActiveMessage(trimmed);
      setText('');
    } catch (e) {
      // error handled via store
    }
  }, [text, sendActiveMessage]);
  // Get conversation and peer info from the chat store
  const conversations = useChatStore(s => s.conversations);
  const isBlockedFn = useChatStore(s => s.isBlocked); 
  const isBlockedByPeerFn = useChatStore(s => s.isBlockedByPeer); 
  const blockedFirebaseUids = useChatStore(s => s.blockedFirebaseUids); 
  const blockedByFirebaseUids = useChatStore(s => s.blockedByFirebaseUids); 
  const ensureBlockSubscriptions = useChatStore(s => s.ensureBlockSubscriptions);
  const activeConvo = conversations.find(c => c.conversationId === activeConversationId);
  const peerId = activeConvo?.otherUserId;
  const peer = peerId ? (users.find(u => u.id === peerId) || { id: peerId }) : null;
  // Recompute isBlocked when block/unblock occurs
  const isBlocked = peer ? isBlockedFn(peer.id) : false;
  const isBlockedByPeer = peer ? isBlockedByPeerFn(peer.id) : false;
  const blockUser = useChatStore(s => s.blockUser);
  const unblockUser = useChatStore(s => s.unblockUser);

  // Build quick index of users for name lookup
  const userIndex = useMemo(() => {
    const map = new Map();
    users.forEach(u => map.set(u.id, u));
    return map;
  }, [users]);
  // Ensure block subscriptions if they haven't started yet (covers first render refresh case)
  useEffect(() => { ensureBlockSubscriptions(); }, [ensureBlockSubscriptions]);


  if (!activeConversationId) {
    return <div className="p-4 text-sm text-gray-500">Select a user to start chatting. {loading && <span className="ml-2 text-xs">(starting...)</span>} {error && <span className="ml-2 text-xs text-red-600">{error}</span>}</div>;
  }

  const formatTs = (ts) => {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const bodyHeightStyle = compact ? { maxHeight: `${maxBodyHeight}px`, display: 'flex', flexDirection: 'column' } : { display:'flex', flexDirection:'column' };
  const showMeetingBanner = meetingLocation && meetingLocationConfirmedBy.length === 2 
    && meetingDateTime && meetingDateTimeConfirmedBy.length === 2;

  return (
    <div className={`flex flex-col bg-white border rounded ${compact ? 'h-auto' : 'h-full'} overflow-hidden`} style={bodyHeightStyle}>
      {(orderContext?.orderId || orderContext?.productTitle) && (
        <div className="flex items-center justify-end px-3 py-2 text-[10px] gap-2 text-gray-600 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          {orderContext?.orderId && (
            <Badge variant="outline" className="text-[10px]">Order #{orderContext.orderId}</Badge>
          )}
          {orderContext?.productTitle && (
            <span className="hidden sm:inline text-[10px] text-gray-500 truncate max-w-[120px]">{orderContext.productTitle}</span>
          )}
        </div>
      )}
    <div className="flex flex-col flex-1 min-h-0">
        {/* Moderation controls */}
        {peer && (
          <div className="flex items-center justify-between px-3 py-1 text-[10px] bg-gray-50 border-b">
            <span className="opacity-70">Chat with <strong>{getUserDisplayName(peer)}</strong></span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isBlocked) {
                    setShowUnblockConfirm(true);
                  } else {
                    blockUser(peer.id);
                  }
                }}
                className={`px-2 py-1 rounded border text-[10px] ${isBlocked ? 'border-green-400 text-green-600 hover:bg-green-50' : 'border-red-400 text-red-600 hover:bg-red-50'}`}
              >{isBlocked ? 'Unblock User' : 'Block User'}</button>
            </div>
          </div>
        )}
        <div className="flex justify-center p-1 border-b bg-gray-50/60">
          {hasMoreHistory ? (
            <button onClick={loadOlder} className="text-[10px] text-blue-600 hover:underline">Load earlier messages</button>
          ) : (
            <span className="text-[9px] text-gray-400">Beginning of conversation</span>
          )}
        </div>
         <div ref={scrollRef} className="flex-1 min-h-0 px-3 py-2 space-y-3 overflow-y-auto bg-white custom-scrollbar">
          {activeMessages.map(m => {
            // System message styling
            if (m.type === 'system') {
              const ts = formatTs(m.createdAt);
              const eventLabel = (() => {
                if (m.text) return m.text; 
                switch (m.eventType) {
                  case 'location-finalized': return `Meeting location confirmed: ${m.payload?.location || ''}`.trim();
                  case 'datetime-finalized': return `Meeting date & time confirmed: ${m.payload?.dateTime || ''}`.trim();
                  default: return `[${m.eventType}]`;
                }
              })();
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="flex items-center max-w-[80%] gap-2 px-3 py-1 mt-1 text-[10px] font-medium tracking-wide text-gray-700 bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-300 rounded-full shadow-sm">
                    <span>{eventLabel}</span>
                    {ts && <span className="text-[9px] opacity-60">{ts}</span>}
                  </div>
                </div>
              );
            }
            const sender = userIndex.get(m.senderId);
            //display User if user navigates to other chats on the chat list - for privacy
            const senderLabel = sender ? getUserDisplayName(sender) : 'User';
            const isSelf = currentUser && m.senderId === currentUser.id;
            const bubbleColor = isSelf ? 'bg-blue-600 text-white' : 'bg-red-600 text-white';
            const align = isSelf ? 'items-end' : 'items-start';
            const dirBadge = null;
            return (
              <div key={m.id} className={`flex flex-col ${align} gap-0.5 group`}> 
                <div className={`relative max-w-[75%] rounded-lg px-3 py-2 shadow-sm transition-colors ${bubbleColor} whitespace-pre-wrap break-words group-hover:shadow-md`}> 
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold leading-none text-[11px] tracking-wide">
                      {senderLabel}{dirBadge}
                    </span>
                    <span className="ml-2 text-[9px] opacity-70 group-hover:opacity-100 tabular-nums">{formatTs(m.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-[13px] leading-snug">{m.text}</div>
                  {m.orderId && (
                    <div className="mt-1">
                      <Badge variant="secondary" className="text-[9px] bg-white/20 text-white border-white/30">#{m.orderId}</Badge>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {activeMessages.length === 0 && (
            <div className="py-6 text-[11px] text-gray-400 text-center">No messages yet. Say hello!</div>
          )}
          {/* Meeting Banner after Location and Date confirmed*/}
          {showMeetingBanner && (
            <div className="flex justify-center mt-2">
              <div className="w-full max-w-sm px-3 py-2 text-[11px] bg-green-50 border border-green-200 rounded shadow-sm flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-green-700">Meeting Confirmed</span>
                  <button
                    type="button"
                    onClick={() => setShowMap(m => !m)}
                    className="text-[10px] px-2 py-0.5 rounded border border-green-300 bg-white text-green-700 hover:bg-green-100 focus:outline-none"
                  >{showMap ? 'Hide Map' : 'Show Map'}</button>
                </div>
                <div className="text-[10px] text-gray-700"><span className="font-medium">Location:</span> {meetingLocation}</div>
                <div className="text-[10px] text-gray-700"><span className="font-medium">Date & Time:</span> {meetingDateTime ? new Date(meetingDateTime).toLocaleString() : ''}</div>
                {showMap && (
                  <div className="mt-1 overflow-hidden rounded-md">
                    <iframe
                      title="Meeting Location Map"
                      width="100%"
                      height="130"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(meetingLocation)}&output=embed`}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 p-3 border-t bg-gray-50">
          <input
            className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Type a message and press Enter"
            disabled={isBlocked || isBlockedByPeer}
          />
          <button
            onClick={onSend}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded shadow hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!text.trim() || isBlocked || isBlockedByPeer}
          >Send</button>
        </div>
        {/* Show messages on who initiated blocking/unblocking*/}
        {(isBlocked || isBlockedByPeer) && (
          <div className="px-3 py-1 text-[11px] text-red-600 bg-red-50 border-t border-red-200">
            {isBlocked && isBlockedByPeer && 'Both users have blocked each other. Unblock to resume chatting.'}
            {isBlocked && !isBlockedByPeer && 'You blocked this user. Unblock to continue chatting.'}
            {!isBlocked && isBlockedByPeer && 'This user has blocked you. You cannot send messages until they unblock you.'}
          </div>
        )}
        {error && (
          <div className="px-3 py-1 text-[11px] text-red-600 bg-red-50 border-t border-red-200">{error}</div>
        )}
      </div>
      {/* Unblock confirmation dialog */}
      <Dialog open={showUnblockConfirm} onOpenChange={setShowUnblockConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Unblock {peer ? getUserDisplayName(peer) : 'User'}?</DialogTitle>
            <DialogDescription>
              They will be able to send you new messages and see your replies again. You can block them anytime later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <button
              type="button"
              className="h-8 px-3 text-xs border rounded border-input bg-background hover:bg-accent hover:text-accent-foreground"
              onClick={() => setShowUnblockConfirm(false)}
            >Cancel</button>
            <button
              type="button"
              className="h-8 px-3 text-xs text-white bg-green-600 rounded hover:bg-green-500"
              onClick={() => { if (peer) { unblockUser(peer.id); } setShowUnblockConfirm(false); }}
            >Unblock</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
