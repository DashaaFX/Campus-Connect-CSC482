import express from 'express';
import authenticateToken from '../middleware/isAuthenticated.js';
import {
  placeOrder,
  getMyOrders,
  getSales,
  requestSingleOrder,
  getProductRequests,
  updateOrderStatus
} from '../controllers/order.controller.js';

const router = express.Router();
router.use(authenticateToken);

router.post('/place', placeOrder);
router.post('/request', requestSingleOrder);
router.get('/my-orders', getMyOrders);
router.get('/sales', getSales);
router.get('/product/:productId', getProductRequests);
router.patch('/:orderId/status', updateOrderStatus);

export default router;