// what: admin routes for sellers
// why: list and approve
// how: protected by admin middleware

import express from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.js';
import { getSellers, approveSeller } from '../controllers/admin.js';

const router = express.Router();

router.get('/sellers', authMiddleware, adminMiddleware, getSellers);
router.put('/sellers/:id/approve', authMiddleware, adminMiddleware, approveSeller);

export default router;