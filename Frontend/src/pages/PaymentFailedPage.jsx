import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '@/store/useOrderStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notifyOrderPayment } from '@/utils/notifications';

const PaymentFailedPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { fetchOrders, orders, createCheckoutSession, redirecting } = useOrderStore();
  const [order, setOrder] = React.useState(null);

  useEffect(() => {
    (async () => {
      const list = orders.length ? orders : await fetchOrders();
      const found = list.find(o => (o._id || o.id) === orderId);
      setOrder(prev => { notifyOrderPayment(found, prev); return found || null; });
    })();
  }, [orderId, orders, fetchOrders]);

  const retry = () => {
    if (!order) return;
    createCheckoutSession(order._id || order.id);
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-10 bg-white border rounded shadow">
      <h1 className="text-xl font-bold mb-4">Payment Failed</h1>
      <p className="text-sm text-gray-600 mb-4">
        {order ? 'Your payment attempt did not complete. You can retry below.' : 'Loading order information...'}
      </p>
      {order && (
        <div className="mb-4 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">Order: {order._id || order.id}</Badge>
            {order.paymentStatus === 'failed' && (
              <Badge className="bg-red-200 text-red-700">Payment Failed</Badge>
            )}
          </div>
          <div>Total: ${Number(order.total || 0).toFixed(2)}</div>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>← Back</Button>
        {order && (order.status === 'approved' || order.paymentStatus === 'failed') && (
          <Button onClick={retry} disabled={redirecting}>
            {redirecting ? 'Redirecting...' : 'Retry Payment'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaymentFailedPage;
