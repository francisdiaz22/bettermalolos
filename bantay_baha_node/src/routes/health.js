import { getPool } from "../db.js";
export async function healthRoutes(app, { config, database }) {
  app.get("/health", async () => ({ status: "ok", service: "bantay-baha", timestamp: new Date().toISOString() }));
  app.get("/readiness", async (_request, reply) => {
    const checks = {}, db = database ?? (() => { try { return getPool(config); } catch { return null; } })();
    if (!db) { checks.database = "error: DATABASE_URL is required"; checks.storage = "error: database unavailable"; checks.migrations = "error: database unavailable"; return reply.code(503).send({ ready: false, checks, timestamp: new Date().toISOString() }); }
    try { await db.execute("SELECT 1"); checks.database = "ok"; } catch { checks.database = "error: database check failed"; }
    try { const [rows] = await db.execute("SELECT COALESCE(SUM(compressed_length),0) used FROM source_snapshot"); checks.storage = Number(rows[0].used) <= config.SNAPSHOT_DATABASE_QUOTA_BYTES ? "ok" : "error: snapshot quota exceeded"; } catch { checks.storage = "error: storage check failed"; }
    try { const [rows] = await db.execute("SELECT version_num FROM alembic_version WHERE version_num='004_mariadb_snapshots'"); checks.migrations = rows.length ? "ok" : "error: schema version mismatch"; } catch { checks.migrations = "error: schema check failed"; }
    const ready = Object.values(checks).every((value) => value === "ok"); return reply.code(ready ? 200 : 503).send({ ready, checks, timestamp: new Date().toISOString() });
  });
}
