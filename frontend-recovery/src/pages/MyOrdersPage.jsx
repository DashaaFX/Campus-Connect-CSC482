// src/pages/MyOrdersPage.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ORDER_API_ENDPOINT } from '@/utils/data';
import { format } from 'date-fns';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${ORDER_API_ENDPOINT}/my-orders`, { withCredentials: true })
      .then(res => setOrders(res.data))
      .catch(err => console.error('Failed to fetch orders', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-4">My Orders</h1>
      {loading ? (
        <p>Loading...</p>
      ) : orders.length === 0 ? (
        <p>You haven't placed any orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order._id} className="border p-4 rounded shadow-sm">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Order ID: {order._id}</span>
                <span>{format(new Date(order.createdAt), 'PPpp')}</span>
              </div>
              <div className="mt-2">
                {order.items.map(item => (
                  <div key={item.product} className="flex justify-between py-1 border-b text-sm">
                    <div>{item.title}</div>
                    <div>Qty: {item.quantity} @ ${item.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 font-semibold">
                <span>Total: ${order.totalAmount.toFixed(2)}</span>
                <span>Status: {order.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
