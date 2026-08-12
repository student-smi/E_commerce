import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createRazorpayOrder, verifyPayment } from '../controllers/payments';

const router = Router();

// Create a Razorpay order (returns orderId + amount to frontend)
router.post('/order', requireAuth, createRazorpayOrder);

// Verify payment signature after Razorpay callback
router.post('/verify', requireAuth, verifyPayment);

export default router;
