
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';


const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const ProductStatus = () => {
  const { productId } = useParams();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    axios.get(`${BASE_URL}/api/orders/product/${productId}`, { withCredentials: true })
      .then(res => {
        const data = res.data?.data || res.data;
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
  }, [productId]);

  const handleStatusUpdate = (orderId, status) => {
    axios.patch(
      `${BASE_URL}/api/orders/${orderId}/status`,
      { status }, 
      { withCredentials: true } 
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