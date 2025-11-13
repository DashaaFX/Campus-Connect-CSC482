export const ORDER_STATUS_COLORS = {
  requested: 'bg-gray-300 text-gray-700',
  approved: 'bg-green-200 text-green-800',
  paid: 'bg-indigo-200 text-indigo-800',
  cancelled: 'bg-red-200 text-red-600',
  completed: 'bg-emerald-200 text-emerald-700',
  refunded: 'bg-yellow-200 text-yellow-800'
};

export const PAYMENT_STATUS_LABELS = {
  failed: { label: 'Payment Failed', className: 'bg-red-200 text-red-700' },
  refunded: { label: 'Refunded', className: 'bg-yellow-200 text-yellow-800' }
};

export function getOrderStatusBadge(status) {
  const cls = ORDER_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
  const text = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  return { className: cls, text };
}

export function getPaymentStatusBadge(paymentStatus) {
  if (!paymentStatus) return null;
  return PAYMENT_STATUS_LABELS[paymentStatus] || null;
}

