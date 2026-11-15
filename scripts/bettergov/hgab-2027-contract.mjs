/**
 * Scope and normalization contract for the FY2027 NEP / House Bill 10858 data.
 * This module does not fetch or publish data; snapshots remain pending review.
 */

export const HGAB_2027_BASE_URL = 'https://budget.bettergov.ph/api/v1/hgab/2027';
export const HGAB_2027_SNAPSHOT_SCHEMA = 1;

export const HGAB_2027_SCOPES = Object.freeze({
  'bulacan-province': Object.freeze({
    label: 'Bulacan Province',
    scopeNote: 'DPWH rows assigned to the three published Bulacan district engineering offices, plus FMR rows whose titles locate the work in Bulacan and HFEP/NIA rows returned by the API search for “Bulacan”. Search-based program matches are not a complete geographic inventory.',
    queries: Object.freeze([
      { dataset: 'dpwh', parameters: Object.freeze({ office: 'Bulacan 1st District Engineering Office' }), reason: 'office-assigned', reasonLabel: 'Assigned to Bulacan 1st District Engineering Office' },
      { dataset: 'dpwh', parameters: Object.freeze({ office: 'Bulacan 2nd District Engineering Office' }), reason: 'office-assigned', reasonLabel: 'Assigned to Bulacan 2nd District Engineering Office' },
      { dataset: 'dpwh', parameters: Object.freeze({ office: 'Bulacan 3rd District Engineering Office' }), reason: 'office-assigned', reasonLabel: 'Assigned to Bulacan 3rd District Engineering Office' },
      ...['fmr', 'hfep', 'nia'].map((dataset) => ({
        dataset,
        parameters: Object.freeze({ q: 'Bulacan' }),
        reason: 'title-match',
        reasonLabel: 'Project returned by API title search for “Bulacan”',
      })),
    ]),
  }),
  'bulacan-first-district': Object.freeze({
    label: 'Bulacan 1st District',
    scopeNote: 'DPWH rows assigned to the Bulacan 1st District Engineering Office whose project titles identify a 1st District municipality, plus FMR, HFEP, and NIA search results whose titles identify one of those municipalities. FMR titles must also locate the work in Bulacan. Title searches do not establish exact project locations.',
    queries: Object.freeze([
      { dataset: 'dpwh', parameters: Object.freeze({ office: 'Bulacan 1st District Engineering Office' }), reason: 'office-assigned', reasonLabel: 'Assigned to Bulacan 1st District Engineering Office; title names a 1st District municipality' },
      ...['Bulakan', 'Calumpit', 'Hagonoy', 'Malolos', 'Paombong', 'Pulilan'].flatMap((place) =>
        ['fmr', 'hfep', 'nia'].map((dataset) => ({
          dataset,
          parameters: Object.freeze({ q: place }),
          reason: 'title-match',
          reasonLabel: `Project returned by API title search for “${place}”`,
        }))),
    ]),
  }),
  'malolos-city': Object.freeze({
    label: 'Malolos City',
    scopeNote: 'FY2027 project rows returned by the API title search for Malolos, excluding rows whose title identifies another municipality as the project location. This title-based view is not a complete inventory of projects physically located in the city.',
    queries: Object.freeze([
      ...['dpwh', 'fmr', 'hfep', 'nia'].map((dataset) => ({
        dataset,
        parameters: Object.freeze({ q: 'Malolos' }),
        reason: 'title-match',
        reasonLabel: 'Project title returned by API search for “Malolos”',
      })),
    ]),
  }),
});

export const HGAB_2027_NOTICES = Object.freeze([
  'Amounts reflect published figures in the 2027 NEP and House Bill 10858, not actual spending. A project found in only one version is a candidate for further review, not a conclusive finding.',
  'The BetterGov.ph Philippine Budget Data API is independent and unofficial; its data and interpretations are not endorsed by the Philippine government.',
  'A project row is not assigned to any one district when an engineering office serves multiple districts.',
]);

