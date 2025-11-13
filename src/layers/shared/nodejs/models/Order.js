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
      // Orders are already split by seller, so just query SellerIndex
      return await this.queryByIndex(
        'SellerIndex',
        'sellerId = :sellerId',
        { ':sellerId': sellerId }
      );
    } catch (e) {
      // Fallback if index not yet provisioned
      const all = await this.getAll();
      return all.filter(o => o.sellerId === sellerId);
    }
  }

  async createOrder(orderData) {
    // Initialize per-product status if products array exists
    let products = Array.isArray(orderData.products)
      ? orderData.products.map(p => ({
          ...p,
          status: p.status || 'pending',
        }))
      : undefined;
    const order = {
      ...orderData,
      products,
      status: orderData.status || 'pending',
      orderDate: new Date().toISOString()
    };
    return super.create(order);
  }

  async updateStatus(orderId, status, updatedBy) {
    // Update overall order status
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

  // Get product status by productId
  async getProductStatus(orderId, productId) {
    const order = await this.get(orderId);
    if (!order || !Array.isArray(order.products)) return null;
    const prod = order.products.find(p => p.productId === productId);
    return prod ? prod.status : null;
  }

  // Update product status by productId
  async updateProductStatus(orderId, productId, status, updatedBy) {
    const order = await this.get(orderId);
    if (!order || !Array.isArray(order.products)) return null;
    const products = order.products.map(p =>
      p.productId === productId ? { ...p, status, statusUpdatedBy: updatedBy, statusUpdatedAt: new Date().toISOString() } : p
    );
    return this.update(orderId, { products });
  }
}

export const orderModel = new OrderModel();
