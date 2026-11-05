#!/usr/bin/env python3
"""Reuse the EXISTING authored Human expression atlases as 2.0 face-only planes.

Human Male and Female expression sheets are full-body images. Copying them
directly onto a character as "Emotion" would duplicate the whole sprite.
This builder preserves their original pixels but keeps only the native head
surface (with a slight pixel-safe seam margin) on the two forward-facing rows.
The source templates, game sprites, and existing character animations remain
untouched. No expressions are fabricated.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

DIRS = ("se", "sw", "ne", "nw")
FRAME = (64, 112)
FORMAT = "mahluk-2-published-emotion-planes-v1"


def _face_mask(head_atlas: Image.Image, direction_index: int) -> np.ndarray:
    # Use the same native head silhouette as the target Male/Female base.
    crop = head_atlas.crop((0, direction_index * 112, 64, (direction_index + 1) * 112))
    mask = crop.getchannel("A").filter(ImageFilter.MaxFilter(7))
    alpha = np.asarray(mask)
    ys, xs = np.ogrid[:112, :64]
    # Exactly the frontal head surface, not a solid rectangle or body patch.
    return (alpha > 0) & (ys >= 23) & (ys <= 61) & (xs >= 14) & (xs <= 52)


def build_emotion_plane_library(out: Path, results: list[dict]) -> dict:
    media = out / "media"
    dest = media / "mahluk2-emotions"
    dest.mkdir(parents=True, exist_ok=True)
    entries: list[dict] = []
    by_id = {row.get("id"): row for row in results}

    for gender in ("male", "female"):
        actor = by_id.get(f"human_{gender}_base")
        if not actor:
            raise ValueError(f"Human {gender} source absent while building emotion planes")
        head_path = media / "original-rig" / f"{gender}-body-head.png"
        if not head_path.is_file():
            raise FileNotFoundError("Native head plane missing: " + str(head_path))
        with Image.open(head_path) as source:
            head = source.convert("RGBA")
        if head.size != (64, 448):
            raise ValueError(f"{gender}: original head source geometry changed")
        masks = [_face_mask(head, d) for d in range(2)]

        for expression in actor.get("expressions", []):
            name = expression.get("id", "")
            sheet_path = out / str(expression.get("sheet", ""))
            frames = int(expression.get("frames", 0))
            if not name or frames < 1 or frames > 48 or not sheet_path.is_file():
                raise ValueError(f"{gender}: invalid authored expression {name!r}")
            with Image.open(sheet_path) as source:
                original = np.asarray(source.convert("RGBA"))
            if original.shape != (4 * 112, frames * 64, 4):
                raise ValueError(f"{gender}/{name}: authored expression sprite sheet has wrong size")
            plane = np.zeros_like(original)
            for di in range(2):
                for fi in range(frames):
                    y0, x0 = di * 112, fi * 64
                    tile = original[y0:y0 + 112, x0:x0 + 64]
                    target = plane[y0:y0 + 112, x0:x0 + 64]
                    mask = masks[di] & (tile[..., 3] > 0)
                    target[mask] = tile[mask]
            if not np.any(plane[:224, :, 3]):
                raise AssertionError(f"{gender}/{name}: expression asset has no front-face pixels")
            if np.any(plane[224:, :, 3]) or np.any(plane[:224, :, 3].reshape(2, 112, frames * 64)[:, 63:, :]):
                raise AssertionError(f"{gender}/{name}: face overlay leaked into back or body")
            filename = f"{gender}-{name}.png"
            Image.fromarray(plane, "RGBA").save(dest / filename, optimize=True)
            timings = expression.get("frame_ms", [])
            entries.append({
                "id": f"human-{gender}-{name}",
                "label": f"HUMAN {gender.upper()} / {expression.get('label', name).upper()}",
                "base": gender,
                "src": "media/mahluk2-emotions/" + filename,
                "frames": frames,
                "frame_ms": timings if len(timings) == frames else [270] * frames,
                "source_expression": name,
                "source_actor": f"human_{gender}_base",
                "face_only": True,
            })

    manifest = {"format": FORMAT, "directions": list(DIRS),
                "cell": list(FRAME), "entries": entries,
                "source": "published authored Human Male/Female original expression sheets"}
    (out / "emotion-plane-library.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("Mahluk 2.0: built", len(entries), "native Human facial plane animation atlases")
    return manifest


if __name__ == "__main__":
    raise SystemExit("Run through tools/build_character_catalog.py after Human original sources")
