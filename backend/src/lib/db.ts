import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const db = knex({
  client: 'pg',
  connection: {
    connectionString,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  },
  pool: { min: 2, max: 10 },
});

export default db;
