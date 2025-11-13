//Dashnyam
// Utility functions for chat-related operations
import api from '@/utils/axios';
import { USER_API_ENDPOINT } from '@/utils/data';

// Build chat 
export function buildChatUrl(peer) {
  if (!peer?.id || !peer?.firebaseUid) return '/chat';
  const qs = new URLSearchParams({
    peerId: peer.id,
    peerFirebaseUid: peer.firebaseUid,
    peerEmail: peer.email || '',
    peerName: peer.fullname || peer.name || peer.email || 'User'
  });
  return `/chat?${qs.toString()}`;
}


// Extract a sellerId from a product
export function extractSellerId(productLike) {
  if (!productLike) return null;
  return (
    productLike.sellerId ||
    productLike.seller?.id ||
    productLike.seller?._id || null
  );
}

// Extract firebaseUid from product seller/owner
export function extractSellerFirebaseUid(productLike) {
  if (!productLike) return null;
  return (
    productLike.sellerFirebaseUid ||
    productLike.seller?.firebaseUid ||
    productLike.sellerUid ||
     null
  );
}

// Extract seller name/email
//Removed unused parameters
export function extractSellerMetadata(productLike) {
  if (!productLike) return { email: '', name: 'Seller' };
  const email = (
    productLike.sellerEmail ||
    productLike.seller?.email ||''
  );
  const name = (
    productLike.sellerName ||
    productLike.seller?.fullname ||
    productLike.seller?.name ||
    email || 'Seller'
  );
  return { email, name };
}

// Derive seller peer from an order item + cache map of fetched sellers
export function deriveSellerPeerFromItem(item, currentUser, sellerUsersCache) {
  if (!item) return null;
  const p = item.product || {};
  const sellerId = extractSellerId(p);
  if (!sellerId) return null;
  if (currentUser && sellerId === currentUser.id) return null;
  const cached = sellerUsersCache?.[sellerId];
  if (cached?.firebaseUid) return cached;
  const firebaseUid = extractSellerFirebaseUid(p);
  if (!firebaseUid) return null;
  const { email, name } = extractSellerMetadata(p);
  return { id: sellerId, firebaseUid, email, name };
}

// Collect distinct sellerIds from orders/items structure
export function collectSellerIds(orders, currentUser) {
  const ids = new Set();
  (orders || []).forEach(o => (o.items || []).forEach(it => {
    const sid = extractSellerId(it.product || {});
    if (sid && sid !== currentUser?.id) ids.add(sid);
  }));
  return [...ids];
}

// Fetch user records (by id) that are missing from a cache; returns new cache map merged
export async function fetchUsersIfNeeded(ids, existingCache = {}) {
  const toFetch = ids.filter(id => !existingCache[id]);
  if (!toFetch.length) return existingCache;
  const newMap = { ...existingCache };
  await Promise.all(toFetch.map(async id => {
    try {
      const res = await api.get(`${USER_API_ENDPOINT}/user/${id}`);
      const u = res.data.user || res.data.data?.user || res.data.data || res.data;
      if (u?.id) {
        newMap[id] = {
          id: u.id,
            firebaseUid: u.firebaseUid,
            email: u.email,
            name: u.profile?.fullname || u.fullname || u.name || u.email
        };
      }
    } catch { }
  }));
  return newMap;
}

// Derive buyer peer from an order using cache (seller perspective)
export function deriveBuyerPeer(order, currentUser, buyerCache) {
  if (!order?.userId) return null;
  if (currentUser && order.userId === currentUser.id) return null;
  const cached = buyerCache?.[order.userId];
  return cached?.firebaseUid ? cached : null;
}

// Collect buyer IDs from a list of orders (seller perspective)
export function collectBuyerIds(orders, currentUser) {
  const ids = new Set();
  (orders || []).forEach(o => {
    if (o.userId && o.userId !== currentUser?.id) ids.add(o.userId);
  });
  return [...ids];
}

// Build order context from an order
export function buildOrderContextFromOrder(order) {
  if (!order) return null;
  const firstItem = (order.items || [])[0];
  const product = firstItem?.product;
  if (!product) return { orderId: order.id };
  return {
    orderId: order.id,
    productId: product.id || product._id,
    productTitle: product.title || product.name,
  };
}