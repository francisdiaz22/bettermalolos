import assert from "node:assert/strict";
import { test } from "node:test";

import { buildApp } from "../../src/server.js";

const item = {
  id: "BM-I-000001",
  slug: "shaded-waiting-sheds",
  title: "More shaded waiting sheds",
  description: "Add shade near school routes.",
  category: "public-spaces",
  categoryName: "Public Spaces",
  barangay: "San Gabriel",
  locationDescription: null,
  beneficiary: null,
  impactStatement: null,
  status: "gathering_support",
  supportCount: 87,
  submitted: "2026-01-01T00:00:00.000Z",
  publishedAt: "2026-01-02T00:00:00.000Z",
};

function repository() {
  return {
    list: async (filters) => ({ data: [item], total: 1, filters }),
    findBySlug: async (slug) => (slug === item.slug ? item : null),
    categories: async () => [{ slug: "public-spaces", name: "Public Spaces" }],
    stats: async () => ({ ideas: 1, supporters: 87, barangaysRepresented: 1, communityPriorities: 0 }),
  };
}

test("wishlist read API returns paginated public data", async (t) => {
  const app = await buildApp({ config: { CORS_ALLOW_ORIGINS: ["https://bettermalolos.org"] }, wishlistRepository: repository() });
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/v1/wishlist?category=public-spaces&page=2&pageSize=5&sort=newest" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    data: [item],
    meta: { page: 2, pageSize: 5, total: 1, sort: "newest" },
  });
});

test("wishlist read API provides details, categories, and stats", async (t) => {
  const app = await buildApp({ config: { CORS_ALLOW_ORIGINS: ["https://bettermalolos.org"] }, wishlistRepository: repository() });
  t.after(() => app.close());

  assert.equal((await app.inject({ method: "GET", url: "/api/v1/wishlist/shaded-waiting-sheds" })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: "/api/v1/wishlist/missing" })).statusCode, 404);
  assert.deepEqual((await app.inject({ method: "GET", url: "/api/v1/wishlist/categories" })).json().data, [{ slug: "public-spaces", name: "Public Spaces" }]);
  assert.equal((await app.inject({ method: "GET", url: "/api/v1/wishlist/stats" })).json().data.supporters, 87);
});

test("wishlist API fails closed when MariaDB is not configured", async (t) => {
  const app = await buildApp({ config: { CORS_ALLOW_ORIGINS: ["https://bettermalolos.org"] } });
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/v1/wishlist" });
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), { error: "Wishlist API database is not configured" });
});
