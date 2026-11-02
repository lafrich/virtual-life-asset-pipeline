#!/usr/bin/env python3
"""Compare generated sprites to committed PNGs, pixel for pixel (no image AI).

Usage (from repo root):
  python tools/check_generated_pixels.py 'assets/npc_milk_mascot/sprites/*.png'

Allows PNG metadata/compression to differ; RGBA pixels must be identical.
"""
from __future__ import annotations

import glob
import io
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageChops


def compare_file(file_name: str) -> None:
    path = Path(file_name)
    if path.suffix.lower() != ".png" or not path.is_file():
        raise ValueError(f"Expected generated PNG: {path}")
    prior = subprocess.run(
        ["git", "show", f"HEAD:{path.as_posix()}"],
        capture_output=True, check=True,
    ).stdout
    with Image.open(io.BytesIO(prior)) as old_image, Image.open(path) as fresh_image:
        old = old_image.convert("RGBA")
        fresh = fresh_image.convert("RGBA")
        if old.size != fresh.size or ImageChops.difference(old, fresh).getbbox() is not None:
            raise AssertionError(f"Pixel regression: {path}")
    print(f"PIXEL-EXACT: {path}")


def main() -> None:
    patterns = sys.argv[1:]
    if not patterns:
        raise SystemExit("Pass one or more glob patterns")
    files = sorted({p for pattern in patterns for p in glob.glob(pattern)})
    if not files:
        raise SystemExit("No PNG files matched")
    for file in files:
        compare_file(file)
    print(f"PASS: {len(files)} committed sprite PNG(s) unchanged")


if __name__ == "__main__":
    main()
