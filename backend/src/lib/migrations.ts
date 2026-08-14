import db from './db';

export async function runMigrations(): Promise<void> {
  // ── users ─────────────────────────────────────────────────────
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (t) => {
      t.string('id').primary();
      t.string('name').notNullable();
      t.string('email').notNullable();
      t.string('password_hash').notNullable();
      t.string('role').notNullable().defaultTo('user');
      t.timestamp('created_at').defaultTo(db.fn.now());
      t.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // ── products ──────────────────────────────────────────────────
  const hasProducts = await db.schema.hasTable('products');
  if (!hasProducts) {
    await db.schema.createTable('products', (t) => {
      t.string('id').primary();
      t.string('name').notNullable();
      t.text('description').notNullable().defaultTo('');
      t.integer('price').notNullable();
      t.integer('stock').notNullable().defaultTo(0);
      t.string('category').notNullable();
      t.string('image_url').notNullable().defaultTo('');
      t.timestamp('created_at').defaultTo(db.fn.now());
      t.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // ── carts ─────────────────────────────────────────────────────
  const hasCarts = await db.schema.hasTable('carts');
  if (!hasCarts) {
    await db.schema.createTable('carts', (t) => {
      t.string('id').primary();
      t.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // ── cart_items ────────────────────────────────────────────────
  const hasCartItems = await db.schema.hasTable('cart_items');
  if (!hasCartItems) {
    await db.schema.createTable('cart_items', (t) => {
      t.string('cart_id').notNullable().references('id').inTable('carts').onDelete('CASCADE');
      t.string('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      t.integer('quantity').notNullable().defaultTo(1);
      t.primary(['cart_id', 'product_id']);
    });
  }

  // ── orders ────────────────────────────────────────────────────
  const hasOrders = await db.schema.hasTable('orders');
  if (!hasOrders) {
    await db.schema.createTable('orders', (t) => {
      t.string('id').primary();
      t.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('status').notNullable().defaultTo('pending');
      t.integer('total_amount').notNullable();
      t.text('shipping_address').notNullable();
      t.string('payment_intent_id').notNullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
      t.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // ── order_items ───────────────────────────────────────────────
  const hasOrderItems = await db.schema.hasTable('order_items');
  if (!hasOrderItems) {
    await db.schema.createTable('order_items', (t) => {
      t.string('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
      t.string('product_id').notNullable().references('id').inTable('products');
      t.integer('quantity').notNullable();
      t.integer('price_at_purchase').notNullable();
      t.primary(['order_id', 'product_id']);
    });
  }

  // ── Indexes (IF NOT EXISTS — safe to re-run) ──────────────────
  await db.raw(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email         ON users(email)`);
  await db.raw(`CREATE INDEX        IF NOT EXISTS idx_products_category   ON products(category)`);
  await db.raw(`CREATE INDEX        IF NOT EXISTS idx_products_created_at ON products(created_at)`);
  await db.raw(`CREATE INDEX        IF NOT EXISTS idx_products_stock       ON products(stock)`);
  await db.raw(`CREATE INDEX        IF NOT EXISTS idx_orders_user_id       ON orders(user_id)`);
  await db.raw(`CREATE INDEX        IF NOT EXISTS idx_orders_status        ON orders(status)`);
  await db.raw(`CREATE INDEX        IF NOT EXISTS idx_orders_created_at    ON orders(created_at)`);
}
