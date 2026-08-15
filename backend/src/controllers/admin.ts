import { Request, Response } from 'express';
import { z } from 'zod';
import db from '../lib/db';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

const UpdateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

const BulkUpdateSchema = z.object({
  orderIds: z.array(z.string()).min(1),
  status: z.enum(ORDER_STATUSES),
});

const ChangeRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

// ── GET /api/admin/orders ─────────────────────────────────────
export async function listAllOrders(req: Request, res: Response): Promise<void> {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const { status, userId, dateFrom, dateTo, search } = req.query as Record<string, string | undefined>;

  let query = db('orders as o').join('users as u', 'o.user_id', 'u.id');
  let countQuery = db('orders as o').join('users as u', 'o.user_id', 'u.id');

  if (status)   { query = query.where('o.status', status); countQuery = countQuery.where('o.status', status); }
  if (userId)   { query = query.where('o.user_id', userId); countQuery = countQuery.where('o.user_id', userId); }
  if (dateFrom) { query = query.where('o.created_at', '>=', dateFrom); countQuery = countQuery.where('o.created_at', '>=', dateFrom); }
  if (dateTo)   { query = query.where('o.created_at', '<=', dateTo); countQuery = countQuery.where('o.created_at', '<=', dateTo); }
  if (search) {
    const like = `%${search}%`;
    query = query.where((q: any) => q.whereILike('u.name', like).orWhereILike('u.email', like));
    countQuery = countQuery.where((q: any) => q.whereILike('u.name', like).orWhereILike('u.email', like));
  }

  const [{ total }] = await countQuery.count('o.id as total');
  const orders = await query
    .select(
      'o.id', 'o.status', 'o.total_amount', 'o.shipping_address',
      'o.payment_intent_id', 'o.created_at', 'o.updated_at',
      'u.id as user_id', 'u.name as user_name', 'u.email as user_email'
    )
    .orderBy('o.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  res.json({
    orders: orders.map((o: any) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.total_amount,
      shippingAddress: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : o.shipping_address,
      paymentIntentId: o.payment_intent_id,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      user: { id: o.user_id, name: o.user_name, email: o.user_email },
    })),
    total: Number(total),
    page,
    limit,
  });
}

// ── PATCH /api/admin/orders/:id ───────────────────────────────
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const order = await db('orders').where({ id: req.params.id }).first();
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const parsed = UpdateOrderStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  await db('orders').where({ id: req.params.id }).update({
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  });

  const updated = await db('orders').where({ id: req.params.id }).first();
  res.json({
    id: updated.id,
    status: updated.status,
    totalAmount: updated.total_amount,
    updatedAt: updated.updated_at,
  });
}

// ── PATCH /api/admin/orders/bulk ──────────────────────────────
export async function bulkUpdateOrders(req: Request, res: Response): Promise<void> {
  const parsed = BulkUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const { orderIds, status } = parsed.data;
  await db('orders').whereIn('id', orderIds).update({ status, updated_at: new Date().toISOString() });
  res.json({ updated: orderIds.length, status });
}

// ── GET /api/admin/orders/:id/items ──────────────────────────
export async function getOrderItems(req: Request, res: Response): Promise<void> {
  const order = await db('orders').where({ id: req.params.id }).first();
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  const items = await db('order_items as oi')
    .join('products as p', 'oi.product_id', 'p.id')
    .where({ 'oi.order_id': req.params.id })
    .select('p.id', 'p.name', 'p.image_url', 'oi.quantity', 'oi.price_at_purchase', 'oi.size', 'oi.color');

  res.json(items.map((i: any) => ({
    productId: i.id,
    name: i.name,
    imageUrl: i.image_url,
    quantity: i.quantity,
    priceAtPurchase: i.price_at_purchase,
    size: i.size || 'M',
    color: i.color || 'Default',
  })));
}

// ── GET /api/admin/users ──────────────────────────────────────
export async function listAllUsers(req: Request, res: Response): Promise<void> {
  const { search } = req.query as { search?: string };

  let query = db('users').select('id', 'name', 'email', 'role', 'created_at').orderBy('created_at', 'desc');
  if (search) {
    const like = `%${search}%`;
    query = query.where((q: any) => q.whereILike('name', like).orWhereILike('email', like));
  }
  const users = await query;

  // Get total spend per user
  const spends = await db('orders')
    .whereIn('status', ['confirmed', 'shipped', 'delivered'])
    .select('user_id')
    .sum('total_amount as total')
    .groupBy('user_id');

  const spendMap = new Map(spends.map((s: any) => [s.user_id, Number(s.total)]));

  res.json(users.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.created_at,
    totalSpend: spendMap.get(u.id) || 0,
  })));
}

