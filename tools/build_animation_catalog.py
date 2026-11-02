#!/usr/bin/env python3
"""Build animation previews from real saved GIFs and opt-in animation templates.

Existing preview-only GIFs are curated with provenance in library.json.
New assets/anim_*/manifest.json objects are discovered via animation_catalog.
This does not generate or modify the playable game or unreviewed action poses.
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MEDIA_PREFIX = "animation-"


def safe_path(relative: str) -> Path:
    if not isinstance(relative, str) or relative.startswith("/"):
        raise ValueError("Expected a relative asset path")
    result = (ROOT / relative).resolve()
    if not result.is_relative_to(ROOT) or not result.is_file():
        raise ValueError("Missing or unsafe animation file: " + relative)
    return result


def valid_id(value: str) -> bool:
    return bool(isinstance(value, str) and re.fullmatch(r"[a-z0-9_]+", value))


def read_manifest(relative: str | None) -> dict:
    if not relative:
        return {}
    obj = json.loads(safe_path(relative).read_text(encoding="utf-8"))
    if not isinstance(obj, dict):
        raise ValueError("Expected manifest object: " + relative)
    return obj


def poster_gif(preview: Path, dest: Path, name: str) -> tuple[str, str, int]:
    """Copy the actual preview and save its first frame without redrawing."""
    with Image.open(preview) as image:
        if image.format != "GIF":
            raise ValueError("Not a GIF asset: " + str(preview))
        # Four-up vendor/prop interaction previews (e.g. Babeh + etalase)
        # can be wider than simple 4x64px actor views; keep actual pixels.
        if image.width > 4096 or image.height > 2048:
            raise ValueError("Animation preview too large: " + str(preview))
        frame = image.convert("RGBA")
        frames = image.n_frames
    gif = MEDIA_PREFIX + name + ".gif"
    poster = MEDIA_PREFIX + name + ".png"
    frame.save(dest / poster, optimize=True)
    if frames < 2:
        # Optimized GIFs may collapse duplicate frames; preserve the still
        # as a legitimate pose preview instead of claiming it is animated.
        return "", "media/" + poster, frames
    shutil.copy2(preview, dest / gif)
    return "media/" + gif, "media/" + poster, frames


def build_animation_catalog(out: Path, repo_url: str) -> list[dict]:
    media = out / "media"
    media.mkdir(parents=True, exist_ok=True)
    registry = json.loads(safe_path("assets/animation_library/library.json").read_text(encoding="utf-8"))
    items = registry.get("clips", [])
    if not isinstance(items, list):
        raise ValueError("Animation registry clips must be list")
    items = list(items)
    records: list[dict] = []
    ids: set[str] = set()

    # Starter templates have metadata but deliberately NO fabricated GIF.
    # New template specs are automatically listed when committed.
    for template in sorted((ROOT / "assets" / "animation_library" / "templates").glob("*.json")):
        entry = json.loads(template.read_text(encoding="utf-8"))
        items.append({**entry, "manifest": template.relative_to(ROOT).as_posix(),
                      "status": "template"})

    # New animations opt in without editing the legacy registry or site.
    for manifest_file in sorted((ROOT / "assets").glob("anim_*/manifest.json")):
        data = json.loads(manifest_file.read_text(encoding="utf-8"))
        entry = data.get("animation_catalog")
        if not isinstance(entry, dict):
            continue
        rel = manifest_file.relative_to(ROOT).as_posix()
        items.append({
            **entry,
            "manifest": rel,
            "source": entry.get("source") or rel,
        })

    # Every committed/or newly generated named NPC 4-view GIF becomes a real
    # actor-specific preview in the MOTION DB. Existing curated legacy clips
    # are kept once; no duplicate aliases for their reference GIFs.
    historical_aliases = {
        "pak_ogah_wave_flag": "pak_ogah_wave",
        "kang_parkir_whistle": "parkir_whistle",
        "babeh_pemilik_walk": "babeh_walk",
    }
    roster = json.loads(safe_path("assets/character_stock/archive_roster.json").read_text())
    source_by_character = {a["id"]: a["source"] for a in roster["characters"]}
    known_ids = {a["id"] for a in items}
    for file in sorted((ROOT / "assets").glob("npc_*/*_4views_4x.gif")):
        key = file.name.removesuffix("_4views_4x.gif")
        if not valid_id(key) or key in known_ids or key in historical_aliases:
            continue
        actor = next((n for n in sorted(source_by_character,key=len,reverse=True)
                      if key.startswith(n + "_")), "")
        if not actor:
            continue
        items.append({
            "id": key, "name": key[len(actor)+1:].replace("_"," ").upper(),
            "group": "npc", "status": "preview",
            "actor": "legacy_" + actor,
            "action_id": key[len(actor)+1:],
            "preview": file.relative_to(ROOT).as_posix(),
            "source": source_by_character[actor],
            "directions": ["se","sw","ne","nw"],
            "layout":"four_up",
            "note": actor.replace("_"," ").upper() + " / ACTUAL GENERATOR CLIP / PREVIEW ONLY",
        })
        known_ids.add(key)

    # Manifests may contain well-defined timing/actions whose output PNG/GIFs
    # have not been committed. Surface them as SOURCE ONLY, never playable.
    for manifest_file in sorted((ROOT / "assets").glob("anim_*/manifest.json")):
        manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
        for name, action in manifest.get("anims", {}).items():
            key = manifest_file.parent.name + "_" + name
            if not valid_id(key) or key in known_ids or not isinstance(action,dict):
                continue
            items.append({
                "id":key, "name":name.replace("_"," ").upper(),
                "group":"action", "status":"source_only",
                "source":manifest_file.relative_to(ROOT).as_posix(),
                "manifest":manifest_file.relative_to(ROOT).as_posix(),
                "animation":name,
                "directions":["se","sw","ne","nw"],"layout":"four_up",
                "note":manifest_file.parent.name.upper()+" / TIMING + SOURCE ONLY / NOT RENDERED",
            })
            known_ids.add(key)

    for entry in items:
        name = entry.get("id")
        if not valid_id(name) or name in ids:
            raise ValueError("Invalid or duplicate animation id: " + str(name))
        ids.add(name)
        if entry.get("group") not in {"action", "npc", "scene"}:
            raise ValueError(name + ": group must be action/npc/scene")
        if entry.get("status", "preview") not in {"preview", "template", "source_only"}:
            raise ValueError(name + ": unsupported review status")
        data = read_manifest(entry.get("manifest"))
        anim = data.get("anims", {}).get(entry.get("animation"), {}) if entry.get("animation") else {}
        if not isinstance(anim, dict):
            anim = {}

        preview_rel = entry.get("preview")
        clip, poster, gif_frames = "", "", 0
        if preview_rel:
            # Draft templates are allowed to have no rendered frames yet.
            path = ROOT / preview_rel
            if path.is_file():
                preview = safe_path(preview_rel)
                clip, poster, gif_frames = poster_gif(preview, media, name)
            elif entry.get("status") not in ("template","source_only"):
                raise ValueError(name + ": preview path missing: " + preview_rel)
        status = entry.get("status","preview")
        if status == "preview" and not clip and poster:
            status = "still"
        if not clip and status not in ("template","source_only","still"):
            raise ValueError(name + ": preview clips need a real multi-frame GIF")

        source = entry.get("source", entry.get("manifest", ""))
        if source:
            safe_path(source)
        dirs = entry.get("directions", data.get("dirs", []))
        if not isinstance(dirs, list) or not dirs or any(x not in ("se", "sw", "ne", "nw") for x in dirs):
            raise ValueError(name + ": invalid directions")
        frames = anim.get("frames", entry.get("frame_count", data.get("frame_count", 0)))
        frame_ms = anim.get("frame_ms", entry.get("frame_ms", data.get("frame_ms", [])))
        if frame_ms:
            if not isinstance(frame_ms, list) or any(not isinstance(x, int) or x <= 0 for x in frame_ms):
                raise ValueError(name + ": invalid frame_ms")
            if frames and len(frame_ms) != frames:
                raise ValueError(name + ": timing doesn't match frames")
        duration = sum(frame_ms) if frame_ms else anim.get("total_ms") or None
        manifest_rel = entry.get("manifest", "")
        downloadable_template = ""
        if entry.get("status") == "template" and manifest_rel:
            target = MEDIA_PREFIX + name + "-template.json"
            shutil.copy2(safe_path(manifest_rel), media / target)
            downloadable_template = "media/" + target

        records.append({
            "id": name,
            "name": str(entry.get("name", name.replace("_", " ").upper())),
            "kind": "animation",
            "group": entry["group"],
            "status": status,
            "note": str(entry.get("note", "")),
            "gif": clip,
            "poster": poster,
            "source_url": repo_url + "/blob/main/" + source if source else "",
            "template_json": downloadable_template,
            "directions": dirs,
            "layout": entry.get("layout", "four_up"),
            "frame_count": int(frames or gif_frames),
            "gif_frames": gif_frames,
            "loop": bool(anim.get("loop", entry.get("loop", False))),
            "frame_ms": frame_ms if frame_ms else [],
            "duration_ms": duration,
            "preview_only": True,
            "actor": str(entry.get("actor", "")),
            "action_id": str(entry.get("action_id", "")),
        })
    (out / "animations.json").write_text(
        json.dumps({"version": 1, "animations": records}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Animation catalog: {len(records)} items ({sum(bool(r['gif']) for r in records)} GIFs)")
    return records
