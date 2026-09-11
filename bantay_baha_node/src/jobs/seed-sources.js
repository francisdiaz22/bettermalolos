import { loadConfig } from "../config.js";
import { closePool } from "../db.js";
import { seedPagasa, seedPdrrmo } from "../services/source-registry.js";
export async function seedSources(config = loadConfig(), database) { return { pdrrmo: await seedPdrrmo(config, database), pagasa: await seedPagasa(config, database) }; }
if (import.meta.url === `file://${process.argv[1]}`) { try { const sources = await seedSources(); for (const source of Object.values(sources)) console.log(`${source.name}: enabled=${Boolean(source.enabled)}`); } finally { await closePool(); } }
