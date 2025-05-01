import express from 'express';
import { getCart, addToCart, removeFromCart, clearCart } from '../controllers/cart.controller.js';
import authenticateToken from '../middleware/isAuthenticated.js';
import { decreaseCartItemQuantity } from '../controllers/cart.controller.js';
const router = express.Router();
router.use(authenticateToken);

router.get('/', getCart);
router.post('/add', addToCart);
router.delete('/remove/:productId', removeFromCart);
router.delete('/clear', clearCart);

export default router;
