"""Contract: API responses must be versioned, have no PII, and handle auth."""

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app

client = TestClient(app)


def setup_module():
    Base.metadata.create_all(bind=engine())


def test_health_endpoints():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    r2 = client.get("/readiness")
    assert r2.status_code == 200
    assert "checks" in r2.json()
    assert "database" in r2.json()["checks"]


def test_ops_health_sources_requires_no_pii():
    # Without token, should succeed if OPS_API_TOKEN not set (dev mode) — but never leak PII
    r = client.get("/v1/ops/health/sources")
    assert r.status_code == 200
    body = r.json()
    assert "sources" in body
    # no PII fields like contact, IP, email
    text = r.text.lower()
    assert "phone" not in text
    assert "email" not in text or "ops@bettermalolos.org" in text  # allow contact in user-agent but not PII leak


def test_public_not_yet_exposed_returns_404():
    # Phase A has no public API yet — ensure public endpoints are not accidentally exposed
    r = client.get("/v1/public/status")
    assert r.status_code == 404


def test_snapshots_listing():
    r = client.get("/v1/ops/snapshots?limit=5")
    assert r.status_code == 200
    assert "snapshots" in r.json()
