#!/usr/bin/env python3
"""Fail closed if the public character gallery includes private source assets."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from PIL import Image

PRIVATE_REPO = "github.com/lafrich/virtual-life-asset-pipeline"
ALLOWED_ROOT = {"index.html", "style.css", "app.js", "catalog.json", ".nojekyll", "media"}
ALLOWED_SUFFIXES = {".png", ".gif"}


def audit(root: Path) -> None:
    if not root.is_dir():
        raise ValueError(f"missing export: {root}")
    extras = {p.name for p in root.iterdir()} - ALLOWED_ROOT
    if extras:
        raise ValueError(f"Unexpected public files: {sorted(extras)}")
    for name in ["index.html", "style.css", "app.js", "catalog.json", ".nojekyll"]:
        if not (root / name).is_file():
            raise ValueError(f"Missing public file: {name}")

    data = json.loads((root / "catalog.json").read_text(encoding="utf-8"))
    if not data.get("characters"):
        raise ValueError("No characters in export")
    for character in data["characters"]:
        if not character.get("public_preview_only"):
            raise ValueError(f"Private-mode metadata published for {character['id']}")
        if character.get("source_url") or character.get("folder_url"):
            raise ValueError(f"Private source link found in {character['id']}")
        if not character["sheet"].endswith("-walk-sheet.png"):
            raise ValueError("Master sprite sheet leaked into catalog")

    for name in ("index.html", "style.css", "app.js", "catalog.json"):
        text = (root / name).read_text(encoding="utf-8")
        if PRIVATE_REPO in text:
            raise ValueError(f"Private repo URL leaked into {name}")

    media = root / "media"
    count = 0
    for path in media.rglob("*"):
        if path.is_dir():
            continue
        if path.suffix.lower() not in ALLOWED_SUFFIXES or path.name.endswith("-sheet.png") and not path.name.endswith("-walk-sheet.png"):
            raise ValueError(f"Unapproved public asset: {path.name}")
        if path.name.startswith("."):
            raise ValueError("Hidden file in exported media")
        with Image.open(path) as im:
            w, h = im.size
            # Full engine sheets are 384x4928. Never let them slip into a
            # published Pages artifact, even if their name was changed.
            if h > 500 or w > 500:
                raise ValueError(f"Asset exceeds preview size: {path.name}: {w}x{h}")
            if path.name.endswith("-walk-sheet.png") and (w, h) != (384, 448):
                raise ValueError(f"Not a 4-direction walk-only sheet: {path.name}")
            if path.name.endswith("-face-neutral.png") and (w, h) != (64, 112):
                raise ValueError("Invalid facial preview frame size")
        count += 1
    if not count:
        raise ValueError("No preview media")
    print(f"SAFE: {len(data['characters'])} characters, {count} preview files. No source/master sheets.")


if __name__ == "__main__":
    audit(Path(sys.argv[1] if len(sys.argv) > 1 else "_public_site"))
