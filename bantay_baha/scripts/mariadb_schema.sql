-- Bantay Baha Phase A schema for MariaDB/MySQL via phpMyAdmin.
-- Target: a new/empty database selected in phpMyAdmin.
-- Runtime timestamps are normalized to UTC by the Python ORM.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE source_registry (
  id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  name VARCHAR(128) NOT NULL,
  canonical_url LONGTEXT NOT NULL,
  type VARCHAR(64) NOT NULL,
  enabled TINYINT(1) NOT NULL,
  cadence_minutes INT NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  terms_reviewed_at DATETIME(6) NULL,
  publisher VARCHAR(128) NULL,
  owner VARCHAR(128) NULL,
  freshness_warning_minutes INT NULL,
  freshness_critical_minutes INT NULL,
  parser_version VARCHAR(32) NOT NULL,
  notes LONGTEXT NULL,
  terms_url LONGTEXT NULL,
  licensing_terms LONGTEXT NULL,
  robots_txt LONGTEXT NULL,
  expected_update_frequency VARCHAR(128) NULL,
  maintainer_name VARCHAR(128) NULL,
  maintainer_contact VARCHAR(256) NULL,
  second_reviewer VARCHAR(128) NULL,
  approved_at DATETIME(6) NULL,
  range_policy_json LONGTEXT NULL,
  last_etag LONGTEXT NULL,
  last_modified LONGTEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_source_registry_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE source_snapshot (
  id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  source_id VARCHAR(36) NOT NULL,
  fetched_at DATETIME(6) NOT NULL,
  http_status INT NOT NULL,
  content_hash VARCHAR(128) NOT NULL,
  object_key LONGTEXT NOT NULL,
  content_type VARCHAR(128) NULL,
  parser_version VARCHAR(32) NOT NULL,
  content_length INT NULL,
  error LONGTEXT NULL,
  compressed_length INT NULL,
  compression VARCHAR(16) NULL,
  raw_body_gzip MEDIUMBLOB NULL,
  PRIMARY KEY (id),
  KEY ix_source_snapshot_source_id (source_id),
  KEY ix_source_snapshot_content_hash (content_hash),
  CONSTRAINT fk_source_snapshot_source
    FOREIGN KEY (source_id) REFERENCES source_registry (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE station (
  id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  source_id VARCHAR(36) NOT NULL,
  source_station_id VARCHAR(256) NOT NULL,
  name VARCHAR(256) NOT NULL,
  kind VARCHAR(64) NOT NULL,
  unit VARCHAR(32) NULL,
  latitude DOUBLE NULL,
  longitude DOUBLE NULL,
  metadata_json LONGTEXT NULL,
  PRIMARY KEY (id),
  KEY ix_station_source_id (source_id),
  UNIQUE KEY uq_station_source (source_id, source_station_id),
  CONSTRAINT fk_station_source
    FOREIGN KEY (source_id) REFERENCES source_registry (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE observation (
  id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  station_id VARCHAR(36) NOT NULL,
  snapshot_id VARCHAR(36) NOT NULL,
  metric VARCHAR(64) NOT NULL,
  value DECIMAL(12,3) NULL,
  unit VARCHAR(32) NULL,
  observed_at DATETIME(6) NULL,
  fetched_at DATETIME(6) NOT NULL,
  source_url LONGTEXT NULL,
  parser_version VARCHAR(32) NOT NULL,
  quality_state VARCHAR(32) NOT NULL,
  thresholds_json LONGTEXT NULL,
  raw_text LONGTEXT NULL,
  supersedes_id VARCHAR(36) NULL,
  active_key VARCHAR(64) NULL,
  PRIMARY KEY (id),
  KEY ix_observation_station_id (station_id),
  KEY ix_observation_snapshot_id (snapshot_id),
  KEY ix_observation_observed_at (observed_at),
  UNIQUE KEY uq_observation_active_key (active_key),
  CONSTRAINT fk_observation_station
    FOREIGN KEY (station_id) REFERENCES station (id),
  CONSTRAINT fk_observation_snapshot
    FOREIGN KEY (snapshot_id) REFERENCES source_snapshot (id),
  CONSTRAINT fk_observation_supersedes
    FOREIGN KEY (supersedes_id) REFERENCES observation (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  actor VARCHAR(128) NOT NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(36) NULL,
  `before` LONGTEXT NULL,
  `after` LONGTEXT NULL,
  reason LONGTEXT NULL,
  `timestamp` DATETIME(6) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE alembic_version (
  version_num VARCHAR(32) NOT NULL,
  PRIMARY KEY (version_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO alembic_version (version_num) VALUES ('004_mariadb_snapshots');
