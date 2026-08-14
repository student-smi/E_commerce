import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createProduct, updateProduct, deleteProduct } from '../controllers/products';
import {
  listAllOrders,
  updateOrderStatus,
  bulkUpdateOrders,
  getOrderItems,
  listAllUsers,
  getUserDetail,
  changeUserRole,
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
router.patch('/orders/bulk', bulkUpdateOrders);         // bulk must be before :id
router.patch('/orders/:id', updateOrderStatus);
router.get('/orders/:id/items', getOrderItems);

// User management
router.get('/users', listAllUsers);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id/role', changeUserRole);

export default router;
