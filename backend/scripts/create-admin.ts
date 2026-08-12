/**
 * One-time script: creates an admin user in dev.db
 * Run with: npx ts-node scripts/create-admin.ts
 */
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import knex from 'knex';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const db = knex({
  client: 'sqlite3',
  connection: { filename: process.env.DATABASE_URL || path.resolve('./dev.db') },
  useNullAsDefault: true,
});

async function main() {
  const email    = 'admin@store.com';
  const password = 'Admin@1234';
  const name     = 'Admin';

  // Ensure users table exists
  const hasTable = await db.schema.hasTable('users');
  if (!hasTable) {
    console.error('users table not found — run the backend server first to run migrations.');
    process.exit(1);
  }

  const existing = await db('users').where({ email }).first();
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    await db.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db('users').insert({
    id:            uuidv4(),
    name,
    email,
    password_hash: passwordHash,
    role:          'admin',
    created_at:    new Date().toISOString(),
    updated_at:    new Date().toISOString(),
  });

  console.log('✅ Admin user created successfully');
  console.log(`   Email   : ${email}`);
  console.log(`   Password: ${password}`);
  await db.destroy();
}

main().catch((err) => { console.error(err); process.exit(1); });
