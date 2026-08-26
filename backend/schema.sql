-- PostgreSQL Schema for E-Commerce Application

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INT NOT NULL, -- price in cents (e.g. 2999 = $29.99)
  stock INT NOT NULL DEFAULT 0,
  category VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  sizes TEXT DEFAULT '["XS", "S", "M", "L", "XL"]',
  colors TEXT DEFAULT '["Black", "Navy", "White", "Gray"]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. CARTS TABLE
CREATE TABLE IF NOT EXISTS carts (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CART ITEMS TABLE
CREATE TABLE IF NOT EXISTS cart_items (
  cart_id VARCHAR(255) NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id VARCHAR(255) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  size VARCHAR(50) DEFAULT 'M',
  color VARCHAR(50) DEFAULT 'Black',
  PRIMARY KEY (cart_id, product_id)
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_amount INT NOT NULL,
  shipping_address TEXT NOT NULL,
  payment_intent_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(255) REFERENCES products(id),
  quantity INT NOT NULL,
  price_at_purchase INT NOT NULL,
  size VARCHAR(50) DEFAULT 'M',
  color VARCHAR(50) DEFAULT 'Black',
  PRIMARY KEY (order_id, product_id)
);

-- INDEXES FOR PERFORMANCE
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX        IF NOT EXISTS idx_products_category   ON products(category);
CREATE INDEX        IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX        IF NOT EXISTS idx_products_stock       ON products(stock);
CREATE INDEX        IF NOT EXISTS idx_orders_user_id       ON orders(user_id);
CREATE INDEX        IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX        IF NOT EXISTS idx_orders_created_at    ON orders(created_at);

-- SAMPLE PRODUCTS SEED DATA
INSERT INTO products (id, name, description, price, stock, category, image_url, sizes, colors) VALUES
('prod-1', 'Classic White Tee', 'A timeless white cotton t-shirt made with 100% organic cotton.', 2999, 100, 'T-Shirts', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80', '["XS", "S", "M", "L", "XL"]', '["White", "Gray", "Black"]'),
('prod-2', 'Black Graphic Tee', 'Bold graphic print on premium heavyweight cotton.', 3499, 80, 'T-Shirts', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80', '["S", "M", "L", "XL"]', '["Black", "Charcoal"]'),
('prod-3', 'Slim Fit Jeans', 'Modern slim fit jeans in dark indigo wash with comfortable stretch.', 7999, 60, 'Jeans', 'https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop&q=80', '["28", "30", "32", "34", "36"]', '["Indigo", "Black"]'),
('prod-4', 'Relaxed Bootcut Jeans', 'Comfortable bootcut denim with vintage styling.', 6999, 45, 'Jeans', 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800&auto=format&fit=crop&q=80', '["30", "32", "34", "36"]', '["Light Wash", "Dark Wash"]'),
('prod-5', 'Floral Midi Dress', 'Elegant floral print midi dress crafted from breathable fabric.', 8999, 35, 'Dresses', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80', '["XS", "S", "M", "L"]', '["Floral Red", "Floral Blue"]'),
('prod-6', 'Little Black Dress', 'Classic LBD for evening occasions and casual outings alike.', 9499, 50, 'Dresses', 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&auto=format&fit=crop&q=80', '["S", "M", "L"]', '["Black"]'),
('prod-7', 'Denim Jacket', 'Vintage-wash classic denim jacket with durable metal buttons.', 10999, 40, 'Jackets', 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=80', '["S", "M", "L", "XL"]', '["Classic Blue", "Washed Black"]'),
('prod-8', 'Puffer Jacket', 'Warm water-resistant insulated puffer jacket for cold weather.', 14999, 25, 'Jackets', 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=800&auto=format&fit=crop&q=80', '["M", "L", "XL", "XXL"]', '["Black", "Navy", "Olive"]'),
('prod-9', 'White Leather Sneakers', 'Clean minimalist white sneakers with cushioned soles.', 8999, 70, 'Sneakers', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80', '["UK 7", "UK 8", "UK 9", "UK 10"]', '["White", "Off-White"]'),
('prod-10', 'Running Performance Shoes', 'Lightweight breathable mesh running shoes with maximum support.', 11999, 55, 'Sneakers', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80', '["UK 6", "UK 7", "UK 8", "UK 9", "UK 10"]', '["Red/Black", "Blue/White"]')
ON CONFLICT (id) DO NOTHING;
