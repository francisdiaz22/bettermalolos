"""Seed source_registry with approved sources."""
from __future__ import annotations

from app.config import get_settings
from app.database import Base, engine, session_local
from app.logging_config import get_logger
from app.models import SourceRegistry

logger = get_logger(__name__)


def seed():
    # ensure tables exist (for sqlite dev without alembic)
    Base.metadata.create_all(bind=engine())
    settings = get_settings()
    db = session_local()()
    try:
        import json
        existing = {r.name: r for r in db.query(SourceRegistry).all()}
        # PDRRMO hydrology source — source acceptance checklist per docs/plans/bantay-baha-python-automation.md:19
        # Do NOT manufacture approval timestamps here. Approval requires manual
        # verification of terms/permission, robots, and a named second reviewer
        # setting approved_at. Until then the source remains disabled/unapproved
        # and only synthetic/fixture collection is allowed.
        pdrrmo_terms_reviewed = None
        pdrrmo_approved_at = None
        pdrrmo_licensing = "Pending — permission/terms not yet confirmed; automated retrieval NOT approved. Complete source acceptance checklist before enabling."
        pdrrmo_robots = "Pending verification — do not enable scheduler until robots/terms are manually verified and recorded."
        pdrrmo_expected_freq = "Tide/dam/rainfall/river tables update multiple times daily during wet season; fallback daily health check in dry season."
        pdrrmo_range_policy = json.dumps(
            {
                "rainfall_mm": {"min": 0, "max": 500, "unit": "mm", "action": "flag out_of_range, do not discard"},
                "dam_level_m": {"min": 0, "max": 250, "unit": "m", "action": "flag out_of_range"},
                "river_level_m": {"min": -5, "max": 20, "unit": "m", "action": "flag out_of_range"},
                "tide_height_m": {"min": 0, "max": 10, "unit": "m", "action": "flag out_of_range"},
            }
        )
        pdrrmo_notes = "Tide, dam, rainfall (Barangay Look 1st etc.), flooding status, river stations (alert/alarm/critical). Source acceptance: canonical_url=https://pdrrmo.bulacan.gov.ph/, timezone=Asia/Manila, parser_version=1.0.0. AWAITING APPROVAL — set terms_reviewed_at, approved_at, licensing_terms, robots_txt, and second_reviewer (named reviewer) before enabling live fetch."
        if "pdrrmo" not in existing:
            src = SourceRegistry(
                name="pdrrmo",
                canonical_url=settings.pdrrmo_url,
                type="hydrology",
                enabled=False,
                cadence_minutes=settings.pdrrmo_cadence_minutes,
                timezone="Asia/Manila",
                publisher="Bulacan PDRRMO",
                owner="Bantay Baha ops",
                freshness_warning_minutes=settings.freshness_warning_minutes,
                freshness_critical_minutes=settings.freshness_critical_minutes,
                parser_version="1.0.0",
                terms_reviewed_at=pdrrmo_terms_reviewed,
                approved_at=pdrrmo_approved_at,
                terms_url="https://pdrrmo.bulacan.gov.ph/",
                licensing_terms=pdrrmo_licensing,
                robots_txt=pdrrmo_robots,
                expected_update_frequency=pdrrmo_expected_freq,
                maintainer_name="Bantay Baha ops",
                maintainer_contact="ops@bettermalolos.org",
                second_reviewer="pending",
                range_policy_json=pdrrmo_range_policy,
                notes=pdrrmo_notes,
            )
            db.add(src)
            logger.info("seeded pdrrmo source (unapproved — manual approval required)")
        else:
            # update URL/cadence if changed; backfill acceptance fields ONLY if null — do not auto-approve
            src = existing["pdrrmo"]
            src.canonical_url = settings.pdrrmo_url
            src.cadence_minutes = settings.pdrrmo_cadence_minutes
            src.publisher = src.publisher or "Bulacan PDRRMO"
            src.timezone = src.timezone or "Asia/Manila"
            # Do not synthesize terms_reviewed_at / approved_at / second_reviewer.
            # Leave them as-is so manual approval remains required.
            if src.terms_url is None:
                src.terms_url = "https://pdrrmo.bulacan.gov.ph/"
            if src.licensing_terms is None:
                src.licensing_terms = pdrrmo_licensing
            if src.robots_txt is None:
                src.robots_txt = pdrrmo_robots
            if src.expected_update_frequency is None:
                src.expected_update_frequency = pdrrmo_expected_freq
            if src.maintainer_name is None:
                src.maintainer_name = "Bantay Baha ops"
            if src.maintainer_contact is None:
                src.maintainer_contact = "ops@bettermalolos.org"
            if src.second_reviewer is None:
                src.second_reviewer = "pending"
            if src.range_policy_json is None:
                src.range_policy_json = pdrrmo_range_policy
            # Never auto-enable from env. Live fetch requires explicit DB approval:
            #   UPDATE source_registry SET enabled=true, terms_reviewed_at=now(), approved_at=now(), second_reviewer='<name>', licensing_terms='<confirmed>' WHERE name='pdrrmo';
            # The PDRRMO_ENABLED env is intentionally ignored here.
            logger.info("pdrrmo source already exists — updated URL/cadence (approval remains pending if not manually set)")
        db.commit()
        # print
        for r in db.query(SourceRegistry).all():
            print(f"{r.name}: {r.canonical_url} enabled={r.enabled} cadence={r.cadence_minutes}m terms_reviewed={r.terms_reviewed_at}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
