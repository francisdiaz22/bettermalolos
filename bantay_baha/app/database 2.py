from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _connect_args(url: str) -> dict:
    # SQLite needs check_same_thread=False for FastAPI threading
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


def get_engine():
    settings = get_settings()
    kwargs = {
        "connect_args": _connect_args(settings.database_url),
        "pool_pre_ping": True,
        "echo": False,
    }
    if settings.database_url.startswith(("mysql", "mariadb")):
        # Shared-host connections can be closed while idle. Recycling plus pre-ping
        # avoids handing a stale socket to a scheduled collector.
        kwargs["pool_recycle"] = 280
    return create_engine(settings.database_url, **kwargs)  # type: ignore[arg-type]


_engine = None
_SessionLocal = None


def engine():
    global _engine
    if _engine is None:
        _engine = get_engine()
    return _engine


def session_local() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=engine(), autocommit=False, autoflush=False)
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = session_local()()
    try:
        yield db
    finally:
        db.close()


def reset_engine() -> None:
    """For tests to reset cached engine after env override."""
    global _engine, _SessionLocal
    _engine = None
    _SessionLocal = None
