// Product Status Component that shows order information for a specific product
import React, { useEffect, useState } from 'react';
import { useParams , useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ORDER_STATUS_COLORS } from '@/constants/order-status';
import { useOrderStore } from '@/store/useOrderStore';
import { toast } from 'sonner';

const ProductStatus = () => {
  const { productId } = useParams();
  const { orders, fetchSales, updateOrderStatus, loading, error } = useOrderStore();
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
  
  const handleStatusUpdate = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order ${status === 'approved' ? 'approved' : 'cancelled'} successfully!`);
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
            return (
              <div key={req._id || req.id} className="p-4 border rounded shadow-sm">
                <p><strong>User:</strong> {buyerName} {buyerEmail && (<span className="text-sm text-gray-500">({buyerEmail})</span>)}</p>
                <p className="mt-1"><strong>Status:</strong> <span className={`px-2 py-0.5 rounded text-xs font-medium inline-block capitalize ${badgeClass}`}>{req.status}</span></p>
                {req.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => handleStatusUpdate(req._id || req.id, 'approved')}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(req._id || req.id, 'cancelled')}>Cancel</Button>
                  </div>
                )}
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
