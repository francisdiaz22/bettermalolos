import mysql from "mysql2/promise";

let pool;

export function getPool(config) {
  if (!config.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for database operations");
  }

  pool ??= mysql.createPool({
    uri: config.DATABASE_URL,
    connectionLimit: 5,
    enableKeepAlive: true,
    timezone: "Z",
  });

  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

