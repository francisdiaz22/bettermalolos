import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const rulesetUrl = new URL("../../../bantay_baha/app/data/risk_ruleset.v1.json", import.meta.url);
const instant = (row) => row.source_published_at ?? row.observed_at;
const fresh = (row, source, now) => { const value = instant(row); if (!value) return false; const age = now - new Date(value).getTime(); return age >= 0 && age <= Number(source.freshness_warning_minutes ?? 45) * 60000; };

async function audit(db, table, values) { await db.execute(`INSERT INTO ${table} SET ?`, [values]); }

export async function selectCondition(db, publicField, now = new Date()) {
  const [mappings] = await db.execute("SELECT * FROM observation_mapping WHERE public_field=? AND enabled=1 AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL", [publicField]);
  const candidates = [];
  let historical = null;
  for (const mapping of mappings) {
    const [rows] = await db.execute("SELECT o.*,s.source_id,s.source_station_id,s.name station_name,sr.* FROM observation o JOIN station s ON s.id=o.station_id JOIN source_registry sr ON sr.id=s.source_id WHERE s.source_id=? AND s.source_station_id=? AND o.metric=? AND o.quality_state='valid' ORDER BY o.observed_at DESC", [mapping.source_id, mapping.source_station_id, mapping.metric]);
    for (const row of rows) { if (mapping.role === "primary" && (!historical || instant(row) > instant(historical.row))) historical = { row, mapping }; if (row.enabled !== 0 && row.source_id && row.enabled !== false && fresh(row, row, now)) candidates.push({ row, mapping }); }
  }
  candidates.sort((a,b) => new Date(instant(b.row)) - new Date(instant(a.row)) || Number(a.mapping.priority) - Number(b.mapping.priority));
  const selected = candidates[0];
  const state = selected ? (selected.mapping.role === "primary" ? "fresh_primary" : "fresh_mapped_fallback") : historical ? "historical_stale" : "unknown";
  const selection = { id: randomUUID(), created_at: now, updated_at: now, public_field: publicField, selected_observation_id: selected?.row.id ?? null, historical_observation_id: selected ? null : historical?.row.id ?? null, candidate_observation_ids_json: JSON.stringify(candidates.map((x) => x.row.id)), mapping_version: selected?.mapping.mapping_version ?? historical?.mapping.mapping_version ?? null, selection_state: state, selection_reason: state === "unknown" ? "unknown_unmapped_or_unavailable" : state, computed_at: now };
  await audit(db, "condition_selection", selection);
  return { ...selection, observation: selected?.row ?? null };
}

export async function computeAssessment(db, barangay = null, now = new Date()) {
  const rules = JSON.parse(await readFile(fileURLToPath(rulesetUrl), "utf8"));
  const selections = {}; for (const field of rules.required_fields) selections[field] = await selectCondition(db, field, now);
  let score = null, display = "unknown";
  if (Object.values(selections).every((x) => x.observation)) { score = 0; for (const [field, selection] of Object.entries(selections)) for (const threshold of rules.fields[field].thresholds) if (Number(selection.observation.value) >= Number(threshold.gte)) score += Number(threshold.points); display = score >= 75 ? "critical" : score >= 50 ? "alert" : score >= 25 ? "monitor" : "normal"; }
  const assessment = { id: randomUUID(), created_at: now, updated_at: now, barangay, ruleset_version: rules.version, inputs_json: JSON.stringify(selections), score, display_state: display, publication_state: "internal_only", computed_at: now, published_at: null };
  await audit(db, "risk_assessment", assessment); return assessment;
}
