import { Router } from 'express';
import { listProducts, getProduct } from '../controllers/products';

const router = Router();

router.get('/', listProducts);
router.get('/:id', getProduct);

export default router;
