//Baljinnyam Puntsagnorov
// Timeline event types for order lifecycle tracking
//Per Stripe Integration Documentation
export const TIMELINE_EVENTS = {
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_REUSED: 'payment_reused',
  DOWNLOAD_ATTEMPT: 'download_attempt',
  DOWNLOAD_BLOCKED_REFUND: 'download_blocked_refund',
  DOWNLOAD_BLOCKED_REVIEW: 'download_blocked_review',
  // Stripe Connect seller payout/onboarding events
  SELLER_PAYOUT_CALCULATED: 'seller_payout_calculated',
  SELLER_PAYOUT_DEFERRED: 'seller_payout_deferred',
  SELLER_TRANSFER_PENDING: 'seller_transfer_pending',
  SELLER_TRANSFER_SUCCEEDED: 'seller_transfer_succeeded',
  SELLER_TRANSFER_FAILED: 'seller_transfer_failed',
  SELLER_TRANSFER_RETRY: 'seller_transfer_retry',
  SELLER_TRANSFER_REVERSED: 'seller_transfer_reversed',
  REFUND_FULL_TRANSFER_REVERSAL: 'refund_full_transfer_reversal',
  ONBOARDING_LINK_CREATED: 'onboarding_link_created',
  ONBOARDING_REQUIRED: 'onboarding_required',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_RESTRICTED: 'onboarding_restricted',
  REVIEW_CLEARED: 'review_cleared'
};

export const appendTimelineEvent = (order, evt) => {
  const timeline = Array.isArray(order?.timeline) ? order.timeline : [];
  return [...timeline, evt];
};