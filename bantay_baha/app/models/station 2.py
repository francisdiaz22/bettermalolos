from __future__ import annotations

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, uuid_pk


class Station(Base, TimestampMixin):
    __tablename__ = "station"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    source_id: Mapped[str] = mapped_column(String(36), ForeignKey("source_registry.id"), nullable=False, index=True)
    source_station_id: Mapped[str] = mapped_column(String(256), nullable=False)  # canonical within source
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    kind: Mapped[str] = mapped_column(String(64), nullable=False)  # rainfall, river, dam, tide
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string for thresholds etc

    source: Mapped[SourceRegistry] = relationship(back_populates="stations")  # type: ignore[name-defined]
    observations: Mapped[list[Observation]] = relationship(back_populates="station", cascade="all, delete-orphan")  # type: ignore[name-defined]

    __table_args__ = (  # type: ignore[var-annotated]
        # Unique within source
        # Will be enforced via UniqueConstraint in migration
        {},
    )
