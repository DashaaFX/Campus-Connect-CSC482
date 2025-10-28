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
import { PRODUCT_API_ENDPOINT } from '@/utils/data'
import { fetchDigitalDownloadUrl } from '@/utils/digitalDownload';
import { FileText, Package } from 'lucide-react';
import { toast } from 'sonner';
const MyOrdersPage = () => {
  
  const { orders, fetchOrders, loading, error, createCheckoutSession, redirecting, cancelOrder } = useOrderStore();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const [sellerEmails, setSellerEmails] = React.useState({});
  const [sellerUsers, setSellerUsers] = React.useState({}); 

  // Poll for order status after payment to enable download promptly
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(), 5000); // Poll every 5s for faster update after payment
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
      <h1 className="mb-4 text-2xl font-bold">My Orders</h1>
      {error && (
        <div className="my-4 font-semibold text-red-500">
          {error}
        </div>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : orders.length === 0 ? (
        <p>You haven't placed any orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.some(order => order.status === 'approved' && order.paymentStatus === 'initiated') && (
            <div className="flex items-center gap-2 p-3 mb-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded">
              <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
              <span>Waiting for payment confirmation... Your download will be enabled automatically once payment is complete.</span>
            </div>
          )}
          {orders.map(order => (
            <div key={order._id || order.id} className="p-4 border rounded shadow-sm">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Order ID: {order._id || order.id}</span>
                <span>{order.createdAt ? format(new Date(order.createdAt), 'PPpp') : ''}</span>
              </div>
              <div className="mt-2">
                {(order.items || []).map(item => {
                  const pid = item.product?.id || item.product?._id || item.productId;
                  const email = sellerEmails[pid] || 'Loading...';
                  const isDigital = item.product?.isDigital;
                  // Blocked download states (single source of truth)
                  const blockedReason = (() => {
                    if (order.timeline?.some(ev => ev.type === 'download_blocked_review')) return 'review';
                    if (order.timeline?.some(ev => ev.type === 'download_blocked_refund')) return 'refund';
                    if (order.timeline?.some(ev => ev.type === 'download_attempt' && ev.meta?.blocked === 'rate_limit')) return 'rate_limit';
                    return null;
                  })();
                  const canDownload = isDigital && (['completed','paid'].includes(order.status)) && order.paymentStatus !== 'failed' && order.status !== 'refunded' && !blockedReason;
                  return (
                    <div
                      key={pid || Math.random()}
                      className="flex flex-col gap-1 py-2 text-sm border-b last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {isDigital ? (
                            <FileText className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Package className="w-4 h-4 text-gray-500" />
                          )}
                          <span>{item.product?.title || item.title || 'Product Title'}</span>
                        </div>
                        <div>Qty: {item.quantity} @ ${Number(item.product?.price || item.price || 0).toFixed(2)}</div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Seller Email: {email}</span>
                        {isDigital && (
                          <Button
                            size="xs"
                            variant={canDownload ? 'outline' : 'outline'}
                            disabled={!canDownload}
                            onClick={async () => {
                              try {
                                const url = await fetchDigitalDownloadUrl(pid);
                                if (!url) { toast.error('Download unavailable'); return; }
                                window.location.href = url;
                              } catch (e) {
                                toast.error(e.response?.data?.message || 'Download failed');
                              }
                            }}
                          >
                            {canDownload ? 'Download'
                              : blockedReason === 'review' ? 'Blocked: Payment Under Review'
                              : blockedReason === 'refund' ? 'Blocked: Refunded'
                              : blockedReason === 'rate_limit' ? 'Blocked: Rate Limit'
                              : (order.status === 'approved' ? 'Awaiting Payment'
                                : (order.paymentStatus === 'failed' ? 'Payment Failed'
                                  : (order.status === 'refunded' ? 'Refunded' : 'Requested')))}
                          </Button>
                        )}
                        {isDigital && blockedReason === 'review' && (
                          <span className="px-2 py-0.5 ml-2 text-[10px] font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded">Download blocked: Payment under review</span>
                        )}
                        {isDigital && blockedReason === 'refund' && (
                          <span className="px-2 py-0.5 ml-2 text-[10px] font-medium text-yellow-800 bg-yellow-50 border border-yellow-200 rounded">Download blocked: Refunded</span>
                        )}
                        {isDigital && blockedReason === 'rate_limit' && (
                          <span className="px-2 py-0.5 ml-2 text-[10px] font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded">Download blocked: Rate limit</span>
                        )}
                        {isDigital && order.status === 'approved' && !isBlockedReview && !isBlockedRefund && !isBlockedRate && (
                          <span className="px-2 py-0.5 ml-2 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded">Approved - Payment Required</span>
                        )}
                        {isDigital && order.paymentStatus === 'failed' && !isBlockedReview && !isBlockedRefund && !isBlockedRate && (
                          <span className="px-2 py-0.5 ml-2 text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 rounded">Payment Failed</span>
                        )}
                        {isDigital && order.status === 'refunded' && !isBlockedReview && !isBlockedRefund && !isBlockedRate && (
                          <span className="px-2 py-0.5 ml-2 text-[10px] font-medium text-yellow-800 bg-yellow-50 border border-yellow-200 rounded">Refunded</span>
                        )}
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
                    const calc = (order.items || []).reduce((sum, it) => {
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
                  const hasDigital = (order.items || []).some(it => it.product?.isDigital);
                  if (!hasDigital) return null;
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
                  const firstItem = (order.items || [])[0];
                  const peer = deriveSellerPeerFromItem(firstItem, currentUser, sellerUsers);
                  const disabled = !peer;
                  return (
                    <Button
                      size="sm"
                      variant={disabled ? 'outline' : 'default'}
                      disabled={disabled}
                      onClick={() => {
                        if (!peer) return;
                        const url = buildChatUrl(peer);
                        navigate(url);
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
