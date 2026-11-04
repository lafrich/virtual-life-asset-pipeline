#!/usr/bin/env python3
"""Build animation previews from real saved GIFs and opt-in animation templates.

Existing preview-only GIFs are curated with provenance in library.json.
New assets/anim_*/manifest.json objects are discovered via animation_catalog.
This does not generate or modify the playable game or unreviewed action poses.
"""
from __future__ import annotations

import json
import os
import re
import shutil
from pathlib import Path
from PIL import Image, ImageDraw
try:
    from .animation_backlog import planned_records, assert_backlog_synced
except ImportError:  # Running the builder directly from tools/ as a script.
    from animation_backlog import planned_records, assert_backlog_synced

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


def build_native_sleep_previews(out: Path, repo_url: str, characters: list[dict]) -> list[dict]:
    """Create real previews from the ORIGINAL Male V6B LIE atlas, not from idle.

    Each preview is a shared action, but the selected actor renders its *own*
    compatible lie frames at runtime. The source character is illustrative.
    """
    source = next((c for c in characters if c.get("id") == "human_male_base"), None)
    if not source:
        raise ValueError("Missing original Human Male base for sleep previews")
    original = next((m for m in source.get("motions", [])
                     if m.get("id") == "lie" and m.get("available") is True), None)
    if not original or int(original.get("frames", 0)) < 4:
        raise ValueError("Cannot publish bed sleep: Human Male native lie is unavailable")
    media = out / "media"
    media.mkdir(parents=True, exist_ok=True)
    sheet_path = media / Path(original.get("sheet") or source["sheet"]).name
    row0 = 0 if original.get("sheet") else int(original.get("row", -1))
    if not sheet_path.is_file() or row0 < 0:
        raise ValueError("Cannot find real Human Male native lie sprites")
    delays = [380, 430, 470, 430]
    keys = ("se", "sw", "ne", "nw")
    colors = (39, 47, 60)
    records = []
    with Image.open(sheet_path) as atlas:
        sheet = atlas.convert("RGBA")
        if sheet.width < 4 * 64 or sheet.height < (row0 + 4) * 112:
            raise ValueError("Native lie atlas has the wrong dimensions")
        for action in ("sleep_bed_right", "sleep_bed_left"):
            frames = []
            for f in range(4):
                picture = Image.new("RGB", (544, 266), colors)
                painter = ImageDraw.Draw(picture)
                for i, direction in enumerate(keys):
                    # Match the shared action's canonical directionFor() mapping.
                    real_dir = (direction if action.endswith("right") else
                                {"se":"sw","sw":"se","ne":"nw","nw":"ne"}[direction])
                    direction_row = keys.index(real_dir)
                    crop = sheet.crop((f * 64, (row0 + direction_row) * 112,
                                      (f + 1) * 64, (row0 + direction_row + 1) * 112))
                    if not crop.getchannel("A").getbbox():
                        raise ValueError(f"Empty actual lying pose: {source['id']} {real_dir} f{f}")
                    tile = crop.resize((128, 224), Image.Resampling.NEAREST)
                    x = 8 + 136 * i
                    picture.paste(tile, (x, 4 + (0, -2, 0, 2)[f]), tile)
                    painter.text((x + 39, 240), direction.upper(), fill=(229, 233, 240))
                frames.append(picture)
            filename = "animation-" + action
            gif_path = media / (filename + ".gif")
            poster_path = media / (filename + ".png")
            frames[0].save(poster_path, optimize=True)
            frames[0].save(gif_path, save_all=True, append_images=frames[1:],
                           duration=delays, loop=0, optimize=False)
            with Image.open(gif_path) as actual:
                if actual.n_frames < 4:
                    raise ValueError("Sleep frames were unexpectedly collapsed")
            records.append({
                "id": action,
                "name": "SLEEP / BED " + ("RIGHT" if action.endswith("right") else "LEFT"),
                "kind": "animation", "group": "action", "status": "ready",
                "note": "UNIVERSAL NATIVE V6B / USES EACH ACTOR'S OWN HORIZONTAL LIE RIG",
                "gif": "media/" + gif_path.name, "poster": "media/" + poster_path.name,
                "source_url": repo_url + "/blob/main/site/universal-sleep.js",
                "template_json": "", "directions": list(keys), "layout": "four_up",
                "frame_count": 4, "gif_frames": 4, "loop": True,
                "frame_ms": list(delays), "duration_ms": sum(delays),
                "preview_only": False, "universal": True,
                "actor": source["id"], "action_id": action,
            })
    return records


