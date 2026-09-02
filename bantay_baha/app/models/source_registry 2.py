from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, uuid_pk


class SourceRegistry(Base, TimestampMixin):
    __tablename__ = "source_registry"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    canonical_url: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g., hydrology, tide
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    cadence_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Manila", nullable=False)
    terms_reviewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    terms_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    licensing_terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    robots_txt: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_update_frequency: Mapped[str | None] = mapped_column(String(128), nullable=True)
    maintainer_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    maintainer_contact: Mapped[str | None] = mapped_column(String(256), nullable=True)
    second_reviewer: Mapped[str | None] = mapped_column(String(128), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    range_policy_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_etag: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_modified: Mapped[str | None] = mapped_column(Text, nullable=True)
    publisher: Mapped[str | None] = mapped_column(String(128), nullable=True)
    owner: Mapped[str | None] = mapped_column(String(128), nullable=True)
    freshness_warning_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    freshness_critical_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parser_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    snapshots: Mapped[list[SourceSnapshot]] = relationship(back_populates="source", cascade="all, delete-orphan")  # type: ignore[name-defined]
    stations: Mapped[list[Station]] = relationship(back_populates="source", cascade="all, delete-orphan")  # type: ignore[name-defined]
