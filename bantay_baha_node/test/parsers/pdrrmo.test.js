import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { parsePdrrmoSnapshot, parsedResultToDict } from "../../src/parsers/pdrrmo.js";

for (const fixture of ["2026-09-02", "flooding_populated"]) test(`parser matches Python contract: ${fixture}`, async () => {
  const html = await readFile(new URL(`../fixtures/pdrrmo/sample_${fixture}.html`, import.meta.url));
  const expected = JSON.parse(await readFile(new URL(`../fixtures/pdrrmo/expected_${fixture}.json`, import.meta.url), "utf8"));
  assert.deepEqual(parsedResultToDict(parsePdrrmoSnapshot(html)), expected);
});
test("parser fails closed for an unrelated page", () => { const result=parsePdrrmoSnapshot("<html><body>error</body></html>"); assert.equal(result.errors.length,1); assert.equal(result.tides.length,0); });