export function buildProjectQueryUrl(query, { limit = 200, offset = 0 } = {}) {
  if (!query || !['dpwh', 'fmr', 'hfep', 'nia'].includes(query.dataset)) throw new Error('Unknown HGAB dataset');
  const params = new URLSearchParams({ ...query.parameters, limit: String(limit), offset: String(offset) });
  return `${HGAB_2027_BASE_URL}/datasets/${query.dataset}/projects?${params}`;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Normalize pages of API list envelopes. Keep the original row intact so new
 * source labels/flags are not lost, while adding explicit inclusion provenance.
 */
export function normalizeHgabProjects(scopeId, queryResults) {
  const scope = HGAB_2027_SCOPES[scopeId];
  if (!scope) throw new Error(`Unknown HGAB scope: ${scopeId}`);
  const projects = new Map();

  for (const { query, response } of queryResults) {
    if (!scope.queries.some((candidate) => candidate.dataset === query.dataset && JSON.stringify(candidate.parameters) === JSON.stringify(query.parameters))) {
      throw new Error(`Query is not configured for ${scopeId}`);
    }
    if (!isRecord(response) || !isRecord(response.meta) || !isRecord(response.data) || !Array.isArray(response.data.rows)) {
      throw new Error(`Invalid HGAB project response for ${query.dataset}`);
    }
    if (response.meta.currency !== 'PHP' || response.meta.scale !== 'pesos') throw new Error('HGAB response must declare PHP pesos');
    const pageTotal = response.data.total;
    if (!Number.isInteger(pageTotal) || pageTotal < 0) throw new Error('HGAB response must declare a non-negative total');
    if (response.data.rows.some((row) => !isRecord(row) || typeof row.id !== 'string' || typeof row.title !== 'string')) {
      throw new Error('HGAB project rows must contain string id and title fields');
    }

    const configuredQuery = scope.queries.find((candidate) => candidate.dataset === query.dataset && JSON.stringify(candidate.parameters) === JSON.stringify(query.parameters));
    for (const row of response.data.rows) {
      // Dataset is part of the key: IDs are only stable within a program.
      const id = `${query.dataset}:${row.id}`;
      const existing = projects.get(id);
      const inclusion = {
        reason: configuredQuery.reason,
        label: configuredQuery.reasonLabel,
        dataset: query.dataset,
        parameters: { ...query.parameters },
      };
      if (existing) {
        if (!existing.inclusion_reasons.some((reason) => reason.reason === inclusion.reason && reason.dataset === inclusion.dataset && JSON.stringify(reason.parameters) === JSON.stringify(inclusion.parameters))) {
          existing.inclusion_reasons.push(inclusion);
        }
      } else {
        projects.set(id, {
          id,
          source_project_id: row.id,
          dataset: query.dataset,
          title: row.title,
          inclusion_reasons: [inclusion],
          amounts: {
            nep_php: row.nep_php ?? null,
            house_php: row.house_php ?? null,
            hgab2_php: row.hgab2_php ?? null,
            hgab3_php: row.hgab3_php ?? null,
          },
          match_status: row.status_label ?? row.trace ?? null,
          pdf_url: row.pdf_url ?? {},
          source_project_url: row.url ?? null,
          source_row: row,
        });
      }
    }
  }
  let normalized = [...projects.values()];
  if (scopeId === 'bulacan-province') {
    // q=Bulacan also matches a barangay named Bulacan in Mabini, Batangas.
    normalized = normalized.filter((project) => project.dataset !== 'fmr' || /,\s*Bulacan\s*$/i.test(project.title));
  }
  if (scopeId === 'bulacan-first-district') {
    const municipalities = /\b(?:bulakan|calumpit|hagonoy|malolos|paombong|pulilan)\b/i;
    return normalized.filter((project) => project.dataset === 'dpwh'
      ? municipalities.test(project.title)
      : project.dataset === 'fmr'
        ? municipalities.test(project.title) && /,\s*Bulacan\s*$/i.test(project.title)
        : municipalities.test(project.title));
  }
  if (scopeId === 'malolos-city') return normalized.filter((project) =>
    /\bmalolos\b/i.test(project.title) && !/(?:,\s*Calumpit,\s*Bulacan\b|\b(?:City|Municipality) of Calumpit,\s*Bulacan\b)/i.test(project.title));
  return normalized;
}

export function assertCompleteHgabPages(query, pages) {
  if (!Array.isArray(pages) || pages.length === 0) throw new Error('A configured HGAB query returned no pages');
  const total = pages[0]?.data?.total;
  if (!Number.isInteger(total) || total < 0) throw new Error('HGAB response is missing its total');
  if (pages.some((page) => page?.data?.total !== total)) throw new Error(`HGAB total changed during pagination for ${query.dataset}`);
  const rows = pages.flatMap((page) => page?.data?.rows ?? []);
  if (rows.length !== total) throw new Error(`Incomplete HGAB pagination for ${query.dataset}: expected ${total}, received ${rows.length}`);
  const ids = rows.map((row) => row?.id);
  if (ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new Error(`Invalid or duplicate HGAB IDs within ${query.dataset} query`);
  return rows;
}

/** Validate every configured query and pagination set before scope normalization. */
export function normalizeHgabScopeProjects(scopeId, queryPages) {
  const scope = HGAB_2027_SCOPES[scopeId];
  if (!scope) throw new Error(`Unknown HGAB scope: ${scopeId}`);
  if (!Array.isArray(queryPages)) throw new Error('HGAB query results must be an array');
  const keyOf = (query) => `${query.dataset}?${new URLSearchParams(query.parameters).toString()}`;
  const configured = new Map(scope.queries.map((query) => [keyOf(query), query]));
  const completed = [];
  const seen = new Set();

  for (const result of queryPages) {
    const key = keyOf(result?.query ?? {});
    if (!configured.has(key)) throw new Error(`Query is not configured for ${scopeId}`);
    if (seen.has(key)) throw new Error(`Duplicate query result for ${scopeId}: ${key}`);
    seen.add(key);
    const rows = assertCompleteHgabPages(result.query, result.pages);
    const first = result.pages[0];
    completed.push({
      query: result.query,
      response: { ...first, data: { ...first.data, rows } },
    });
  }
  for (const key of configured.keys()) {
    if (!seen.has(key)) throw new Error(`Missing configured query result for ${scopeId}: ${key}`);
  }
  return normalizeHgabProjects(scopeId, completed);
}
