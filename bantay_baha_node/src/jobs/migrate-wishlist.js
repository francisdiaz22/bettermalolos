import { loadConfig } from "../config.js";
import { closePool, getPool } from "../db.js";
import { migrateWishlist } from "../modules/wishlist/migrate.js";

async function main() {
  const config = loadConfig();
  const result = await migrateWishlist({ database: getPool(config) });
  console.log(result.applied.length ? `Applied Wishlist migrations: ${result.applied.join(", ")}` : "Wishlist schema is current.");
}

try {
  await main();
} finally {
  await closePool();
}
