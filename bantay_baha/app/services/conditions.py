"""Explicit mapping resolver and internal-only deterministic risk assessment."""
from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any, cast

from sqlalchemy.orm import Session

from app.models import ConditionSelection, Observation, ObservationMapping, RiskAssessment, SourceRegistry, Station
from app.models.enums import ConditionSelectionState, FreshnessState, Indicator, ObservationQuality, PublicationState
from app.services.freshness import compute_freshness

RULESET_PATH = Path(__file__).parents[1] / "data" / "risk_ruleset.v1.json"


def _instant(observation: Observation) -> datetime | None:
    return observation.source_published_at or observation.observed_at


def _freshness(observation: Observation, source: SourceRegistry, now: datetime) -> FreshnessState:
    return compute_freshness(
        _instant(observation),
        observation.fetched_at,
        timedelta(minutes=source.freshness_warning_minutes or 45),
        timedelta(minutes=source.freshness_critical_minutes or 90),
        now=now,
    )


def _approved_mapping(mapping: ObservationMapping) -> bool:
    return bool(mapping.enabled and mapping.reviewed_at and (mapping.reviewed_by or "").strip())


def select_condition(db: Session, public_field: str, now: datetime | None = None) -> ConditionSelection:
    """Resolve a field strictly through reviewed mapping rows and write an audit record.

    The resolver never uses nearby stations, generic source priorities, or values
    with only a matching metric. A stale primary is retained only as historical
    evidence and cannot become ``selected_observation_id``.
    """
    now = now or datetime.now(UTC)
    mappings = db.query(ObservationMapping).filter(ObservationMapping.public_field == public_field).all()
    approved = [mapping for mapping in mappings if _approved_mapping(mapping)]
    candidates: list[tuple[Observation, ObservationMapping, SourceRegistry]] = []
    historical: tuple[Observation, ObservationMapping] | None = None
    for mapping in approved:
        source = db.get(SourceRegistry, mapping.source_id)
        if source is None or not source.enabled:
            continue
        observations = (
            db.query(Observation)
            .join(Station, Observation.station_id == Station.id)
            .filter(
                Station.source_id == mapping.source_id,
                Station.source_station_id == mapping.source_station_id,
                Observation.metric == mapping.metric,
                Observation.quality_state == ObservationQuality.valid.value,
            )
            .all()
        )
        for observation in observations:
            observation_instant = _instant(observation)
            if observation_instant is None:
                continue
            historical_instant = _instant(historical[0]) if historical else None
            if mapping.role == "primary" and (historical_instant is None or observation_instant > historical_instant):
                historical = (observation, mapping)
            if _freshness(observation, source, now) == FreshnessState.fresh:
                candidates.append((observation, mapping, source))

    candidates.sort(key=lambda item: (_instant(item[0]), -item[1].priority), reverse=True)
    selected = candidates[0] if candidates else None
    candidate_ids = [obs.id for obs, _, _ in candidates]
    if selected:
        observation, mapping, _ = selected
        state = ConditionSelectionState.fresh_primary.value if mapping.role == "primary" else ConditionSelectionState.fresh_mapped_fallback.value
        reason = state
        selection = ConditionSelection(
            public_field=public_field,
            selected_observation_id=observation.id,
            historical_observation_id=None,
            candidate_observation_ids_json=json.dumps(candidate_ids),
            mapping_version=mapping.mapping_version,
            selection_state=state,
            selection_reason=reason,
            computed_at=now,
        )
    elif historical:
        observation, mapping = historical
        selection = ConditionSelection(
            public_field=public_field,
            selected_observation_id=None,
            historical_observation_id=observation.id,
            candidate_observation_ids_json=json.dumps(candidate_ids),
            mapping_version=mapping.mapping_version,
            selection_state=ConditionSelectionState.historical_stale.value,
            selection_reason="historical_stale",
            computed_at=now,
        )
    else:
        selection = ConditionSelection(
            public_field=public_field,
            selected_observation_id=None,
            historical_observation_id=None,
            candidate_observation_ids_json=json.dumps(candidate_ids),
            mapping_version=None,
            selection_state=ConditionSelectionState.unknown.value,
            selection_reason="unknown_unmapped_or_unavailable",
            computed_at=now,
        )
    db.add(selection)
    db.commit()
    db.refresh(selection)
    return selection


def load_ruleset() -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(RULESET_PATH.read_text(encoding="utf-8")))


def compute_internal_assessment(db: Session, barangay: str | None = None, now: datetime | None = None) -> RiskAssessment:
    """Score only complete, fresh, mapped inputs; otherwise write an unknown audit row."""
    now = now or datetime.now(UTC)
    rules = load_ruleset()
    selections = {field: select_condition(db, field, now) for field in rules["required_fields"]}
    inputs: dict[str, dict[str, Any]] = {}
    if any(selection.selected_observation_id is None for selection in selections.values()):
        state, score = Indicator.unknown.value, None
    else:
        score = Decimal("0")
        for field, selection in selections.items():
            observation = db.get(Observation, selection.selected_observation_id)
            assert observation is not None
            value = observation.value
            inputs[field] = {"observation_id": observation.id, "value": str(value), "selection_state": selection.selection_state}
            rule = rules["fields"].get(field)
            if value is None or rule is None:
                state, score = Indicator.unknown.value, None
                break
            for threshold in rule["thresholds"]:
                if value >= Decimal(str(threshold["gte"])):
                    score += Decimal(str(threshold["points"]))
        else:
            state = Indicator.normal.value
            for boundary, indicator in ((75, Indicator.critical), (50, Indicator.alert), (25, Indicator.monitor)):
                if score >= boundary:
                    state = indicator.value
                    break
    for field, selection in selections.items():
        inputs.setdefault(field, {"selection_id": selection.id, "selection_state": selection.selection_state})
    assessment = RiskAssessment(
        barangay=barangay,
        ruleset_version=rules["version"],
        inputs_json=json.dumps(inputs),
        score=score,
        display_state=state,
        publication_state=PublicationState.internal_only.value,
        computed_at=now,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment
