import React, { useEffect, useState } from 'react';
import api from "@/utils/axios";
import { ORDER_API_ENDPOINT } from '@/utils/data';
import { format } from 'date-fns';
import { ORDER_STATUS_COLORS } from '@/constants/order-status.jsx';
import { useAuthStore } from '@/store/useAuthStore';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    api.get(`${ORDER_API_ENDPOINT}/my-orders`, { 
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setOrders(res.data.orders || res.data))
      .catch(err => console.error('Failed to fetch orders', err))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-5xl px-4 py-6 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">My Orders</h1>
      {loading ? (
        <p>Loading...</p>
      ) : orders.length === 0 ? (
        <p>You haven't placed any orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order._id} className="p-4 border rounded shadow-sm">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Order ID: {order._id}</span>
                <span>{format(new Date(order.createdAt), 'PPpp')}</span>
              </div>
              <div className="mt-2">
                {(order.items || []).map(item => (
                  <div key={item.product} className="flex justify-between py-1 text-sm border-b">
                    <div>{item.product?.title || item.title || 'Product Title'}</div>
                    <div>Qty: {item.quantity} @ ${Number(item.product?.price || item.price || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 font-semibold">
                <span>
                  {/* Calculate total from items if no total field exists */}
                  Total: ${(() => {
                    // Try using the existing total field if available
                    if (order.total) return Number(order.total).toFixed(2);
                    if (order.totalAmount) return Number(order.totalAmount).toFixed(2);
                    
                    // Calculate total from items as fallback
                    const calculatedTotal = (order.items || []).reduce((sum, item) => {
                      const price = Number(item.product?.price || item.price || 0);
                      const quantity = Number(item.quantity || 1);
                      return sum + (price * quantity);
                    }, 0);
                    
                    return calculatedTotal.toFixed(2);
                  })()}
                </span>
                <span>
                  Status: <span className={`capitalize px-2 py-1 rounded ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-200 text-gray-700'}`}>
                    {order.status}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
