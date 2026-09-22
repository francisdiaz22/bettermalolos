import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { collect } from '../scripts/bettergov/snapshot-pipeline.mjs';

async function temporaryOutputDir() {
  return mkdtemp(join(tmpdir(), 'bettermalolos-bettergov-'));
}

test('fixture collection writes a valid snapshot and rotates the previous snapshot', async () => {
  const outputDir = await temporaryOutputDir();

  await collect('budget-sample', { fixture: true, outputDirOverride: outputDir });
  const first = JSON.parse(await readFile(join(outputDir, 'budget-sample.json'), 'utf8'));
  assert.equal(first.review_status, 'pending-review');
  assert.equal(first.data.length, 2);

  await collect('budget-sample', {
    payloadOverride: {
      meta: { dataset: 'gaa', year: 2026, currency: 'PHP', scale: 'pesos' },
      data: [{ ...first.data[0], amount: 1250000001 }],
    },
    outputDirOverride: outputDir,
  });

  const previous = JSON.parse(await readFile(join(outputDir, 'budget-sample.json.previous.json'), 'utf8'));
  const current = JSON.parse(await readFile(join(outputDir, 'budget-sample.json'), 'utf8'));
  assert.equal(previous.data.length, 2);
  assert.equal(previous.data[0].amount, 1250000000);
  assert.equal(current.data[0].amount, 1250000001);
});

test('an invalid response is rejected without changing the current snapshot or backup', async () => {
  const outputDir = await temporaryOutputDir();
  await collect('budget-sample', { fixture: true, outputDirOverride: outputDir });
  const currentPath = join(outputDir, 'budget-sample.json');
  const backupPath = join(outputDir, 'budget-sample.json.previous.json');
  const beforeCurrent = await readFile(currentPath, 'utf8');

  await assert.rejects(
    collect('budget-sample', {
      payloadOverride: { meta: { currency: 'PHP', scale: 'pesos' }, data: [{ amount: 'not-a-number' }] },
      outputDirOverride: outputDir,
    }),
    /Budget records must contain amount/,
  );

  assert.equal(await readFile(currentPath, 'utf8'), beforeCurrent);
  await assert.rejects(readFile(backupPath, 'utf8'), { code: 'ENOENT' });
});
