// Chat helpers built on Firestore
import { db, auth } from "../../firebase";
const ROOT_COLLECTION = 'chats';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  limit,
  getDocs,
  endBefore,
  where,
} from "firebase/firestore";


export function directConversationId(userIdA, userIdB) {
  if (!userIdA || !userIdB) throw new Error('Both user IDs required');
  return [userIdA, userIdB].sort().join('_');
}

// Parse 2 user IDs from direct conversation ID, smaller ID is 'a', larger is 'b'
export function parseDirectConversationId(conversationId) {
  if (!conversationId || typeof conversationId !== 'string') return { a: null, b: null };
  const parts = conversationId.split('_');
  if (parts.length !== 2) return { a: null, b: null };
  const [p1, p2] = parts;
  if (!p1 || !p2) return { a: null, b: null };
  const ordered = [p1, p2].sort();
  return { a: ordered[0], b: ordered[1] };
}

//Check for existing conversation between two users, if not found create a new one
export async function ensureDirectConversation({ currentUser, otherUser, orderContext }) {
  if (!currentUser?.id || !otherUser?.id) throw new Error('Missing user ids');

  const storedCurrentFirebaseUid = currentUser.firebaseUid;
  const liveAuthUid = auth.currentUser?.uid;
  const currentFirebaseUid = liveAuthUid || storedCurrentFirebaseUid;
  const otherFirebaseUid = otherUser.firebaseUid;

  if (storedCurrentFirebaseUid && liveAuthUid && storedCurrentFirebaseUid !== liveAuthUid) {
    if (import.meta.env.DEV) {
      console.warn('[chat] firebaseUid mismatch: stored=', storedCurrentFirebaseUid, ' live=', liveAuthUid, ' — using liveAuthUid.');
    }
  }

  if (!currentFirebaseUid) throw new Error('Your account is not chat-enabled (missing firebase linkage).');
  if (!otherFirebaseUid) throw new Error('The other user has not enabled chat yet.');

  const convoId = directConversationId(currentUser.id, otherUser.id);
  const ref = doc(db, ROOT_COLLECTION, convoId);

  if (import.meta.env.DEV) console.debug('[chat] ensureDirectConversation', convoId);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      const pfus = data.participantFirebaseUids;
      if (Array.isArray(pfus) && pfus.includes(currentFirebaseUid) && pfus.includes(otherFirebaseUid)) {
        // Merge order context fields if provided
        const updates = {};
        if (orderContext?.orderId && (!Array.isArray(data.orderIds) || !data.orderIds.includes(orderContext.orderId))) {
          updates.orderIds = Array.isArray(data.orderIds) ? [...data.orderIds, orderContext.orderId] : [orderContext.orderId];
        }
        if (orderContext?.productTitle && !data.primaryProductTitle) {
          updates.primaryProductTitle = orderContext.productTitle;
        }
        if (orderContext?.productId && !data.primaryProductId) {
          updates.primaryProductId = orderContext.productId;
        }
        if (Object.keys(updates).length) {
          try {
            await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
          } catch (e) {
            console.error('[chat] mergeOrderContextExisting:updateDoc failed', e.code, e.message);
          }
        }
        return convoId;
      }
    if (import.meta.env.DEV) console.warn('[chat] legacy doc missing participantFirebaseUids', convoId);
      throw new Error('Legacy conversation document blocks creation. Delete or migrate the existing chat doc: ' + convoId);
    }
    //catch permission-denied error from firestore rules
  } catch (preflightErr) {
    if (preflightErr.code === 'permission-denied') {
      if (import.meta.env.DEV) console.debug('[chat] preflight permission-denied -> will attempt create');
    } else if (preflightErr.message?.startsWith('Legacy conversation document')) {
      throw preflightErr; 
    }
  }

  //Build new conversation document for firestore
  const base = (() => {
    const pair = [
      { id: currentUser.id, f: currentFirebaseUid },
      { id: otherUser.id, f: otherFirebaseUid }
    ].sort((a,b) => a.id.localeCompare(b.id));
    return {
      participants: pair.map(p => p.id),
      participantFirebaseUids: pair.map(p => p.f),
      type: 'direct',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
      lastReadAt: { [currentUser.id]: serverTimestamp(), [otherUser.id]: null },
      orderIds: orderContext?.orderId ? [orderContext.orderId] : [],
      ...(orderContext?.productTitle ? { primaryProductTitle: orderContext.productTitle } : {}),
      ...(orderContext?.productId ? { primaryProductId: orderContext.productId } : {}),
    };
  })();

  // Create document
  try {
    await setDoc(ref, base);
  } catch (e) {
    if (e.code === 'permission-denied') {
      throw new Error('Cannot create chat');
    }
    throw e;
  }

  return convoId;
}

