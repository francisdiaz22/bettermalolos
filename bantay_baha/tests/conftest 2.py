import os
import tempfile
from pathlib import Path

import pytest

# Force test mode before any app import
os.environ["APP_ENV"] = "test"
os.environ["OPS_API_TOKEN"] = ""

# Use a temp file for sqlite so tests share state across factories but are isolated per run
@pytest.fixture(scope="session", autouse=True)
def setup_db():
    external_test_url = os.getenv("TEST_DATABASE_URL")
    tmp = None
    if external_test_url:
        db_url = external_test_url
    else:
        tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        tmp.close()
        db_url = f"sqlite:///{tmp.name}"
    os.environ["DATABASE_URL"] = db_url
    os.environ["STORAGE_BACKEND"] = "database"
    os.environ["SNAPSHOT_DIR"] = tempfile.mkdtemp(prefix="bantay_snapshots_")
    # reset engine cache after env override
    from app.database import Base, engine, reset_engine

    reset_engine()
    Base.metadata.drop_all(bind=engine())
    Base.metadata.create_all(bind=engine())
    yield
    # cleanup
    Base.metadata.drop_all(bind=engine())
    if tmp is not None:
        Path(tmp.name).unlink(missing_ok=True)
