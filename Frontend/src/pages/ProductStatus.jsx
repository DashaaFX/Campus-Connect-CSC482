
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from "@/utils/axios";
import { Button } from '@/components/ui/button';
import { ORDER_API_ENDPOINT } from '@/utils/data';
import { useAuthStore } from '@/store/useAuthStore';

const ProductStatus = () => {
  const { productId } = useParams();
  const [requests, setRequests] = useState([]);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    api.get(`${ORDER_API_ENDPOINT}/product/${productId}`, { 
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const data = res.data?.data || res.data?.orders || res.data;
        if (Array.isArray(data)) {
          setRequests(data);
        } else {
          console.error("Unexpected response structure:", res.data);
          setRequests([]);
        }
      })
      .catch(err => {
        console.error('Error loading requests:', err);
        setRequests([]);
      });
  }, [productId, token]);

  const handleStatusUpdate = (orderId, status) => {
    api.patch(
      `${ORDER_API_ENDPOINT}/${orderId}/status`,
      { status },  
      { headers: { Authorization: `Bearer ${token}` } } 
    )
      .then(() => {
        setRequests(prev =>
          prev.map(o => o._id === orderId ? { ...o, status } : o)
        );
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
          {requests.map(req => (
            <div key={req._id} className="p-4 border rounded shadow-sm">
              <p><strong>User:</strong> {req.buyer?.fullname} ({req.buyer?.email})</p>
              <p><strong>Status:</strong> <span className="capitalize">{req.status}</span></p>
              {req.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <Button onClick={() => handleStatusUpdate(req._id, 'approved')}>Approve</Button>
                  <Button variant="outline" onClick={() => handleStatusUpdate(req._id, 'cancelled')}>Cancel</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductStatus;
