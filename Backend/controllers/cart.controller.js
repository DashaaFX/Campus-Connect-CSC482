import { Cart } from '../models/cart.model.js';
import Product from '../models/product.model.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const getCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  res.json(cart || { user: req.user._id, items: [] });
};

export const addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });

  const existingItem = cart.items.find(i => i.product.toString() === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();
  const populatedCart = await Cart.findById(cart._id).populate('items.product');
  res.status(200).json(populatedCart);
};

export const removeFromCart = async (req, res) => {
  const { productId } = req.params;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  cart.items = cart.items.filter(i => i.product.toString() !== productId);
  await cart.save();
  const populatedCart = await Cart.findById(cart._id).populate('items.product');
  res.json(populatedCart);
};

export const clearCart = async (req, res) => {
  await Cart.findOneAndDelete({ user: req.user._id });
  res.json({ message: 'Cart cleared' });
};

export const decreaseCartItemQuantity = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const productId = req.params.productId;

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    res.status(404);
    throw new Error('Cart not found');
  }

  const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
  if (itemIndex === -1) {
    res.status(404);
    throw new Error('Item not found in cart');
  }

  const item = cart.items[itemIndex];

  if (item.quantity > 1) {
    item.quantity -= 1;
  } else {
    cart.items.splice(itemIndex, 1); // Remove item from array
  }

  await cart.save();
  const populatedCart = await Cart.findById(cart._id).populate('items.product');
  res.status(200).json({ success: true, items: populatedCart.items });
});