// Send a message 
export async function sendMessage({ conversationId, senderAppUserId, senderFirebaseUid, text, orderContext, otherUserId }) {
  if (!text || !text.trim()) return;
  const messagesCol = collection(db, ROOT_COLLECTION, conversationId, 'messages');
  const createdAt = serverTimestamp();
  const messagePayload = {
    senderId: senderAppUserId,
    senderFirebaseUid,
    text: text.trim(),
    createdAt,
  };
  if (orderContext?.orderId) messagePayload.orderId = orderContext.orderId;
  if (orderContext?.productId) messagePayload.productId = orderContext.productId;
  if (orderContext?.productTitle) messagePayload.productTitle = orderContext.productTitle;
  const res = await addDoc(messagesCol, messagePayload);

  try {
    await updateDoc(doc(db, ROOT_COLLECTION, conversationId), {
      lastMessage: { text: messagePayload.text, senderId: senderAppUserId, createdAt, orderId: messagePayload.orderId || null },
      updatedAt: createdAt,
    });
  } catch (e) {
    console.debug('lastMessage update skipped:', e.message);
  }
  return res.id;
}

// Append a system message when meeting location or datetime is finalized
export async function appendSystemEvent({ conversationId, type, payload = {}, actorAppUserId, text }) {
  if (!conversationId || !type) return;
  const messagesCol = collection(db, ROOT_COLLECTION, conversationId, 'messages');
  const createdAt = serverTimestamp();
  const autoText = (() => {
    if (text) return text;
    switch (type) {
      case 'location-finalized': return `Meeting location confirmed: ${payload?.location || ''}`.trim();
      case 'datetime-finalized': return `Meeting date & time confirmed: ${payload?.dateTime ? payload.dateTime : ''}`.trim();
      default: return `[${type}]`;
    }
  })();
  const senderFirebaseUid = auth.currentUser?.uid || null; // ensure rule compatibility for system messages
  const docData = {
    type: 'system',
    eventType: type,
    payload,
    createdAt,
    actorId: actorAppUserId || null,
    text: autoText,
    senderFirebaseUid, // add sender ID 
  };
  const res = await addDoc(messagesCol, docData);
  try {
    await updateDoc(doc(db, ROOT_COLLECTION, conversationId), {
      lastMessage: { text: autoText, senderId: actorAppUserId || null, createdAt },
      updatedAt: createdAt,
    });
  } catch (e) {
    console.debug('[chat] appendSystemEvent lastMessage skipped', e.message);
  }
  return res.id;
}

// Listen to messages from oldest first
export function subscribeToMessages(conversationId, callback, { pageSize = 50 } = {}) {
  const sessionUid = auth.currentUser?.uid; // store current users id
  const q = query(
    collection(db, ROOT_COLLECTION, conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(pageSize)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(messages);
    },
    (error) => {
      const currentUid = auth.currentUser?.uid;
      const userLoggedOut = !auth.currentUser;
      const uidChanged = currentUid && sessionUid && currentUid !== sessionUid;
      // Suppresspermission-denied errors triggered after logout, cleared after logout
      if ((userLoggedOut || uidChanged) && error.code === 'permission-denied') {
        if (import.meta.env.DEV) console.debug('[chat] suppress permission-denied after auth change/logout (messages)');
        return;
      }
      if (error.code === 'permission-denied') {
        console.error('[chat] subscribe error (messages)', error.code, error.message);
      } else {
        console.error('[chat] subscribe error (messages)', error.code, error.message);
      }
    }
  );
}

