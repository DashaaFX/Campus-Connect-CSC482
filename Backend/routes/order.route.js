import express from 'express';
import { placeOrder, getMyOrders, getSales } from '../controllers/order.controller.js';
import authenticateToken from '../middleware/isAuthenticated.js';

const router = express.Router();
router.use(authenticateToken);

router.post('/place', placeOrder);
router.get('/my-orders', getMyOrders);
router.get('/sales', getSales); // for sellers

export default router;
