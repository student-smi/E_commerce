import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../lib/db';

// ── Validation schemas ────────────────────────────────────────
const CreateProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().default(''),
  price: z.number().int().positive('Price must be a positive integer (cents)'),
  stock: z.number().int().min(0, 'Stock must be >= 0'),
  category: z.string().min(1, 'Category is required'),
  imageUrl: z.string().default(''),
});

const UpdateProductSchema = CreateProductSchema.partial();

// ── GET /api/products ─────────────────────────────────────────
export async function listProducts(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const { category, search } = req.query as { category?: string; search?: string };

  let query = db('products');
  let countQuery = db('products');

  if (category) {
    query = query.where('category', category);
    countQuery = countQuery.where('category', category);
  }

  if (search) {
    const pattern = `%${search}%`;
    query = query.where((b) => b.whereILike('name', pattern).orWhereILike('description', pattern));
    countQuery = countQuery.where((b) => b.whereILike('name', pattern).orWhereILike('description', pattern));
  }

  const [{ total }] = await countQuery.count('* as total');
  const products = await query.select('*').orderBy('created_at', 'desc').limit(limit).offset(offset);

  res.json({
    products: products.map(toProductDTO),
    total: Number(total),
    page,
    limit,
  });
}

// ── GET /api/products/:id ─────────────────────────────────────
export async function getProduct(req: Request, res: Response): Promise<void> {
  const product = await db('products').where({ id: req.params.id }).first();
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json(toProductDTO(product));
}

// ── POST /api/admin/products ──────────────────────────────────
export async function createProduct(req: Request, res: Response): Promise<void> {
  const parsed = CreateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, description, price, stock, category, imageUrl } = parsed.data;
  const id = uuidv4();
  const now = new Date().toISOString();

  await db('products').insert({
    id, name, description, price, stock, category,
    image_url: imageUrl,
    created_at: now,
    updated_at: now,
  });

  const product = await db('products').where({ id }).first();
  res.status(201).json(toProductDTO(product));
}

// ── PUT /api/admin/products/:id ───────────────────────────────
export async function updateProduct(req: Request, res: Response): Promise<void> {
  const product = await db('products').where({ id: req.params.id }).first();
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const parsed = UpdateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { imageUrl, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
  if (imageUrl !== undefined) updates.image_url = imageUrl;

  await db('products').where({ id: req.params.id }).update(updates);
  const updated = await db('products').where({ id: req.params.id }).first();
  res.json(toProductDTO(updated));
}

// ── DELETE /api/admin/products/:id ────────────────────────────
export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const product = await db('products').where({ id: req.params.id }).first();
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  await db('products').where({ id: req.params.id }).delete();
  res.json({ message: 'Product deleted' });
}

// ── DTO mapper ────────────────────────────────────────────────
function toProductDTO(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    stock: p.stock,
    category: p.category,
    imageUrl: p.image_url,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}
