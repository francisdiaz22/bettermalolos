#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname);
const sourceDir = resolve(root, 'data/bettergov');
const reportPath = resolve(root, 'data/provenance/review-report.md');

const readSnapshot = async (file) => JSON.parse(await readFile(resolve(sourceDir, file), 'utf8'));
const recordKey = (record, index) => String(record.id ?? record.code ?? record.name ?? index);
const monetaryFields = ['amount', 'budget', 'appropriation', 'base_amount', 'delta'];

function diff(previous, current) {
  const oldRecords = new Map((previous?.data ?? []).map((record, index) => [recordKey(record, index), record]));
  const newRecords = new Map((current?.data ?? []).map((record, index) => [recordKey(record, index), record]));
  const added = [...newRecords.keys()].filter((key) => !oldRecords.has(key));
  const removed = [...oldRecords.keys()].filter((key) => !newRecords.has(key));
  const changed = [];
  for (const key of newRecords.keys()) {
    if (!oldRecords.has(key)) continue;
    const oldRecord = oldRecords.get(key);
    const newRecord = newRecords.get(key);
    const monetaryChanges = monetaryFields.filter((field) => oldRecord[field] !== newRecord[field]);
    if (monetaryChanges.length || JSON.stringify(oldRecord) !== JSON.stringify(newRecord)) changed.push({ key, monetaryChanges });
  }
  return { added, removed, changed };
}

const files = ['budget-sample.json', 'psa-catalog.json'];
const lines = [
  '# BetterGov snapshot review report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '> Maintainer-only review artifact. A snapshot is not ready for public display until its `review_status` is changed to `reviewed` by a human reviewer.',
  '',
];

for (const file of files) {
  const current = await readSnapshot(file);
  let previous = null;
  try {
    previous = await readSnapshot(`${file}.previous.json`);
  } catch {
    // The first run has no previous snapshot; this is expected.
  }
  const changes = diff(previous, current);
  lines.push(`## ${file}`, '', `- Source: ${current.source_name}`, `- URL: ${current.source_url}`, `- Retrieved: ${current.retrieved_at}`, `- Status: ${current.review_status}`);
  if (current.reviewed_at) lines.push(`- Reviewed: ${current.reviewed_at}`, `- Reviewer: ${current.reviewer ?? 'Not recorded'}`);
  lines.push(`- Added: ${changes.added.length}`, `- Removed: ${changes.removed.length}`, `- Changed: ${changes.changed.length}`);
  if (changes.changed.some((change) => change.monetaryChanges.length)) lines.push('- Monetary changes: yes; inspect the source response before review.');
  lines.push('');
}

await writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${reportPath}`);
