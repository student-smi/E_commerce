/**
 * Integration tests — full request/response cycles using supertest.
 * Uses an isolated test SQLite file (test.db) separate from dev.db.
 *
 * Covers:
 * - Auth: register, login, duplicate email, wrong password, 422 validation
 * - Products: list, pagination, 404, admin CRUD auth protection
 * - Cart: auth protection, validation
 * - Orders: auth protection
 * - Admin: 401/403 enforcement, stats endpoint
 * - API contract: monetary values as integers, pagination shape
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';

// DB path and env vars are set in jest.integration.setup.js (setupFiles)
// which runs before any module is imported, so db.ts picks up TEST_DATABASE_URL correctly.
const TEST_DB = process.env.TEST_DATABASE_URL!;

import app from '../app';
import { runMigrations } from '../lib/migrations';
import { seedDatabase } from '../lib/seed';

beforeAll(async () => {
  await runMigrations();
  await seedDatabase();
});

afterAll(async () => {
  // Clean up test DB file
  try { fs.unlinkSync(TEST_DB); } catch { /* ignore */ }
});

// ── Helpers ─────────────────────────────────────────────────
let _emailCounter = 0;
function uniqueEmail(prefix = 'user') {
  return `${prefix}${++_emailCounter}@test.com`;
}

async function registerUser(name = 'Alice', email?: string, password = 'password123') {
  email = email ?? uniqueEmail('reg');
  const res = await request(app).post('/api/auth/register').send({ name, email, password });
  return res;
}

function adminToken() {
  return jwt.sign(
    { userId: 'admin-user-id', role: 'admin' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

// ── Auth ─────────────────────────────────────────────────────
describe('Auth — /api/auth', () => {
  test('POST /register → 201 with token', async () => {
    const res = await registerUser('Bob', uniqueEmail('bob'));
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('userId');
  });

  test('POST /register duplicate email → 409', async () => {
    const email = uniqueEmail('dup');
    await registerUser('Dup', email);
    const res = await registerUser('Dup2', email);
    expect(res.status).toBe(409);
  });

  test('POST /register missing name → 422 with details', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com', password: 'password123' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('details');
  });

  test('POST /register password < 8 chars → 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short', email: uniqueEmail(), password: '1234' });
    expect(res.status).toBe(422);
  });

  test('POST /login correct credentials → 200 with token + role', async () => {
    const email = uniqueEmail('login');
    await registerUser('LoginUser', email, 'password123');
    const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('role');
    expect(res.body.role).toBe('user');
  });

  test('POST /login wrong password → 401 generic message', async () => {
    const email = uniqueEmail('wp');
    await registerUser('WP', email, 'password123');
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('POST /login unknown email → 401 same generic message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@nowhere.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });
});

// ── Products ─────────────────────────────────────────────────
describe('Products — /api/products', () => {
  test('GET /products returns paginated list', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  test('GET /products?limit=3 → at most 3 results', async () => {
    const res = await request(app).get('/api/products?page=1&limit=3');
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeLessThanOrEqual(3);
  });

  test('GET /products?category=Jeans → only Jeans', async () => {
    const res = await request(app).get('/api/products?category=Jeans');
    expect(res.status).toBe(200);
    for (const p of res.body.products) {
      expect(p.category).toBe('Jeans');
    }
  });

  test('GET /products/:id non-existent → 404', async () => {
    const res = await request(app).get('/api/products/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  test('POST /admin/products without auth → 401', async () => {
    const res = await request(app).post('/api/admin/products').send({ name: 'T' });
    expect(res.status).toBe(401);
  });

  test('POST /admin/products with user JWT → 403', async () => {
    const regRes = await registerUser('PU', uniqueEmail('pu'));
    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${regRes.body.token}`)
      .send({ name: 'T', price: 1000, stock: 10, category: 'Tops', imageUrl: '' });
    expect(res.status).toBe(403);
  });

  test('POST /admin/products admin + invalid data → 422', async () => {
    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: '', price: -1 });
    expect(res.status).toBe(422);
  });

  test('POST /admin/products admin + valid data → 201', async () => {
    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Test Shirt', description: 'Nice', price: 2999, stock: 50, category: 'T-Shirts', imageUrl: '' });
    expect(res.status).toBe(201);
    expect(res.body.price).toBe(2999);
    expect(Number.isInteger(res.body.price)).toBe(true);
  });
});

// ── Cart ─────────────────────────────────────────────────────
describe('Cart — /api/cart', () => {
  test('GET /cart without auth → 401', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });

  test('POST /cart/add without auth → 401', async () => {
    const res = await request(app).post('/api/cart/add').send({ productId: 'x', quantity: 1 });
    expect(res.status).toBe(401);
  });

  test('POST /cart/add quantity = 0 → 422', async () => {
    const regRes = await registerUser('CartU', uniqueEmail('cart'));
    const res = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${regRes.body.token}`)
      .send({ productId: 'x', quantity: 0 });
    expect(res.status).toBe(422);
  });

  test('POST /cart/add non-existent product → 404', async () => {
    const regRes = await registerUser('CartU2', uniqueEmail('cart2'));
    const res = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${regRes.body.token}`)
      .send({ productId: '00000000-0000-0000-0000-000000000099', quantity: 1 });
    expect(res.status).toBe(404);
  });
});

// ── Orders ────────────────────────────────────────────────────
describe('Orders — /api/orders', () => {
  test('GET /orders without auth → 401', async () => {
    expect((await request(app).get('/api/orders')).status).toBe(401);
  });

  test('GET /orders with valid auth → 200 array', async () => {
    const regRes = await registerUser('OrdU', uniqueEmail('ord'));
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${regRes.body.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /orders/:id non-existent → 404', async () => {
    const regRes = await registerUser('OrdU2', uniqueEmail('ord2'));
    const res = await request(app)
      .get('/api/orders/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${regRes.body.token}`);
    expect(res.status).toBe(404);
  });

  test('POST /orders without auth → 401', async () => {
    expect((await request(app).post('/api/orders').send({})).status).toBe(401);
  });
});

// ── Admin enforcement ─────────────────────────────────────────
describe('Admin route enforcement — /api/admin', () => {
  test('GET /admin/orders without JWT → 401', async () => {
    expect((await request(app).get('/api/admin/orders')).status).toBe(401);
  });

  test('GET /admin/orders with user JWT → 403', async () => {
    const regRes = await registerUser('ATest', uniqueEmail('atest'));
    const res = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${regRes.body.token}`);
    expect(res.status).toBe(403);
  });

  test('GET /admin/users without JWT → 401', async () => {
    expect((await request(app).get('/api/admin/users')).status).toBe(401);
  });

  test('GET /admin/stats with admin JWT → 200 with all fields', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalRevenue');
    expect(res.body).toHaveProperty('pendingOrderCount');
    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('totalProducts');
  });

  test('GET /admin/users with admin JWT → 200 array (no passwords)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const user of res.body) {
      expect(user).not.toHaveProperty('password_hash');
      expect(user).not.toHaveProperty('passwordHash');
    }
  });
});

// ── API contract ──────────────────────────────────────────────
describe('API Contract', () => {
  test('product prices are integers (cents)', async () => {
    const res = await request(app).get('/api/products');
    for (const p of res.body.products) {
      expect(Number.isInteger(p.price)).toBe(true);
    }
  });

  test('paginated response includes total, page, limit', async () => {
    const res = await request(app).get('/api/products');
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.page).toBe('number');
    expect(typeof res.body.limit).toBe('number');
  });

  test('GET /api/health → 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
