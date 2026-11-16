#!/usr/bin/env node
import { readdir, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve(process.argv[2] ?? 'dist/data/bettergov');
let removed = 0;
let kept = 0;

try {
  for (const name of await readdir(directory)) {
    if (!name.endsWith('.json')) continue;
    const path = resolve(directory, name);
    const snapshot = JSON.parse(await readFile(path, 'utf8'));
    if (['reviewed', 'verified'].includes(snapshot.review_status)) {
      kept += 1;
      continue;
    }
    await unlink(path);
    removed += 1;
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

console.log(`Public snapshot filter: kept ${kept} reviewed/legacy file(s); removed ${removed} unreviewed file(s).`);
