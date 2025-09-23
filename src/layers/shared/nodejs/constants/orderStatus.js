// Canonical order statuses (central source of truth)
export const ORDER_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  CANCELLED: 'cancelled',
  SHIPPED: 'shipped',
  COMPLETED: 'completed'
};

// Export list form if needed elsewhere
export const ORDER_STATUS_LIST = Object.values(ORDER_STATUSES);