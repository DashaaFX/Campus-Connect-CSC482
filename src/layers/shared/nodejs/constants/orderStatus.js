//Baljinnyam Puntsagnorov
// Unified order lifecycle constants & helpers
// Core statuses (incremental payment support for digital products only):
// requested -> approved -> paid -> completed (digital fast path)
// requested -> approved -> (physical chat fulfillment) -> completed (manual acknowledgement later)

export const ORDER_STATUSES = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  PAID: 'paid', // payment succeeded for digital orders
  COMPLETED: 'completed',
  REFUNDED: 'refunded', // full refund processed
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
};

export const ORDER_STATUS_LIST = Object.values(ORDER_STATUSES);

// Statuses considered open (prevent duplicate requests for same buyer/product)
export const OPEN_ORDER_STATUSES = [
  ORDER_STATUSES.REQUESTED,
  ORDER_STATUSES.APPROVED,
  ORDER_STATUSES.PAID // still not completed yet (e.g. waiting manual finalize)
];

// Allowed transitions map
export const ORDER_ALLOWED_TRANSITIONS = {
  [ORDER_STATUSES.REQUESTED]: [ORDER_STATUSES.APPROVED, ORDER_STATUSES.REJECTED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.APPROVED]: [ORDER_STATUSES.PAID, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.PAID]: [ORDER_STATUSES.COMPLETED],
  [ORDER_STATUSES.COMPLETED]: [ORDER_STATUSES.REFUNDED],
  [ORDER_STATUSES.REFUNDED]: [],
  [ORDER_STATUSES.REJECTED]: [],
  [ORDER_STATUSES.CANCELLED]: []
};

export const DOWNLOAD_ENTITLEMENT_STATUSES = [
  ORDER_STATUSES.PAID,
  ORDER_STATUSES.COMPLETED
];

export function canTransition(from, to) {
  return ORDER_ALLOWED_TRANSITIONS[from]?.includes(to) || false;
}

export function isOpenStatus(status) {
  return OPEN_ORDER_STATUSES.includes(status);
}

export function isDownloadEntitled(status) {
  return DOWNLOAD_ENTITLEMENT_STATUSES.includes(status);
}