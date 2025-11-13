// Product Status Component that shows order information for a specific product
// Now includes chat functionality 
import React, { useEffect, useState } from 'react';
import { useParams , useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ORDER_STATUS_COLORS } from '@/constants/order-status';
import { useOrderStore } from '@/store/useOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import { buildChatUrl, collectBuyerIds, fetchUsersIfNeeded, deriveBuyerPeer } from '@/utils/chatHelpers';
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
  // Handle status updates, by loading state
  const [updatingId, setUpdatingId] = useState(null);
  const handleStatusUpdate = async (orderId, status) => {
    setUpdatingId(orderId + ':' + status);
    try {
      await updateOrderStatus(orderId, status);
      if (status === 'approved') toast.success('Order approved successfully!');
      else if (status === 'cancelled') toast.success('Order cancelled successfully!');
      else if (status === 'completed') toast.success('Order marked completed!');
      else toast.success(`Order updated: ${status}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
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
                  {/* Shows Loading Spinner when Order status changes */}
                  {req.status === 'requested' && (() => {
                    const orderId = req._id || req.id;
                    const loadingApproved = updatingId === orderId + ':approved';
                    const loadingCancelled = updatingId === orderId + ':cancelled';
                    return (
                      <>
                        <Button
                          size="sm"
                          disabled={loadingApproved || loadingCancelled}
                          onClick={() => handleStatusUpdate(orderId, 'approved')}
                        >
                          {loadingApproved ? (
                            <span className="flex items-center gap-2"><LoadingSpinner size="sm" className="w-4 h-4" /> Approving...</span>
                          ) : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loadingApproved || loadingCancelled}
                          onClick={() => handleStatusUpdate(orderId, 'cancelled')}
                        >
                          {loadingCancelled ? (
                            <span className="flex items-center gap-2"><LoadingSpinner size="sm" className="w-4 h-4" /> Cancelling...</span>
                          ) : 'Cancel'}
                        </Button>
                      </>
                    );
                  })()}
                  {req.status === 'approved' && (() => {
                    const product = req.items?.[0]?.product;
                    if (product?.isDigital) return null;
                    const orderId = req._id || req.id;
                    const loadingThis = updatingId === orderId + ':completed';
                    return (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" disabled={loadingThis}>
                            {loadingThis ? (
                              <span className="flex items-center gap-2"><LoadingSpinner size="sm" className="w-4 h-4" /> Completing...</span>
                            ) : 'Mark Order Complete'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm" aria-describedby={undefined}>
                          <DialogHeader>
                            <DialogTitle>Mark order complete?</DialogTitle>
                            <DialogDescription>
                              Finalize the physical order and notify the buyer. Ensure delivery or pickup is confirmed before proceeding.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="flex justify-end gap-2 mt-2">
                            <DialogClose asChild>
                              <Button variant="outline" type="button">Cancel</Button>
                            </DialogClose>
                            <Button
                              type="button"
                              disabled={loadingThis}
                              onClick={() => handleStatusUpdate(orderId, 'completed')}
                            >
                              {loadingThis ? <span className="flex items-center gap-2"><LoadingSpinner size="sm" className="w-4 h-4" /> Saving</span> : 'Confirm Complete'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    );
                  })()}
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
