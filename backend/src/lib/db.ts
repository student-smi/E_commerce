import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const dbPath =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  './dev.db';

const db = knex({
  client: 'sqlite3',
  connection: { filename: dbPath },
  useNullAsDefault: true,
});

export default db;
