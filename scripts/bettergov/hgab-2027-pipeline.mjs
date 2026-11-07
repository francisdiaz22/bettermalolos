#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchJson, sha256 } from './api-client.mjs';
import {
  HGAB_2027_BASE_URL,
  HGAB_2027_NOTICES,
  HGAB_2027_SCOPES,
  HGAB_2027_SNAPSHOT_SCHEMA,
  buildProjectQueryUrl,
  normalizeHgabScopeProjects,
} from './hgab-2027-contract.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const outputPath = resolve(root, 'data/bettergov/hgab-2027.json');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

async function fetchAllPages(query, { request = fetchJson, limit = 200 } = {}) {
  const pages = [];
  const pageRequests = [];
  let offset = 0;
  let total = null;
  do {
    const result = await request(buildProjectQueryUrl(query, { limit, offset }));
    const response = result.data;
    if (!isObject(response?.meta) || !isObject(response?.data) || !Array.isArray(response.data.rows)) {
      throw new Error(`Invalid list response for ${query.dataset} at offset ${offset}`);
    }
    if (response.meta.currency !== 'PHP' || response.meta.scale !== 'pesos') throw new Error('API did not identify amounts as PHP pesos');
    if (!Number.isInteger(response.data.total) || response.data.total < 0) throw new Error('API response has no valid pagination total');
    if (total !== null && total !== response.data.total) throw new Error(`API total changed while collecting ${query.dataset}`);
    total = response.data.total;
    pages.push(response);
    pageRequests.push({ limit, offset, received: response.data.rows.length });
    if (response.data.rows.length === 0 && offset < total) throw new Error(`API returned an empty page before the end of ${query.dataset}`);
    offset += response.data.rows.length;
    if (offset < total && response.data.rows.length === 0) throw new Error(`Pagination stalled for ${query.dataset}`);
  } while (offset < total);
  return { query, pages, total, pageRequests, fetchedAt: new Date().toISOString() };
}

function normalizeOverview(payload) {
  if (!isObject(payload) || !isObject(payload.meta)) throw new Error('HGAB overview response is missing metadata');
  const metadata = payload.meta;
  const sourceRelease = metadata.source_commit ?? metadata.source_release ?? metadata.commit ?? 'Not stated by source';
  const builtAt = metadata.built_at ?? metadata.generated_at ?? metadata.updated_at ?? null;
  const notices = [...new Set([
    ...HGAB_2027_NOTICES,
    ...(typeof metadata.notice === 'string' ? [metadata.notice] : []),
    ...(Array.isArray(payload.notices) ? payload.notices : []),
  ].filter((item) => typeof item === 'string'))];
  const disclaimers = Array.isArray(payload.disclaimers)
    ? payload.disclaimers
    : Array.isArray(payload.data?.disclaimers) ? payload.data.disclaimers : [];
  return { sourceRelease, builtAt, notices, disclaimers, metadata, raw: payload };
}

function scopeQueryManifest(scopeId) {
  return HGAB_2027_SCOPES[scopeId].queries;
}
const queryKey = (query) => `${query.dataset}?${new URLSearchParams(query.parameters).toString()}`;

