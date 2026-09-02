"""source acceptance fields — PDRRMO checklist

Revision ID: 002_source_acceptance
Revises: 001_initial
Create Date: 2026-09-02
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "002_source_acceptance"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("source_registry", sa.Column("terms_url", sa.Text(), nullable=True))
    op.add_column("source_registry", sa.Column("licensing_terms", sa.Text(), nullable=True))
    op.add_column("source_registry", sa.Column("robots_txt", sa.Text(), nullable=True))
    op.add_column("source_registry", sa.Column("expected_update_frequency", sa.String(length=128), nullable=True))
    op.add_column("source_registry", sa.Column("maintainer_name", sa.String(length=128), nullable=True))
    op.add_column("source_registry", sa.Column("maintainer_contact", sa.String(length=256), nullable=True))
    op.add_column("source_registry", sa.Column("second_reviewer", sa.String(length=128), nullable=True))
    op.add_column("source_registry", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("source_registry", sa.Column("range_policy_json", sa.Text(), nullable=True))
    op.add_column("source_registry", sa.Column("last_etag", sa.Text(), nullable=True))
    op.add_column("source_registry", sa.Column("last_modified", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("source_registry", "last_modified")
    op.drop_column("source_registry", "last_etag")
    op.drop_column("source_registry", "range_policy_json")
    op.drop_column("source_registry", "approved_at")
    op.drop_column("source_registry", "second_reviewer")
    op.drop_column("source_registry", "maintainer_contact")
    op.drop_column("source_registry", "maintainer_name")
    op.drop_column("source_registry", "expected_update_frequency")
    op.drop_column("source_registry", "robots_txt")
    op.drop_column("source_registry", "licensing_terms")
    op.drop_column("source_registry", "terms_url")
