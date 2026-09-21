import { pathToFileURL } from "node:url";
import cors from "@fastify/cors";
import Fastify from "fastify";

import { loadConfig } from "./config.js";
import { closePool } from "./db.js";
import { healthRoutes } from "./routes/health.js";
import { opsRoutes } from "./routes/ops.js";
import { wishlistRoutes } from "./modules/wishlist/wishlist.routes.js";

export async function buildApp({ config = loadConfig(), logger = false, database, wishlistRepository } = {}) {
  const app = Fastify({ logger });

  await app.register(cors, {
    origin: config.CORS_ALLOW_ORIGINS,
    credentials: false,
  });
  await app.register(healthRoutes, { config, database });
  await app.register(opsRoutes, { config, database });
  await app.register(wishlistRoutes, { config, repository: wishlistRepository });

  app.get("/", async () => ({
    service: "bantay-baha",
    phase: "internal ingestion service",
    health: "/health",
    disclaimer: "Community indicator, not an official flood forecast.",
  }));

  app.addHook("onClose", closePool);
  return app;
}

async function start() {
  const config = loadConfig();
  const app = await buildApp({ config, logger: true });

  const shutdown = async (signal) => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  try {
    await app.listen({ host: "0.0.0.0", port: config.PORT });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

const isDirectEntry =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

const isLiteSpeedEntry = Boolean(
  globalThis.LitespeedNodeJS || process.env.LSNODE_STARTUP_FILE,
);

if (isDirectEntry || isLiteSpeedEntry) {
  void start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
