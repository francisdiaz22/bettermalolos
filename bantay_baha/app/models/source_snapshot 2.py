from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.dialects.mysql import MEDIUMBLOB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UTCDateTime, utcnow, uuid_pk

snapshot_blob_type = LargeBinary().with_variant(MEDIUMBLOB(), "mysql").with_variant(MEDIUMBLOB(), "mariadb")


class SourceSnapshot(Base, TimestampMixin):
    __tablename__ = "source_snapshot"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    source_id: Mapped[str] = mapped_column(String(36), ForeignKey("source_registry.id"), nullable=False, index=True)
    fetched_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, nullable=False)
    http_status: Mapped[int] = mapped_column(Integer, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    object_key: Mapped[str] = mapped_column(Text, nullable=False)  # path or S3 key
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    parser_version: Mapped[str] = mapped_column(String(32), nullable=False)
    content_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    compressed_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    compression: Mapped[str | None] = mapped_column(String(16), nullable=True)
    raw_body_gzip: Mapped[bytes | None] = mapped_column(snapshot_blob_type, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    source: Mapped[SourceRegistry] = relationship(back_populates="snapshots")  # type: ignore[name-defined]
    observations: Mapped[list[Observation]] = relationship(back_populates="snapshot")  # type: ignore[name-defined]
