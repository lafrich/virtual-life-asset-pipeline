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
from PIL import Image, ImageDraw

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
            "sheet": "media/" + slug + "-sheet.png",
            "folder_url": REPO_URL + "/tree/main/" + folder.relative_to(ROOT).as_posix(),
            "source_url": REPO_URL + "/blob/main/" + data.get("generator", ""),
            "timestamp": updated_timestamp(manifest_path),
            "frame_size": "64 × 112",
            "walk_frames": frame_count,
        })
        print("Added", slug, "->", gif.relative_to(OUT))

    results.sort(key=lambda c: (-c["timestamp"], c["name"].lower()))
    (OUT / "catalog.json").write_text(
        json.dumps({"version": 1, "characters": results}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Catalog ready: {len(results)} characters at {OUT}")
    return results


if __name__ == "__main__":
    try:
        build()
    except Exception as err:
        print("Catalog build failed:", err, file=sys.stderr)
        raise SystemExit(1)
