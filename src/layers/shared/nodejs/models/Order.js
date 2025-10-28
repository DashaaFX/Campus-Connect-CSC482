//Baljinnyam Puntsagnorov
import { BaseModel } from './BaseModel.js';

//Model for Orders table
export class OrderModel extends BaseModel {
  constructor() {
    super(process.env.ORDERS_TABLE);
  }

  // Primary GSI for buyer/user orders
  async getByBuyer(userId) {
    const queried = await this.queryByIndex(
      'UserIndex',
      'userId = :userId',
      { ':userId': userId }
    );
    if (queried && queried.length) return queried;
    // Fallback: index empty or missing; perform bounded scan
    try {
      const all = await this.getAll(500); // bounded scan limit
      const filtered = all.filter(o => o.userId === userId);
      if (filtered.length) {
        console.error('[orders-index-warning] UserIndex returned 0 for user', userId, 'but scan recovered', filtered.length, 'orders');
      }
      return filtered;
    } catch (e) {
      console.error('[orders-index-error] fallback scan failed for user', userId, e.message);
      return [];
    }
  }

  // Seller orders: prefer SellerIndex if exists, else fallback to scan & filter
  async getBySeller(sellerId) {
    try {
      const items = await this.queryByIndex(
        'SellerIndex',
        'sellerId = :sellerId',
        { ':sellerId': sellerId }
      );
      return items;
    } catch (e) {
      // Fallback if index not yet provisioned
      const all = await this.getAll();
      return all.filter(o => o.sellerId === sellerId || o.items?.some(it => it.sellerId === sellerId || it.product?.sellerId === sellerId));
    }
  }

  async createOrder(orderData) {
    const order = {
      ...orderData,
      status: orderData.status || 'pending',
      orderDate: new Date().toISOString()
    };
    return super.create(order);
  }

  async updateStatus(orderId, status, updatedBy) {
    return this.update(orderId, {
      status,
      statusUpdatedBy: updatedBy,
      statusUpdatedAt: new Date().toISOString()
    });
  }

  // Provide get alias for legacy code referencing orderModel.get
  async get(id) {
    return this.getById(id);
  }

  // Query payment intent index (expects GSI PaymentIntentIndex)
  async listByPaymentIntent(paymentIntentId) {
    if (!paymentIntentId) return [];
    try {
      const items = await this.queryByIndex(
        'PaymentIntentIndex',
        'stripePaymentIntentId = :pid',
        { ':pid': paymentIntentId }
      );
      return items || [];
    } catch (e) {
      console.error('[orders-paymentIntentIndex-error]', e.message);
      return [];
    }
  }

  async listByStatus(status) {
    if (!status) return [];
    try {
      const items = await this.queryByIndex(
        'StatusIndex',
        'status = :status',
        { ':status': status }
      );
      return items || [];
    } catch (e) {
      console.error('[orders-statusIndex-error]', e.message);
      return [];
    }
  }

  async listFailedPaymentApproved(cutoffIso) {
    // Return orders still in APPROVED with paymentStatus failed and updatedAt older than cutoff
    const approved = await this.listByStatus('approved');
    return approved.filter(o => o.paymentStatus === 'failed' && o.updatedAt && o.updatedAt < cutoffIso);
  }
}

export const orderModel = new OrderModel();
