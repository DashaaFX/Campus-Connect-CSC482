import { orderModel } from '/opt/nodejs/models/Order.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { ORDER_STATUSES } from '/opt/nodejs/constants/orderStatus.js';

// Cleanup handler: cancels approved orders stuck with paymentStatus failed older than threshold minutes.
// Intended to be triggered by a scheduled CloudWatch event (e.g., every hour).
// Environment var CLEANUP_FAILED_PAYMENT_MINUTES (default 180 minutes)
export const handler = async () => {
  try {
    const thresholdMinutes = parseInt(process.env.CLEANUP_FAILED_PAYMENT_MINUTES || '180', 10);
  const cutoff = Date.now() - thresholdMinutes * 60 * 1000;
    // NOTE: orderModel.listFailedPaymentApproved is a placeholder; implement query by status/paymentStatus+updatedAt if available.
    let candidates = [];
    if (typeof orderModel.listFailedPaymentApproved === 'function') {
      try { candidates = await orderModel.listFailedPaymentApproved(new Date(cutoff).toISOString()); } catch (e) { console.warn('listFailedPaymentApproved error', e.message); }
    } else if (typeof orderModel.getAll === 'function') {
      // Fallback: bounded scan
      try { candidates = await orderModel.getAll(500); } catch (e) { console.warn('getAll failed', e.message); }
    }

    const nowIso = new Date().toISOString();
    const toCancel = candidates.filter(o => o.status === ORDER_STATUSES.APPROVED && o.paymentStatus === 'failed' && Date.parse(o.updatedAt || o.createdAt || 0) < cutoff);
    let updated = 0;
    for (const order of toCancel) {
      try {
        const timeline = [ ...(order.timeline || []), { at: nowIso, type: 'status_cancelled', actor: 'system', actorType: 'system', actorId: 'system', meta: { reason: 'failed_payment_timeout' } } ];
        // Update all products to CANCELLED
        const updatedProducts = (order.products || []).map(p => ({ ...p, status: ORDER_STATUSES.CANCELLED }));
        await orderModel.update(order._id || order.id, { status: ORDER_STATUSES.CANCELLED, products: updatedProducts, updatedAt: nowIso, timeline });
        updated++;
      } catch (e) {
        console.error('Failed to cancel stale failed payment order', { orderId: order._id || order.id, error: e.message });
      }
    }
    return createSuccessResponse({ message: 'Cleanup executed', examined: candidates.length, cancelled: updated, cutoff: new Date(cutoff).toISOString() });
  } catch (error) {
    console.error('Cleanup failed payments error:', error);
    return createErrorResponse(error.message, 500);
  }
};
