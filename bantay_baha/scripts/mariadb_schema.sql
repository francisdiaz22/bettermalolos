-- Bantay Baha Phase B schema for MariaDB/MySQL via phpMyAdmin.
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
  source_published_at DATETIME(6) NULL,
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

CREATE TABLE observation_mapping (
  id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  public_field VARCHAR(128) NOT NULL,
  source_id VARCHAR(36) NOT NULL,
  source_station_id VARCHAR(256) NOT NULL,
  metric VARCHAR(64) NOT NULL,
  unit_datum VARCHAR(128) NULL,
  geographic_scope LONGTEXT NOT NULL,
  aggregation_period VARCHAR(128) NOT NULL,
  timestamp_semantics VARCHAR(256) NOT NULL,
  threshold_semantics LONGTEXT NULL,
  role VARCHAR(16) NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  mapping_version VARCHAR(64) NOT NULL,
  rationale LONGTEXT NOT NULL,
  reviewed_by VARCHAR(128) NULL,
  reviewed_at DATETIME(6) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_observation_mapping_public_field (public_field),
  CONSTRAINT fk_observation_mapping_source FOREIGN KEY (source_id) REFERENCES source_registry (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE condition_selection (
  id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  public_field VARCHAR(128) NOT NULL,
  selected_observation_id VARCHAR(36) NULL,
  historical_observation_id VARCHAR(36) NULL,
  candidate_observation_ids_json LONGTEXT NOT NULL,
  mapping_version VARCHAR(64) NULL,
  selection_state VARCHAR(32) NOT NULL,
  selection_reason VARCHAR(64) NOT NULL,
  computed_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_condition_selection_public_field (public_field),
  CONSTRAINT fk_condition_selection_selected FOREIGN KEY (selected_observation_id) REFERENCES observation (id),
  CONSTRAINT fk_condition_selection_historical FOREIGN KEY (historical_observation_id) REFERENCES observation (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE official_advisory (
  id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  source_id VARCHAR(36) NOT NULL,
  snapshot_id VARCHAR(36) NOT NULL,
  source_url LONGTEXT NOT NULL,
  issued_at DATETIME(6) NULL,
  expires_at DATETIME(6) NULL,
  reviewed_at DATETIME(6) NULL,
  raw_text LONGTEXT NOT NULL,
  level VARCHAR(64) NULL,
  areas_json LONGTEXT NOT NULL,
  structured_json LONGTEXT NULL,
  extraction_confidence VARCHAR(16) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_official_advisory_source_id (source_id),
  KEY ix_official_advisory_snapshot_id (snapshot_id),
  CONSTRAINT fk_official_advisory_source FOREIGN KEY (source_id) REFERENCES source_registry (id),
  CONSTRAINT fk_official_advisory_snapshot FOREIGN KEY (snapshot_id) REFERENCES source_snapshot (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE risk_assessment (
  id VARCHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  barangay VARCHAR(128) NULL,
  ruleset_version VARCHAR(64) NOT NULL,
  inputs_json LONGTEXT NOT NULL,
  score DECIMAL(8,2) NULL,
  display_state VARCHAR(32) NOT NULL,
  publication_state VARCHAR(32) NOT NULL DEFAULT 'internal_only',
  computed_at DATETIME(6) NOT NULL,
  published_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  KEY ix_risk_assessment_barangay (barangay)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE alembic_version (
  version_num VARCHAR(32) NOT NULL,
  PRIMARY KEY (version_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO alembic_version (version_num) VALUES ('005_phase_b_conditions');
