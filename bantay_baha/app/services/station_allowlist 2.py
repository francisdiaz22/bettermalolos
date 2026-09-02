from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

ALLOWLIST_PATH = Path(__file__).parent.parent / "data" / "pdrrmo_allowlist.json"


@lru_cache(maxsize=1)
def load_allowlist() -> dict:  # type: ignore[no-any-return]
    try:
        data = json.loads(ALLOWLIST_PATH.read_text(encoding="utf-8"))
        return data  # type: ignore[no-any-return]
    except Exception:
        return {"rainfall": [], "dam": [], "river": []}


def is_allowed(kind: str, name: str) -> bool:
    data = load_allowlist()
    # normalize whitespace/case for comparison
    norm = name.strip()
    # flooding municipalities are dynamic — allow any but caller handles
    if kind == "flooding":
        return True
    if kind == "tide":
        return True
    allowed = data.get(kind, [])
    # exact match
    if norm in allowed:
        return True
    # case-insensitive fallback
    lower_allowed = {a.lower(): a for a in allowed}
    return norm.lower() in lower_allowed


def allowed_set(kind: str) -> set[str]:
    data = load_allowlist()
    return set(data.get(kind, []))
