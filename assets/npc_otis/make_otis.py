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
    """Compact Otis helmet / plain squared-off rear; untouched Theodore body.

    New proportions are confined to original helmet/visor pixels:
    turquoise shell x24..48, y30..42 versus old x17..52, y25..44;
    chrome ear fits x45..53, and front muzzle now ends at y66, not y70.
    Rear helmet is an intentionally flat plain box (no wraparound front glass).
    """
    if source.size != (64, 112) or source.mode != "RGBA":
        raise ValueError("Otis requires Theodore's 64x112 RGBA source frame")
    if view not in VIEWS:
        raise ValueError("Unknown facing direction " + view)
    front = view in ("se", "sw")
    mirror = view in ("sw", "nw")
    img = ImageOps.mirror(source) if mirror else source.copy()
    d = ImageDraw.Draw(img)
    # Clear the original Theodore dome only. Keep face, glasses, red suit,
    # arms, pack, trouser silhouettes, shoes and exact ground shadow pixels.
    d.rectangle((18, 26, 50, 42), fill=(0, 0, 0, 0))

    if front:
        # Lower/narrower helmet relative to unchanged Theodore shoulders:
        # no oversized rounded roof or massive overhanging chrome cylinders.
        d.polygon([(24, 40), (24, 35), (27, 32), (32, 30),
                   (44, 30), (48, 33), (48, 41)], fill=C["shell_d"])
        d.polygon([(25, 36), (28, 33), (33, 31),
                   (41, 31), (46, 33), (45, 36)], fill=C["shell_m"])
        d.polygon([(26, 35), (30, 32), (34, 31),
                   (39, 31), (35, 34), (29, 36)], fill=C["shell_l"])
        d.polygon([(41, 31), (45, 32), (47, 35),
                   (47, 40), (44, 37)], fill=C["shell_dark"])
        d.rectangle((24, 39, 48, 41), fill=C["shell_dark"])
        d.line([(24, 39), (37, 39)], fill=C["shell_l"])

        # Retain paired red horns, but short and proportionate to the head.
        d.polygon([(29, 33), (26, 25), (32, 31), (31, 34)], fill=C["red"])
        d.line([(27, 27), (29, 31)], fill=C["red_hi"])
        d.polygon([(42, 32), (45, 24), (45, 35), (42, 35)], fill=C["red"])
        d.line([(45, 26), (44, 31)], fill=C["red_hi"])
        for x in (33, 36, 39, 42):
            d.point((x, 38), fill=C["glow"])

        # Transparent chrome visor: never cover Theodore's original goggles.
        d.rectangle((23, 42, 46, 43), fill=C["chrome_mid"])
        d.line([(24, 42), (41, 42)], fill=C["chrome_hi"])
        d.rectangle((23, 44, 24, 52), fill=C["chrome_d"])
        d.line([(23, 46), (23, 50)], fill=C["chrome_l"])
        d.rectangle((46, 44, 47, 52), fill=C["chrome_d"])
        d.line([(46, 45), (46, 50)], fill=C["chrome_hi"])
        d.line([(25, 53), (46, 53)], fill=C["chrome_d"])

        # Smaller cylindrical ear joint, kept on one side only.
        d.ellipse((45, 40, 53, 54), fill=C["chrome_dark"])
        d.ellipse((46, 41, 52, 53), fill=C["chrome_mid"])
        d.ellipse((47, 42, 51, 52), fill=C["chrome_l"])
        d.line([(47, 43), (49, 42)], fill=C["chrome_hi"])

        # Rotating snout stays mechanical, but no longer dominates the torso.
        d.polygon([(35, 51), (42, 51), (45, 56), (43, 62),
                   (36, 66), (31, 61), (31, 56)], fill=C["chrome_dark"])
        d.polygon([(36, 51), (41, 51), (43, 55),
                   (42, 60), (34, 60), (33, 55)], fill=C["chrome_mid"])
        d.line([(35, 52), (40, 52)], fill=C["chrome_hi"])
        d.ellipse((32, 55, 44, 66), fill=C["chrome_dark"])
        d.ellipse((33, 56, 43, 65), fill=C["chrome_l"])
        d.ellipse((35, 57, 42, 63), fill=C["ink"])
        d.line([(36, 62), (41, 62)], fill=C["red_d"])
        d.point((40, 62), fill=C["red_hi"])
        for spoke in range(4):
            theta = (phase % 8) * math.pi / 4 + spoke * math.pi / 2
            x0 = round(38 + 4 * math.cos(theta))
            y0 = round(60 + 4 * math.sin(theta))
            x1 = round(38 + 6 * math.cos(theta))
            y1 = round(60 + 6 * math.sin(theta))
            d.line([(x0, y0), (x1, y1)], fill=C["chrome_hi"])
        d.arc((32, 55, 44, 66), 20, 180, fill=C["chrome_d"])
    else:
        # Reference rear: FLAT-TOPPED SOLID BOX, not a dome, visor or rear snout.
        # The silver/white pack visible BELOW it belongs to Theodore's body
        # and must remain untouched, as requested.
        d.rectangle((25, 31, 47, 48), fill=C["shell_d"])
        d.rectangle((26, 32, 45, 45), fill=C["shell_m"])
        d.rectangle((26, 32, 43, 34), fill=C["shell_l"])
        d.line([(25, 31), (47, 31)], fill=C["shell_hi"])
        d.rectangle((25, 46, 47, 48), fill=C["shell_dark"])
        # Tiny horn tips remain visible from behind, like the reference.
        d.polygon([(29, 31), (28, 27), (31, 31)], fill=C["red_d"])
        d.polygon([(43, 31), (44, 26), (45, 31)], fill=C["red"])
        d.ellipse((45, 39, 52, 52), fill=C["chrome_dark"])
        d.ellipse((46, 40, 51, 51), fill=C["chrome_mid"])
        d.ellipse((47, 41, 50, 50), fill=C["chrome_l"])
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
                source_name = (f"theodore_{view}_{kind}_f{index}.png" if folder == "frames"
                               else f"theodore_{kind}_{view}_f{index}.png")
                source = THEODORE / folder / source_name
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
