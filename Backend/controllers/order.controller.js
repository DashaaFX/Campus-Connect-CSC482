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
  const orders = await Order.find({ buyer: req.user._id })
    .populate('items.product')
    .sort('-createdAt');
  res.json(orders);
};

export const getSales = async (req, res) => {
  const orders = await Order.find({ seller: req.user._id })
    .populate('items.product buyer')
    .sort('-createdAt');
  res.json(orders);
};

export const requestSingleOrder = async (req, res) => {
  const { productId } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  if (product.seller.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: 'You cannot request to buy your own product' });
  }

  const order = new Order({
    buyer: req.user._id,
    seller: product.seller,
    items: [{
      product: product._id,
      title: product.title,
      price: product.price,
      quantity: 1
    }],
    totalAmount: product.price,
    status: 'pending'
  });

  await order.save();
  res.status(201).json(order);
};

export const getProductRequests = async (req, res) => {
  const { productId } = req.params;
  const orders = await Order.find({ 'items.product': productId })
    .populate('buyer', 'fullname email');
  res.json(orders);
};

export const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const order = await Order.findById(orderId).populate('items.product');
  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (order.seller.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  order.status = status;
  await order.save();
  res.json(order);
};