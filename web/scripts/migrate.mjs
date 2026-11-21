import { readFile } from "node:fs/promises";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED is missing.");
}

const migrationName = "001_create_repositories_and_issues.sql";

const sql = await readFile(
  new URL(`../migrations/${migrationName}`, import.meta.url),
  "utf8",
);

const client = new Client({
  connectionString,
  connectionTimeoutMillis: 10_000,
});

try {
  await client.connect();
  await client.query("BEGIN");

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const existing = await client.query(
    "SELECT name FROM schema_migrations WHERE name = $1",
    [migrationName],
  );

  if (existing.rowCount === 0) {
    await client.query(sql);

    await client.query(
      "INSERT INTO schema_migrations (name) VALUES ($1)",
      [migrationName],
    );

    await client.query("COMMIT");
    console.log(`Applied: ${migrationName}`);
  } else {
    await client.query("COMMIT");
    console.log(`Already applied: ${migrationName}`);
  }
} catch {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Migration failed. Database changes were not committed.");
  process.exitCode = 1;
} finally {
  await client.end();
}