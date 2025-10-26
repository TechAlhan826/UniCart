// what: product routes
// why: browse/view/create/update/delete products
// how: filters, pagination, seller auth

import express from 'express';
import { authMiddleware, sellerMiddleware, adminMiddleware } from '../middlewares/auth.js';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../controllers/products.js';

const router = express.Router();

router.get('/', getProducts); // browse with filters
router.get('/:id', getProduct); // detail, increment views
router.post('/create', authMiddleware, sellerMiddleware, createProduct); // seller create
router.put('/update/:id', authMiddleware, updateProduct); // seller own or admin
router.delete('/:id', authMiddleware, deleteProduct); // seller own or admin

export default router;