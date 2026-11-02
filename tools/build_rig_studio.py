#!/usr/bin/env python3
"""Compile real, actor-specific 2D sprite motion packs for the Rig Studio.

One shared action ID can be resolved against many model types, but a model
type is NEVER treated as permission to copy/warp a different character's GIF.
The returned atlas must be the selected actor's own original RGBA sheet.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

DIRS = ("se", "sw", "ne", "nw")
FRAME = (64, 112)
PIVOT = (32, 100)
SITE_URL = "https://lafrich.github.io/virtual-life-asset-pipeline/"


def profile_for(character: dict, definitions: dict) -> tuple[str, str]:
    key = character["id"]
    explicit = definitions["overrides"]
    legacy = definitions["legacy_humanoid"]
    if key in explicit:
        kind = explicit[key]
        evidence = "verified_source_family"
    elif key.startswith("native_") or key in ("ichsan",):
        kind = "HUMANOID"
        evidence = "v6b_native"
    elif key.startswith("legacy_") and key[len("legacy_"):] in legacy:
        kind = "HUMANOID"
        evidence = "provisional_legacy_human"
    else:
        kind = definitions["fallback"]
        evidence = "provisional_fallback"
    if kind not in {m["id"] for m in definitions["types"]}:
        raise ValueError(key + ": unknown model type")
    return kind, evidence


def clip_for(character: dict, action: dict, site: Path) -> dict | None:
    if not action.get("available"):
        return None
    source = action.get("source")
    if source == "native":
        sheet = character.get("sheet")
        row = action.get("row")
        if not sheet or not isinstance(row, int) or row < 0:
            raise ValueError(character["id"] + ": invalid native motion atlas")
        rows = 44
        frame_cols = 6
        if row + 4 > rows:
            raise ValueError(character["id"] + ": action exceeds native atlas")
    elif source == "custom":
        sheet = action.get("sheet")
        row = action.get("row", 0)
        if not sheet or row != 0:
            raise ValueError(character["id"] + ": invalid custom motion")
        rows = 4
        frame_cols = action["frames"]
    else:
        raise ValueError(character["id"] + ": available action has no original source")
    if (not sheet.startswith("media/") or ".." in sheet or
            not (site / sheet).is_file()):
        raise ValueError(character["id"] + ": missing or unsafe original sprite " + str(sheet))
    frames = action.get("frames", 0)
    timing = action.get("frame_ms", [])
    if not isinstance(frames, int) or frames <= 0 or frames > frame_cols:
        raise ValueError(character["id"] + ": invalid frame count")
    if len(timing) != frames or any(not isinstance(t, int) or t <= 0 for t in timing):
        raise ValueError(character["id"] + ": invalid frame timing")
    return {
        "id":action["id"], "name":action.get("name", action["id"].upper()),
        "source":source, "status":"ready", "atlas":sheet,
        "columns":frame_cols, "row_start":row, "rows":rows,
        "frames":frames, "frame_ms":timing, "loop":bool(action["loop"]),
        "directions":list(DIRS), "frame_size":list(FRAME),
        "pivot":list(PIVOT), "atlas_url":SITE_URL + sheet,
        "review_scope":"original_character_source",
    }


def build_rig_packs(site: Path, characters: list[dict], root: Path) -> dict:
    defs = json.loads((root/"assets/animation_library/model_types.json").read_text(encoding="utf-8"))
    if defs.get("version") != 1:
        raise ValueError("Invalid model type registry")
    actions = json.loads((root/"assets/animation_library/actions.json").read_text(encoding="utf-8"))["actions"]
    out = site/"motion-packs"
    out.mkdir(exist_ok=True)
    actors = []
    for character in characters:
        cid = character["id"]
        if not re.fullmatch(r"[a-z][a-z0-9_]*", cid):
            raise ValueError("unsafe actor pack name: " + cid)
        kind, evidence = profile_for(character, defs)
        model = next(m for m in defs["types"] if m["id"] == kind)
        character["model_type"] = kind
        character["rig_adapter"] = model["adapter"]
        character["rig_evidence"] = evidence
        clips = []
        seen = set()
        for action in character.get("motions", []):
            if action["id"] in seen:
                raise ValueError(cid+": duplicate source motion ID "+action["id"])
            seen.add(action["id"])
            clip = clip_for(character, action, site)
            if clip:
                clips.append(clip)
        pack_path = "motion-packs/"+cid+".json"
        pack = {
            "version":1, "format":"virtual-life-sprite-motion-v1",
            "actor":cid, "model_type":kind, "adapter":model["adapter"],
            "source_evidence":evidence, "frame_size":list(FRAME),
            "pivot":list(PIVOT), "directions":list(DIRS),
            "clips":clips, "usable_in_game":bool(clips),
            "notes":"Only original actor sprites; model templates do not auto-generate new poses.",
        }
        (site/pack_path).write_text(json.dumps(pack,indent=2)+"\n",encoding="utf-8")
        character["motion_pack"] = pack_path
        character["rig_ready_count"] = len(clips)
        actors.append({"id":cid,"name":character["name"],"model_type":kind,
                       "adapter":model["adapter"],"source_evidence":evidence,
                       "ready_count":len(clips),"pack":pack_path,
                       "thumbnail":character.get("thumbnail", ""),
                       "source_only":not bool(character.get("sheet"))})
    spec = {
        "version":1, "format":"virtual-life-rig-studio-v1",
        "types":defs["types"],"characters":actors,
        "registry": [{
            "id":a["id"],"label":a["label"],"category":a["category"],
            "status":a.get("status","registered"),
            "priority":a.get("priority",""),
            "requirements":a.get("requirements",[]),
            "phases":a.get("phases",[]),
            "type":a.get("modality","body"),
        } for a in actions],
        "included_game_code":False,
        "notes":"Playable in preview only when original character-specific sprite frames exist. Importing a pack into gameplay remains an explicit step.",
    }
    (site/"rigs.json").write_text(json.dumps(spec,indent=2)+"\n",encoding="utf-8")
    print("RIG STUDIO:",len(actors),"characters",len(defs["types"]),"model types",
          sum(a["ready_count"] for a in actors),"original actor motion clips")
    return spec
