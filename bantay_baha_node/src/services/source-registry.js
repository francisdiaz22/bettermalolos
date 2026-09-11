import { randomUUID } from "node:crypto";
import { getPool } from "../db.js";
import { PDRRMO_PARSER_VERSION } from "../parsers/pdrrmo.js";
import { PAGASA_PARSER_VERSION } from "../parsers/pagasa.js";
const markers = ["pending", "not approved", "not yet confirmed", "to be confirmed", "unclear"];
export function isSourceApproved(source) {
  if (!source?.enabled || !source.terms_reviewed_at || !source.approved_at) return false;
  const reviewer = String(source.second_reviewer ?? "").trim().toLowerCase(), licensing = String(source.licensing_terms ?? "").trim().toLowerCase(), robots = String(source.robots_txt ?? "").trim().toLowerCase();
  return !["", "pending", "pending_review"].includes(reviewer) && licensing && robots && !markers.some((word) => licensing.includes(word) || robots.includes(word));
}
export async function seedPdrrmo(config, db = getPool(config)) {
  const now = new Date(), ranges = JSON.stringify({ rainfall_mm: { min: 0, max: 500 }, dam_level_m: { min: 0, max: 250 }, river_level_m: { min: -5, max: 20 }, tide_height_m: { min: 0, max: 10 } });
  await db.execute(`INSERT INTO source_registry (id,created_at,updated_at,name,canonical_url,type,enabled,cadence_minutes,timezone,publisher,owner,freshness_warning_minutes,freshness_critical_minutes,parser_version,terms_url,licensing_terms,robots_txt,expected_update_frequency,maintainer_name,maintainer_contact,second_reviewer,range_policy_json,notes) VALUES (?,?,?,?,?,'hydrology',0,?,'Asia/Manila','Bulacan PDRRMO','Bantay Baha ops',?,?,?, ?,?,?,?,'Bantay Baha ops','ops@bettermalolos.org','pending',?,?) ON DUPLICATE KEY UPDATE canonical_url=VALUES(canonical_url),cadence_minutes=VALUES(cadence_minutes),updated_at=VALUES(updated_at)`, [randomUUID(), now, now, "pdrrmo", config.PDRRMO_URL, config.PDRRMO_CADENCE_MINUTES, config.FRESHNESS_WARNING_MINUTES, config.FRESHNESS_CRITICAL_MINUTES, PDRRMO_PARSER_VERSION, config.PDRRMO_URL, "Pending — permission/terms not yet confirmed; automated retrieval NOT approved.", "Pending verification — do not enable scheduler.", "Multiple daily in wet season", ranges, "Awaiting manual source approval."]);
  const [rows] = await db.execute("SELECT * FROM source_registry WHERE name='pdrrmo'"); return rows[0];
}
export async function seedPagasa(config, db = getPool(config)) {
  const now = new Date();
  await db.execute(`INSERT INTO source_registry (id,created_at,updated_at,name,canonical_url,type,enabled,cadence_minutes,timezone,publisher,owner,freshness_warning_minutes,freshness_critical_minutes,parser_version,terms_url,licensing_terms,robots_txt,expected_update_frequency,maintainer_name,maintainer_contact,second_reviewer,range_policy_json,notes) VALUES (?,?,?,?,?,'hydrology',0,?,'Asia/Manila','DOST-PAGASA','Bantay Baha ops',?,?,?, ?,?,?,?,'Bantay Baha ops','ops@bettermalolos.org','pending',?,?) ON DUPLICATE KEY UPDATE canonical_url=VALUES(canonical_url),cadence_minutes=VALUES(cadence_minutes),updated_at=VALUES(updated_at)`, [randomUUID(), now, now, "pagasa_flood", config.PAGASA_URL, config.PAGASA_CADENCE_MINUTES, 30 * 60, 54 * 60, PAGASA_PARSER_VERSION, config.PAGASA_URL, "Restricted/unclear — written PAGASA clearance required before live automation or redistribution.", "No robots.txt policy published (HTTP 404 checked 2026-09-04); this is not permission.", "Proposed, not approved: conditional fetch 30m; dam warning 30h/unavailable 54h.", JSON.stringify({ dam_level_m: { min: 0, max: 250 } }), "Internal fixture-only PAGASA collector; no production mapping seeded."]); 
  const [rows] = await db.execute("SELECT * FROM source_registry WHERE name='pagasa_flood'"); return rows[0];
}
export async function getSource(name, config, db = getPool(config)) { const [rows] = await db.execute("SELECT * FROM source_registry WHERE name=?", [name]); return rows[0] ?? null; }
export async function getApprovedSource(name, config, db = getPool(config)) { const source = await getSource(name, config, db); return isSourceApproved(source) ? source : null; }
