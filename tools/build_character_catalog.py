#!/usr/bin/env python3
"""Build a GitHub Pages gallery from committed v6b character manifests.

New folders are auto-discovered; assets/character_stock/index.json is only for
optional display-name/description overrides, never a registration requirement.
No network requests, image generation, or changes to original sprite assets.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
from build_animation_catalog import build_animation_catalog

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
OUT = ROOT / "_site"
REPO_URL = "https://github.com/lafrich/virtual-life-asset-pipeline"
SIZE = (64, 112)
SCALE = 3
PREVIEW_SIZE = (350, 386)
BG = (28, 31, 40)
GROUND = (64, 76, 94)
EDGE = (93, 108, 126)


def inside(path: Path, parent: Path) -> bool:
    return path.resolve().is_relative_to(parent.resolve())


def checked_asset(folder: Path, name: str) -> Path:
    if not isinstance(name, str) or not name:
        raise ValueError("missing relative asset path")
    p = (folder / name).resolve()
    if not inside(p, folder) or not p.is_file():
        raise ValueError(f"invalid or missing file: {name}")
    return p


def updated_timestamp(path: Path) -> int:
    try:
        proc = subprocess.run(
            ["git", "log", "-1", "--format=%ct", "--", path.relative_to(ROOT).as_posix()],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
        return int(proc.stdout.strip() or "0")
    except (OSError, ValueError, subprocess.CalledProcessError):
        return 0


def save_walk_preview(sheet_path: Path, gif_path: Path, poster_path: Path, row: int, frames: int) -> None:
    with Image.open(sheet_path) as source:
        sheet = source.convert("RGBA")
    if sheet.width < SIZE[0] * frames or sheet.height < (row + 4) * SIZE[1]:
        raise ValueError("sheet is too small for 4-direction walk")
    all_frames, timings = [], []
    for direction in range(4):
        for frame_num in range(frames):
            tile = sheet.crop(
                (frame_num * SIZE[0], (row + direction) * SIZE[1],
                 (frame_num + 1) * SIZE[0], (row + direction + 1) * SIZE[1])
            )
            tile = tile.resize((SIZE[0] * SCALE, SIZE[1] * SCALE), Image.Resampling.NEAREST)
            canvas = Image.new("RGBA", PREVIEW_SIZE, (*BG, 255))
            d = ImageDraw.Draw(canvas)
            d.polygon([(175, 301), (290, 346), (175, 381), (60, 346)],
                      fill=GROUND, outline=EDGE)
            canvas.alpha_composite(tile, ((PREVIEW_SIZE[0] - tile.width) // 2, 10))
            all_frames.append(canvas.convert("RGB"))
            timings.append(390 if frame_num == 0 else 140)
    all_frames[0].save(
        poster_path, optimize=True
    )
    all_frames[0].save(
        gif_path, format="GIF", save_all=True, append_images=all_frames[1:],
        duration=timings, loop=0, optimize=True, disposal=2
    )


EXPRESSION_LABELS = {
    "angry": "Angry", "blink": "Blink", "emb": "Embarrassed",
    "happy": "Happy", "sad": "Sad", "sleepy": "Sleepy",
    "smile": "Smile", "surpr": "Surprised",
}


def save_expression_previews(folder: Path, data: dict, sheet_path: Path, media: Path, slug: str) -> list:
    """Compose native expression overlays onto the SE idle frame at 1×.

    A character's *_f*.png files are transparent change overlays, not
    stand-alone sprites. Render the actual combined result to view them on
    the site; preserve nearest-neighbor pixels without redrawing the face.
    """
    idle_row = int(data.get("row_starts", {}).get("idle", 4))
    with Image.open(sheet_path) as im:
        base = im.convert("RGBA").crop((0, idle_row * SIZE[1], SIZE[0],
                                       (idle_row + 1) * SIZE[1]))

    def create_panel(frame: Image.Image, filename: str) -> str:
        tile = frame.resize((SIZE[0] * SCALE, SIZE[1] * SCALE),
                            Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", PREVIEW_SIZE, (*BG, 255))
        d = ImageDraw.Draw(canvas)
        d.polygon([(175, 301), (290, 346), (175, 381), (60, 346)],
                  fill=GROUND, outline=EDGE)
        canvas.alpha_composite(tile, ((PREVIEW_SIZE[0] - tile.width) // 2, 10))
        output = media / filename
        canvas.convert("RGB").save(output, optimize=True)
        return "media/" + filename

    def raw_face(frame: Image.Image, code: str) -> str:
        filename = slug + "-face-" + code + ".png"
        frame.save(media / filename, optimize=True)
        return "media/" + filename

    expressions = [{"id": "neutral", "label": "Neutral",
                    "image": create_panel(base, slug + "-expression-neutral.png"),
                    "sprite": raw_face(base, "neutral"), "overlay": ""}]
    for name in data.get("sprites", []):
        p = Path(name)
        if not p.name.startswith(slug + "_v6b_f") or p.suffix.lower() != ".png":
            continue
        code = p.stem[len(slug + "_v6b_f"):]
        label = EXPRESSION_LABELS.get(code)
        if not label:
            continue
        path = checked_asset(folder, name)
        with Image.open(path) as im:
            if im.size != (384, 4928):
                raise ValueError(f"{slug}: invalid expression overlay {name}")
            overlay = im.convert("RGBA").crop((0, idle_row * SIZE[1], SIZE[0],
                                               (idle_row + 1) * SIZE[1]))
        # Skip blank placeholders; do not advertise expressions that have
        # no actual visible pixel changes on the reference idle frame.
        if not overlay.getchannel("A").getbbox():
            continue
        composite = base.copy()
        composite.alpha_composite(overlay)
        if not ImageChops.difference(composite.convert("RGB"), base.convert("RGB")).getbbox():
            continue
        overlay_name = slug + "-face-layer-" + code + ".png"
        shutil.copy2(path, media / overlay_name)
        expressions.append({
            "id": code,
            "label": label,
            "image": create_panel(composite, slug + "-expression-" + code + ".png"),
            "sprite": raw_face(composite, code),
            "overlay": "media/" + overlay_name,
        })
    return expressions


def available_actions(folder: Path, data: dict, slug: str, media: Path,
                      actions: list[dict]) -> list[dict]:
    """Build actual character motion bindings; never substitute another actor."""
    bindings_file = folder / "motions.json"
    cfg = json.loads(bindings_file.read_text(encoding="utf-8")) if bindings_file.exists() else {}
    approved = cfg.get("approved_native_actions", ["idle", "walk"])
    if not isinstance(approved, list) or len(set(approved)) != len(approved):
        raise ValueError(f"{slug}: duplicate/invalid native action bindings")
    choices = []
    row_starts = data.get("row_starts", {})
    for action in actions:
        item = {
            "id": action["id"], "name": action["label"], "category": action["category"],
            "frames": action["frames"], "frame_ms": action["frame_ms"],
            "loop": action["loop"], "available": False, "source": "",
            "reason": "NEEDS CHARACTER RIG",
        }
        if action["type"] == "native_row" and action["id"] in approved:
            row = row_starts.get(action["row"])
            if not isinstance(row, int) or row < 0 or row + 4 > int(data.get("rows", 0)):
                raise ValueError(f"{slug}: missing native sheet row for {action['id']}")
            item.update(available=True, source="native", row=row, reason="")
        choices.append(item)

    for entry in cfg.get("custom_actions", []):
        if not isinstance(entry, dict) or entry.get("id") not in {a["id"] for a in actions}:
            raise ValueError(f"{slug}: invalid custom action id")
        target = next(a for a in choices if a["id"] == entry["id"])
        if target["available"]:
            raise ValueError(f"{slug}: duplicate action binding {target['id']}")
        sheet = checked_asset(folder, entry.get("sheet", ""))
        with Image.open(sheet) as image:
            if image.mode != "RGBA" or image.size != (64 * target["frames"], 112 * 4):
                raise ValueError(f"{slug}: invalid custom sheet for {target['id']}")
        filename = f"{slug}-action-{target['id']}.png"
        shutil.copy2(sheet, media / filename)
        target.update(available=True, source="custom", sheet="media/" + filename, row=0, reason="")
    return choices


def motion_actions() -> list[dict]:
    filepath = ROOT / "assets" / "animation_library" / "actions.json"
    data = json.loads(filepath.read_text(encoding="utf-8"))
    result = data.get("actions")
    if not isinstance(result, list) or not result:
        raise ValueError("Empty shared animation action registry")
    ids = set()
    for action in result:
        aid = action.get("id")
        if not isinstance(aid, str) or not aid.replace("_", "").isalnum() or aid in ids:
            raise ValueError(f"Invalid duplicate motion id: {aid}")
        ids.add(aid)
        if len(action.get("frame_ms", [])) != action.get("frames", -1):
            raise ValueError(f"{aid}: frame count/timing mismatch")
    return result


def manifests():
    for pattern in ("npc_*/manifest.json", "player_*/manifest.json", "character_*/manifest.json"):
        yield from sorted((ROOT / "assets").glob(pattern))


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(SITE, OUT)
    media = OUT / "media"
    media.mkdir(exist_ok=True)

    index_path = ROOT / "assets/character_stock/index.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {}
    overrides = {v["id"]: v for v in index.get("characters", []) if isinstance(v, dict) and v.get("id")}
    results = []
    actions = motion_actions()
    seen = set()

    for manifest_path in manifests():
        folder = manifest_path.parent
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        if data.get("engine") != "virtual-life-v6b":
            continue  # other asset families are not part of the character stock
        slug = folder.name.removeprefix("npc_").removeprefix("player_").removeprefix("character_")
        if slug in seen:
            raise ValueError("duplicate stock character ID: " + slug)
        if not slug.replace("_", "").replace("-", "").isalnum():
            raise ValueError("unexpected character ID: " + slug)
        seen.add(slug)
        override = overrides.get(slug, {})
        sheet = checked_asset(folder, data["sheet"])
        walk_names = [p for p in data.get("previews", []) if "walk" in p.lower() and "4dirs" in p.lower() and p.lower().endswith(".gif")]
        if not walk_names:
            raise ValueError(f"{slug} needs a 4-direction walk GIF in its manifest")
        checked_asset(folder, walk_names[0])  # require the original stored preview
        fw, fh = data.get("frame", [])
        if (fw, fh) != SIZE or data.get("directions") != ["se", "sw", "ne", "nw"]:
            raise ValueError(f"{slug} is not a valid 64x112 v6b, 4-direction sheet")
        if data.get("walk_frames", 0) < 1:
            raise ValueError(f"{slug} has no walk frames")
        with Image.open(sheet) as image:
            if image.mode != "RGBA" or image.size != (384, 4928):
                raise ValueError(f"{slug}: expected RGBA 384x4928 game sheet")

        frame_count = min(int(data["walk_frames"]), 6)
        walk_row = int(data.get("row_starts", {}).get("walk", 0))
        gif = media / (slug + "-walk.gif")
        poster = media / (slug + "-poster.png")
        save_walk_preview(sheet, gif, poster, walk_row, frame_count)
        shutil.copy2(sheet, media / (slug + "-sheet.png"))
        with Image.open(sheet) as native_sheet:
            frame_y = int(data.get("row_starts", {}).get("idle", 4)) * SIZE[1]
            native_sheet.convert("RGBA").crop(
                (0, frame_y, SIZE[0], frame_y + SIZE[1])
            ).save(media / (slug + "-thumb.png"), optimize=True)
        expressions = save_expression_previews(folder, data, sheet, media, slug)
        motions = available_actions(folder, data, slug, media, actions)

        title = override.get("name") or slug.replace("_", " ").replace("-", " ").title()
        description = override.get("character_look") or data.get("notes", "")
        kind = override.get("type") or data.get("type") or "npc"
        if kind not in ("npc", "player"):
            kind = "npc"
        results.append({
            "id": slug,
            "name": str(title),
            "type": kind,
            "description": str(description),
            "outfit": str(data.get("outfit", "")),
            "hairstyle": str(data.get("hairstyle", "")),
            "walk": "media/" + gif.name,
            "poster": "media/" + poster.name,
            "thumbnail": "media/" + slug + "-thumb.png",
            "sheet": "media/" + slug + "-sheet.png",
            "folder_url": REPO_URL + "/tree/main/" + folder.relative_to(ROOT).as_posix(),
            "source_url": REPO_URL + "/blob/main/" + data.get("generator", ""),
            "timestamp": updated_timestamp(manifest_path),
            "frame_size": "64 × 112",
            "walk_frames": frame_count,
            "expressions": expressions,
            "motions": motions,
        })
        print("Added", slug, "->", gif.relative_to(OUT))

    results.sort(key=lambda c: (-c["timestamp"], c["name"].lower()))
    (OUT / "catalog.json").write_text(
        json.dumps({"version": 1, "characters": results}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    build_animation_catalog(OUT, REPO_URL)
    print(f"Catalog ready: {len(results)} characters at {OUT}")
    return results


if __name__ == "__main__":
    try:
        build()
    except Exception as err:
        print("Catalog build failed:", err, file=sys.stderr)
        raise SystemExit(1)
