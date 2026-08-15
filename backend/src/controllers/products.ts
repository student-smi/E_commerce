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
  sizes: z.union([z.array(z.string()), z.string()]).optional(),
  colors: z.union([z.array(z.string()), z.string()]).optional(),
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

  const { name, description, price, stock, category, imageUrl, sizes, colors } = parsed.data;
  const id = uuidv4();
  const now = new Date().toISOString();

  const formattedSizes = Array.isArray(sizes) ? JSON.stringify(sizes) : typeof sizes === 'string' ? sizes : '["XS", "S", "M", "L", "XL"]';
  const formattedColors = Array.isArray(colors) ? JSON.stringify(colors) : typeof colors === 'string' ? colors : '["Black", "Navy", "White", "Gray"]';

  await db('products').insert({
    id, name, description, price, stock, category,
    image_url: imageUrl,
    sizes: formattedSizes,
    colors: formattedColors,
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

  const { imageUrl, sizes, colors, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
  if (imageUrl !== undefined) updates.image_url = imageUrl;
  if (sizes !== undefined) updates.sizes = Array.isArray(sizes) ? JSON.stringify(sizes) : sizes;
  if (colors !== undefined) updates.colors = Array.isArray(colors) ? JSON.stringify(colors) : colors;

  await db('products').where({ id: req.params.id }).update(updates);
  const updated = await db('products').where({ id: req.params.id }).first();
  res.json(toProductDTO(updated));
}

// ── DELETE /api/admin/products/:id ────────────────────────────
export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await db('products').where({ id: req.params.id }).first();
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Check if the product has been purchased in any past orders
    const existingOrderItem = await db('order_items').where({ product_id: req.params.id }).first();
    if (existingOrderItem) {
      res.status(400).json({
        error: 'Yeh product past customer orders se juda hua hai, isliye ise direct delete nahi kiya ja sakta. Aap iska stock 0 kar sakte hain.',
      });
      return;
    }

    // Remove from active shopping carts first
    await db('cart_items').where({ product_id: req.params.id }).delete();
    await db('products').where({ id: req.params.id }).delete();

    res.json({ message: 'Product deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete product' });
  }
}

// ── DTO mapper ────────────────────────────────────────────────
function parseJSONSafe(val: any, defaultVal: string[]): string[] {
  if (!val) return defaultVal;
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : defaultVal;
  } catch {
    return typeof val === 'string' ? val.split(',').map((s) => s.trim()) : defaultVal;
  }
}

function toProductDTO(p: any) {
  const defaultSizes = p.category === 'Sneakers' ? ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'] : p.category === 'Jeans' ? ['28', '30', '32', '34', '36', '38'] : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const defaultColors = ['Black', 'Navy', 'White', 'Charcoal'];

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    stock: p.stock,
    category: p.category,
    imageUrl: p.image_url,
    sizes: parseJSONSafe(p.sizes, defaultSizes),
    colors: parseJSONSafe(p.colors, defaultColors),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}
