from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, utcnow, uuid_pk


class ObservationMapping(Base, TimestampMixin):
    """Reviewed allow-list from a concrete source measurement to a public field."""

    __tablename__ = "observation_mapping"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    public_field: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String(36), ForeignKey("source_registry.id"), nullable=False)
    source_station_id: Mapped[str] = mapped_column(String(256), nullable=False)
    metric: Mapped[str] = mapped_column(String(64), nullable=False)
    unit_datum: Mapped[str | None] = mapped_column(String(128), nullable=True)
    geographic_scope: Mapped[str] = mapped_column(Text, nullable=False)
    aggregation_period: Mapped[str] = mapped_column(String(128), nullable=False)
    timestamp_semantics: Mapped[str] = mapped_column(String(256), nullable=False)
    threshold_semantics: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # primary | fallback
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    mapping_version: Mapped[str] = mapped_column(String(64), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    reviewed_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class ConditionSelection(Base, TimestampMixin):
    """Immutable explanation of a condition resolver decision."""

    __tablename__ = "condition_selection"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    public_field: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    selected_observation_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("observation.id"), nullable=True)
    historical_observation_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("observation.id"), nullable=True)
    candidate_observation_ids_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    mapping_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    selection_state: Mapped[str] = mapped_column(String(32), nullable=False)
    selection_reason: Mapped[str] = mapped_column(String(64), nullable=False)
    computed_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, nullable=False)


class OfficialAdvisory(Base, TimestampMixin):
    __tablename__ = "official_advisory"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    source_id: Mapped[str] = mapped_column(String(36), ForeignKey("source_registry.id"), nullable=False, index=True)
    snapshot_id: Mapped[str] = mapped_column(String(36), ForeignKey("source_snapshot.id"), nullable=False, index=True)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    issued_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[str | None] = mapped_column(String(64), nullable=True)
    areas_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    structured_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction_confidence: Mapped[str] = mapped_column(String(16), nullable=False, default="low")


class RiskAssessment(Base, TimestampMixin):
    __tablename__ = "risk_assessment"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    barangay: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    ruleset_version: Mapped[str] = mapped_column(String(64), nullable=False)
    inputs_json: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    display_state: Mapped[str] = mapped_column(String(32), nullable=False)
    publication_state: Mapped[str] = mapped_column(String(32), nullable=False, default="internal_only")
    computed_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
