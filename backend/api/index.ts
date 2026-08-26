import dotenv from 'dotenv';
dotenv.config();

import { IncomingMessage, ServerResponse } from 'http';
import app from '../src/app';
import { runMigrations } from '../src/lib/migrations';
import { seedDatabase } from '../src/lib/seed';

// One-time initialization flag for serverless warm starts
let initialized = false;

async function initialize() {
  if (!initialized) {
    try {
      await runMigrations();
      await seedDatabase();
      initialized = true;
    } catch (err) {
      console.error('Failed to initialize database on Vercel:', err);
    }
  }
}

// Vercel serverless handler — exports app as a request handler
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await initialize();
  // @ts-ignore — express RequestHandler is compatible
  return app(req, res);
}
