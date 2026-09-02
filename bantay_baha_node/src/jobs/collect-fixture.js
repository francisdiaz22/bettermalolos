import { readFile } from "node:fs/promises";
import { loadConfig } from "../config.js";
import { closePool } from "../db.js";
import { collectFixture } from "../services/collector.js";

const defaultFixture = new URL("../../test/fixtures/pdrrmo/sample_2026-09-02.html", import.meta.url);

export async function collectFixtureFile(path = defaultFixture, config = loadConfig(), database) {
  return collectFixture("pdrrmo", await readFile(path), config, database);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fixtureArgument = process.argv.indexOf("--fixture");
  const fixture = fixtureArgument >= 0 ? process.argv[fixtureArgument + 1] : defaultFixture;
  if (fixtureArgument >= 0 && !fixture) throw new Error("--fixture requires a path");
  try {
    console.log(JSON.stringify(await collectFixtureFile(fixture), null, 2));
  } finally {
    await closePool();
  }
}
