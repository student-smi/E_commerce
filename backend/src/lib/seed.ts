import { v4 as uuidv4 } from 'uuid';
import db from './db';

const categories = ['T-Shirts', 'Jeans', 'Dresses', 'Jackets', 'Sneakers'];

const sampleProducts = [
  { name: 'Classic White Tee', description: 'A timeless white cotton t-shirt', price: 2999, stock: 100, category: 'T-Shirts', image_url: 'https://via.placeholder.com/400x500?text=White+Tee' },
  { name: 'Black Graphic Tee', description: 'Bold graphic print on premium cotton', price: 3499, stock: 80, category: 'T-Shirts', image_url: 'https://via.placeholder.com/400x500?text=Black+Tee' },
  { name: 'Slim Fit Jeans', description: 'Modern slim fit jeans in dark wash', price: 7999, stock: 60, category: 'Jeans', image_url: 'https://via.placeholder.com/400x500?text=Slim+Jeans' },
  { name: 'Relaxed Bootcut Jeans', description: 'Comfortable bootcut jeans with stretch', price: 6999, stock: 45, category: 'Jeans', image_url: 'https://via.placeholder.com/400x500?text=Bootcut+Jeans' },
  { name: 'Floral Midi Dress', description: 'Elegant floral print midi dress', price: 8999, stock: 35, category: 'Dresses', image_url: 'https://via.placeholder.com/400x500?text=Midi+Dress' },
  { name: 'Little Black Dress', description: 'Classic LBD for every occasion', price: 9499, stock: 50, category: 'Dresses', image_url: 'https://via.placeholder.com/400x500?text=Black+Dress' },
  { name: 'Denim Jacket', description: 'Vintage-wash denim jacket', price: 10999, stock: 40, category: 'Jackets', image_url: 'https://via.placeholder.com/400x500?text=Denim+Jacket' },
  { name: 'Puffer Jacket', description: 'Warm water-resistant puffer jacket', price: 14999, stock: 25, category: 'Jackets', image_url: 'https://via.placeholder.com/400x500?text=Puffer+Jacket' },
  { name: 'White Sneakers', description: 'Clean minimalist white sneakers', price: 8999, stock: 70, category: 'Sneakers', image_url: 'https://via.placeholder.com/400x500?text=White+Sneakers' },
  { name: 'Running Shoes', description: 'Lightweight performance running shoes', price: 11999, stock: 55, category: 'Sneakers', image_url: 'https://via.placeholder.com/400x500?text=Running+Shoes' },
];

export async function seedDatabase(): Promise<void> {
  // Seed Default Admin User
  const adminEmail = 'admin@ecommerce.com';
  const existingAdmin = await db('users').where({ email: adminEmail }).first();
  if (!existingAdmin) {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('admin12345', 12);
    await db('users').insert({
      id: uuidv4(),
      name: 'Super Admin',
      email: adminEmail,
      password_hash: passwordHash,
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log('Seed complete: inserted default admin user.');
  }

  for (const product of sampleProducts) {
    const existing = await db('products').where({ name: product.name }).first();
    if (!existing) {
      await db('products').insert({
        id: uuidv4(),
        ...product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
  console.log('Seed complete: inserted sample products.');
}
