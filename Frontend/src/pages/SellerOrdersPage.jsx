import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ORDER_STATUS_COLORS } from '@/constants/order-status.jsx';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/axios';
import { PRODUCT_API_ENDPOINT, ORDER_API_ENDPOINT } from '@/utils/data';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const SellerOrdersPage = () => {
  const currentUser = useAuthStore(s => s.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [productDetails, setProductDetails] = useState({});
  const navigate = useNavigate();
  // Fetch missing product details for items with only productId
  useEffect(() => {
    const missingIds = [];
    (orders || []).forEach(order => {
      (order.products || order.items || []).forEach(item => {
        const pid = item.productId || item.product?.id || item.product?._id;
        if (pid && !productDetails[pid] && !item.product?.title && !item.title && !item.productTitle) {
          missingIds.push(pid);
        }
      });
    });
    if (!missingIds.length) return;
    Promise.all(missingIds.map(async pid => {
      try {
        const res = await api.get(`${PRODUCT_API_ENDPOINT}/${pid}`);
        const prod = res.data.product || res.data.data || {};
        setProductDetails(prev => ({ ...prev, [pid]: prod }));
      } catch {
        setProductDetails(prev => ({ ...prev, [pid]: { title: 'Unknown', price: 0 } }));
      }
    }));
  }, [orders, productDetails]);

  useEffect(() => {
    // Fetch all orders for products owned by current seller
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get(`${ORDER_API_ENDPOINT}/seller-orders`); // Correct backend route
        setOrders(res.data.orders || []);
      } catch {
        setOrders([]);
      }
      setLoading(false);
    };
    fetchOrders();
  }, [currentUser]);

  // Filter orders by status
  const visibleOrders = React.useMemo(() => {
    if (statusFilter === 'all') return orders;
    if (statusFilter === 'cancelled') return orders.filter(order => order.status === 'cancelled');
    if (statusFilter === 'requested') return orders.filter(order => order.status === 'requested');
    if (statusFilter === 'approved') return orders.filter(order => order.status === 'approved');
    if (statusFilter === 'completed') return orders.filter(order => order.status === 'completed');
    // 'active' = all except cancelled
    return orders.filter(order => order.status !== 'cancelled');
  }, [orders, statusFilter]);

  return (
    <div className="max-w-5xl px-4 py-6 mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <h1 className="text-2xl font-bold">Incoming Orders</h1>
        </div>
        <select
          className="px-2 py-1 border rounded text-sm bg-white"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {loading ? <p>Loading...</p> : visibleOrders.length === 0 ? <p>No incoming orders.</p> : (
        <div className="space-y-4">
          {visibleOrders.map(order => (
            <div key={order.id || order._id} className="p-4 border rounded shadow-sm">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Order ID: {order.id || order._id}</span>
                <span>Buyer: {order.buyerEmail || order.userEmail || 'N/A'}</span>
                <span>{order.createdAt ? format(new Date(order.createdAt), 'PPpp') : ''}</span>
              </div>
              <div className="mt-2">
                {(order.products || order.items || []).map(item => {
                  const pid = item.product?.id || item.product?._id || item.productId;
                  const isDigital = item.product?.isDigital;
                  const productTitle = item.product?.title
                    || item.title
                    || item.productTitle
                    || (pid && productDetails[pid]?.title)
                    || 'Untitled Product';
                  const price = item.product?.price
                    ?? item.price
                    ?? (pid && productDetails[pid]?.price)
                    ?? 0;
                  return (
                    <div key={pid || Math.random()} className="flex flex-col gap-1 py-2 text-sm border-b last:border-b-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{productTitle}</span>
                        </div>
                        <div>Qty: {item.quantity} @ ${price ? Number(price).toFixed(2) : 'N/A'}</div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Payment: {order.paymentStatus}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-3 font-semibold">
                <span>
                  Total: ${(() => {
                    if (order.total) return Number(order.total).toFixed(2);
                    if (order.totalAmount) return Number(order.totalAmount).toFixed(2);
                    const calc = (order.products || order.items || []).reduce((sum, it) => {
                      const price = Number(it.product?.price || it.price || 0);
                      return sum + price * Number(it.quantity || 1);
                    }, 0);
                    return calc.toFixed(2);
                  })()}
                </span>
                <span>
                  Status: <span className={`capitalize px-2 py-1 rounded font-semibold ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-200 text-gray-700'}`}>{order.status}</span>
                </span>
                {/* Whole order approve/reject buttons */}
                <div className="flex gap-2 ml-4">
                  {order.status === 'cancelled' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await api.delete(`${ORDER_API_ENDPOINT}/${order.id || order._id}`);
                          toast.success('Order deleted');
                          const res = await api.get(`${ORDER_API_ENDPOINT}/seller-orders`);
                          setOrders(res.data.orders || []);
                        } catch (e) {
                          toast.error(e.response?.data?.message || 'Delete failed');
                        }
                      }}
                    >Delete</Button>
                  )}
                  {(order.status === 'requested') && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                        onClick={async () => {
                          try {
                            await api.put(`${ORDER_API_ENDPOINT}/${order.id || order._id}/status`, {
                              status: 'approved'
                            });
                            const res = await api.get(`${ORDER_API_ENDPOINT}/seller-orders`);
                            setOrders(res.data.orders || []);
                          } catch (e) {}
                        }}
                      >Approve Order</Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                        onClick={async () => {
                          try {
                            await api.put(`${ORDER_API_ENDPOINT}/${order.id || order._id}/status`, {
                              status: 'rejected'
                            });
                            const res = await api.get(`${ORDER_API_ENDPOINT}/seller-orders`);
                            setOrders(res.data.orders || []);
                          } catch (e) {}
                        }}
                      >Reject Order</Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      // Open chat with buyer (use buyerEmail or userId)
                      const buyerId = order.buyerId || order.userId || order.buyerEmail || order.userEmail;
                      if (!buyerId) return;
                      // If buyerId is an email, pass as query param
                      const url = `/chat?buyer=${encodeURIComponent(buyerId)}`;
                      navigate(url);
                    }}
                    title="Chat with buyer"
                  >Chat</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerOrdersPage;
