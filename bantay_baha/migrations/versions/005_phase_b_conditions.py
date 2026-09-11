"""Phase B mappings, selections, advisories, and internal assessments.

Revision ID: 005_phase_b_conditions
Revises: 004_mariadb_snapshots
Create Date: 2026-09-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "005_phase_b_conditions"
down_revision: str | None = "004_mariadb_snapshots"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("observation", sa.Column("source_published_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "observation_mapping",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("public_field", sa.String(128), nullable=False),
        sa.Column("source_id", sa.String(36), sa.ForeignKey("source_registry.id"), nullable=False),
        sa.Column("source_station_id", sa.String(256), nullable=False),
        sa.Column("metric", sa.String(64), nullable=False),
        sa.Column("unit_datum", sa.String(128)),
        sa.Column("geographic_scope", sa.Text, nullable=False),
        sa.Column("aggregation_period", sa.String(128), nullable=False),
        sa.Column("timestamp_semantics", sa.String(256), nullable=False),
        sa.Column("threshold_semantics", sa.Text),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("priority", sa.Integer, nullable=False, server_default="100"),
        sa.Column("mapping_version", sa.String(64), nullable=False),
        sa.Column("rationale", sa.Text, nullable=False),
        sa.Column("reviewed_by", sa.String(128)),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_observation_mapping_public_field", "observation_mapping", ["public_field"])
    op.create_table(
        "condition_selection",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("public_field", sa.String(128), nullable=False),
        sa.Column("selected_observation_id", sa.String(36), sa.ForeignKey("observation.id")),
        sa.Column("historical_observation_id", sa.String(36), sa.ForeignKey("observation.id")),
        sa.Column("candidate_observation_ids_json", sa.Text, nullable=False),
        sa.Column("mapping_version", sa.String(64)),
        sa.Column("selection_state", sa.String(32), nullable=False),
        sa.Column("selection_reason", sa.String(64), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_condition_selection_public_field", "condition_selection", ["public_field"])
    op.create_table(
        "official_advisory",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("source_id", sa.String(36), sa.ForeignKey("source_registry.id"), nullable=False),
        sa.Column("snapshot_id", sa.String(36), sa.ForeignKey("source_snapshot.id"), nullable=False),
        sa.Column("source_url", sa.Text, nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True)),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("raw_text", sa.Text, nullable=False),
        sa.Column("level", sa.String(64)),
        sa.Column("areas_json", sa.Text, nullable=False),
        sa.Column("structured_json", sa.Text),
        sa.Column("extraction_confidence", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_official_advisory_source_id", "official_advisory", ["source_id"])
    op.create_index("ix_official_advisory_snapshot_id", "official_advisory", ["snapshot_id"])
    op.create_table(
        "risk_assessment",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("barangay", sa.String(128)),
        sa.Column("ruleset_version", sa.String(64), nullable=False),
        sa.Column("inputs_json", sa.Text, nullable=False),
        sa.Column("score", sa.Numeric(8, 2)),
        sa.Column("display_state", sa.String(32), nullable=False),
        sa.Column("publication_state", sa.String(32), nullable=False, server_default="internal_only"),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_risk_assessment_barangay", "risk_assessment", ["barangay"])


def downgrade() -> None:
    op.drop_table("risk_assessment")
    op.drop_table("official_advisory")
    op.drop_table("condition_selection")
    op.drop_table("observation_mapping")
    op.drop_column("observation", "source_published_at")
