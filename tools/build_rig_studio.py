#!/usr/bin/env python3
"""Compile original sprite packs and universal category-bone contracts.

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
    # Publish shared bone animation data independently of per-actor sprite atlases.
    # Future skinned sprites consume these same source actions across all rigs.
    skeletons = json.loads((root/"assets/animation_library/category_skeletons.json").read_text(encoding="utf-8"))
    shared = json.loads((root/"assets/animation_library/shared_bone_motions.json").read_text(encoding="utf-8"))
    expected = {m["id"] for m in defs["types"]}
    if skeletons.get("version") != 1 or set(skeletons["types"]) != expected:
        raise ValueError("Category skeleton definitions differ from model types")
    registered = {action["id"] for action in actions}
    shared_ids = [clip["id"] for clip in shared["clips"]]
    if len(shared_ids) != len(set(shared_ids)) or not set(shared_ids) <= registered:
        raise ValueError("Shared bone actions must be unique registered actions")
    for key, rig in skeletons["types"].items():
        if rig["adapter"] != next(m["adapter"] for m in defs["types"] if m["id"] == key):
            raise ValueError("Bone adapter does not match category")
        defined = set()
        for bone in rig["bones"]:
            if bone["parent"] is not None and bone["parent"] not in defined:
                raise ValueError("Bone must follow its parent")
            if bone["id"] in defined:
                raise ValueError("Duplicate bone")
            defined.add(bone["id"])
        if set(rig["channels"]) != set(skeletons["semantics"]) or not set(rig["channels"].values()) <= defined:
            raise ValueError("Missing shared action bone binding")
    (site/"category-skeletons.json").write_text(json.dumps(skeletons, indent=2)+"\n",encoding="utf-8")
    (site/"shared-bone-motions.json").write_text(json.dumps(shared, indent=2)+"\n",encoding="utf-8")
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
        character["skeleton_profile"] = kind
        character["bone_actions"] = list(shared_ids)
        character["bone_skin_ready"] = False
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
            "skeleton_profile":kind,"shared_bone_actions":shared_ids,
            "bone_skin_ready":False,
            "notes":"Only original actor sprites; model templates do not auto-generate new poses.",
        }
        (site/pack_path).write_text(json.dumps(pack,indent=2)+"\n",encoding="utf-8")
        character["motion_pack"] = pack_path
        character["rig_ready_count"] = len(clips)
        actors.append({"id":cid,"name":character["name"],"model_type":kind,
                       "adapter":model["adapter"],"source_evidence":evidence,
                       "ready_count":len(clips),"pack":pack_path,
                       "skeleton_profile":kind,"shared_bone_actions":shared_ids,
                       "bone_skin_ready":False,
                       "thumbnail":character.get("thumbnail", ""),
                       "source_only":not bool(character.get("sheet"))})
    spec = {
        "version":1, "format":"virtual-life-category-bones-v1",
        "types":defs["types"],"characters":actors,
        "skeletons":"category-skeletons.json",
        "shared_bone_motions":"shared-bone-motions.json",
        "shared_bone_runtime":"shared-bone-runtime.js",
        "shared_bone_actions":shared_ids,
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
    print("SHARED BONE CATALOG:",len(actors),"characters",len(defs["types"]),"model types",
          sum(a["ready_count"] for a in actors),"original actor motion clips")
    return spec
