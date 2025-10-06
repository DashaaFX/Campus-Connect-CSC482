import Chat from '@/components/chat/Chat';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/useChatStore';
// Hardcoded two test accounts for local chat verification
const TEST_USERS = [
  {
    id: '33d46d2a-d1ec-41f0-9766-f932e848963b',
    firebaseUid: 'IMZDiH7W5MhlnY9huJtOcOTXrYY2',
    email: 'firebase2@mail.adelphi.edu',
    name: 'firebase2'
  },
  {
    id: 'e144c371-f4a9-4dd4-b071-4729eec5779e',
    firebaseUid: 'Dvfj56xywXVKXufM3NsgnIowToF2',
    email: 'firebase@mail.adelphi.edu',
    name: 'firebase'
  }
];

export default function ChatPage() {
  const currentUser = useAuthStore(s => s.user);
  const [users, setUsers] = useState([]);
  const startChatWithUser = useChatStore(s => s.startChatWithUser);
  const [autoStarted, setAutoStarted] = useState(false);
  const [pendingOrderContext, setPendingOrderContext] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const params = new URLSearchParams(window.location.search);
    const peerId = params.get('peerId');
    const peerFirebaseUid = params.get('peerFirebaseUid');
    const peerEmail = params.get('peerEmail') || params.get('peerEmail'.toLowerCase());
    const peerName = params.get('peerName');

    const orderId = params.get('orderId');
    const productId = params.get('productId');
    const productTitle = params.get('productTitle');
    const productImage = params.get('productImage');
    const orderStatus = params.get('orderStatus');

    if (peerId && peerFirebaseUid && peerId !== currentUser.id) {
      const peer = {
        id: peerId,
        firebaseUid: peerFirebaseUid,
        email: peerEmail || '',
        name: peerName || peerEmail || 'User'
      };
      setUsers([currentUser, peer]);
      if (orderId || productId) {
        setPendingOrderContext({ orderId, productId, productTitle, productImage, orderStatus });
      }
    } else {
      if (import.meta.env.DEV) {
        const withCurrentAligned = TEST_USERS.some(u => u.id === currentUser.id)
          ? TEST_USERS
          : [currentUser, ...TEST_USERS.filter(u => u.id !== currentUser.id)];
        setUsers(withCurrentAligned);
      } else {
        setUsers([currentUser]);
      }
    }
  }, [currentUser]);

  // start conversation if found a peer to chat from the query params
  useEffect(() => {
    if (!currentUser || autoStarted || users.length < 2) return;
    const peer = users.find(u => u.id !== currentUser.id);
    if (peer && peer.firebaseUid) {
      startChatWithUser(peer, { orderContext: pendingOrderContext });
      setAutoStarted(true);
    }
  }, [users, currentUser, autoStarted, startChatWithUser, pendingOrderContext]);

  return <Chat users={users} />;
}