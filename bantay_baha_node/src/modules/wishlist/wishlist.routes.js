import { createWishlistRepository } from "./wishlist.repository.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function wishlistRoutes(app, { config, repository } = {}) {
  const repo = repository ?? (config?.DATABASE_URL ? createWishlistRepository({ config }) : null);

  function requireRepository(reply) {
    if (repo) return repo;
    return reply.code(503).send({ error: "Wishlist API database is not configured" });
  }

  app.get("/api/v1/wishlist", async (request, reply) => {
    const activeRepository = requireRepository(reply);
    if (!activeRepository) return;
    const page = positiveInt(request.query?.page, 1);
    const pageSize = Math.min(positiveInt(request.query?.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const sort = request.query?.sort === "newest" ? "newest" : "popular";
    const result = await activeRepository.list({
      category: request.query?.category?.trim() || undefined,
      barangay: request.query?.barangay?.trim() || undefined,
      sort,
      page,
      pageSize,
    });

    return {
      data: result.data,
      meta: { page, pageSize, total: result.total, sort },
    };
  });

  app.get("/api/v1/wishlist/categories", async (_request, reply) => {
    const activeRepository = requireRepository(reply);
    return activeRepository ? { data: await activeRepository.categories() } : undefined;
  });
  app.get("/api/v1/wishlist/stats", async (_request, reply) => {
    const activeRepository = requireRepository(reply);
    return activeRepository ? { data: await activeRepository.stats() } : undefined;
  });

  app.get("/api/v1/wishlist/:slug", async (request, reply) => {
    const activeRepository = requireRepository(reply);
    if (!activeRepository) return;
    const item = await activeRepository.findBySlug(request.params.slug);
    if (!item) return reply.code(404).send({ error: "Wishlist item not found" });
    return { data: item };
  });
}
