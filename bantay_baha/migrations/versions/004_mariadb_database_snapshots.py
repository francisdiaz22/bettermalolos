"""MariaDB-compatible observation uniqueness and database snapshot bodies.

Revision ID: 004_mariadb_snapshots
Revises: 003_observation_constraints
Create Date: 2026-09-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import context, op
from sqlalchemy.dialects.mysql import MEDIUMBLOB

revision: str = "004_mariadb_snapshots"
down_revision: str | None = "003_observation_constraints"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_index(table: str, name: str) -> bool:
    if context.is_offline_mode():
        return False
    inspector = sa.inspect(op.get_bind())
    return any(index["name"] == name for index in inspector.get_indexes(table))


def upgrade() -> None:
    dialect = op.get_bind().dialect.name
    blob_type = MEDIUMBLOB() if dialect in {"mysql", "mariadb"} else sa.LargeBinary()

    if dialect == "sqlite":
        with op.batch_alter_table("observation") as batch:
            if _has_index("observation", "uq_observation_active"):
                batch.drop_index("uq_observation_active")
            batch.add_column(sa.Column("active_key", sa.String(length=64), nullable=True))
            batch.create_unique_constraint("uq_observation_active_key", ["active_key"])
        with op.batch_alter_table("source_snapshot") as batch:
            batch.add_column(sa.Column("compressed_length", sa.Integer(), nullable=True))
            batch.add_column(sa.Column("compression", sa.String(length=16), nullable=True))
            batch.add_column(sa.Column("raw_body_gzip", blob_type, nullable=True))
        return

    if _has_index("observation", "uq_observation_active"):
        op.drop_index("uq_observation_active", table_name="observation")
    op.add_column("observation", sa.Column("active_key", sa.String(length=64), nullable=True))
    op.create_unique_constraint("uq_observation_active_key", "observation", ["active_key"])
    op.add_column("source_snapshot", sa.Column("compressed_length", sa.Integer(), nullable=True))
    op.add_column("source_snapshot", sa.Column("compression", sa.String(length=16), nullable=True))
    op.add_column("source_snapshot", sa.Column("raw_body_gzip", blob_type, nullable=True))


def downgrade() -> None:
    dialect = op.get_bind().dialect.name
    if dialect == "sqlite":
        with op.batch_alter_table("source_snapshot") as batch:
            batch.drop_column("raw_body_gzip")
            batch.drop_column("compression")
            batch.drop_column("compressed_length")
        with op.batch_alter_table("observation") as batch:
            batch.drop_constraint("uq_observation_active_key", type_="unique")
            batch.drop_column("active_key")
        return

    op.drop_column("source_snapshot", "raw_body_gzip")
    op.drop_column("source_snapshot", "compression")
    op.drop_column("source_snapshot", "compressed_length")
    op.drop_constraint("uq_observation_active_key", "observation", type_="unique")
    op.drop_column("observation", "active_key")
