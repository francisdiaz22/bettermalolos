import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parsePagasaSnapshot } from "../../src/parsers/pagasa.js";

test("PAGASA parser matches the Phase B fixture contract", async () => {
  const fixture = await readFile(new URL("../../../bantay_baha/tests/fixtures/pagasa/sample_flood.html", import.meta.url));
  const parsed = parsePagasaSnapshot(fixture, "https://www.pagasa.dost.gov.ph/flood");
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.basins.length, 3);
  assert.equal(parsed.dams.length, 2);
  assert.equal(parsed.advisories.length, 3);
  assert.equal(parsed.dams[0].reservoir_level_m, 203);
});
