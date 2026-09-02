from __future__ import annotations

import hashlib
import random
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol

import httpx

from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class FetchResult:
    content: bytes
    status_code: int
    content_type: str | None
    headers: dict
    url: str
    fetched_at: datetime


class Collector(Protocol):
    name: str

    def fetch(self) -> FetchResult:
        ...

    def collect_and_store(self, db) -> dict:  # type: ignore[no-untyped-def]
        ...


def fetch_with_retries(url: str, headers: dict | None = None) -> FetchResult:
    settings = get_settings()
    base_headers = {
        "User-Agent": settings.collector_user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    if headers:
        base_headers.update(headers)
    timeout = httpx.Timeout(settings.http_timeout_seconds, read=settings.http_timeout_seconds)
    last_exc: Exception | None = None
    for attempt in range(settings.http_max_retries + 1):
        try:
            with httpx.Client(timeout=timeout, follow_redirects=True, headers=base_headers) as client:
                # conditional request headers could be added here if we store etag/last-modified per source
                resp = client.get(url)
                fetched_at = datetime.now(UTC)
                # raise for status? No — we persist even error bodies but caller checks status
                return FetchResult(
                    content=resp.content,
                    status_code=resp.status_code,
                    content_type=resp.headers.get("content-type"),
                    headers=dict(resp.headers),
                    url=str(resp.url),
                    fetched_at=fetched_at,
                )
        except Exception as e:
            last_exc = e
            logger.warning("fetch attempt failed", url=url, attempt=attempt, error=str(e))
            if attempt < settings.http_max_retries:
                sleep = (2**attempt) + random.uniform(0, 0.5)
                time.sleep(sleep)
    raise RuntimeError(f"Failed to fetch {url} after retries") from last_exc


def content_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()
