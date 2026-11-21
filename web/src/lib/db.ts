import "server-only";

import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

const databaseGlobal = globalThis as typeof globalThis & {
  databasePool?: Pool;
};

export function getDatabasePool() {
  if (databaseGlobal.databasePool) {
    return databaseGlobal.databasePool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5_000,
  });

  pool.on("error", () => {
    console.error("An idle database connection failed.");
  });

  attachDatabasePool(pool);
  databaseGlobal.databasePool = pool;

  return pool;
}