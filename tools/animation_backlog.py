"""Validate the life-sim animation roadmap without manufacturing any sprite.

This backlog is *not* the approved motion registry; a planned action remains
unplayable until a real character-specific rig and reviewed pose sheet exist.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

CATEGORIES = frozenset({
    "movement", "posture", "objects", "food", "hygiene", "social",
    "office", "trading", "phone", "city", "funny", "npc", "facial",
})
PRIORITIES = {"P0", "P1", "P2"}
DIRECTIONS = ["se", "sw", "ne", "nw"]


def read_backlog(path: Path, reserved_ids: set[str] | None = None) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("version") != 1:
        raise ValueError("Animation backlog must be a version-1 object")
    items = data.get("actions")
    if not isinstance(items, list) or len(items) < 100:
        raise ValueError("Life-sim backlog missing or incomplete")
    seen = set(reserved_ids or ())
    result = []
    for action in items:
        if not isinstance(action, dict):
            raise ValueError("Action must be an object")
        aid = action.get("id")
        if not isinstance(aid, str) or not re.fullmatch(r"[a-z][a-z0-9_]*", aid) or aid in seen:
            raise ValueError(f"Invalid/duplicate/reserved planned action: {aid!r}")
        seen.add(aid)
        if action.get("status") != "planned":
            raise ValueError(aid + ": unrendered backlog must remain planned")
        if action.get("priority") not in PRIORITIES or action.get("category") not in CATEGORIES:
            raise ValueError(aid + ": invalid priority or category")
        if action.get("type") != ("facial" if action["category"] == "facial" else "body"):
            raise ValueError(aid + ": invalid animation type")
        if action.get("batch") not in (1, 2, 3, 4):
            raise ValueError(aid + ": invalid batch")
        if action.get("directions") != DIRECTIONS or action.get("frame_size") != [64, 112] or action.get("pivot") != [32, 100]:
            raise ValueError(aid + ": inconsistent native sprite geometry")
        phases = action.get("phases")
        if (not isinstance(phases, list) or len(phases) != 3 or phases[0] != "enter"
                or phases[-1] != "exit" or phases[1] not in ("loop", "contact", "hold")):
            raise ValueError(aid + ": invalid action phases")
        if not isinstance(action.get("loop"), bool) or (action["loop"] and phases[1] != "loop"):
            raise ValueError(aid + ": invalid action loop")
        if not isinstance(action.get("requirements"), list) or not all(
            isinstance(x, str) and re.fullmatch(r"[a-z_]+", x) for x in action["requirements"]
        ) or len(set(action["requirements"])) != len(action["requirements"]):
            raise ValueError(aid + ": invalid prop requirements")
        event = action.get("event")
        if event is not None and (not isinstance(event, dict)
                or not isinstance(event.get("name"), str) or not re.fullmatch(r"[a-z_]+", event["name"])
                or event.get("phase") not in phases):
            raise ValueError(aid + ": invalid gameplay event")
        if action.get("sync") not in ("solo", "paired"):
            raise ValueError(aid + ": invalid synchronization")
        result.append(action)
    return result


def planned_records(path: Path, reserved_ids: set[str]) -> list[dict]:
    actions = read_backlog(path, reserved_ids)
    return [{
        "id": item["id"],
        "name": item["label"],
        "kind": "animation",
        "group": "action",
        "status": "planned",
        "note": item.get("notes", ""),
        "gif": "",
        "poster": "",
        "source_url": "",
        "template_json": "",
        "directions": item["directions"],
        "layout": "four_up",
        "frame_count": 0,
        "gif_frames": 0,
        "loop": item["loop"],
        "frame_ms": [],
        "duration_ms": None,
        "preview_only": True,
        "actor": "",
        "action_id": item["id"],
        "priority": item["priority"],
        "category": item["category"],
        "batch": item["batch"],
        "phases": item["phases"],
        "requirements": item["requirements"],
        "event": item["event"],
        "sync": item["sync"],
        "type": item["type"],
        "rig_ready": False,
    } for item in actions]
