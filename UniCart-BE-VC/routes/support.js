// what: support ticket routes
// why: endpoints for ticket creation and management
// how: validate auth, check admin role for updates

import express from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { 
  getUserTickets,
  getAllTickets,
  createTicket,
  updateTicket,
  deleteTicket
} from '../controllers/support.js';

const router = express.Router();

// User routes
router.get('/tickets', authMiddleware, getUserTickets);
router.post('/create', authMiddleware, createTicket);

// Admin routes
router.get('/admin/tickets', authMiddleware, getAllTickets);
router.put('/tickets/:id', authMiddleware, updateTicket);
router.delete('/tickets/:id', authMiddleware, deleteTicket);

export default router;
