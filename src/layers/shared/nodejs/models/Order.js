import { BaseModel } from './BaseModel.js';

// Orders table currently defines a GSI "UserIndex" (userId HASH). A SellerIndex GSI will
// be added separately in infrastructure (template.yaml). Until then, we can still
// filter seller orders via scan fallback if the index is missing.
export class OrderModel extends BaseModel {
  constructor() {
    super(process.env.ORDERS_TABLE);
  }

  // Primary GSI for buyer/user orders
  async getByBuyer(userId) {
    return this.queryByIndex(
      'UserIndex',
      'userId = :userId',
      { ':userId': userId }
    );
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
}

export const orderModel = new OrderModel();
