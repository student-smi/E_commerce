import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createProduct, updateProduct, deleteProduct } from '../controllers/products';
import {
  listAllOrders,
  updateOrderStatus,
  listAllUsers,
  getUserDetail,
  getStats,
} from '../controllers/admin';

const router = Router();

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// Dashboard stats
router.get('/stats', getStats);

// Product management
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Order management
router.get('/orders', listAllOrders);
router.patch('/orders/:id', updateOrderStatus);

// User management
router.get('/users', listAllUsers);
router.get('/users/:id', getUserDetail);

export default router;
