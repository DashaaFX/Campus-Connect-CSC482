import { BaseModel } from './BaseModel.js';

export class OrderModel extends BaseModel {
  constructor() {
    super(process.env.ORDERS_TABLE);
  }

  async getByBuyer(buyer) {
    return this.queryByIndex(
      'BuyerIndex',
      'buyer = :buyer',
      { ':buyer': buyer }
    );
  }

  async getBySeller(seller) {
    return this.queryByIndex(
      'SellerIndex',
      'seller = :seller',
      { ':seller': seller }
    );
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
}

export const orderModel = new OrderModel();
