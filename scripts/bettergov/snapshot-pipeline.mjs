#!/usr/bin/env node
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { assertSnapshotShape, fetchJson, makeSnapshot } from './api-client.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const outputDir = resolve(root, 'data/bettergov');

const sources = {
  'budget-sample': {
    sourceName: 'Philippine Budget Data API',
    sourceUrl: 'https://budget.bettergov.ph/api/v1/gaa/search',
    parameters: { q: 'flood control', year: 2026, limit: 5 },
    snapshotFile: 'budget-sample.json',
    fixtureFile: 'fixtures/budget-sample.json',
    validate: (payload) => {
      if (!payload?.meta || !Array.isArray(payload.data)) throw new Error('Budget response must contain meta and data');
      if (payload.meta.currency !== 'PHP' || payload.meta.scale !== 'pesos') throw new Error('Budget response must declare exact PHP pesos');
      if (payload.data.some((row) =>
        typeof row.amount !== 'number' ||
        !['GAA', 'NEP'].includes(row.stage) ||
        !Number.isInteger(row.year) ||
        typeof row.program !== 'string' ||
        typeof row.department !== 'string'
      )) throw new Error('Budget records must contain amount, year, stage, program, and department');
      return payload.data;
    },
    sourceRelease: 'FY 2026 GAA',
    scopeNote: 'National-government context; not an LGU Malolos appropriation.',
    currency: 'PHP',
    unit: 'pesos',
  },
  'psa-catalog': {
    sourceName: 'Philippine Statistics Authority Statistical Classification API',
    sourceUrl: 'https://classification.psa.gov.ph/psgc/Q2_2024/all',
    parameters: { version: 'Q2_2024', classification: 'PSGC', coverage: 'all' },
    snapshotFile: 'psa-catalog.json',
    fixtureFile: 'fixtures/psa-catalog.json',
    validate: (payload) => {
      if (!payload?.meta || !Array.isArray(payload.data)) throw new Error('PSA response must contain meta and data');
      if (payload.meta.classification !== 'PSGC') throw new Error('PSA response must identify the PSGC classification');
      if (payload.data.some((row) => typeof row.code !== 'string' || typeof row.name !== 'string')) throw new Error('PSA records must contain code and name');
      return payload.data;
    },
    sourceRelease: 'PSGC Q2 2024',
    scopeNote: 'PSA geographic reference context; not a locally curated service or demographic estimate.',
  },
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeAtomically(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp-${process.pid}`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tempPath, path);
}

async function collect(name, { fixture = false } = {}) {
  const config = sources[name];
  if (!config) throw new Error(`Unknown source ${name}`);
  const payload = fixture
    ? await readJson(resolve(root, 'scripts/bettergov', config.fixtureFile))
    : (await fetchJson(`${config.sourceUrl}?${new URLSearchParams(config.parameters)}`)).data;
  const data = config.validate(payload);
  const snapshot = makeSnapshot({
    snapshotId: `${name}-${new Date().toISOString().replaceAll(/[-:.TZ]/g, '').slice(0, 14)}`,
    sourceName: config.sourceName,
    sourceUrl: config.sourceUrl,
    parameters: config.parameters,
    sourceRelease: config.sourceRelease,
    scopeNote: config.scopeNote,
    currency: config.currency,
    unit: config.unit,
    data,
  });
  assertSnapshotShape(snapshot);
  const outputPath = resolve(outputDir, config.snapshotFile);
  try {
    await copyFile(outputPath, `${outputPath}.previous.json`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await writeAtomically(outputPath, snapshot);
  console.log(`Saved ${name}: ${config.snapshotFile} (${data.length} records)`);
}

const args = new Set(process.argv.slice(2));
const names = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const selected = names.length ? names : Object.keys(sources);
try {
  for (const name of selected) await collect(name, { fixture: args.has('--fixture') });
} catch (error) {
  console.error(`Snapshot rejected: ${error.message}`);
  process.exitCode = 1;
}
