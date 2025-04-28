import { Order } from '../models/order.model.js';
import { Cart } from '../models/cart.model.js';
import Product from '../models/product.model.js';

export const placeOrder = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  const orders = [];
  const grouped = {};

  // Group by seller
  for (const item of cart.items) {
    const sellerId = item.product.seller.toString();
    if (!grouped[sellerId]) grouped[sellerId] = [];
    grouped[sellerId].push(item);
  }

  for (const [sellerId, items] of Object.entries(grouped)) {
    const orderItems = items.map(i => ({
      product: i.product._id,
      title: i.product.title,
      price: i.product.price,
      quantity: i.quantity
    }));

    const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

    const order = new Order({
      buyer: req.user._id,
      seller: sellerId,
      items: orderItems,
      totalAmount: total
    });

    await order.save();
    orders.push(order);

    // Update product stock
    for (const item of items) {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.stock -= item.quantity;
        product.quantitySold += item.quantity;
        await product.save();
      }
    }
  }

  await Cart.findOneAndDelete({ user: req.user._id });
  res.status(201).json({ message: 'Order placed', orders });
};

export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ buyer: req.user._id }).populate('items.product').sort('-createdAt');
  res.json(orders);
};

export const getSales = async (req, res) => {
  const orders = await Order.find({ seller: req.user._id }).populate('items.product').sort('-createdAt');
  res.json(orders);
};
