#!/usr/bin/env python3
"""Otis — Theodore's exact original V6B body, with a new animating helmet.

Input: real 64x112 RGBA source frames from assets/npc_theodore.
ALL suit / limbs / boots / backpack, grounding and pose motion are copied
pixel-for-pixel; only the helmet is redrawn. The forward cylindrical snout
has a four/eight-phase rotating chrome cage (visible on idle/walk/talk).
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
THEODORE = ROOT / "assets/npc_theodore"
sys.path.insert(0, str(THEODORE))
import make_theodore as T  # noqa: E402 - genuine Theodore renderer, not a copied NPC

VIEWS = ("se", "sw", "ne", "nw")
EXPRESSIONS = ("neutral", "happy", "surprised", "angry", "sleepy")
POSES = ("sit", "sit_type", "sleep_seat", "nap_stand", "talk")
COUNTS = {"idle": 4, "walk": 6, **{kind: 4 for kind in POSES}}

# Pixel-art palette only: solid RGBA, no antialiasing or interpolated colors.
C = {
    "shell_hi": "#D5EFF0", "shell_l": "#97D0D9",
    "shell_m": "#65B5C8", "shell_d": "#3588A3", "shell_dark": "#245A73",
    "chrome_hi": "#F1ECDB", "chrome_l": "#D6E0E0",
    "chrome_mid": "#92ABBA", "chrome_d": "#607F91", "chrome_dark": "#3B4D60",
    "red_hi": "#FF784F", "red": "#D43C2C", "red_d": "#8D202D",
    "ink": "#111B29", "glow": "#FFF3D5",
}


def helmet(source: Image.Image, view: str, phase: int = 0) -> Image.Image:
    """Swap only the original helmet; preserve Theodore's goggles/face/body."""
    if source.size != (64, 112) or source.mode != "RGBA":
        raise ValueError("Otis requires Theodore's 64x112 RGBA source frame")
    if view not in VIEWS:
        raise ValueError("Unknown facing direction " + view)
    front = view in ("se", "sw")
    mirror = view in ("sw", "nw")
    img = ImageOps.mirror(source) if mirror else source.copy()
    d = ImageDraw.Draw(img)
    # Remove the previous short metal dome only. Never erase goggles or suit.
    d.rectangle((18, 26, 50, 42), fill=(0, 0, 0, 0))

    # Wide turquoise machine shell with rounded-rect top and angled sloping brim.
    d.polygon([(17, 40), (18, 35), (22, 29), (28, 26), (40, 25),
               (46, 27), (50, 32), (52, 39), (51, 44), (18, 44)],
              fill=C["shell_d"])
    d.polygon([(18, 38), (20, 33), (25, 29), (30, 27),
               (39, 26), (46, 28), (50, 33), (50, 38)], fill=C["shell_m"])
    d.polygon([(19, 36), (21, 32), (26, 29), (31, 28),
               (37, 28), (32, 31), (26, 34), (20, 39)], fill=C["shell_l"])
    d.polygon([(31, 28), (40, 27), (47, 29), (50, 34),
               (50, 36), (46, 35), (42, 33), (37, 33)], fill=C["shell_d"])
    d.rectangle((19, 39, 51, 41), fill=C["shell_dark"])
    d.line([(19, 39), (26, 39)], fill=C["chrome_hi"])

    # Twin red conical horns, asymmetric as in reference.
    d.polygon([(22, 31), (17, 21), (26, 28), (25, 34)], fill=C["red"])
    d.polygon([(18, 22), (24, 29), (22, 28)], fill=C["red_hi"])
    d.polygon([(42, 28), (46, 18), (47, 31), (44, 34)], fill=C["red"])
    d.polygon([(46, 19), (46, 29), (44, 28)], fill=C["red_hi"])
    d.point((25, 34), fill=C["red_d"])
    d.point((44, 34), fill=C["red_d"])
    for x in (30, 33, 36, 39):
        d.rectangle((x, 38, x + 1, 39), fill=C["glow"])

    # Cylindrical steel visor; center stays transparent so Theodore's original
    # round spectacles and facial expressions remain VISIBLE inside the helmet.
    d.rectangle((18, 42, 49, 43), fill=C["chrome_mid"])
    d.line([(21, 42), (40, 42)], fill=C["chrome_hi"])
    d.rectangle((18, 44, 20, 53), fill=C["chrome_d"])
    d.line([(19, 45), (19, 51)], fill=C["chrome_hi"])
    d.rectangle((47, 44, 49, 54), fill=C["chrome_d"])
    d.line([(48, 45), (48, 50)], fill=C["chrome_l"])
    d.line([(21, 53), (47, 53)], fill=C["chrome_d"])
    d.line([(23, 54), (43, 54)], fill=C["chrome_mid"])
    d.line([(23, 45), (27, 44)], fill=C["shell_l"])

    # Heavy circular side socket / ear housing.
    d.ellipse((46, 39, 55, 56), fill=C["chrome_dark"])
    d.ellipse((47, 40, 54, 55), fill=C["chrome_mid"])
    d.ellipse((48, 41, 53, 54), fill=C["chrome_l"])
    d.line([(48, 43), (49, 42)], fill=C["chrome_hi"])

    if front:
        # Forward-facing muzzle with dark hollow center and a rotating
        # four-spoke metal cage; the underlying V6B suit remains untouched.
        d.polygon([(34, 51), (44, 51), (48, 57), (46, 64),
                   (39, 69), (33, 65), (31, 58)], fill=C["chrome_dark"])
        d.polygon([(35, 51), (43, 50), (46, 54),
                   (44, 61), (36, 63), (32, 58)], fill=C["chrome_mid"])
        d.line([(36, 52), (42, 52)], fill=C["chrome_hi"])
        d.ellipse((32, 55, 46, 70), fill=C["chrome_dark"])
        d.ellipse((33, 56, 45, 69), fill=C["chrome_l"])
        d.ellipse((35, 58, 44, 68), fill=C["ink"])
        d.ellipse((37, 65, 42, 67), fill=C["red_d"])
        d.line([(37, 65), (41, 65)], fill=C["red_hi"])
        for spoke in range(4):
            theta = (phase % 8) * math.pi / 4 + spoke * math.pi / 2
            x0 = round(39 + 6 * math.cos(theta))
            y0 = round(63 + 6 * math.sin(theta))
            x1 = round(39 + 8 * math.cos(theta))
            y1 = round(63 + 8 * math.sin(theta))
            d.line([(x0, y0), (x1, y1)], fill=C["chrome_hi"], width=2)
        d.arc((32, 55, 46, 70), 15, 170, fill=C["chrome_d"], width=2)
        d.arc((32, 55, 46, 70), 190, 350, fill=C["chrome_hi"])
    else:
        # No magical second front snout on back-facing views.
        d.rectangle((23, 43, 48, 49), fill=C["shell_m"])
        d.line([(24, 44), (43, 44)], fill=C["shell_l"])
        d.rectangle((23, 49, 49, 51), fill=C["chrome_mid"])
        d.line([(25, 50), (45, 50)], fill=C["chrome_hi"])
    return ImageOps.mirror(img) if mirror else img


