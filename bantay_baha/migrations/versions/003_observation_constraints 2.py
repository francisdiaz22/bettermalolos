"""observation constraints — supersedes_id + partial unique index

Revision ID: 003_observation_constraints
Revises: 002_source_acceptance
Create Date: 2026-09-02
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "003_observation_constraints"
down_revision: str | None = "002_source_acceptance"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Partial unique index to protect against concurrent duplicate inserts on active observations
    # Only where quality_state != 'superseded' and observed_at IS NOT NULL
    # SQLite supports partial indexes; Postgres does too.
    # Use raw SQL for portability across alembic versions
    if op.get_bind().dialect.name in {"mysql", "mariadb"}:
        # MariaDB/MySQL do not implement partial indexes. Revision 004 adds a
        # nullable active-key uniqueness constraint instead.
        return
    try:
        op.create_index(
            "uq_observation_active",
            "observation",
            ["station_id", "metric", "observed_at"],
            unique=True,
            sqlite_where=sa.text("quality_state != 'superseded' AND observed_at IS NOT NULL"),
            postgresql_where=sa.text("quality_state != 'superseded' AND observed_at IS NOT NULL"),
        )
    except TypeError:
        # Fallback for alembic that doesn't support sqlite_where/postgresql_where
        op.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS uq_observation_active ON observation (station_id, metric, observed_at) WHERE quality_state != 'superseded' AND observed_at IS NOT NULL"))


def downgrade() -> None:
    op.drop_index("uq_observation_active", table_name="observation")
