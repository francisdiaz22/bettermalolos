import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
export const migrationDirectory = join(moduleDirectory, "migrations");
const migrationFilePattern = /^(\d{3})_([a-z0-9_]+)\.sql$/;
const migrationLockName = "bettermalolos_wishlist_migrations";

export async function loadWishlistMigrations(directory = migrationDirectory) {
  const files = (await readdir(directory)).filter((file) => migrationFilePattern.test(file)).sort();
  const migrations = await Promise.all(files.map(async (filename) => {
    const match = migrationFilePattern.exec(filename);
    const sql = await readFile(join(directory, filename), "utf8");
    return {
      version: Number(match[1]),
      name: match[2],
      filename,
      sql,
      checksum: createHash("sha256").update(sql).digest("hex"),
    };
  }));

  for (let index = 1; index < migrations.length; index += 1) {
    if (migrations[index - 1].version === migrations[index].version) {
      throw new Error(`Duplicate Wishlist migration version ${migrations[index].version}`);
    }
  }
  return migrations;
}

export async function migrateWishlist({ database, directory } = {}) {
  if (!database) throw new Error("A MariaDB database connection is required for Wishlist migrations");
  const migrations = await loadWishlistMigrations(directory);
  const connection = await database.getConnection();

  try {
    const [lockRows] = await connection.execute("SELECT GET_LOCK(?, 30) AS acquired", [migrationLockName]);
    if (Number(lockRows[0]?.acquired) !== 1) throw new Error("Could not acquire the Wishlist migration lock");

    await connection.execute(
      `CREATE TABLE IF NOT EXISTS wishlist_schema_migration (
        version SMALLINT UNSIGNED NOT NULL,
        name VARCHAR(180) NOT NULL,
        checksum CHAR(64) NOT NULL,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (version),
        UNIQUE KEY uq_wishlist_schema_migration_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );

    const [appliedRows] = await connection.execute(
      "SELECT version, name, checksum FROM wishlist_schema_migration ORDER BY version",
    );
    const applied = new Map(appliedRows.map((row) => [Number(row.version), row]));

    for (const migration of migrations) {
      const existing = applied.get(migration.version);
      if (existing) {
        if (existing.name !== migration.name || existing.checksum !== migration.checksum) {
          throw new Error(`Wishlist migration ${migration.filename} does not match its recorded checksum`);
        }
        continue;
      }

      await connection.query(migration.sql);
      await connection.execute(
        "INSERT INTO wishlist_schema_migration (version, name, checksum) VALUES (?, ?, ?)",
        [migration.version, migration.name, migration.checksum],
      );
    }

    return { applied: migrations.filter((migration) => !applied.has(migration.version)).map(({ filename }) => filename) };
  } finally {
    try {
      await connection.execute("SELECT RELEASE_LOCK(?)", [migrationLockName]);
    } finally {
      connection.release();
    }
  }
}
