# Community Wishlist API (POC)

The first POC API is read-only and lives in the existing Fastify service under
the `/api/v1/wishlist` namespace. It uses only `wishlist_*` MariaDB tables and
does not alter Bantay Baha tables.

## Endpoints

```text
GET /api/v1/wishlist?page=1&pageSize=20&category=environment&barangay=San%20Gabriel&sort=popular
GET /api/v1/wishlist/:slug
GET /api/v1/wishlist/categories
GET /api/v1/wishlist/stats
```

The list response is paginated:

```json
{
  "data": [],
  "meta": { "page": 1, "pageSize": 20, "total": 0, "sort": "popular" }
}
```

Only public lifecycle statuses are returned. Pending, rejected, duplicate,
archived, moderation, account, contact, and handoff-private data are never
part of a public response.

## Local behavior

If `DATABASE_URL` is absent, the service returns `503` for Wishlist API calls
while the rest of the service remains available. The static frontend falls
back to `/data/community-wishlist.json`, which keeps the prototype usable
before the API is deployed.

Apply the numbered additive migrations with the Hostinger MariaDB operator
only after the backup and disposable-copy checks are complete. The exact
procedure and verification queries are in [the MariaDB deployment runbook](deployment.md).
