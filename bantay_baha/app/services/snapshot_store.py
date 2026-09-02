from __future__ import annotations

import gzip
import hashlib
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any
from urllib.parse import urlparse

from sqlalchemy import func, select

from app.config import get_settings

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.models import SourceSnapshot


def _s3_client() -> Any:
    settings = get_settings()
    import boto3

    client_kwargs: dict[str, str] = {}
    if settings.s3_endpoint_url:
        client_kwargs["endpoint_url"] = settings.s3_endpoint_url
    if settings.s3_region:
        client_kwargs["region_name"] = settings.s3_region
    if settings.s3_access_key_id:
        client_kwargs["aws_access_key_id"] = settings.s3_access_key_id
    if settings.s3_secret_access_key:
        client_kwargs["aws_secret_access_key"] = settings.s3_secret_access_key
    return boto3.client("s3", **client_kwargs)


def compute_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def compress_snapshot(content: bytes) -> bytes:
    """Validate and deterministically gzip a raw response for database storage."""
    settings = get_settings()
    if len(content) > settings.snapshot_max_raw_bytes:
        raise ValueError(
            f"snapshot raw body is {len(content)} bytes; limit is {settings.snapshot_max_raw_bytes}"
        )
    compressed = gzip.compress(content, compresslevel=6, mtime=0)
    if len(compressed) > settings.snapshot_max_compressed_bytes:
        raise ValueError(
            f"snapshot gzip body is {len(compressed)} bytes; limit is {settings.snapshot_max_compressed_bytes}"
        )
    return compressed


def database_snapshot_usage(db: Session) -> int:
    """Return the tracked compressed-body bytes currently stored in the database."""
    from app.models import SourceSnapshot

    return int(db.scalar(select(func.coalesce(func.sum(SourceSnapshot.compressed_length), 0))) or 0)


def enforce_database_quota(db: Session, incoming_compressed_bytes: int) -> None:
    settings = get_settings()
    projected = database_snapshot_usage(db) + incoming_compressed_bytes
    if projected > settings.snapshot_database_quota_bytes:
        raise RuntimeError(
            f"snapshot database quota would be exceeded: {projected} > "
            f"{settings.snapshot_database_quota_bytes} bytes"
        )


def store_raw_snapshot(source_name: str, content: bytes, content_type: str | None = None) -> tuple[str, str]:
    """
    Persist raw bytes to the configured local filesystem or S3-compatible store.
    Returns (object_key, content_hash).
    """
    settings = get_settings()
    if settings.storage_backend == "database":
        raise RuntimeError("database snapshots must be persisted atomically with SourceSnapshot metadata")
    chash = compute_hash(content)
    now = datetime.now(UTC)
    # Preserve extension from content_type hint.
    ext = ".html" if content_type and "html" in content_type else ".bin"
    if content.startswith(b"<!doctype") or content.startswith(b"<!DOCTYPE") or b"<html" in content[:2048].lower():
        ext = ".html"
    relative_key = f"{source_name}/{now:%Y/%m/%d}/{chash}{ext}"

    if settings.storage_backend == "s3":
        if not settings.s3_bucket:
            raise RuntimeError("S3_BUCKET is required when STORAGE_BACKEND=s3")
        client = _s3_client()
        put_kwargs: dict[str, object] = {
            "Bucket": settings.s3_bucket,
            "Key": relative_key,
            "Body": content,
            "Metadata": {"sha256": chash},
        }
        if content_type:
            put_kwargs["ContentType"] = content_type
        client.put_object(**put_kwargs)
        return f"s3://{settings.s3_bucket}/{relative_key}", chash

    # e.g., storage/snapshots/pdrrmo/2026/09/02/<hash>.html
    subdir = settings.snapshot_dir / source_name / now.strftime("%Y/%m/%d")
    subdir.mkdir(parents=True, exist_ok=True)
    object_key = str(subdir / f"{chash}{ext}")
    path = Path(object_key)
    if not path.exists():
        path.write_bytes(content)
    return object_key, chash


def load_snapshot(snapshot: SourceSnapshot | str) -> bytes:
    if not isinstance(snapshot, str):
        if snapshot.raw_body_gzip is not None:
            if snapshot.compression != "gzip":
                raise ValueError(f"unsupported snapshot compression: {snapshot.compression}")
            content = gzip.decompress(snapshot.raw_body_gzip)
            if compute_hash(content) != snapshot.content_hash:
                raise ValueError(f"snapshot hash mismatch: {snapshot.id}")
            return content
        object_key = snapshot.object_key
    else:
        object_key = snapshot
    if object_key.startswith("s3://"):
        parsed = urlparse(object_key)
        bucket = parsed.netloc
        key = parsed.path.lstrip("/")
        if not bucket or not key:
            raise ValueError(f"Invalid S3 snapshot key: {object_key}")
        response = _s3_client().get_object(Bucket=bucket, Key=key)
        return response["Body"].read()  # type: ignore[no-any-return]
    return Path(object_key).read_bytes()


def check_snapshot_storage(db: Session | None = None) -> None:
    """Raise when the configured snapshot backend is unavailable or incomplete."""
    settings = get_settings()
    if settings.storage_backend == "database":
        if db is None:
            raise RuntimeError("database session is required for database snapshot readiness")
        usage = database_snapshot_usage(db)
        if usage > settings.snapshot_database_quota_bytes:
            raise RuntimeError(
                f"snapshot database quota exceeded: {usage} > {settings.snapshot_database_quota_bytes} bytes"
            )
        return
    if settings.storage_backend == "s3":
        if not settings.s3_bucket:
            raise RuntimeError("S3_BUCKET is required when STORAGE_BACKEND=s3")
        _s3_client().head_bucket(Bucket=settings.s3_bucket)
        return
    settings.snapshot_dir.mkdir(parents=True, exist_ok=True)
    test_file = settings.snapshot_dir / ".healthcheck"
    test_file.write_text("ok")
    test_file.unlink(missing_ok=True)
