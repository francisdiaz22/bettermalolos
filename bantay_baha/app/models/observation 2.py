from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, uuid_pk
from app.models.enums import ObservationQuality


class Observation(Base, TimestampMixin):
    __tablename__ = "observation"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    station_id: Mapped[str] = mapped_column(String(36), ForeignKey("station.id"), nullable=False, index=True)
    snapshot_id: Mapped[str] = mapped_column(String(36), ForeignKey("source_snapshot.id"), nullable=False, index=True)
    metric: Mapped[str] = mapped_column(String(64), nullable=False)  # rainfall, river_level, dam_level, tide_height, flood_level
    value: Mapped[Decimal | None] = mapped_column(Numeric(12, 3), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    observed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True, index=True)
    fetched_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    parser_version: Mapped[str] = mapped_column(String(32), nullable=False)
    quality_state: Mapped[str] = mapped_column(String(32), default=ObservationQuality.valid.value, nullable=False)
    thresholds_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON for alert/alarm/critical
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    supersedes_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("observation.id"), nullable=True)
    active_key: Mapped[str | None] = mapped_column(String(64), nullable=True)

    station: Mapped[Station] = relationship(back_populates="observations")  # type: ignore[name-defined]
    snapshot: Mapped[SourceSnapshot] = relationship(back_populates="observations")  # type: ignore[name-defined]

    __table_args__ = (UniqueConstraint("active_key", name="uq_observation_active_key"),)


def observation_active_key(station_id: str, metric: str, observed_at: datetime | None) -> str | None:
    """Build a portable active-row key for MariaDB, which lacks partial indexes."""
    if observed_at is None:
        return None
    normalized = observed_at.astimezone(UTC) if observed_at.tzinfo else observed_at.replace(tzinfo=UTC)
    material = f"{station_id}\x1f{metric}\x1f{normalized.isoformat(timespec='microseconds')}".encode()
    return hashlib.sha256(material).hexdigest()
