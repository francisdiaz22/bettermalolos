-- Read-only post-import checks for Hostinger phpMyAdmin.

-- Qualify application tables because phpMyAdmin can switch its active context
-- to information_schema while executing an imported multi-statement script.
SELECT 'u735413447_bettermalolos' AS selected_database, VERSION() AS server_version;

SELECT version_num AS schema_revision
FROM `u735413447_bettermalolos`.alembic_version;

SELECT table_name, engine, table_collation
FROM information_schema.tables
WHERE table_schema = 'u735413447_bettermalolos'
  AND table_name IN (
    'source_registry', 'source_snapshot', 'station',
    'observation', 'audit_log', 'alembic_version'
  )
ORDER BY table_name;

SELECT column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'u735413447_bettermalolos'
  AND table_name = 'source_snapshot'
  AND column_name IN (
    'content_hash', 'content_length', 'compressed_length',
    'compression', 'raw_body_gzip'
  )
ORDER BY ordinal_position;

SELECT index_name, non_unique, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS indexed_columns
FROM information_schema.statistics
WHERE table_schema = 'u735413447_bettermalolos'
  AND table_name = 'observation'
GROUP BY index_name, non_unique
ORDER BY index_name;

SELECT
  COUNT(*) AS snapshot_count,
  COALESCE(SUM(compressed_length), 0) AS tracked_gzip_bytes,
  COALESCE(MAX(compressed_length), 0) AS largest_gzip_bytes,
  SUM(raw_body_gzip IS NULL) AS snapshots_without_database_body
FROM `u735413447_bettermalolos`.source_snapshot;

SELECT
  name,
  enabled,
  terms_reviewed_at,
  approved_at,
  second_reviewer,
  licensing_terms,
  robots_txt
FROM `u735413447_bettermalolos`.source_registry
ORDER BY name;

SELECT
  (SELECT COUNT(*) FROM `u735413447_bettermalolos`.source_snapshot) AS snapshot_count,
  (SELECT COUNT(*) FROM `u735413447_bettermalolos`.station) AS station_count,
  (SELECT COUNT(*) FROM `u735413447_bettermalolos`.observation) AS observation_count,
  (SELECT COUNT(*) FROM `u735413447_bettermalolos`.observation WHERE active_key IS NOT NULL) AS active_observation_count,
  (SELECT COUNT(*) FROM `u735413447_bettermalolos`.audit_log) AS audit_count;

-- Expect zero rows: the unique index also prevents this condition.
SELECT active_key, COUNT(*) AS duplicate_count
FROM `u735413447_bettermalolos`.observation
WHERE active_key IS NOT NULL
GROUP BY active_key
HAVING COUNT(*) > 1;
