import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ORDER_STATUS_COLORS } from '@/constants/order-status.jsx';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/axios';
import { PRODUCT_API_ENDPOINT, ORDER_API_ENDPOINT } from '@/utils/data';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/store/useChatStore';
import { buildChatUrl, collectBuyerIds, fetchUsersIfNeeded, deriveBuyerPeer } from '@/utils/chatHelpers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
//now includes pagination feature
const SellerOrdersPage = () => {
  const currentUser = useAuthStore(s => s.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [archivedOrderIds, setArchivedOrderIds] = useState([]);
  const [buyerUsers, setBuyerUsers] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Chat conversations (for unread indicator)
  const conversations = useChatStore(s => s.conversations);
  const unreadByUser = React.useMemo(() => {
    const map = {};
    conversations.forEach(c => { if (c.unread > 0 && c.otherUserId) map[c.otherUserId] = (map[c.otherUserId] || 0) + c.unread; });
    return map;
  }, [conversations]);

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

  // Fetch buyer users for chat functionality
  useEffect(() => {
    const ids = collectBuyerIds(orders, currentUser);
    if (!ids.length) return;
    (async () => {
      const merged = await fetchUsersIfNeeded(ids, buyerUsers);
      if (merged !== buyerUsers) setBuyerUsers(merged);
    })();
  }, [orders, currentUser, buyerUsers]);

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
  //pagination feature
  const pagedOrders = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleOrders.slice(start, start + pageSize);
  }, [visibleOrders, page, pageSize]);

  // Reset page when filter or data length changes
  useEffect(() => { setPage(1); }, [statusFilter, visibleOrders.length]);

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
          className="px-2 py-1 text-sm bg-white border rounded"
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
          {pagedOrders.map(order => (
            <div key={order.id || order._id} className="p-4 border rounded shadow-sm">
              <div className="flex justify-between mb-2 text-sm text-gray-500">
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
                        className="text-green-700 bg-green-100 border-green-200 hover:bg-green-200"
                        disabled={updatingId === (order.id || order._id) + ':approved'}
                        onClick={async () => {
                          const orderId = order.id || order._id;
                          setUpdatingId(orderId + ':approved');
                          try {
                            await api.put(`${ORDER_API_ENDPOINT}/${orderId}/status`, {
                              status: 'approved'
                            });
                            toast.success('Order approved successfully!');
                            const res = await api.get(`${ORDER_API_ENDPOINT}/seller-orders`);
                            setOrders(res.data.orders || []);
                          } catch (e) {
                            toast.error(e.response?.data?.message || 'Failed to approve order');
                          } finally {
                            setUpdatingId(null);
                          }
                        }}
                      >
                        {updatingId === (order.id || order._id) + ':approved' ? (
                          <span className="flex items-center gap-2"><LoadingSpinner size="sm" className="w-4 h-4" /> Approving...</span>
                        ) : 'Approve Order'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-red-700 bg-red-100 border-red-200 hover:bg-red-200"
                        disabled={updatingId === (order.id || order._id) + ':rejected'}
                        onClick={async () => {
                          const orderId = order.id || order._id;
                          setUpdatingId(orderId + ':rejected');
                          try {
                            await api.put(`${ORDER_API_ENDPOINT}/${orderId}/status`, {
                              status: 'rejected'
                            });
                            toast.success('Order rejected successfully!');
                            const res = await api.get(`${ORDER_API_ENDPOINT}/seller-orders`);
                            setOrders(res.data.orders || []);
                          } catch (e) {
                            toast.error(e.response?.data?.message || 'Failed to reject order');
                          } finally {
                            setUpdatingId(null);
                          }
                        }}
                      >
                        {updatingId === (order.id || order._id) + ':rejected' ? (
                          <span className="flex items-center gap-2"><LoadingSpinner size="sm" className="w-4 h-4" /> Rejecting...</span>
                        ) : 'Reject Order'}
                      </Button>
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
                          className="text-yellow-800 bg-yellow-100 border-yellow-200 hover:bg-yellow-200"
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
                  {(() => {
                    const buyerId = order.buyerId || order.userId;
                    // Use deriveBuyerPeer helper for consistent peer derivation
                    const peer = deriveBuyerPeer(order, currentUser, buyerUsers);
                    const chatDisabled = !peer;
                    const unread = buyerId ? unreadByUser[buyerId] : 0;
                    return (
                      <div className="relative inline-block">
                        <Button
                          size="sm"
                          variant={chatDisabled ? 'outline' : 'default'}
                          disabled={chatDisabled}
                          title={chatDisabled ? 'Chat not available yet (buyer not ready or firebase UID missing)' : unread > 0 ? 'Unread messages' : 'Chat with buyer'}
                          onClick={() => {
                            if (!peer) return;
                            const url = buildChatUrl(peer);
                            navigate(url);
                          }}
                        >Chat</Button>
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-600 rounded-full shadow">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
                {/* Refund/dispute status and timeline events */}
                <div className="mt-2">
                  {order.paymentStatus === 'refunded' && (
                    <span className="inline-block px-2 py-1 mr-2 text-xs font-semibold text-yellow-800 bg-yellow-100 border border-yellow-300 rounded">Refunded</span>
                  )}
                  {order.disputeStatus && (
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded mr-2 ${order.disputeStatus === 'open' ? 'bg-red-100 text-red-700 border border-red-300' : order.disputeStatus === 'won' ? 'bg-green-100 text-green-700 border border-green-300' : order.disputeStatus === 'lost' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                      Dispute: {order.disputeStatus.charAt(0).toUpperCase() + order.disputeStatus.slice(1)}
                    </span>
                  )}
                  {Array.isArray(order.timeline) && order.timeline.length > 0 && (
                    <div className="mt-2">
                      <h3 className="mb-1 text-xs font-semibold">Activity</h3>
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
          {/* Pagination controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
            <div className="text-sm text-gray-600">
              {(() => {
                const total = visibleOrders.length;
                if (!total) return '';
                const start = (page - 1) * pageSize + 1;
                const end = Math.min(start + pageSize - 1, total);
                return `Showing ${start}-${end} of ${total}`;
              })()}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-1">Page size:
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="px-2 py-1 border rounded"
                >
                  {[5,10,20,50].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >Prev</Button>
              <span className="text-sm">Page {page}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const maxPage = Math.ceil(visibleOrders.length / pageSize) || 1;
                  setPage(p => Math.min(maxPage, p + 1));
                }}
                disabled={page >= (Math.ceil(visibleOrders.length / pageSize) || 1)}
              >Next</Button>
            </div>
          </div>
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
