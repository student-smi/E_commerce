import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getCart, addToCart, updateCartItem, removeFromCart } from '../controllers/cart';

const router = Router();

router.use(requireAuth);

router.get('/', getCart);
router.post('/add', addToCart);
router.patch('/update', updateCartItem);
router.delete('/remove/:productId', removeFromCart);

export default router;
