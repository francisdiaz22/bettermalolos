import { readFile } from "node:fs/promises";
import { loadConfig } from "../config.js";
import { closePool } from "../db.js";
import { collectFixture } from "../services/collector.js";

const defaultFixture = new URL("../../test/fixtures/pdrrmo/sample_2026-09-02.html", import.meta.url);

export async function collectFixtureFile(path = defaultFixture, config = loadConfig(), database, source = "pdrrmo") {
  return collectFixture(source, await readFile(path), config, database);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fixtureArgument = process.argv.indexOf("--fixture");
  const fixture = fixtureArgument >= 0 ? process.argv[fixtureArgument + 1] : defaultFixture;
  const sourceArgument = process.argv.indexOf("--source");
  const source = sourceArgument >= 0 ? process.argv[sourceArgument + 1] : "pdrrmo";
  if (fixtureArgument >= 0 && !fixture) throw new Error("--fixture requires a path");
  try {
    console.log(JSON.stringify(await collectFixtureFile(fixture, undefined, undefined, source), null, 2));
  } finally {
    await closePool();
  }
}
