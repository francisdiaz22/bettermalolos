#!/usr/bin/env node
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertSnapshotShape, fetchJson, makeSnapshot } from './api-client.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const outputDir = resolve(root, 'data/bettergov');

export const sources = {
  'budget-sample': {
    sourceName: 'BetterGov Philippine Budget API',
    sourceUrl: 'https://budget.bettergov.ph/api/v1/gaa/search',
    parameters: { queries: ['Malolos', 'Bulacan State University'], year: 2026, limit: 100 },
    snapshotFile: 'budget-sample.json',
    fixtureFile: 'fixtures/budget-sample.json',
    validate: (payload) => {
      if (!payload?.meta || !Array.isArray(payload.data)) throw new Error('Budget response must contain meta and data');
      if (payload.meta.currency !== 'PHP' || payload.meta.scale !== 'pesos') throw new Error('Budget response must declare exact PHP pesos');
      const year = Number(payload.meta.year ?? 2026);
      const records = payload.data.map((row) => {
        const sourceYear = row.years?.[String(year)];
        return {
          id: row.id ?? row.fam_key ?? row.name,
          program: row.program ?? row.name,
          department: row.department,
          amount: row.amount ?? sourceYear?.amount,
          year: row.year ?? year,
          ...(row.stage || payload.meta.dataset === 'gaa' ? { stage: row.stage ?? 'GAA' } : {}),
          ...(row.fam_key ? { source_record_id: row.fam_key } : {}),
        };
      });
      if (records.some((row) =>
        typeof row.amount !== 'number' ||
        !Number.isInteger(row.year) ||
        typeof row.program !== 'string' ||
        (row.department !== undefined && typeof row.department !== 'string')
      )) throw new Error('Budget records must contain amount, year, and program');
      return records.filter((row) => row.amount > 0);
    },
    sourceRelease: 'FY 2026 BetterGov budget response',
    scopeNote: 'FY 2026 records discovered through BetterGov Malolos and Bulacan State University searches, supplemented with top-level regular-program totals from DBM F.4; verify precise geographic and administrative scope before publication.',
    currency: 'PHP',
    unit: 'pesos',
    supplementalRecords: [
      {
        id: 'dbm-f4|general-administration-and-support',
        program: 'General Administration and Support (DBM F.4 regular program)',
        department: 'State Universities and Colleges (SUCs)',
        amount: 259133000,
        year: 2026,
        stage: 'DBM F.4',
        source_record_url: 'https://www.dbm.gov.ph/wp-content/uploads/GAA/GAA2026/VolumeIA/SUCS/F4.pdf',
      },
      {
        id: 'dbm-f4|support-to-operations',
        program: 'Support to Operations (DBM F.4 regular program)',
        department: 'State Universities and Colleges (SUCs)',
        amount: 9000,
        year: 2026,
        stage: 'DBM F.4',
        source_record_url: 'https://www.dbm.gov.ph/wp-content/uploads/GAA/GAA2026/VolumeIA/SUCS/F4.pdf',
      },
      {
        id: 'dbm-f4|operations',
        program: 'Operations (DBM F.4 regular program)',
        department: 'State Universities and Colleges (SUCs)',
        amount: 1417499000,
        year: 2026,
        stage: 'DBM F.4',
        source_record_url: 'https://www.dbm.gov.ph/wp-content/uploads/GAA/GAA2026/VolumeIA/SUCS/F4.pdf',
      },
    ],
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

export async function saveSnapshot(outputPath, snapshot) {
  await mkdir(dirname(outputPath), { recursive: true });
  const tempPath = `${outputPath}.tmp-${process.pid}`;
  await writeFile(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  // Only rotate the prior snapshot after the new snapshot has been validated
  // and fully written. A failed refresh therefore cannot change either file.
  try {
    await copyFile(outputPath, `${outputPath}.previous.json`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await rename(tempPath, outputPath);
}

export async function collect(name, { fixture = false, payloadOverride, outputDirOverride } = {}) {
  const config = sources[name];
  if (!config) throw new Error(`Unknown source ${name}`);
  const payloads = payloadOverride
    ? [payloadOverride]
    : fixture
      ? [await readJson(resolve(root, 'scripts/bettergov', config.fixtureFile))]
      : await Promise.all(config.parameters.queries.map((query) =>
        fetchJson(`${config.sourceUrl}?${new URLSearchParams({
          q: query,
          year: String(config.parameters.year),
          limit: String(config.parameters.limit),
        })}`).then((response) => response.data)
      ));
  const records = payloads.flatMap((payload) => config.validate(payload));
  if (!fixture && !payloadOverride && config.supplementalRecords) {
    records.push(...config.supplementalRecords);
  }
  const data = [...new Map(records.map((record) => [record.source_record_id ?? record.id ?? record.program, record])).values()];
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
  const outputPath = resolve(outputDirOverride ?? outputDir, config.snapshotFile);
  await saveSnapshot(outputPath, snapshot);
  console.log(`Saved ${name}: ${config.snapshotFile} (${data.length} records)`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = new Set(process.argv.slice(2));
  const names = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const selected = names.length ? names : Object.keys(sources);
  try {
    for (const name of selected) await collect(name, { fixture: args.has('--fixture') });
  } catch (error) {
    console.error(`Snapshot rejected: ${error.message}`);
    process.exitCode = 1;
  }
}
