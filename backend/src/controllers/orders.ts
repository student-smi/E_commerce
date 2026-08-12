import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../lib/db';

// ── Schema ────────────────────────────────────────────────────
const AddressSchema = z.object({
  line1:      z.string().min(1),
  line2:      z.string().optional(),
  city:       z.string().min(1),
  state:      z.string().min(1),
  postalCode: z.string().min(1),
  country:    z.string().min(1),
});

const CreateOrderSchema = z.object({
  cartId:            z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId:   z.string().min(1),
  shippingAddress:   AddressSchema,
});

// ── POST /api/orders ──────────────────────────────────────────
export async function createOrder(req: Request, res: Response): Promise<void> {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { cartId, razorpayPaymentId, razorpayOrderId, shippingAddress } = parsed.data;
  const userId = req.user!.userId;

  // Load cart items
  const items = await db('cart_items as ci')
    .join('products as p', 'ci.product_id', 'p.id')
    .where('ci.cart_id', cartId)
    .select('ci.product_id', 'ci.quantity', 'p.price', 'p.stock', 'p.name');

  if (!items.length) {
    res.status(400).json({ error: 'Cart is empty' });
    return;
  }

  // Check stock for all items
  for (const item of items) {
    if (item.stock < item.quantity) {
      res.status(409).json({ error: `"${item.name}" is out of stock` });
      return;
    }
  }

  const totalAmount = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
  const orderId = uuidv4();
  const now = new Date().toISOString();

  // Atomic transaction: insert order + items, decrement stock, clear cart
  try {
    await db.transaction(async (trx) => {
      await trx('orders').insert({
        id: orderId,
        user_id: userId,
        status: 'pending',
        total_amount: totalAmount,
        shipping_address: JSON.stringify(shippingAddress),
        payment_intent_id: razorpayPaymentId,
        created_at: now,
        updated_at: now,
      });

      for (const item of items) {
        await trx('order_items').insert({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_purchase: item.price,  // snapshot — never updated
        });
        await trx('products')
          .where({ id: item.product_id })
          .decrement('stock', item.quantity);
      }

      await trx('cart_items').where({ cart_id: cartId }).delete();
    });

    res.status(201).json({ orderId });
  } catch (err) {
    console.error('Order creation failed:', err);
    res.status(500).json({ error: 'Order creation failed, please try again' });
  }
}

// ── GET /api/orders ───────────────────────────────────────────
export async function listOrders(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const orders = await db('orders')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .select('id', 'status', 'total_amount', 'shipping_address', 'created_at', 'updated_at');

  res.json(orders.map(toOrderDTO));
}

// ── GET /api/orders/:id ───────────────────────────────────────
export async function getOrder(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const order = await db('orders').where({ id: req.params.id, user_id: userId }).first();

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const items = await db('order_items as oi')
    .join('products as p', 'oi.product_id', 'p.id')
    .where('oi.order_id', order.id)
    .select('oi.product_id', 'oi.quantity', 'oi.price_at_purchase', 'p.name', 'p.image_url');

  res.json({
    ...toOrderDTO(order),
    items: items.map((i: any) => ({
      productId: i.product_id,
      name: i.name,
      imageUrl: i.image_url,
      quantity: i.quantity,
      priceAtPurchase: i.price_at_purchase,
    })),
  });
}

// ── DTO mapper ────────────────────────────────────────────────
function toOrderDTO(o: any) {
  return {
    id: o.id,
    userId: o.user_id,
    status: o.status,
    totalAmount: o.total_amount,
    shippingAddress: typeof o.shipping_address === 'string'
      ? JSON.parse(o.shipping_address)
      : o.shipping_address,
    paymentIntentId: o.payment_intent_id,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}