export function assembleHgabSnapshot({ overview, queryPages, retrievedAt = new Date().toISOString() }) {
  const overviewData = normalizeOverview(overview);
  const scopes = {};
  for (const scopeId of Object.keys(HGAB_2027_SCOPES)) {
    const selected = scopeQueryManifest(scopeId).map((query) => {
      const found = queryPages.find((result) => queryKey(result.query) === queryKey(query));
      if (!found) throw new Error(`Missing collected query for ${scopeId}: ${query.dataset}`);
      return found;
    });
    const projects = normalizeHgabScopeProjects(scopeId, selected);
    for (const project of projects) {
      for (const amount of Object.values(project.amounts)) {
        if (amount !== null && (typeof amount !== 'number' || !Number.isFinite(amount))) throw new Error(`Invalid amount for ${project.id}`);
      }
      if (project.pdf_url !== null && !isObject(project.pdf_url)) throw new Error(`Invalid PDF link map for ${project.id}`);
      for (const field of ['nep_php', 'house_php', 'hgab2_php', 'hgab3_php']) {
        if ((project.amounts[field] ?? null) !== (project.source_row[field] ?? null)) throw new Error(`Normalized ${field} differs from API source row for ${project.id}`);
      }
      for (const [version, href] of Object.entries(project.pdf_url ?? {})) {
        if (href !== null && (typeof href !== 'string' || !/^https:\/\//.test(href) || !/#page=[1-9]\d*$/.test(href))) {
          throw new Error(`Invalid ${version} PDF page link for ${project.id}`);
        }
      }
      if (typeof project.source_project_url !== 'string' || !/^https:\/\//.test(project.source_project_url)) throw new Error(`Missing project source link for ${project.id}`);
    }
    scopes[scopeId] = {
      label: HGAB_2027_SCOPES[scopeId].label,
      scope_note: HGAB_2027_SCOPES[scopeId].scopeNote,
      query_manifest: selected.map(({ query, total, pageRequests }) => ({
        dataset: query.dataset,
        parameters: query.parameters,
        expected_count: total,
        requests: pageRequests.map((page) => ({ ...page, parameters: { ...query.parameters, limit: page.limit, offset: page.offset } })),
        received_count: pageRequests.reduce((sum, page) => sum + page.received, 0),
      })),
      projects,
    };
  }
  const queryRecords = queryPages.map(({ query, total, pages }) => ({ query, total, rows: pages.flatMap((page) => page.data.rows) }));
  const provinceIds = new Set(scopes['bulacan-province'].projects.map((item) => item.id));
  const provinceQueryIds = new Set(queryRecords.filter(({ query }) => query.parameters.office).flatMap(({ query, rows }) =>
    query.dataset === 'dpwh' && ['Bulacan 1st District Engineering Office', 'Bulacan 2nd District Engineering Office', 'Bulacan 3rd District Engineering Office'].includes(query.parameters.office) ? rows.map((row) => `dpwh:${row.id}`) : []));
  if (provinceIds.size !== provinceQueryIds.size || [...provinceIds].some((id) => !provinceQueryIds.has(id))) throw new Error('Province scope contains records outside its configured office queries');
  const overlap = scopes['malolos-city'].projects.filter((project) => project.inclusion_reasons.some((reason) => reason.reason === 'office-assigned') && project.inclusion_reasons.some((reason) => reason.reason === 'title-match'));
  return {
    schema_version: HGAB_2027_SNAPSHOT_SCHEMA,
    snapshot_id: `hgab-2027-${retrievedAt.replaceAll(/[-:.TZ]/g, '').slice(0, 14)}`,
    fiscal_year: 2027,
    source_name: 'BetterGov.ph Philippine Budget Data API',
    source_url: HGAB_2027_BASE_URL,
    overview_url: HGAB_2027_BASE_URL,
    overview_sha256: sha256(overview),
    parameters: Object.fromEntries(queryPages.map(({ query, total, pageRequests }) => [`${query.dataset}?${new URLSearchParams(query.parameters)}`, {
      filter: query.parameters,
      requests: pageRequests.map((page) => ({ limit: page.limit, offset: page.offset, received: page.received })),
      total,
    }])),
    retrieved_at: retrievedAt,
    source_release: overviewData.sourceRelease,
    source_built_at: overviewData.builtAt,
    api_metadata: overviewData.metadata,
    api_overview: overviewData.raw,
    currency: 'PHP',
    unit: 'pesos',
    review_status: 'pending-review',
    scope_note: 'FY2027 national budget document project rows; not actual spending, project completion, or Malolos LGU appropriations.',
    notices: overviewData.notices,
    disclaimers: overviewData.disclaimers,
    pagination_validation: queryPages.map(({ query, total, pages, pageRequests }) => ({
      dataset: query.dataset,
      parameters: query.parameters,
      total,
      received: pages.reduce((sum, page) => sum + page.data.rows.length, 0),
      pages: pages.length,
      requests: pageRequests.map(({ limit, offset, received }) => ({ limit, offset, received })),
      unique_ids: new Set(pages.flatMap((page) => page.data.rows.map((row) => row.id))).size,
    })),
    validation_summary: {
      province_office_only: true,
      province_query_unique_count: provinceIds.size,
      malolos_unique_count: scopes['malolos-city'].projects.length,
      malolos_office_title_overlap_count: overlap.length,
      malolos_overlap_ids: overlap.map((project) => project.id),
      source_row_checksums: Object.fromEntries(queryPages.map(({ query, pages }) => [
        `${query.dataset}?${new URLSearchParams(query.parameters)}`,
        sha256(pages.flatMap((page) => page.data.rows)),
      ])),
    },
    scopes,
  };
}

export async function collectHgab2027({ request = fetchJson, output = outputPath, overviewOverride } = {}) {
  const overviewResult = overviewOverride
    ? { data: overviewOverride }
    : await request(HGAB_2027_BASE_URL);
  const queryMap = new Map();
  for (const scope of Object.values(HGAB_2027_SCOPES)) {
    for (const query of scope.queries) queryMap.set(`${query.dataset}?${new URLSearchParams(query.parameters)}`, query);
  }
  const queryPages = [];
  for (const query of queryMap.values()) queryPages.push(await fetchAllPages(query, { request }));
  const snapshot = assembleHgabSnapshot({ overview: overviewResult.data, queryPages });
  const temp = `${output}.tmp-${process.pid}`;
  await mkdir(dirname(output), { recursive: true });
  await writeFile(temp, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await readFile(temp, 'utf8').then((content) => JSON.parse(content));
  await rename(temp, output);
  return snapshot;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const snapshot = await collectHgab2027();
    console.log(JSON.stringify({ output: outputPath, retrieved_at: snapshot.retrieved_at, status: snapshot.review_status, pagination: snapshot.pagination_validation, validation: snapshot.validation_summary }, null, 2));
  } catch (error) {
    console.error(`HGAB snapshot rejected; prior snapshot was left unchanged: ${error.message}`);
    process.exitCode = 1;
  }
}
