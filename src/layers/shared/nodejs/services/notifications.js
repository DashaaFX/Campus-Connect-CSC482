// Backend notification publisher using Firebase Admin
// Adds notification documents in Firestore under users/{userId}/notifications/{autoId}
// Relies on FIREBASE_SECRET_ARN already for firebase-admin initialization.

/**
 * Notifications service (backend side)
 * - Centralizes Firestore writes and dedupe logic (we hash certain notifications so we don't spam).
 * - Keeps notification formatting (title/body/payload/severity) consistent.
 * - Makes it easy to add new notification types in one spot.
 */
import { getFirebaseApp } from '../utils/firebaseAdmin.js';
import crypto from 'crypto';
// Optional product lookup for cases where order snapshot lacks embedded product details
import { ProductModel } from '/opt/nodejs/models/Product.js';

let firestorePromise;
async function getDb() {
  if (!firestorePromise) {
    firestorePromise = (async () => {
      const app = await getFirebaseApp();
      const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
      const db = getFirestore(app);
      return { db, FieldValue };
    })();
  }
  return firestorePromise;
}

export async function publishNotification(opts = {}) {
  const { receiverUserId, type, actorId, relatedIds = {}, title, body = '', payload = {}, severity = 'info', isSystem = false, dedupe = true } = opts;
  if (!receiverUserId || !type || !title) return false;
  try {
    const { db, FieldValue } = await getDb();
    // Ensure parent user doc exists (silent failures ignored)
    try {
      const userDocRef = db.collection('users').doc(receiverUserId);
      const userDocSnap = await userDocRef.get();
      if (!userDocSnap.exists) {
        await userDocRef.set({ createdAt: FieldValue.serverTimestamp(), initializedByNotification: true }, { merge: true });
      }
    } catch {/* ignore parent create errors */}
    const baseRef = db.collection('users').doc(receiverUserId).collection('notifications');
    let docRef;
    if (dedupe) {
      const hashInput = JSON.stringify({ r: receiverUserId, type, relatedIds });
      const id = crypto.createHash('sha1').update(hashInput).digest('hex').slice(0, 32);
      docRef = baseRef.doc(id);
      const snap = await docRef.get();
      if (snap.exists) {
        await docRef.set({ body, payload, severity, title, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return true;
      }
    } else {
      docRef = baseRef.doc();
    }
    await docRef.set({
      type,
      actorId: actorId || null,
      relatedIds,
      title,
      body,
      payload,
      severity,
      isSystem,
      userId: receiverUserId,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null
    });
    return true;
  } catch {
    return false;
  }
}

/** Convenience wrappers */
export async function notifyOrderStatusChange(order, { actorId, fromStatus, toStatus }) {
  if (!order) return;
  const orderId = order.id || order._id;
  const buyerId = order.userId;
  const sellerId = order.sellerId;
  // Derive product title; fallback to DB lookup if missing.
  const firstItem = Array.isArray(order.items) ? order.items[0] : null;
  let product = firstItem?.product || (Array.isArray(order.products) ? order.products[0]?.product || order.products[0] : null);
  let productId = firstItem?.productId || product?.id || product?._id;
  let productTitle = product?.title || product?.name || product?.productTitle || product?.displayName || null;
  if (!productTitle && productId) {
    try {
      const pm = new ProductModel();
      const fetched = await pm.getById(productId);
      if (fetched) {
        productTitle = fetched.title || fetched.name || fetched.productTitle || fetched.displayName || null;
      }
    } catch {/* ignore lookup errors */}
  }
  const severity = ['approved','paid','completed'].includes(toStatus) ? 'success' : ['cancelled','rejected','refunded'].includes(toStatus) ? 'warning' : 'info';
  const title = productTitle ? productTitle : `Order ${toStatus}`;
  const body = productTitle ? `${productTitle} status changed to ${toStatus}` : `Order ${orderId} status changed to ${toStatus}`;
  // Notify other party only; actor already knows
  if (actorId && actorId === buyerId && sellerId) {
    await publishNotification({ receiverUserId: sellerId, type: 'order.status.changed', actorId, relatedIds: { orderId }, title, body, payload: { from: fromStatus, to: toStatus, productTitle }, severity, dedupe: true });
  } else if (actorId && actorId === sellerId && buyerId) {
    await publishNotification({ receiverUserId: buyerId, type: 'order.status.changed', actorId, relatedIds: { orderId }, title, body, payload: { from: fromStatus, to: toStatus, productTitle }, severity, dedupe: true });
  } else {
    // System triggered (e.g. webhook) -> notify both
    if (buyerId) await publishNotification({ receiverUserId: buyerId, type: 'order.status.changed', actorId: 'system', relatedIds: { orderId }, title, body, payload: { from: fromStatus, to: toStatus, productTitle }, severity, isSystem: true, dedupe: true });
    if (sellerId) await publishNotification({ receiverUserId: sellerId, type: 'order.status.changed', actorId: 'system', relatedIds: { orderId }, title, body, payload: { from: fromStatus, to: toStatus, productTitle }, severity, isSystem: true, dedupe: true });
  }
}

// Retained placeholder for potential future re-introduction.
export async function notifyOrderRequested() {
  return { sellerNotified: false, buyerNotified: false };
}

// Chat message notification helper (non-deduped, each message appears)
export async function notifyChatMessage({ conversationId, otherUserId, actorId, textPreview }) {
  if (!conversationId || !otherUserId || !actorId) return;
  await publishNotification({
    receiverUserId: otherUserId,
    type: 'chat.message.new',
    actorId,
    relatedIds: { chatId: conversationId },
    title: 'New chat message',
    body: (textPreview || 'New message').slice(0, 120),
    payload: { chatId: conversationId },
    severity: 'info',
    dedupe: false
  });
}
