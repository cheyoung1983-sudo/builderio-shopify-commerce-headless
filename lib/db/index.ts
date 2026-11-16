import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Database connection singleton to prevent creating multiple connection pools
 * in a serverless environment.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Use a global variable to persist the connection across hot-reloads in development
const globalForDb = global as unknown as {
  conn: postgres.Sql | undefined;
  db: any;
};

export const conn = globalForDb.conn ?? postgres(connectionString, {
  prepare: false, // Necessary for some serverless environments like Vercel/PlanetScale
});

export const db = globalForDb.db ?? drizzle(conn);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = conn;
  globalForDb.db = db;
}

export type DbClient = typeof db;
