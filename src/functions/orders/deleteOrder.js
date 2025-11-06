
import { orderModel } from '/opt/nodejs/models/Order.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '{}' };
  }
  const orderId = event.pathParameters?.id;
  if (!orderId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Missing orderId' }) };
  }
  // Only allow delete if order is cancelled
  const order = await orderModel.get(orderId);
  if (!order) {
    return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Order not found' }) };
  }
  if (order.status !== 'cancelled') {
    return { statusCode: 403, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Only cancelled orders can be deleted' }) };
  }
  await orderModel.delete(orderId);
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Order deleted' }) };
};
