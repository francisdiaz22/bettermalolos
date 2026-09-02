import { createHash, randomUUID } from "node:crypto";
import { gzip as gzipCallback } from "node:zlib";
import { promisify } from "node:util";
const gzip = promisify(gzipCallback);
export async function prepareSnapshot(content, config, db) {
  const body = Buffer.from(content); if (body.length > config.SNAPSHOT_MAX_RAW_BYTES) throw new Error("snapshot raw body exceeds configured limit");
  const compressed = await gzip(body); if (compressed.length > config.SNAPSHOT_MAX_COMPRESSED_BYTES) throw new Error("snapshot compressed body exceeds configured limit");
  const [rows] = await db.execute("SELECT COALESCE(SUM(compressed_length),0) AS used_bytes FROM source_snapshot");
  if (Number(rows[0].used_bytes) + compressed.length > config.SNAPSHOT_DATABASE_QUOTA_BYTES) throw new Error("snapshot database quota exceeded");
  return { id: randomUUID(), body, compressed, hash: createHash("sha256").update(body).digest("hex") };
}
export async function storeSnapshot(db, source, snap, { fetchedAt, status, contentType, error = null }) {
  await db.execute(`INSERT INTO source_snapshot (id,created_at,updated_at,source_id,fetched_at,http_status,content_hash,object_key,content_type,parser_version,content_length,error,compressed_length,compression,raw_body_gzip) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'gzip',?)`, [snap.id, fetchedAt, fetchedAt, source.id, fetchedAt, status, snap.hash, `database://source_snapshot/${snap.id}`, contentType, source.parser_version, snap.body.length, error, snap.compressed.length, snap.compressed]); return snap.id;
}
