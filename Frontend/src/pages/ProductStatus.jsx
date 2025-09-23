
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from "@/utils/axios";
import { Button } from '@/components/ui/button';
import { ORDER_API_ENDPOINT } from '@/utils/data';
import { useAuthStore } from '@/store/useAuthStore';
import { ORDER_STATUS_COLORS } from '@/constants/order-status';

const ProductStatus = () => {
  const { productId } = useParams();
  const [requests, setRequests] = useState([]);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    // Fetch all seller orders then filter client-side for this product
    api.get(`${ORDER_API_ENDPOINT}/seller-orders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const raw = res.data?.orders || res.data?.data || [];
        if (!Array.isArray(raw)) {
          console.error('Unexpected response for seller-orders:', res.data);
          setRequests([]);
          return;
        }
        // Filter orders that include this productId in items
        const filtered = raw.filter(o => Array.isArray(o.items) && o.items.some(it => {
          return (
            it.productId === productId ||
            it.product?.id === productId ||
            it.product?._id === productId ||
            it.product?.productId === productId
          );
        }));
        setRequests(filtered);
      })
      .catch(err => {
        console.error('Error loading seller orders:', err);
        setRequests([]);
      });
  }, [productId, token]);

  const handleStatusUpdate = (orderId, status) => {
    api.put(
      `${ORDER_API_ENDPOINT}/${orderId}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(() => {
        setRequests(prev => prev.map(o => (o._id === orderId ? { ...o, status } : o)));
      })
      .catch(err => console.error('Error updating status:', err));
  };


  return (
    <div className="max-w-3xl px-4 py-6 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">Purchase Requests</h1>
      {requests.length === 0 ? (
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
    </div>
  );
};

export default ProductStatus;