// Load older messages 
export async function loadOlderMessages(conversationId, firstLoadedMessage, { pageSize = 50 } = {}) {
  if (!firstLoadedMessage?.createdAt) return [];
  const qOlder = query(
    collection(db, ROOT_COLLECTION, conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
    endBefore(firstLoadedMessage.createdAt),
    limit(pageSize)
  );
  const snap = await getDocs(qOlder);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Listen to the user's conversations
export function subscribeToUserConversations(appUserId, callback, { pageSize = 50, _attempt = 0 } = {}) {
  if (!appUserId) { callback([]); return () => {}; }
  if (!auth.currentUser) {
    const timeout = setTimeout(() => {
      subscribeToUserConversations(appUserId, callback, { pageSize, _attempt: _attempt + 1 });
    }, Math.min(500 + _attempt * 200, 2000));
    return () => clearTimeout(timeout);
  }
  let unsub = () => {};
  const sessionUid = auth.currentUser.uid; 
  try {
    const currentUid = auth.currentUser.uid; 
      // Query by firebase UID 
      const q = query(
        collection(db, ROOT_COLLECTION),
        where('participantFirebaseUids', 'array-contains', currentUid),
        orderBy('updatedAt', 'desc'),
        limit(pageSize)
      );
    unsub = onSnapshot(q, (snapshot) => {
      const next = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(next);
    }, async (err) => {
      const currentAuthUid = auth.currentUser?.uid;
      const userLoggedOut = !auth.currentUser;
  const uidChanged = currentAuthUid && currentAuthUid !== sessionUid; 

      if ((userLoggedOut || uidChanged) && err.code === 'permission-denied') {
        if (import.meta.env.DEV) console.debug('[chat] suppress permission-denied after auth change/logout');
        callback([]);
        return;
      }
      if (err.code === 'permission-denied') {
  // console errors
  // Log only if still the same user session
        console.error('[chat] conversation list subscribe error', err);
      } else {
        console.error('[chat] conversation list subscribe error', err);
      }
      if (!userLoggedOut && !uidChanged && err.code === 'permission-denied' && _attempt < 5) {
        const retryTimeout = setTimeout(() => {
          subscribeToUserConversations(appUserId, callback, { pageSize, _attempt: _attempt + 1 });
        }, 400 + _attempt * 300);
        return () => clearTimeout(retryTimeout);
      }
  // Fallback if index missing
      if (err.code === 'failed-precondition' || /indexes/.test(err.message || '')) {
        try {
          const currentUid2 = auth.currentUser?.uid;
          const q2 = query(
            collection(db, ROOT_COLLECTION),
            where('participantFirebaseUids', 'array-contains', currentUid2),
            limit(pageSize)
          );
          const snap = await getDocs(q2);
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          callback(list.sort((a,b) => (b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0)));
        } catch (fallbackErr) {
          console.error('[chat] fallback conversation query failed', fallbackErr);
          callback([]);
        }
      } else {
        callback([]);
      }
    });
  } catch (outer) {
    console.error('[chat] conversation list outer error', outer);
    callback([]);
  }
  return () => { try { unsub(); } catch { /* noop */ } };
}

// Start the chat
export async function startDirectChat({ currentUser, otherUser, onMessages, orderContext }) {
  const conversationId = await ensureDirectConversation({ currentUser, otherUser, orderContext });
  const unsubscribe = subscribeToMessages(conversationId, onMessages);
  return { conversationId, unsubscribe };
}

