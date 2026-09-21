import assert from "node:assert/strict";
import { test } from "node:test";

import { loadWishlistMigrations } from "../../src/modules/wishlist/migrate.js";

test("Wishlist migrations are ordered, uniquely versioned, and checksum-ready", async () => {
  const migrations = await loadWishlistMigrations();

  assert.deepEqual(migrations.map(({ version }) => version), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(migrations.map(({ filename }) => filename), [
    "001_create_wishlist_categories.sql",
    "002_create_wishlist_items.sql",
    "003_create_wishlist_status_history.sql",
    "004_create_wishlist_moderation.sql",
    "005_create_wishlist_account.sql",
    "006_create_wishlist_support.sql",
    "007_create_wishlist_submission_contact.sql",
    "008_create_wishlist_lgu_handoff.sql",
    "009_create_wishlist_magic_link.sql",
    "010_create_wishlist_session.sql",
    "011_seed_wishlist_categories.sql",
  ]);
  assert.ok(migrations.every(({ checksum }) => /^[a-f0-9]{64}$/.test(checksum)));
});
