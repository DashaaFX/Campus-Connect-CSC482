// Chat session Hook, refactored from ChatPage component. 
// Get peer and order context, start with peer if valid ID, subscribe to chat meta.
// Simplified Chatpage logic into reusable Hook.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';

export function useChatSession() {
  const currentUser = useAuthStore(s => s.user);
  const startChatWithUser = useChatStore(s => s.startChatWithUser);
  const subscribeToChatMeta = useChatStore(s => s.subscribeToChatMeta);
  const meetingLocation = useChatStore(s => s.meetingLocation);
  const meetingDateTime = useChatStore(s => s.meetingDateTime);
  const activeConversationId = useChatStore(s => s.activeConversationId);
  const [autoStarted, setAutoStarted] = useState(false);
  const [users, setUsers] = useState([]);
  const [pendingOrderContext, setPendingOrderContext] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!currentUser) return;
    const peerId = searchParams.get('peerId');
    const peerFirebaseUid = searchParams.get('peerFirebaseUid');
    const peerEmail = searchParams.get('peerEmail');
    const peerName = searchParams.get('peerName');
    const orderId = searchParams.get('orderId');
    const productId = searchParams.get('productId');
    const productTitle = searchParams.get('productTitle');
    const productImage = searchParams.get('productImage');
    const orderStatus = searchParams.get('orderStatus');

    if (peerId && peerFirebaseUid && peerId !== currentUser.id) {
      const peer = { id: peerId, firebaseUid: peerFirebaseUid, email: peerEmail || '', name: peerName || peerEmail || 'User' };
      setUsers([currentUser, peer]);
      if (orderId || productId) setPendingOrderContext({ orderId, productId, productTitle, productImage, orderStatus });
    } else {
      setUsers([currentUser]);
    }
  }, [currentUser, searchParams]);

  useEffect(() => {
    if (!currentUser || autoStarted || users.length < 2) return;
    const peer = users.find(u => u.id !== currentUser.id);
    if (peer && peer.firebaseUid) {
      startChatWithUser(peer, { orderContext: pendingOrderContext });
      setAutoStarted(true);
    }
  }, [users, currentUser, autoStarted, startChatWithUser, pendingOrderContext]);

  useEffect(() => {
    if (activeConversationId) subscribeToChatMeta(activeConversationId);
  }, [activeConversationId, subscribeToChatMeta]);

  return {
    users,
    activeConversationId,
    meetingLocation,
    meetingDateTime,
    startChatWithPeer: (peer, ctx) => startChatWithUser(peer, { orderContext: ctx }),
    pendingOrderContext,
  };
}
