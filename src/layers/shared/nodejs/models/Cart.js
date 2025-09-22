import { BaseModel } from './BaseModel.js';
import { GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../utils/dynamodb.js';

export class CartModel extends BaseModel {
  constructor() {
    super(process.env.CARTS_TABLE);
  }

  // Override BaseModel methods to use userId as primary key instead of id
  async getById(userId) {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { userId }
    });

    const result = await docClient.send(command);
    return result.Item;
  }

  async update(userId, updates) {
    const timestamp = new Date().toISOString();
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // Ensure we're not trying to update any key fields
    const safeUpdates = { ...updates };
    delete safeUpdates.userId;  // Remove primary key if present
    
    // Ensure updatedAt is included only once
    if (!safeUpdates.updatedAt) {
      safeUpdates.updatedAt = timestamp;
    }
    
    Object.keys(safeUpdates).forEach((key, index) => {
      const attributeName = `#attr${index}`;
      const attributeValue = `:val${index}`;
      
      updateExpression.push(`${attributeName} = ${attributeValue}`);
      expressionAttributeNames[attributeName] = key;
      expressionAttributeValues[attributeValue] = safeUpdates[key];
    });

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const result = await docClient.send(command);
    return result.Attributes;
  }

  // Alias for getById for code clarity
  async getByUserId(userId) {
    return this.getById(userId);
  }

  async create(item) {
    const timestamp = new Date().toISOString();
    
    const itemWithMetadata = {
      ...item,
      userId: item.userId, // Ensure userId is set
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: itemWithMetadata,
      ConditionExpression: 'attribute_not_exists(userId)' // Use userId instead of id
    });

    await docClient.send(command);
    return itemWithMetadata;
  }

  async getByUserId(userId) {
    // Cart table uses userId as primary key, not id
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
      // Update existing item
      cart.items[existingItemIndex].quantity += quantity;
      
      // Update product details if provided
      if (productDetails.product) {
        cart.items[existingItemIndex].product = productDetails.product;
      }
    } else {
      // Create new item with complete product data for easier rendering
      const newItem = {
        productId,
        quantity,
        addedAt: new Date().toISOString(),
        ...productDetails
      };
      
      cart.items.push(newItem);
    }

    // Check if cart already exists (has userId field means it exists)
    if (cart.userId && cart.createdAt) {
      return this.update(userId, { items: cart.items });
    } else {
      return this.create({ userId, items: cart.items });
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
