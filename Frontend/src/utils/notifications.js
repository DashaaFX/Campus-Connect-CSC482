import { toast } from 'sonner';

// Simple in-app payment status notifier
export function notifyOrderPayment(order, prev) {
  if (!order) return;
  const status = order.status;
  const pay = order.paymentStatus;
  const prevStatus = prev?.status;
  const prevPay = prev?.paymentStatus;

  // Payment succeeded
  if (pay === 'succeeded' && prevPay !== 'succeeded') {
    toast.success('Payment succeeded');
  }
  // Payment failed
  if (pay === 'failed' && prevPay !== 'failed') {
    toast.error('Payment failed');
  }
  // Refunded
  if (status === 'refunded' && prevStatus !== 'refunded') {
    toast.info('Order refunded');
  }
  // Requires review
  if (order.requiresReview && !prev?.requiresReview) {
    toast.warning('Payment flagged for review');
  }
}