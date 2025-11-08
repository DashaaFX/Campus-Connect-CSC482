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
  const [archivedOrderIds, setArchivedOrderIds] = useState([]);

  // Fetch archived order IDs from backend on mount
  useEffect(() => {
    async function fetchArchived() {
      try {
        const res = await api.get(`${ORDER_API_ENDPOINT}/archive`);
        setArchivedOrderIds(res.data.archivedOrderIds || []);
      } catch {}
    }
    fetchArchived();
  }, []);

  // Archive/unarchive order
  const handleArchive = async (orderId, action) => {
    try {
      const res = await api.post(`${ORDER_API_ENDPOINT}/archive`, { orderId, action });
      setArchivedOrderIds(res.data.archivedOrderIds || []);
      toast.success(action === 'archive' ? 'Order archived' : 'Order unarchived');
    } catch (e) {
      toast.error('Archive action failed');
    }
  };
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
    if (statusFilter === 'all') return orders.filter(order => !archivedOrderIds.includes(order._id || order.id));
    if (statusFilter === 'cancelled') return orders.filter(order => order.status === 'cancelled' && !archivedOrderIds.includes(order._id || order.id));
    if (statusFilter === 'requested') return orders.filter(order => order.status === 'requested' && !archivedOrderIds.includes(order._id || order.id));
    if (statusFilter === 'approved') return orders.filter(order => order.status === 'approved' && !archivedOrderIds.includes(order._id || order.id));
    if (statusFilter === 'completed') return orders.filter(order => order.status === 'completed' && !archivedOrderIds.includes(order._id || order.id));
    if (statusFilter === 'archived') return orders.filter(order => archivedOrderIds.includes(order._id || order.id));
    // 'active' = all except cancelled and archived
    return orders.filter(order => order.status !== 'cancelled' && !archivedOrderIds.includes(order._id || order.id));
  }, [orders, statusFilter, archivedOrderIds]);

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
          <option value="archived">Archived</option>
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
                  {/* Archive/Unarchive button for completed/refunded/disputed orders */}
                  {(['completed','refunded','disputed'].includes(order.status) && !archivedOrderIds.includes(order._id || order.id)) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleArchive(order._id || order.id, 'archive')}
                    >Archive</Button>
                  )}
                  {archivedOrderIds.includes(order._id || order.id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleArchive(order._id || order.id, 'unarchive')}
                    >Unarchive</Button>
                  )}
                  {(order.status === 'cancelled' || order.status === 'rejected') && (
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
                    {/* Refund button for eligible digital/completed orders */}
                    {(() => {
                      const isDigital =
                        (order.downloadLinks && order.downloadLinks.length > 0) ||
                        !!order.stripeCheckoutSessionUrl;
                      const eligibleForRefund = isDigital && order.status === 'completed' && order.paymentStatus !== 'refunded' && order.disputeStatus !== 'open';
              
                      if (!eligibleForRefund) return null;
                      return (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200"
                          onClick={async () => {
                            if (!window.confirm('Initiate full refund for this order? This cannot be undone.')) return;
                            try {
                              await api.post(`${ORDER_API_ENDPOINT}/${order.id || order._id}/refund`);
                              toast.success('Refund initiated');
                              const res = await api.get(`${ORDER_API_ENDPOINT}/seller-orders`);
                              setOrders(res.data.orders || []);
                            } catch (e) {
                              toast.error(e.response?.data?.message || 'Refund failed');
                            }
                          }}
                        >Initiate Refund</Button>
                      );
                    })()}
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
                {/* Refund/dispute status and timeline events */}
                <div className="mt-2">
                  {order.paymentStatus === 'refunded' && (
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800 border border-yellow-300 mr-2">Refunded</span>
                  )}
                  {order.disputeStatus && (
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded mr-2 ${order.disputeStatus === 'open' ? 'bg-red-100 text-red-700 border border-red-300' : order.disputeStatus === 'won' ? 'bg-green-100 text-green-700 border border-green-300' : order.disputeStatus === 'lost' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                      Dispute: {order.disputeStatus.charAt(0).toUpperCase() + order.disputeStatus.slice(1)}
                    </span>
                  )}
                  {Array.isArray(order.timeline) && order.timeline.length > 0 && (
                    <div className="mt-2">
                      <h3 className="text-xs font-semibold mb-1">Activity</h3>
                      <ul className="space-y-1 text-xs">
                        {order.timeline.slice(-10).map((ev, i) => (
                          <li key={i}>
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium mr-1">{new Date(ev.at).toLocaleString()}</span>
                            <span>{translateTimelineEvent(ev)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerOrdersPage;
// Minimal translation for timeline events
function translateTimelineEvent(ev) {
  const type = ev.type;
  switch (type) {
    case 'requested': return 'Order requested';
    case 'status_approved': return 'Seller approved order';
    case 'status_rejected': return 'Seller rejected order';
    case 'status_cancelled': return 'Buyer cancelled order';
    case 'payment_initiated': return 'Payment initiated';
    case 'payment_succeeded': return 'Payment succeeded';
    case 'payment_failed': return 'Payment failed';
    case 'refund_full': return 'Full refund processed';
    case 'refund_full_initiated': return 'Full refund initiated';
    case 'dispute_created': return 'Dispute opened';
    case 'dispute_closed': return 'Dispute closed';
    case 'dispute_funds_reinstated': return 'Dispute won (funds reinstated)';
    case 'dispute_funds_withdrawn': return 'Dispute lost (funds withdrawn)';
    default:
      if (type?.startsWith('status_')) return `Status changed: ${type.replace('status_','')}`;
      return type || 'Event';
  }
}
