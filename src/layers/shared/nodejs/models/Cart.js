import { BaseModel } from './BaseModel.js';

export class CartModel extends BaseModel {
  constructor() {
    super(process.env.CARTS_TABLE);
  }

  async getByUserId(userId) {
    const cart = await this.getById(userId);
    return cart || { userId, items: [] };
  }

  async addItem(userId, productId, quantity = 1, productDetails = {}) {
    let cart = await this.getByUserId(userId);
    
    if (!cart.items) {
      cart.items = [];
    }

    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
        addedAt: new Date().toISOString(),
        ...productDetails
      });
    }

    if (cart.id) {
      return this.update(userId, { items: cart.items });
    } else {
      return this.create({ id: userId, userId, items: cart.items });
    }
  }

  async updateItem(userId, productId, quantity) {
    const cart = await this.getByUserId(userId);
    
    if (!cart.items) {
      throw new Error('Cart is empty');
    }

    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    return this.update(userId, { items: cart.items });
  }

  async clearCart(userId) {
    return this.update(userId, { items: [] });
  }
}

export const cartModel = new CartModel();
