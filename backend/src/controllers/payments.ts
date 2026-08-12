import { Request, Response } from 'express';
import crypto from 'crypto';
import db from '../lib/db';

// ── POST /api/payments/order ──────────────────────────────────
// Simulated payment order — no real gateway needed for local dev/testing
export async function createRazorpayOrder(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const cart = await db('carts').where({ user_id: userId }).first();
  if (!cart) {
    res.status(400).json({ error: 'Cart is empty' });
    return;
  }

  const items = await db('cart_items as ci')
    .join('products as p', 'ci.product_id', 'p.id')
    .where('ci.cart_id', cart.id)
    .select('ci.quantity', 'p.price', 'p.name');

  if (!items.length) {
    res.status(400).json({ error: 'Cart is empty' });
    return;
  }

  const amount = items.reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  );

  // Generate a simulated order ID (no external API call needed)
  const simulatedOrderId = `order_sim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  res.json({
    razorpayOrderId: simulatedOrderId,
    amount,
    currency: 'INR',
    keyId:    'sim_test_key',   // placeholder — not used in sim mode
    simMode:  true,
  });
}

// ── POST /api/payments/verify ─────────────────────────────────
// In simulation mode: always verifies successfully
export async function verifyPayment(req: Request, res: Response): Promise<void> {
  const { razorpay_order_id, razorpay_payment_id } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id) {
    res.status(422).json({ error: 'Missing payment details' });
    return;
  }

  // In sim mode we skip signature verification
  res.json({ verified: true, razorpayPaymentId: razorpay_payment_id });
}
