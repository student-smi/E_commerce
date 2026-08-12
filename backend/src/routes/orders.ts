import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createOrder, listOrders, getOrder } from '../controllers/orders';

const router = Router();

router.use(requireAuth);

router.post('/', createOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);

export default router;
