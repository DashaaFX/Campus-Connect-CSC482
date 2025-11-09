// Now features chat functionality for buyer-seller

import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { ORDER_STATUS_COLORS, getPaymentStatusBadge } from '@/constants/order-status.jsx';
import { useOrderStore } from '@/store/useOrderStore';
import { useNavigate } from 'react-router-dom'; 
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { buildChatUrl, collectSellerIds, fetchUsersIfNeeded, deriveSellerPeerFromItem } from '@/utils/chatHelpers';
import api from '@/utils/axios';
import { PRODUCT_API_ENDPOINT, ORDER_API_ENDPOINT } from '@/utils/data'
import { fetchDigitalDownloadUrl } from '@/utils/digitalDownload';
import { FileText, Package } from 'lucide-react';
import { toast } from 'sonner';
const MyOrdersPage = () => {
  // Cache for fetched product details
  const [productDetails, setProductDetails] = React.useState({});
  const { orders, fetchOrders, loading, error, createCheckoutSession, redirecting, cancelOrder } = useOrderStore();
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
  
  const [statusFilter, setStatusFilter] = React.useState('active');
  const [archivedOrderIds, setArchivedOrderIds] = React.useState([]);

  // Fetch archived order IDs from backend on mount
  React.useEffect(() => {
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
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const [sellerEmails, setSellerEmails] = React.useState({});
  const [sellerUsers, setSellerUsers] = React.useState({}); 

  // Poll for order status after payment to enable download promptly
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(), 10000); // Poll every 5s for faster update after payment
    const vis = () => { if (document.visibilityState === 'visible') fetchOrders(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', vis); };
  }, [fetchOrders]);
  
  useEffect(() => {
    const loadSellerEmails = async () => {
      if (!orders.length) return;
      const productIds = new Set();
      orders.forEach(o =>
        (o.items || []).forEach(it => {
          const pid = it.product?.id || it.product?._id || it.productId;
            if (pid) productIds.add(pid);
        })
      );
      const currentMap = { ...sellerEmails };
      const toFetch = [...productIds].filter(pid => !currentMap[pid]);
      if (!toFetch.length) return;
      await Promise.all(
        toFetch.map(async pid => {
          try {
            const res = await api.get(`${PRODUCT_API_ENDPOINT}/${pid}`);
            const prod = res.data.product || res.data.data || {};
            currentMap[pid] = prod.sellerEmail?.S || prod.sellerEmail || 'N/A';
          } catch {
            currentMap[pid] = 'N/A';
          }
        })
      );
      setSellerEmails(currentMap);
    };
    loadSellerEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);
  
  // Fetch seller user records to get firebase UIds for chat
  useEffect(() => {
    const sellerIds = collectSellerIds(orders, currentUser);
    if (!sellerIds.length) return;
    (async () => {
      const merged = await fetchUsersIfNeeded(sellerIds, sellerUsers);
      if (merged !== sellerUsers) setSellerUsers(merged);
    })();
  }, [orders, currentUser, sellerUsers]);
 return (
    <div className="max-w-5xl px-4 py-6 mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Orders</h1>
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
      {error && (
        <div className="my-4 font-semibold text-red-500">
          {error}
        </div>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : visibleOrders.length === 0 ? (
        <p>You haven't placed any orders yet.</p>
      ) : (
        <div className="space-y-4">
          {visibleOrders.some(order => order.status === 'approved' && order.paymentStatus === 'initiated') && (
            <div className="flex items-center gap-2 p-3 mb-2 text-sm text-blue-700 border border-blue-200 rounded bg-blue-50">
              <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Waiting for payment confirmation... Your download will be enabled automatically once payment is complete.</span>
            </div>
          )}
          {visibleOrders.map(order => (
            <div key={order._id || order.id} className="p-4 border rounded shadow-sm">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Order ID: {order._id || order.id}</span>
                <span>{order.createdAt ? format(new Date(order.createdAt), 'PPpp') : ''}</span>
              </div>
              <div className="mt-2">
                {/* Show seller email for every product in all orders */}
                {(order.products || order.items || []).map(item => {
                  const pid = item.product?.id || item.product?._id || item.productId;
                  return (
                    <div key={pid} className="mb-1">
                      <span className="text-xs text-gray-500">Seller Email: {sellerEmails[pid] || 'N/A'}</span>
                    </div>
                  );
                })}
                {/* Only show download links/buttons for completed orders */}
                {order.status === 'completed' && (
                  order.downloadLinks?.length > 0 ? (
                    <div className="mb-2 space-y-2">
                      <h3 className="font-semibold">Download your products:</h3>
                      {order.downloadLinks.map(link => (
                        <Button
                          key={link.productId}
                          size="sm"
                          variant="default"
                          onClick={async () => {
                            try {
                              const url = await fetchDigitalDownloadUrl(link.productId);
                              if (!url) { toast.error('Download unavailable'); return; }
                              window.location.href = url;
                              await new Promise(resolve => setTimeout(resolve, 1000));
                              await fetchOrders();
                            } catch (e) {
                              toast.error(e.response?.data?.message || 'Download failed');
                            }
                          }}
                          className="inline-block px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700"
                        >
                          Download File
                        </Button>
                      ))}
                    </div>
                  ) : (
                    (order.products || order.items || []).filter(item => item.product?.isDigital).map(item => {
                      const pid = item.product?.id || item.product?._id || item.productId;
                      const title = item.product?.title || item.title || 'Digital Product';
                      return (
                        <div key={pid} className="flex items-center justify-between p-3 mb-2 bg-white border rounded-lg">
                          <div className="text-sm font-medium text-gray-900">{title}</div>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={async () => {
                              try {
                                const url = await fetchDigitalDownloadUrl(pid);
                                if (!url) { toast.error('Download unavailable'); return; }
                                window.location.href = url;
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                await fetchOrders();
                              } catch (e) {
                                toast.error(e.response?.data?.message || 'Download failed');
                              }
                            }}
                          >
                            Download File
                          </Button>
                        </div>
                      );
                    })
                  )
                )}
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
                  Status:{' '}
                  <span className={`capitalize px-2 py-1 rounded ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-200 text-gray-700'}`}>
                    {order.status}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap justify-end gap-2 mt-3">
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
                      const endpoint = `${ORDER_API_ENDPOINT}/${order.id || order._id}`;
                      
                      try {
                        await api.delete(endpoint);
                        toast.success('Order deleted');
                        fetchOrders();
                      } catch (e) {
                        console.error('Delete order error:', e);
                        toast.error(e.response?.data?.message || 'Delete failed');
                      }
                    }}
                  >Delete</Button>
                )}
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => navigate(`/order/${order._id || order.id}`)}
                >
                  View Details
                </Button>
                {(['requested','approved'].includes(order.status)) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      const confirmed = window.confirm('Cancel this order? This cannot be undone.');
                      if (!confirmed) return;
                      try {
                        await cancelOrder(order._id || order.id);
                        toast.success('Order cancelled');
                      } catch (e) {
                        toast.error(e.response?.data?.message || 'Cancel failed');
                      }
                    }}
                  >
                    Cancel
                  </Button>
                )}
                {(() => {
                  // Find first product with seller info
                  const firstItem = (order.products || order.items || [])[0];
                  const peer = deriveSellerPeerFromItem(firstItem, currentUser, sellerUsers);
                  // Detect digital products using both product and productDetails
                  const hasDigital = (order.products || order.items || []).some(it => {
                    if (it.product?.isDigital) return true;
                    if (it.productId && productDetails[it.productId]?.isDigital) return true;
                    return false;
                  });
                  if (!hasDigital) return null;
                  // Show Pay Now button only if order.status === 'approved' or paymentStatus === 'failed'
                  if (order.status === 'approved' || order.paymentStatus === 'failed') {
                    return (
                      <Button
                        size="sm"
                        variant="default"
                        disabled={redirecting}
                        onClick={() => createCheckoutSession(order._id || order.id)}
                      >
                        {redirecting ? 'Redirecting...' : (order.paymentStatus === 'failed' ? 'Retry Payment' : 'Pay Now')}
                      </Button>
                    );
                  }
                  return null;
                })()}
                {(() => {
                  if (!order.paymentStatus || ['refunded'].indexOf(order.paymentStatus) === -1) return null;
                  const p = getPaymentStatusBadge(order.paymentStatus);
                  if (!p) return null;
                  return <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${p.className}`}>{p.label}</span>;
                })()}
                {(() => {
                  // Find first product with seller info
                  const firstItem = (order.products || order.items || [])[0];
                  const peer = deriveSellerPeerFromItem(firstItem, currentUser, sellerUsers);
                  const sellerId = firstItem?.sellerId;
                  const disabled = !peer && !sellerId;
                  return (
                    <Button
                      size="sm"
                      variant={disabled ? 'outline' : 'default'}
                      disabled={disabled}
                      onClick={() => {
                        if (peer) {
                          const url = buildChatUrl(peer);
                          navigate(url);
                        } else if (sellerId) {
                          // Fallback: build chat URL with sellerId only
                          const url = `/chat?sellerId=${sellerId}`;
                          navigate(url);
                        }
                      }}
                      title={disabled ? 'Seller chat not available yet' : 'Chat with seller'}
                    >
                      Chat
                    </Button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default MyOrdersPage;
