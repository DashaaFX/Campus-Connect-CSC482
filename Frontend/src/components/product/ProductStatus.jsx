// Product Status Component that shows order information for a specific product
// Now includes chat functionality 
import React, { useEffect, useState } from 'react';
import { useParams , useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ORDER_STATUS_COLORS } from '@/constants/order-status';
import { useOrderStore } from '@/store/useOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import { buildChatUrl, collectBuyerIds, fetchUsersIfNeeded, deriveBuyerPeer } from '@/utils/chatHelpers';
// Import firebase directly from project root 
import { db, auth } from '../../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

const ProductStatus = () => {
  const { productId } = useParams();
  const { orders, fetchSales, updateOrderStatus, loading, error } = useOrderStore();
  const currentUser = useAuthStore(s => s.user);
  const [buyerUsers, setBuyerUsers] = useState({}); 
  const navigate = useNavigate();

  useEffect(() => {
    fetchSales();
  }, []);

  const requests = orders.filter(o =>
    Array.isArray(o.items) && o.items.some(it =>
      it.productId === productId ||
      it.product?.id === productId ||
      it.product?._id === productId ||
      it.product?.productId === productId
    )
  );

  // Get user records
  useEffect(() => {
    const ids = collectBuyerIds(requests, currentUser);
    if (!ids.length) return;
    (async () => {
      const merged = await fetchUsersIfNeeded(ids, buyerUsers);
      if (merged !== buyerUsers) setBuyerUsers(merged);
    })();
  }, [requests, currentUser, buyerUsers]);
  
  const handleStatusUpdate = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order ${status === 'approved' ? 'approved' : 'cancelled'} successfully!`);
      if (status === 'approved') {
        // Find the order we just updated to derive buyer peer
        const updated = orders.find(o => (o._id === orderId || o.id === orderId));
        const buyerId = updated?.userId;
        if (buyerId && currentUser?.id && buyerId !== currentUser.id) {
          // Generate deterministic thread id 
            const threadId = [buyerId, currentUser.id].sort().join('_');
            if (auth?.currentUser?.uid) {
              try {
                await addDoc(collection(db, 'threads', threadId, 'messages'), {
                  type: 'system',
                  text: 'Your order was approved. You can download your digital item now.',
                  orderId,
                  from: currentUser.id,
                  to: buyerId,
                  createdAt: serverTimestamp(),
                  read: false
                });
              } catch (fireErr) {
                console.error('Failed to send system chat message:', fireErr);
              }
            }
        }
      }
    } catch (err) {
     toast.error(err?.response?.data?.message || 'Failed to update order status');
    }
  };


  return (
    <div className="max-w-3xl px-4 py-6 mx-auto">
      <div className="mb-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Back
        </Button>
      </div>
      <h1 className="mb-4 text-2xl font-bold">Purchase Requests</h1>
       {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <p>No requests found for this product.</p>
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const buyerEmail = req.buyer?.email || req.userEmail || req.user?.email;
            const buyerName = req.buyer?.fullname || req.buyer?.name || req.user?.fullname || buyerEmail || 'Buyer';
            const badgeClass = ORDER_STATUS_COLORS[req.status] || 'bg-gray-200 text-gray-700';
            const peer = deriveBuyerPeer(req, currentUser, buyerUsers);
            const chatDisabled = !peer;
            return (
              <div key={req._id || req.id} className="p-4 border rounded shadow-sm">
                <p><strong>User:</strong> {buyerName} {buyerEmail && (<span className="text-sm text-gray-500">({buyerEmail})</span>)}</p>
                <p className="mt-1"><strong>Status:</strong> <span className={`px-2 py-0.5 rounded text-xs font-medium inline-block capitalize ${badgeClass}`}>{req.status}</span></p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {req.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => handleStatusUpdate(req._id || req.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(req._id || req.id, 'cancelled')}>Cancel</Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant={chatDisabled ? 'outline' : 'default'}
                    disabled={chatDisabled}
                    title={chatDisabled ? 'Chat not available yet (buyer not ready or firebase UID missing)' : 'Chat with buyer'}
                    onClick={() => {
                      if (!peer) return;
                      const url = buildChatUrl(peer);
                      navigate(url);
                    }}
                  >
                    Chat
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </div>
  );
};

export default ProductStatus;
