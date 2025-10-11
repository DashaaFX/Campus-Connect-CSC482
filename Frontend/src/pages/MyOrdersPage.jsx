// Now features chat functionality for buyer-seller

import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { ORDER_STATUS_COLORS } from '@/constants/order-status.jsx';
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
  
  const { orders, fetchOrders, loading, error } = useOrderStore();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const [sellerEmails, setSellerEmails] = React.useState({});
  const [sellerUsers, setSellerUsers] = React.useState({}); 

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(), 15000);
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
                  const canDownload = isDigital && (['approved','completed'].includes(order.status));
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
                            {canDownload ? 'Download' : (order.status === 'approved' ? 'Ready' : 'Pending')}
                          </Button>
                        )}
                        {isDigital && (order.status === 'approved' || order.status === 'completed') && (
                          <span className="px-2 py-0.5 ml-2 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded">Approved (Download Ready)</span>
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
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => navigate(`/order/${order._id || order.id}`)}
                >
                  View Details
                </Button>
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
