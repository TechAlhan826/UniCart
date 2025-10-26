import express from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { confirmPayment } from '../controllers/payments.js';

const router = express.Router();

router.post('/confirm', authMiddleware, confirmPayment);

export default router;
