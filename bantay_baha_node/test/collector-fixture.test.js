import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { collectFixture } from "../src/services/collector.js";

function fakeDatabase() {
  const state = { snapshots: [], stations: [], observations: [], audits: [] };
  const database = {
    state,
    async getConnection() { return connection; },
    async execute(sql, params = []) { return execute(sql, params); },
  };
  const connection = {
    async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
    async execute(sql, params = []) { return execute(sql, params); },
  };
  async function execute(sql, params) {
    if (sql.includes("FROM source_registry WHERE name=?")) return [[source]];
    if (sql.includes("SUM(compressed_length)")) return [[{ used_bytes: state.snapshots.reduce((sum, row) => sum + row.compressed_length, 0) }]];
    if (sql.startsWith("INSERT INTO source_snapshot")) { state.snapshots.push({ id: params[0], compressed_length: params[12] }); return [{ affectedRows: 1 }]; }
    if (sql.includes("FROM station WHERE source_id=?")) return [[state.stations.find((row) => row.source_id === params[0] && row.source_station_id === params[1])].filter(Boolean)];
    if (sql.startsWith("INSERT INTO station")) { state.stations.push({ id: params[0], source_id: params[3], source_station_id: params[4] }); return [{ affectedRows: 1 }]; }
    if (sql.includes("FROM observation WHERE active_key=?")) return [[state.observations.find((row) => row.active_key === params[0])].filter(Boolean)];
    if (sql.startsWith("UPDATE observation SET active_key=NULL")) { state.observations.find((row) => row.id === params[1]).active_key = null; return [{ affectedRows: 1 }]; }
    if (sql.startsWith("INSERT INTO observation")) { state.observations.push({ id: params[0], value: params[6], thresholds_json: params[13], raw_text: params[14], active_key: params[16] }); return [{ affectedRows: 1 }]; }
    if (sql.startsWith("INSERT INTO audit_log")) { state.audits.push(params); return [{ affectedRows: 1 }]; }
    throw new Error(`Unexpected SQL in fixture test: ${sql}`);
  }
  const source = { id: "source-1", name: "pdrrmo", enabled: 0, canonical_url: "https://example.invalid", parser_version: "test" };
  return database;
}

test("fixture collection bypasses approval but remains idempotent", async () => {
  const content = await readFile(new URL("fixtures/pdrrmo/sample_2026-09-02.html", import.meta.url));
  const database = fakeDatabase();
  const config = { SNAPSHOT_MAX_RAW_BYTES: 2_000_000, SNAPSHOT_MAX_COMPRESSED_BYTES: 1_000_000, SNAPSHOT_DATABASE_QUOTA_BYTES: 250_000_000 };

  const first = await collectFixture("pdrrmo", content, config, database);
  const second = await collectFixture("pdrrmo", content, config, database);

  assert.equal(first.observations_written, 18);
  assert.equal(second.observations_written, 0);
  assert.equal(database.state.snapshots.length, 2);
  assert.equal(database.state.stations.length, 15);
  assert.equal(database.state.observations.filter((row) => row.active_key).length, 18);
  assert.equal(database.state.audits.length, 18);
});
