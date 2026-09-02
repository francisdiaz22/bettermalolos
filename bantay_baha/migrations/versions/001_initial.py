"""initial foundations — source_registry, snapshot, station, observation, audit_log

Revision ID: 001_initial
Revises:
Create Date: 2026-09-02
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "source_registry",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("canonical_url", sa.Text(), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("cadence_minutes", sa.Integer(), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("terms_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("publisher", sa.String(length=128), nullable=True),
        sa.Column("owner", sa.String(length=128), nullable=True),
        sa.Column("freshness_warning_minutes", sa.Integer(), nullable=True),
        sa.Column("freshness_critical_minutes", sa.Integer(), nullable=True),
        sa.Column("parser_version", sa.String(length=32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "source_snapshot",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_id", sa.String(length=36), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("http_status", sa.Integer(), nullable=False),
        sa.Column("content_hash", sa.String(length=128), nullable=False),
        sa.Column("object_key", sa.Text(), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=True),
        sa.Column("parser_version", sa.String(length=32), nullable=False),
        sa.Column("content_length", sa.Integer(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["source_id"], ["source_registry.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_source_snapshot_source_id", "source_snapshot", ["source_id"])
    op.create_index("ix_source_snapshot_content_hash", "source_snapshot", ["content_hash"])

    op.create_table(
        "station",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_id", sa.String(length=36), nullable=False),
        sa.Column("source_station_id", sa.String(length=256), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["source_id"], ["source_registry.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_id", "source_station_id", name="uq_station_source"),
    )
    op.create_index("ix_station_source_id", "station", ["source_id"])

    op.create_table(
        "observation",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("station_id", sa.String(length=36), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), nullable=False),
        sa.Column("metric", sa.String(length=64), nullable=False),
        sa.Column("value", sa.Numeric(precision=12, scale=3), nullable=True),
        sa.Column("unit", sa.String(length=32), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("parser_version", sa.String(length=32), nullable=False),
        sa.Column("quality_state", sa.String(length=32), nullable=False),
        sa.Column("thresholds_json", sa.Text(), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("supersedes_id", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["snapshot_id"], ["source_snapshot.id"]),
        sa.ForeignKeyConstraint(["station_id"], ["station.id"]),
        sa.ForeignKeyConstraint(["supersedes_id"], ["observation.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_observation_station_id", "observation", ["station_id"])
    op.create_index("ix_observation_snapshot_id", "observation", ["snapshot_id"])
    op.create_index("ix_observation_observed_at", "observation", ["observed_at"])
    # Unique on station, metric, observed time, source — enforced via superseded logic; add partial index if needed

    op.create_table(
        "audit_log",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actor", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=36), nullable=True),
        sa.Column("before", sa.Text(), nullable=True),
        sa.Column("after", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_index("ix_observation_observed_at", table_name="observation")
    op.drop_index("ix_observation_snapshot_id", table_name="observation")
    op.drop_index("ix_observation_station_id", table_name="observation")
    op.drop_table("observation")
    op.drop_index("ix_station_source_id", table_name="station")
    op.drop_table("station")
    op.drop_index("ix_source_snapshot_content_hash", table_name="source_snapshot")
    op.drop_index("ix_source_snapshot_source_id", table_name="source_snapshot")
    op.drop_table("source_snapshot")
    op.drop_table("source_registry")
