#!/usr/bin/env python3
"""Package actual 1x v6b frames into a 4-facing animation preview GIF.

This is a packaging tool, not a pose/animation generator. No missing poses
are synthesized. The user must author frames before the clip can preview.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DIRS = ("se", "sw", "ne", "nw")
SIZE = (64, 112)


def render(manifest_file: Path) -> Path:
    manifest_file = manifest_file.resolve()
    if manifest_file.name != "manifest.json" or not manifest_file.is_relative_to(ROOT / "assets"):
        raise ValueError("Pass assets/anim_<name>/manifest.json")
    data = json.loads(manifest_file.read_text(encoding="utf-8"))
    family = manifest_file.parent.name
    if not family.startswith("anim_"):
        raise ValueError("Animation family must start with anim_")
    slug = family.removeprefix("anim_")
    frames = data.get("frame_count")
    times = data.get("frame_ms")
    if not isinstance(frames, int) or not 2 <= frames <= 40 or not isinstance(times, list) or len(times) != frames:
        raise ValueError("Invalid frame count or durations")
    if any(not isinstance(t, int) or t < 20 for t in times):
        raise ValueError("Frame durations must be positive whole milliseconds")
    scale = 3
    cell_w, cell_h = 64 * scale, 112 * scale
    canvas_w, canvas_h = cell_w * 4 + 5 * 16, cell_h + 56
    frames_out = []
    for index in range(frames):
        canvas = Image.new("RGBA", (canvas_w, canvas_h), (31, 40, 57, 255))
        draw = ImageDraw.Draw(canvas)
        draw.text((18, 8), slug.upper() + "   /   PREVIEW   /   NOT IN GAME", fill=(220, 229, 243))
        for direction_index, direction in enumerate(DIRS):
            path = manifest_file.parent / "frames" / f"{slug}_{direction}_f{index}.png"
            if not path.exists():
                raise FileNotFoundError(f"Missing authored 1x pose: {path}. Template is NOT a finished animation.")
            with Image.open(path) as original:
                if original.size != SIZE or original.mode != "RGBA":
                    raise ValueError(f"Incorrect native 64x112 RGBA frame: {path}")
                tile = original.resize((cell_w, cell_h), Image.Resampling.NEAREST)
            x = 16 + direction_index * (cell_w + 16)
            draw.text((x + 6, 27), direction.upper(), fill=(176, 196, 225))
            canvas.alpha_composite(tile, (x, 42))
        frames_out.append(canvas.convert("RGB"))
    out = manifest_file.parent / "preview" / (slug + "_4views.gif")
    out.parent.mkdir(parents=True, exist_ok=True)
    frames_out[0].save(
        out, format="GIF", save_all=True,
        append_images=frames_out[1:], duration=times, loop=0, disposal=2, optimize=True
    )
    print("Animation preview:", out.relative_to(ROOT), "/", frames, "authored frames x 4 directions")
    return out


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    render(args.manifest)