def frame(view: str, kind: str = "idle", index: int = 0,
          expression: str = "neutral") -> Image.Image:
    """Native source renderer, also used by the catalog's face loop builder."""
    return helmet(T.frame(view, kind, index, expression), view, index)


def build() -> None:
    for part in ("frames", "poses", "expr"):
        (HERE / part).mkdir(parents=True, exist_ok=True)

    for view in VIEWS:
        for kind in ("idle", "walk", *POSES):
            folder = "frames" if kind in ("idle", "walk") else "poses"
            for index in range(COUNTS[kind]):
                source = THEODORE / folder / f"theodore_{view}_{kind}_f{index}.png"
                if not source.is_file():
                    raise FileNotFoundError("Original Theodore pose missing: " + str(source))
                with Image.open(source) as input_image:
                    otis = helmet(input_image.convert("RGBA"), view, index)
                otis.save(HERE / folder / f"otis_{view}_{kind}_f{index}.png", optimize=True)
        # Purely for 4-view QA of idle shape.
        (HERE / f"otis_{view}.png").write_bytes(
            (HERE / "frames" / f"otis_{view}_idle_f0.png").read_bytes())

    for expression in EXPRESSIONS:
        # Genuine Theodore v6b expression and glasses, under the Otis shell.
        frame("se", "idle", 0, expression).save(
            HERE / "expr" / f"otis_se_{expression}.png", optimize=True)

    print("OTIS: Theodore body/poses preserved, custom rotating helmet,",
          len(VIEWS), "directions,", sum(COUNTS.values()) * len(VIEWS),
          "actor-specific animation frames,", len(EXPRESSIONS), "faces")


if __name__ == "__main__":
    build()
