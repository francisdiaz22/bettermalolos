from __future__ import annotations

import sys
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from app.config import get_settings
from app.services.snapshot_store import (
    check_snapshot_storage,
    compress_snapshot,
    compute_hash,
    enforce_database_quota,
    load_snapshot,
    store_raw_snapshot,
)


def _set_s3(monkeypatch: pytest.MonkeyPatch, bucket: str = "private-bantay-snapshots") -> None:
    monkeypatch.setenv("STORAGE_BACKEND", "s3")
    monkeypatch.setenv("S3_BUCKET", bucket)
    monkeypatch.setenv("S3_ENDPOINT_URL", "https://objects.example.test")
    monkeypatch.setenv("S3_REGION", "ap-southeast-1")
    monkeypatch.setenv("S3_ACCESS_KEY_ID", "test-key")
    monkeypatch.setenv("S3_SECRET_ACCESS_KEY", "test-secret")
    get_settings.cache_clear()


def test_s3_store_and_load_round_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_s3(monkeypatch)
    content = b"<html><body>snapshot</body></html>"
    client = MagicMock()
    client.get_object.return_value = {"Body": BytesIO(content)}
    client_factory = MagicMock(return_value=client)
    fake_boto3 = SimpleNamespace(client=client_factory)

    with patch.dict(sys.modules, {"boto3": fake_boto3}):
        object_key, content_hash = store_raw_snapshot("pdrrmo", content, "text/html")
        assert object_key.startswith("s3://private-bantay-snapshots/pdrrmo/")
        assert object_key.endswith(f"/{compute_hash(content)}.html")
        assert content_hash == compute_hash(content)
        put = client.put_object.call_args.kwargs
        assert put["Bucket"] == "private-bantay-snapshots"
        assert put["Body"] == content
        assert put["ContentType"] == "text/html"
        assert put["Metadata"] == {"sha256": content_hash}

        assert load_snapshot(object_key) == content
        get = client.get_object.call_args.kwargs
        assert get["Bucket"] == "private-bantay-snapshots"
        assert get["Key"] == put["Key"]
        assert client_factory.call_count == 2

        check_snapshot_storage()
        client.head_bucket.assert_called_once_with(Bucket="private-bantay-snapshots")

    get_settings.cache_clear()


def test_s3_backend_requires_bucket(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_s3(monkeypatch, bucket="")
    with pytest.raises(RuntimeError, match="S3_BUCKET"):
        store_raw_snapshot("pdrrmo", b"snapshot", "text/plain")
    get_settings.cache_clear()


def test_database_compression_is_deterministic_and_bounded(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("STORAGE_BACKEND", "database")
    monkeypatch.setenv("SNAPSHOT_MAX_RAW_BYTES", "32")
    monkeypatch.setenv("SNAPSHOT_MAX_COMPRESSED_BYTES", "128")
    get_settings.cache_clear()

    content = b"same auditable body"
    assert compress_snapshot(content) == compress_snapshot(content)
    with pytest.raises(ValueError, match="raw body"):
        compress_snapshot(b"x" * 33)
    with pytest.raises(RuntimeError, match="atomically"):
        store_raw_snapshot("pdrrmo", content, "text/plain")

    get_settings.cache_clear()


def test_database_quota_fails_before_insert(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SNAPSHOT_DATABASE_QUOTA_BYTES", "100")
    get_settings.cache_clear()
    db = MagicMock()
    db.scalar.return_value = 90
    with pytest.raises(RuntimeError, match="quota would be exceeded"):
        enforce_database_quota(db, 11)
    enforce_database_quota(db, 10)
    get_settings.cache_clear()
