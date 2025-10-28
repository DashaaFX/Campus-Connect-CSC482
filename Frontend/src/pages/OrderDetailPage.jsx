import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOrderStore } from "@/store/useOrderStore";
import { format } from "date-fns";
import { ORDER_STATUS_COLORS, getOrderStatusBadge, getPaymentStatusBadge } from "@/constants/order-status.jsx";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import api from "@/utils/axios";
import { PRODUCT_API_ENDPOINT } from "@/utils/data";
import { fetchDigitalDownloadUrl } from '@/utils/digitalDownload';
import { toast } from 'sonner';

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, fetchOrders, loading, error, createCheckoutSession, redirecting, cancelOrder, refundOrder } = useOrderStore();
  const [order, setOrder] = useState(null);
  const [sellerEmails, setSellerEmails] = useState({});
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState("");


  //combine many useeffects into one logic - for faster page rendering
  useEffect(() => {
    const loadOrderAndSellers = async () => {
      setLocalLoading(true);
      setLocalError("");
      try {
        // Fetch orders if not loaded
        if (!orders.length) {
          await fetchOrders();
        }
        const found = (orders.length ? orders : await fetchOrders())
          .find(o => o._id === orderId || o.id === orderId);
        setOrder(found || null);

        // Fetch seller emails for each product in the order
        if (found && found.items && found.items.length > 0) {
          const emails = {};
          await Promise.all(found.items.map(async (item) => {
            const productId = item.product?.id || item.product?._id || item.productId;
            if (productId && !emails[productId]) {
              try {
                const res = await api.get(`${PRODUCT_API_ENDPOINT}/${productId}`);
                const prod = res.data.product || res.data.data;
                emails[productId] = prod?.sellerEmail?.S || prod?.sellerEmail || "N/A";
              } catch {
                emails[productId] = "N/A";
              }
            }
          }));
          setSellerEmails(emails);
        }
      } catch (err) {
        setLocalError("Failed to load order or seller info");
      } finally {
        setLocalLoading(false);
      }
    };

    loadOrderAndSellers();
    // eslint-disable-next-line
  }, [orderId]);

  if (loading || localLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || localError) {
    return (
      <div className="max-w-xl mx-auto mt-10 font-semibold text-red-500">
        {error || localError}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto mt-10 text-gray-500">
        Order not found.
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl px-4 py-8 mx-auto">
      <div className="flex gap-2 mb-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        {['requested','approved'].includes(order.status) && (
          <Button
            variant="destructive"
            onClick={async () => {
              const confirmed = window.confirm('Cancel this order? This cannot be undone.');
              if (!confirmed) return;
              try {
                await cancelOrder(order._id || order.id);
                toast.success('Order cancelled');
                navigate(-1);
              } catch (e) {
                toast.error(e.response?.data?.message || 'Cancel failed');
              }
            }}
          >
            Cancel Order
          </Button>
        )}
      </div>
      <div className="p-6 bg-white border rounded-lg shadow-lg">
        <h1 className="mb-4 text-2xl font-bold">Order Details</h1>
        <div className="flex justify-between mb-2 text-sm text-gray-500">
          <span>Order ID: <Badge variant="secondary">{order._id || order.id}</Badge></span>
          <span>{order.createdAt ? format(new Date(order.createdAt), "PPpp") : ""}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(() => {
            const main = getOrderStatusBadge(order.status);
            return (
              <Badge className={`capitalize px-2 py-1 ${main.className}`}>
                {main.text}
              </Badge>
            );
          })()}
          {(() => {
            if (order.status === 'refunded') return null; // main badge already conveys
            const p = getPaymentStatusBadge(order.paymentStatus);
            if (!p) return null;
            return (
              <Badge className={`px-2 py-1 text-xs ${p.className}`}>
                {p.label}
              </Badge>
            );
          })()}
        </div>
        <div className="mb-4">
          <strong>Total:</strong>
          <Badge variant="outline" className="ml-2">${order.total ? Number(order.total).toFixed(2) : "0.00"}</Badge>
        </div>
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Items</h2>
          <div className="space-y-4">
            {(order.items || []).map((item, idx) => {
              const productId = item.product?.id || item.product?._id || item.productId;
              const sellerEmail = sellerEmails[productId] || "Loading...";
              const isDigital = item.product?.isDigital;
              const canDownload = isDigital && (['completed','paid'].includes(order.status)) && order.paymentStatus !== 'failed' && order.status !== 'refunded';
              return (
                <div key={idx} className="flex items-center gap-4 p-3 border rounded bg-gray-50">
                  {item.product?.images?.length > 0 && (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.title || item.product.name}
                      className="object-cover w-32 h-32 rounded"
                    />
                  )}
                  <div>
                    <div className="font-semibold">{item.product?.title || item.product?.name || "Product"}</div>
                    <div className="text-sm text-gray-500">{item.product?.description}</div>
                    <div className="flex gap-4 mt-1 text-sm">
                      <Badge variant="secondary">Quantity: {item.quantity}</Badge>
                      <Badge variant="secondary">Price: ${Number(item.product?.price || item.price || 0).toFixed(2)}</Badge>
                    </div>
                    <div className="mt-1 text-sm">
                      <strong>Seller Email:</strong> <Badge variant="outline" className="text-md">{sellerEmail}</Badge>
                    </div>
                    {isDigital && (
                      <div className="mt-3 space-y-2">
                        {order.status === 'approved' && (
                          <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
                            Approved - Payment Required
                          </Badge>
                        )}
                        <div className="flex gap-2">
                          {(order.status === 'approved' || order.paymentStatus === 'failed') && (
                            <Button
                              variant="default"
                              size="sm"
                              disabled={redirecting}
                              onClick={() => createCheckoutSession(order._id || order.id)}
                            >
                                {redirecting ? 'Redirecting...' : (order.paymentStatus === 'failed' ? 'Retry Payment' : 'Pay Now')}
                            </Button>
                          )}
                          {isDigital && order.status === 'completed' && order.paymentStatus !== 'refunded' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!window.confirm('Initiate full refund?')) return;
                                try {
                                  await refundOrder(order._id || order.id);
                                  toast.success('Refund initiated');
                                } catch (e) {
                                  toast.error(e.response?.data?.message || 'Refund failed');
                                }
                              }}
                            >
                              Initiate Refund
                            </Button>
                          )}
                          {order.status === 'refunded' && isDigital && (
                            <Badge variant="outline" className="text-xs text-yellow-800 border-yellow-300 bg-yellow-50">Access Revoked (Refunded)</Badge>
                          )}
                          <Button
                            variant={canDownload ? 'default' : 'outline'}
                            size="sm"
                            disabled={!canDownload}
                            onClick={async () => {
                              try {
                                const url = await fetchDigitalDownloadUrl(productId);
                                if (!url) {
                                  toast.error('Download unavailable');
                                  return;
                                }
                                window.location.href = url;
                              } catch (e) {
                                toast.error(e.response?.data?.message || 'Download failed');
                              }
                            }}
                          >
                            {canDownload ? 'Download File' : (order.status === 'approved' ? 'Awaiting Payment' : (order.paymentStatus === 'failed' ? 'Payment Failed' : (order.status === 'refunded' ? 'Refunded' : 'Available After Completion')))}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {Array.isArray(order.timeline) && order.timeline.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-lg font-semibold">Activity</h2>
            <ul className="space-y-2 text-sm">
              {order.timeline.slice(-15).map((ev, i) => {
                const label = translateTimelineEvent(ev);
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="px-2 py-0.5 text-[11px] rounded bg-gray-100 text-gray-700 font-medium">
                      {new Date(ev.at).toLocaleString()}
                    </span>
                    <span>{label}</span>
                  </li>
                );
              })}
            </ul>
            {order.suspiciousPayment && (
              <div className="mt-3 text-xs font-semibold text-red-600">Payment flagged as suspicious amount mismatch.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

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
    default:
      if (type?.startsWith('status_')) return `Status changed: ${type.replace('status_','')}`;
      return type || 'Event';
  }
}

export default OrderDetailPage;