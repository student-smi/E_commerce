import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { runMigrations } from './lib/migrations';
import { seedDatabase } from './lib/seed';

const PORT = process.env.PORT || 5000;

async function start() {
  await runMigrations();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
