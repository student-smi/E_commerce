import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../lib/db';

// ── Schema ────────────────────────────────────────────────────
const AddItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  size: z.string().optional(),
  color: z.string().optional(),
});

const UpdateItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  size: z.string().optional(),
  color: z.string().optional(),
});

// ── Helpers ───────────────────────────────────────────────────
async function getOrCreateCart(userId: string): Promise<string> {
  const existing = await db('carts').where({ user_id: userId }).first();
  if (existing) return existing.id;

  const id = uuidv4();
  await db('carts').insert({ id, user_id: userId, created_at: new Date().toISOString() });
  return id;
}

async function getCartWithItems(userId: string) {
  const cart = await db('carts').where({ user_id: userId }).first();
  if (!cart) return { cartId: null, items: [] };

  const items = await db('cart_items as ci')
    .join('products as p', 'ci.product_id', 'p.id')
    .where('ci.cart_id', cart.id)
    .select(
      'ci.product_id as productId',
      'ci.quantity',
      'ci.size',
      'ci.color',
      'p.name',
      'p.price',
      'p.stock',
      'p.category',
      'p.image_url as imageUrl'
    );

  return {
    cartId: cart.id,
    items: items.map((i: any) => ({
      ...i,
      size: i.size || 'M',
      color: i.color || 'Default',
    })),
  };
}

// ── GET /api/cart ─────────────────────────────────────────────
export async function getCart(req: Request, res: Response): Promise<void> {
  const result = await getCartWithItems(req.user!.userId);
  res.json(result);
}

// ── POST /api/cart/add ────────────────────────────────────────
export async function addToCart(req: Request, res: Response): Promise<void> {
  const parsed = AddItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { productId, quantity, size = 'M', color = 'Default' } = parsed.data;
  const userId = req.user!.userId;

  const product = await db('products').where({ id: productId }).first();
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  if (product.stock <= 0) {
    res.status(400).json({ error: 'Product is out of stock' });
    return;
  }

  const cartId = await getOrCreateCart(userId);
  const existing = await db('cart_items')
    .where({ cart_id: cartId, product_id: productId })
    .first();

  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > product.stock) {
      res.status(400).json({ error: `Only ${product.stock} units available (${existing.quantity} already in cart)` });
      return;
    }
    await db('cart_items')
      .where({ cart_id: cartId, product_id: productId })
      .update({ quantity: newQty, size, color });
  } else {
    if (quantity > product.stock) {
      res.status(400).json({ error: `Only ${product.stock} units available` });
      return;
    }
    await db('cart_items').insert({
      cart_id: cartId,
      product_id: productId,
      quantity,
      size,
      color,
    });
  }

  const result = await getCartWithItems(userId);
  res.json(result);
}

// ── PATCH /api/cart/update ────────────────────────────────────
export async function updateCartItem(req: Request, res: Response): Promise<void> {
  const parsed = UpdateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { productId, quantity, size, color } = parsed.data;
  const userId = req.user!.userId;

  const product = await db('products').where({ id: productId }).first();
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  if (quantity > product.stock) {
    res.status(400).json({ error: `Only ${product.stock} units available` });
    return;
  }

  const cart = await db('carts').where({ user_id: userId }).first();
  if (!cart) {
    res.status(404).json({ error: 'Cart not found' });
    return;
  }

  const updates: Record<string, any> = { quantity };
  if (size !== undefined) updates.size = size;
  if (color !== undefined) updates.color = color;

  await db('cart_items')
    .where({ cart_id: cart.id, product_id: productId })
    .update(updates);

  const result = await getCartWithItems(userId);
  res.json(result);
}

// ── DELETE /api/cart/remove/:productId ────────────────────────
export async function removeFromCart(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { productId } = req.params;

  const cart = await db('carts').where({ user_id: userId }).first();
  if (cart) {
    await db('cart_items').where({ cart_id: cart.id, product_id: productId }).delete();
  }

  const result = await getCartWithItems(userId);
  res.json(result);
}
