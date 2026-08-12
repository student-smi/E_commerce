import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { z } from 'zod';
import db from '../lib/db';

// Initialize Razorpay — NEVER expose key_secret to the client
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// ── POST /api/payments/order ──────────────────────────────────
// Creates a Razorpay order and returns { orderId, amount, currency, keyId }
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

  // Calculate total in paise (INR smallest unit) — 1 INR = 100 paise
  const amountPaise = items.reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  );

  const order = await razorpay.orders.create({
    amount:   amountPaise,
    currency: 'INR',
    receipt:  `receipt_${Date.now()}`,
    notes:    { userId, cartId: cart.id },
  });

  res.json({
    razorpayOrderId: order.id,
    amount:          order.amount,
    currency:        order.currency,
    keyId:           process.env.RAZORPAY_KEY_ID, // public key — safe to send
  });
}

// ── POST /api/payments/verify ─────────────────────────────────
// Verifies Razorpay payment signature server-side
const VerifySchema = z.object({
  razorpay_order_id:   z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature:  z.string(),
});

export async function verifyPayment(req: Request, res: Response): Promise<void> {
  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
  const secret    = process.env.RAZORPAY_KEY_SECRET || '';
  const expected  = crypto.createHmac('sha256', secret).update(body).digest('hex');

  if (expected !== razorpay_signature) {
    res.status(400).json({ error: 'Invalid payment signature' });
    return;
  }

  res.json({ verified: true, razorpayPaymentId: razorpay_payment_id });
}
