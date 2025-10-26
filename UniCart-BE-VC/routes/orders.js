import express from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { 
  createOrder, 
  applyCoupon,
  getUserOrders,
  getSellerOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
} from '../controllers/orders.js';

const router = express.Router();

// Order Creation & Coupons
router.post('/create', authMiddleware, createOrder);
router.post('/applyCoupon', authMiddleware, applyCoupon);

// Order Retrieval
router.get('/', authMiddleware, getUserOrders);
router.get('/seller', authMiddleware, getSellerOrders);
router.get('/:id', authMiddleware, getOrderById);

// Order Management
router.put('/:id/status', authMiddleware, updateOrderStatus);
router.delete('/:id', authMiddleware, cancelOrder);

export default router;
