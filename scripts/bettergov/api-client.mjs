import { createHash } from 'node:crypto';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;

class RetryableHttpError extends Error {
  constructor(message, response, attempt) {
    super(message);
    this.response = response;
    this.attempt = attempt;
  }
}

export function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function retryDelay(response, attempt) {
  const retryAfter = response?.headers?.get('retry-after');
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 30_000);
  return Math.min(500 * 2 ** attempt, 5_000);
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function fetchJson(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const headers = {
    accept: 'application/json',
    'user-agent': options.userAgent ?? 'BetterMalolos/1.0 (+https://bettermalolos.org; civic-data-snapshot)',
    ...(options.headers ?? {}),
  };

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, headers, method: 'GET', signal: controller.signal });
      if (response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('json')) throw new Error(`Expected JSON from ${url}, got ${contentType || 'unknown content type'}`);
        return { data: await response.json(), fetchedAt: new Date().toISOString(), status: response.status };
      }
      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(`API request failed (${response.status}) for ${url}`);
      }
      if (attempt === retries) throw new Error(`API request failed (${response.status}) for ${url}`);
      throw new RetryableHttpError(`Retryable API response (${response.status}) for ${url}`, response, attempt);
    } catch (error) {
      if (error instanceof RetryableHttpError) {
        await wait(retryDelay(error.response, error.attempt));
      } else {
        if (attempt === retries) throw error;
        await wait(500 * 2 ** attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`API request failed for ${url}`);
}

export function assertObject(value, label = 'response') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a JSON object`);
}

export function assertSnapshotShape(snapshot) {
  assertObject(snapshot, 'snapshot');
  for (const field of ['snapshot_id', 'source_name', 'source_url', 'retrieved_at', 'data']) {
    if (!(field in snapshot)) throw new Error(`snapshot is missing ${field}`);
  }
  if (!Array.isArray(snapshot.data)) throw new Error('snapshot.data must be an array');
  if (snapshot.data.some((record) => !record || typeof record !== 'object' || Array.isArray(record))) {
    throw new Error('snapshot.data must contain JSON objects');
  }
}

export function makeSnapshot({ snapshotId, sourceName, sourceUrl, parameters = {}, sourceRelease, data, fetchedAt, scopeNote, currency, unit, reviewStatus = 'pending-review' }) {
  const snapshot = {
    schema_version: 1,
    snapshot_id: snapshotId,
    source_name: sourceName,
    source_url: sourceUrl,
    parameters,
    retrieved_at: fetchedAt ?? new Date().toISOString(),
    source_release: sourceRelease ?? 'Not stated by source',
    scope_note: scopeNote ?? 'Partner-provided context; not an LGU Malolos record.',
    ...(currency ? { currency } : {}),
    ...(unit ? { unit } : {}),
    review_status: reviewStatus,
    checksum_sha256: sha256(data),
    data,
  };
  assertSnapshotShape(snapshot);
  return snapshot;
}
