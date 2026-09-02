import { loadConfig } from "../config.js";
import { closePool } from "../db.js";
import { seedPdrrmo } from "../services/source-registry.js";
export async function seedSources(config = loadConfig(), database) { return seedPdrrmo(config, database); }
if (import.meta.url === `file://${process.argv[1]}`) { try { const source = await seedSources(); console.log(`${source.name}: enabled=${Boolean(source.enabled)}`); } finally { await closePool(); } }