def build_bath_previews(out: Path, repo_url: str, characters: list[dict]) -> list[dict]:
    """Publish genuine Male/Female 4-frame washing motions into Animations."""
    records=[]
    dirs=("se","sw","ne","nw")
    media=out/"media"
    for gender in ("male","female"):
        actor=next((c for c in characters if c.get("id")==f"human_{gender}_base"),None)
        if not actor:raise ValueError(f"Bath base absent: {gender}")
        motion=next((m for m in actor["motions"]
                     if m.get("id")=="bathe" and m.get("available")),None)
        if not motion or motion.get("frames")!=4 or not motion.get("sheet"):
            raise ValueError(f"Missing 4-frame authored bath motion for {gender}")
        sheet_path=media/Path(motion["sheet"]).name
        if not sheet_path.is_file():
            raise FileNotFoundError(sheet_path)
        frames=[]
        with Image.open(sheet_path) as image:
            atlas=image.convert("RGBA")
            if atlas.size!=(256,448):
                raise ValueError(f"Invalid bath sprite sheet {gender}: {atlas.size}")
            for frame in range(4):
                picture=Image.new("RGB",(544,266),(39,47,60))
                painter=ImageDraw.Draw(picture)
                for i,direction in enumerate(dirs):
                    tile=atlas.crop((frame*64,i*112,(frame+1)*64,(i+1)*112))
                    if not tile.getchannel("A").getbbox():
                        raise ValueError(f"Empty bath frame {gender}/{direction}/{frame}")
                    picture.paste(tile.resize((128,224),Image.Resampling.NEAREST),
                                  (8+i*136,4),tile.resize((128,224),Image.Resampling.NEAREST))
                    painter.text((8+i*136+39,240),direction.upper(),fill=(229,233,240))
                frames.append(picture)
        prefix=f"animation-bathe-{gender}"
        gif=media/(prefix+".gif")
        poster=media/(prefix+".png")
        frames[0].save(poster,optimize=True)
        frames[0].save(gif,save_all=True,append_images=frames[1:],
                       duration=[330,360,380,360],loop=0,optimize=False)
        with Image.open(gif) as check:
            if check.n_frames!=4:raise ValueError("Bath frames collapsed")
        records.append({
            "id":f"bathe_{gender}_v1","name":f"BATHE / SHOWER — {gender.upper()}",
            "kind":"animation","group":"action","status":"ready",
            "note":"4-FRAME NON-EXPLICIT ADULT BATHING ANIMATION / NATURAL SKIN PALETTE / FOUR DIRECTIONS",
            "gif":"media/"+gif.name,"poster":"media/"+poster.name,
            "source_url":repo_url+"/blob/main/tools/build_human_templates.py",
            "template_json":"","directions":list(dirs),"layout":"four_up",
            "frame_count":4,"gif_frames":4,"loop":True,
            "frame_ms":[330,360,380,360],"duration_ms":1430,
            "preview_only":False,"universal":True,
            "actor":actor["id"],"action_id":"bathe"
        })
    return records


def build_animation_catalog(out: Path, repo_url: str,
                            characters: list[dict] | None = None) -> list[dict]:
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
    if characters is not None:
        shared = build_native_sleep_previews(out, repo_url, characters)
        shared.extend(build_bath_previews(out, repo_url, characters))
        for row in shared:
            if row["id"] in ids:
                raise ValueError("Duplicate native sleep action " + row["id"])
            ids.add(row["id"])
        records.extend(shared)
    # Roadmap actions are searchable in a distinct PLANNED view but must not
    # masquerade as a GIF, approved motion, or working character binding.
    action_registry = json.loads(safe_path("assets/animation_library/actions.json").read_text(encoding="utf-8"))
    registered = action_registry.get("actions", [])
    backlog_path = ROOT / "assets/animation_library/backlog.json"
    assert_backlog_synced(backlog_path, registered)
    # Shared IDs of unrendered specs are deliberately present in actions.json.
    # Reject collisions with *real* motions and historical media only.
    reserved = ids | {item["id"] for item in registered if item.get("status") != "planned"}
    records.extend(planned_records(backlog_path, reserved))
    (out / "animations.json").write_text(
        json.dumps({"version": 1, "build_version": os.environ.get("GITHUB_SHA", "local")[:12], "animations": records}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Animation catalog: {len(records)} items ({sum(bool(r['gif']) for r in records)} GIFs)")
    return records
