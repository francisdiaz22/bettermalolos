from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: Literal["development", "test", "staging", "production"] = Field(default="development")
    log_level: str = Field(default="INFO")
    database_url: str = Field(default="sqlite:///./bantay_baha.db", alias="DATABASE_URL")
    snapshot_dir: Path = Field(default=Path("./storage/snapshots"), alias="SNAPSHOT_DIR")
    storage_backend: Literal["database", "local", "s3"] = Field(default="database", alias="STORAGE_BACKEND")
    snapshot_max_raw_bytes: int = Field(default=2_000_000, alias="SNAPSHOT_MAX_RAW_BYTES")
    snapshot_max_compressed_bytes: int = Field(default=1_000_000, alias="SNAPSHOT_MAX_COMPRESSED_BYTES")
    snapshot_database_quota_bytes: int = Field(default=250_000_000, alias="SNAPSHOT_DATABASE_QUOTA_BYTES")
    s3_bucket: str | None = Field(default=None, alias="S3_BUCKET")
    s3_endpoint_url: str | None = Field(default=None, alias="S3_ENDPOINT_URL")
    s3_access_key_id: str | None = Field(default=None, alias="S3_ACCESS_KEY_ID")
    s3_secret_access_key: str | None = Field(default=None, alias="S3_SECRET_ACCESS_KEY")
    s3_region: str | None = Field(default=None, alias="S3_REGION")

    cors_allow_origins: str | list[str] = Field(
        default="https://bettermalolos.org,http://localhost:8000", alias="CORS_ALLOW_ORIGINS"
    )
    ops_api_token: str | None = Field(default=None, alias="OPS_API_TOKEN")

    pdrrmo_url: str = Field(default="https://pdrrmo.bulacan.gov.ph/", alias="PDRRMO_URL")
    pdrrmo_enabled: bool = Field(default=False, alias="PDRRMO_ENABLED")
    pdrrmo_cadence_minutes: int = Field(default=30, alias="PDRRMO_CADENCE_MINUTES")

    collector_user_agent: str = Field(
        default="BantayBaha/0.1 (+https://bettermalolos.org/bantay-baha; contact: ops@bettermalolos.org)",
        alias="COLLECTOR_USER_AGENT",
    )
    http_timeout_seconds: int = Field(default=15, alias="HTTP_TIMEOUT_SECONDS")
    http_max_retries: int = Field(default=2, alias="HTTP_MAX_RETRIES")

    freshness_warning_minutes: int = Field(default=45, alias="FRESHNESS_WARNING_MINUTES")
    freshness_critical_minutes: int = Field(default=90, alias="FRESHNESS_CRITICAL_MINUTES")
    tide_warning_hours: int = Field(default=36, alias="TIDE_WARNING_HOURS")
    tide_critical_hours: int = Field(default=72, alias="TIDE_CRITICAL_HOURS")

    @field_validator("cors_allow_origins", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @field_validator("snapshot_dir", mode="before")
    @classmethod
    def parse_path(cls, v: str | Path) -> Path:
        return Path(v) if isinstance(v, str) else v

    def is_test(self) -> bool:
        return self.app_env == "test" or "pytest" in os.getenv("_", "")

    @field_validator(
        "snapshot_max_raw_bytes",
        "snapshot_max_compressed_bytes",
        "snapshot_database_quota_bytes",
    )
    @classmethod
    def positive_storage_limit(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("snapshot storage limits must be positive")
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
