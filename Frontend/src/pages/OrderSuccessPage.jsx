import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import api from '@/utils/axios';
import { ORDER_API_ENDPOINT } from '@/utils/data';
import { fetchDigitalDownloadUrl } from '@/utils/digitalDownload';
import { toast } from 'sonner';
import { notifyOrderPayment } from '@/utils/notifications';

// Lightweight success / post-checkout page.
// Polls the order until it reaches completed for digital downloads.
const POLL_INTERVAL_MS = 3000;

const OrderSuccessPage = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${ORDER_API_ENDPOINT}/${orderId}`);
      const ord = res.data.order || res.data.data || res.data;
      setOrder(prev => { notifyOrderPayment(ord, prev); return ord; });
      setError(null);
      return ord;
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    const isDigital = (order.items || []).some(i => i.product?.isDigital);
    if (!isDigital) return; // physical fulfillment handled elsewhere
    const terminal = ['completed','paid','refunded','cancelled'];
    if (terminal.includes(order.status) || terminal.includes(order.paymentStatus)) return; // done
    setPolling(true);
    const id = setInterval(async () => {
      const fresh = await fetchOrder();
      if (fresh) {
        const done = terminal.includes(fresh.status) || terminal.includes(fresh.paymentStatus);
        if (done) {
        clearInterval(id);
        setPolling(false);
      }
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [order]);

  if (loading && !order) {
    return (
      <div className="flex items-center justify-center h-64">Loading order...</div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg px-4 py-8 mx-auto">
        <p className="mb-4 font-semibold text-red-600">{error}</p>
        <Button variant="outline" onClick={() => navigate(`/order/${orderId}`)}>Back to Order</Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-lg px-4 py-8 mx-auto">
        <p>Order not found.</p>
        <Button variant="outline" onClick={() => navigate('/my-orders')}>My Orders</Button>
      </div>
    );
  }

  const isDigital = (order.products || order.items || []).some(i => i.product?.isDigital);
  const ready = ['completed','paid','refunded'].includes(order.status) || ['succeeded','refunded'].includes(order.paymentStatus);

  return (
    <div className="max-w-xl px-4 py-8 mx-auto">
      <h1 className="mb-2 text-2xl font-bold">Payment Successful</h1>
      {sessionId && (
        <p className="mb-4 text-sm text-gray-500">Checkout Session: {sessionId}</p>
      )}
      <p className="mb-4">Thank you! Your payment was processed.</p>
      <div className="p-4 mb-4 border rounded bg-green-50">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Order Status:</span>
          <span className="capitalize">{order.status}</span>
        </div>
      </div>
      {isDigital && (
        <div className="mb-6">
          {!ready && (
            <p className="text-sm text-gray-600">Finalizing your digital delivery… {polling && 'Polling order status.'}</p>
          )}
          {ready && (
            <div className="space-y-3">
              {/* Render download links from order.downloadLinks if present */}
              {order.downloadLinks?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Download your products:</h3>
                  {order.downloadLinks.map(link => (
                    <Button
                      key={link.productId}
                      onClick={async () => {
                        try {
                          const url = await fetchDigitalDownloadUrl(link.productId);
                          if (!url) { toast.error('Download unavailable'); return; }
                          window.location.href = url;
                        } catch (e) {
                          toast.error(e.response?.data?.message || 'Download failed');
                        }
                      }}
                      className="inline-block px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700"
                    >
                      Download Product {link.productId}
                    </Button>
                  ))}
                </div>
              )}
              {/* Fallback: old download button logic if needed */}
              {(order.downloadLinks?.length === 0 || !order.downloadLinks) &&
                (order.products || order.items || []).filter(i => i.product?.isDigital).map(i => {
                  const pid = i.product?.id || i.product?._id || i.productId;
                  return (
                    <Button
                      key={pid}
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
                      Download {i.product?.title || i.title || i.product?.name || i.name || 'File'}
                    </Button>
                  );
                })}
              {['refunded'].includes(order.status) && (
                <div className="p-2 text-xs text-red-700 border rounded bg-red-50">Refunded — downloads disabled.</div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(`/order/${orderId}`)}>View Order</Button>
        <Button variant="outline" onClick={() => navigate('/my-orders')}>My Orders</Button>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