// ── GET /api/admin/users/:id ──────────────────────────────────
export async function getUserDetail(req: Request, res: Response): Promise<void> {
  const user = await db('users').where({ id: req.params.id })
    .select('id', 'name', 'email', 'role', 'created_at').first();
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const orders = await db('orders').where({ user_id: req.params.id })
    .select('id', 'status', 'total_amount', 'created_at')
    .orderBy('created_at', 'desc');

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
    orders: orders.map((o: any) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.total_amount,
      createdAt: o.created_at,
    })),
  });
}

// ── PATCH /api/admin/users/:id/role ──────────────────────────
export async function changeUserRole(req: Request, res: Response): Promise<void> {
  const user = await db('users').where({ id: req.params.id }).first();
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Prevent admin from demoting themselves
  if (req.user?.userId === req.params.id) {
    res.status(400).json({ error: 'Cannot change your own role' });
    return;
  }

  const parsed = ChangeRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  await db('users').where({ id: req.params.id }).update({ role: parsed.data.role });
  res.json({ id: req.params.id, role: parsed.data.role });
}

// ── GET /api/admin/stats ──────────────────────────────────────
export async function getStats(req: Request, res: Response): Promise<void> {
  const [revenueRow] = await db('orders')
    .whereIn('status', ['confirmed', 'shipped', 'delivered'])
    .sum('total_amount as totalRevenue');

  const [pendingRow]  = await db('orders').where({ status: 'pending' }).count('id as count');
  const [usersRow]    = await db('users').count('id as count');
  const [productsRow] = await db('products').count('id as count');

  // Revenue last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const revenueByDay = await db('orders')
    .whereIn('status', ['confirmed', 'shipped', 'delivered'])
    .where('created_at', '>=', sevenDaysAgo)
    .select(db.raw(`DATE(created_at) as day`))
    .sum('total_amount as revenue')
    .groupByRaw('DATE(created_at)')
    .orderBy('day', 'asc');

  // Top 5 products by revenue
  const topProducts = await db('order_items as oi')
    .join('products as p', 'oi.product_id', 'p.id')
    .join('orders as o', 'oi.order_id', 'o.id')
    .whereIn('o.status', ['confirmed', 'shipped', 'delivered'])
    .select('p.id', 'p.name', 'p.image_url', 'p.category')
    .sum('oi.price_at_purchase as revenue')
    .sum('oi.quantity as units')
    .groupBy('p.id', 'p.name', 'p.image_url', 'p.category')
    .orderBy('revenue', 'desc')
    .limit(5);

  // Recent 5 orders
  const recentOrders = await db('orders as o')
    .join('users as u', 'o.user_id', 'u.id')
    .select('o.id', 'o.status', 'o.total_amount', 'o.created_at', 'u.name as user_name', 'u.email as user_email')
    .orderBy('o.created_at', 'desc')
    .limit(5);

  // Low stock products (stock < 10)
  const lowStock = await db('products')
    .where('stock', '<', 10)
    .select('id', 'name', 'stock', 'category', 'image_url')
    .orderBy('stock', 'asc')
    .limit(5);

  // Order status breakdown
  const statusBreakdown = await db('orders')
    .select('status')
    .count('id as count')
    .groupBy('status');

  res.json({
    totalRevenue:      Number(revenueRow.totalRevenue) || 0,
    pendingOrderCount: Number(pendingRow.count),
    totalUsers:        Number(usersRow.count),
    totalProducts:     Number(productsRow.count),
    revenueByDay: revenueByDay.map((r: any) => ({
      day: r.day,
      revenue: Number(r.revenue) || 0,
    })),
    topProducts: topProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.image_url,
      category: p.category,
      revenue: Number(p.revenue) || 0,
      units: Number(p.units) || 0,
    })),
    recentOrders: recentOrders.map((o: any) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.total_amount,
      createdAt: o.created_at,
      user: { name: o.user_name, email: o.user_email },
    })),
    lowStock: lowStock.map((p: any) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      category: p.category,
      imageUrl: p.image_url,
    })),
    statusBreakdown: statusBreakdown.reduce((acc: any, s: any) => {
      acc[s.status] = Number(s.count);
      return acc;
    }, {}),
  });
}
