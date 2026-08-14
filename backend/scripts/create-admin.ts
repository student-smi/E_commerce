/**
 * Run this script to create an admin user:
 * npx ts-node scripts/create-admin.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../src/lib/db';

async function createAdmin() {
  const email = 'admin@ecommerce.com';
  const password = 'Admin@1234';
  const name = 'Super Admin';

  const existing = await db('users').where({ email }).first();
  if (existing) {
    // Already exists — just promote to admin
    await db('users').where({ email }).update({ role: 'admin' });
    console.log(`✅ User "${email}" promoted to admin.`);
    await db.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  await db('users').insert({
    id: uuidv4(),
    name,
    email,
    password_hash: passwordHash,
    role: 'admin',
    created_at: now,
    updated_at: now,
  });

  console.log('');
  console.log('✅ Admin user created!');
  console.log('─────────────────────────────');
  console.log(`📧 Email:    ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`🌐 URL:      http://localhost:5173/login`);
  console.log('─────────────────────────────');
  console.log('After login, go to /admin for the admin panel.');
  console.log('');

  await db.destroy();
}

createAdmin().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});
