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
import base64
import binascii
import io
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
THEODORE = ROOT / "assets/npc_theodore"
sys.path.insert(0, str(THEODORE))
import make_theodore as T  # noqa: E402 - genuine Theodore renderer, not a copied NPC

VIEWS = ("se", "sw", "ne", "nw")
EXPRESSIONS = ("neutral", "happy", "surprised", "angry", "sleepy")
POSES = ("sit", "sit_type", "sleep_seat", "nap_stand", "talk")
COUNTS = {"idle": 4, "walk": 6, **{kind: 4 for kind in POSES}}

# Optional approved browser pixel edits, committed as a portable text artifact.
# No upload endpoint / arbitrary remote file modification is involved.
PIXEL_PATCH = HERE / "pixel_overrides.json"
HEAD_REGION = (8, 18, 56, 72)
PATCH_FORMAT = "virtual-life-pixel-patch-v1"


def load_pixel_overrides(path: Path = PIXEL_PATCH) -> dict[tuple[str, str, int], Image.Image]:
    """Validate exact original-frame PNGs; only head-region pixels can change."""
    if not path.exists():
        return {}
    if path.stat().st_size > 15_000_000:
        raise ValueError("Otis overrides exceed 15 MB")
    data = json.loads(path.read_text(encoding="utf-8"))
    if (data.get("format") != PATCH_FORMAT or data.get("version") != 1 or
        data.get("actor") != "legacy_otis" or
        data.get("frame_size") != [64, 112] or
        data.get("region") != list(HEAD_REGION)):
        raise ValueError("Pixel overrides must target the original Otis V6B head only")
    frames = data.get("frames")
    if not isinstance(frames, list) or len(frames) > 140:
        raise ValueError("Too many pixel override frames")
    result = {}
    for item in frames:
        if not isinstance(item, dict):
            raise ValueError("Invalid pixel frame record")
        kind, direction, index = item.get("action"), item.get("direction"), item.get("frame")
        if (kind not in COUNTS or direction not in VIEWS or
            type(index) is not int or not 0 <= index < COUNTS[kind]):
            raise ValueError("Invalid Otis action/view/frame")
        key = (kind, direction, index)
        if key in result:
            raise ValueError("Duplicate pixel overrides for " + str(key))
        value = item.get("png")
        if (not isinstance(value, str) or
            not value.startswith("data:image/png;base64,") or len(value) > 1_000_000):
            raise ValueError("Expected PNG data URL")
        try:
            raw = base64.b64decode(value.split(",", 1)[1], validate=True)
            with Image.open(io.BytesIO(raw)) as image:
                if image.format != "PNG" or image.size != (64, 112) or image.mode != "RGBA":
                    raise ValueError("Edited sprite must be a 64×112 RGBA PNG")
                image.load()
                result[key] = image.copy()
        except (OSError, ValueError, binascii.Error) as error:
            raise ValueError("Invalid edited original PNG frame") from error
    return result


def apply_pixel_override(image: Image.Image, view: str, kind: str,
                         index: int, patches: dict | None = None) -> Image.Image:
    if patches is None:
        patches = load_pixel_overrides()
    updated = patches.get((kind, view, index))
    if updated is None:
        return image
    if image.size != (64, 112) or image.mode != "RGBA":
        raise ValueError("Source Otis frame is not original 64×112 RGBA")
    # Only the editable head rectangle is transplanted. All suit pixels,
    # shoes, grounding, backpacks and silhouettes outside it remain exact.
    out = image.copy()
    out.paste(updated.crop(HEAD_REGION), HEAD_REGION[:2])
    return out

# Pixel-art palette only: solid RGBA, no antialiasing or interpolated colors.
C = {
    "hi": "#D4F0F0", "light": "#95D7DE", "turquoise": "#61B3C4",
    "mid": "#418DA5", "dark": "#2B6479", "edge": "#183F59",
    "c_hi": "#FBF9EA", "c_light": "#DDE5E5", "c_med": "#9EB3BF",
    "c_dark": "#687F90", "c_edge": "#354555",
    "red_l": "#F87D56", "red": "#D63E35", "red_d": "#8F2630",
    "black": "#101A2A", "glow": "#FEF4D4",
}


def helmet(source: Image.Image, view: str, phase: int = 0) -> Image.Image:
    """Pixel-authored Otis helmet on Theodore's actual sprite, no face visible.

    64x112 V6B character, unchanged body / exact anchor and source animations.
    Front: compact turquoise square shell, red horns, four roof lights,
    fully OPAQUE cylindrical chrome visor (no eyes/glasses), side end-cap,
    short rotating steel cage and black opening. Rear: plain flat teal box.
    """
    if source.size != (64, 112) or source.mode != "RGBA":
        raise ValueError("Otis requires Theodore's 64x112 RGBA source frame")
    if view not in VIEWS:
        raise ValueError("Unknown facing direction " + view)
    front = view in ("se", "sw")
    # Theodore faces screen-right in SE/NE and screen-left in SW/NW.
    # The canonical Otis helmet was drawn in the OPPOSITE orientation:
    # end-cap right / nozzle left. Mirror the HEAD for SE/NE, not SW/NW.
    # Source is double-mirrored to preserve the original Theodore body view.
    mirror = view in ("se", "ne")
    im = ImageOps.mirror(source) if mirror else source.copy()
    # The underlying V6B source already knows the true per-frame HEAD bob.
    # Derive the dome's top from source pixels (idle f0 = y30) instead of
    # making up a separate gait or moving the original body.
    head_bbox = im.getchannel("A").crop((18, 22, 50, 43)).getbbox()
    top = 22 + head_bbox[1] if head_bbox else 30
    head_dy = max(-3, min(5, top - 30)) if 27 <= top <= 35 else 0
    old = ImageDraw.Draw(im)
    # Clear only the original dome. No changes below the neck or to backpack.
    old.rectangle((13, 25 + head_dy, 51, 42 + head_dy),
                  fill=(0, 0, 0, 0))
    # Draw the new helmet onto an INDEPENDENT moving part. The original
    # character sprite is never mirrored in the final saved asset.
    head = Image.new("RGBA", (64, 112))
    d = ImageDraw.Draw(head)
    if front:
        # Frontward cylindrical end has an opaque metal wall. In the authored
        # left-facing pose this is x12..18; after SE flip it lands x45..51.
        # This hides Theodore's old goggles/face at the newly forward edge
        # without shifting or deleting any pixels of the red body.
        d.rectangle((12, 43, 18, 53), fill=C["c_edge"])
        d.line([(14, 44), (14, 51)], fill=C["c_dark"])
        # Compact almost-square shell, approximately equal to shoulder width.
        d.polygon([(21, 38), (23, 32), (28, 29), (44, 29),
                   (48, 32), (49, 39), (49, 42), (20, 42)],
                  fill=C["edge"])
        d.polygon([(22, 37), (25, 32), (30, 30), (43, 30),
                   (47, 33), (48, 37), (48, 40), (21, 40)],
                  fill=C["mid"])
        d.polygon([(22, 37), (26, 32), (31, 30), (41, 30),
                   (37, 33), (29, 35), (23, 39)], fill=C["light"])
        d.polygon([(40, 30), (44, 30), (47, 33),
                   (48, 38), (44, 35)], fill=C["turquoise"])
        d.line([(22, 39), (48, 39)], fill=C["dark"])
        d.line([(21, 40), (42, 40)], fill=C["hi"])
        # Short asymmetrical red horns.
        d.polygon([(26, 32), (22, 25), (30, 30), (29, 33)], fill=C["red"])
        d.line([(23, 26), (27, 30)], fill=C["red_l"])
        d.polygon([(42, 30), (46, 24), (46, 33), (43, 33)], fill=C["red"])
        d.line([(46, 25), (44, 30)], fill=C["red_l"])
        for x in (29, 33, 37, 41):
            d.rectangle((x, 39, x + 1, 40), fill=C["glow"])
        # Solid chrome visor completely hides Theodore's eyes and skin.
        # Never render the underlying facial features through clear glass.
        d.polygon([(19, 42), (49, 42), (50, 54), (19, 55)],
                  fill=C["c_edge"])
        d.rectangle((21, 43, 47, 53), fill=C["c_med"])
        d.rectangle((23, 44, 45, 46), fill=C["c_light"])
        d.line([(22, 43), (45, 43)], fill=C["c_hi"])
        d.line([(23, 48), (46, 48)], fill=C["c_dark"])
        d.rectangle((21, 50, 47, 52), fill=C["c_med"])
        d.line([(22, 53), (46, 53)], fill=C["c_dark"])
        d.line([(22, 46), (24, 46)], fill=C["hi"])
        # Chrome cylinder left rim + oversized but proportional right end-cap.
        d.rectangle((18, 43, 20, 54), fill=C["c_edge"])
        d.line([(19, 44), (19, 52)], fill=C["c_light"])
        d.line([(20, 43), (20, 54)], fill=C["c_hi"])
        d.ellipse((44, 40, 53, 56), fill=C["c_edge"])
        d.ellipse((45, 41, 52, 55), fill=C["c_med"])
        d.ellipse((46, 42, 51, 54), fill=C["c_light"])
        d.line([(46, 43), (47, 42)], fill=C["c_hi"])
        d.line([(50, 45), (50, 50)], fill=C["c_med"])
        d.polygon([(25, 54), (45, 54), (44, 59),
                   (29, 59), (25, 56)], fill=C["edge"])
        d.line([(28, 55), (43, 55)], fill=C["dark"])
        # Independent forward-projecting rotating muzzle: do not move torso.
        d.polygon([(33, 53), (41, 52), (45, 56), (44, 62),
                   (37, 67), (31, 61), (30, 56)], fill=C["c_edge"])
        d.polygon([(33, 53), (41, 53), (44, 56),
                   (42, 60), (33, 60), (31, 57)], fill=C["c_med"])
        d.line([(34, 54), (40, 54)], fill=C["c_hi"])
        d.line([(32, 56), (40, 55)], fill=C["c_light"])
        d.ellipse((31, 56, 44, 68), fill=C["c_edge"])
        d.ellipse((32, 57, 43, 67), fill=C["c_light"])
        d.ellipse((34, 58, 42, 65), fill=C["black"])
        d.rectangle((36, 64, 41, 65), fill=C["red_d"])
        d.line([(37, 64), (40, 64)], fill=C["red_l"])
        for spoke in range(4):
            theta = (phase % 8) * math.pi / 4 + spoke * math.pi / 2
            x0 = round(37.5 + 5 * math.cos(theta))
            y0 = round(61 + 5 * math.sin(theta))
            x1 = round(37.5 + 7 * math.cos(theta))
            y1 = round(61 + 7 * math.sin(theta))
            d.line([(x0, y0), (x1, y1)], fill=C["c_hi"])
        d.arc((31, 56, 44, 68), 10, 150, fill=C["c_dark"])
    else:
        # Rear reference: flat-topped uninterrupted rectangular teal shell,
        # twin horn tips and a small side disc; NO face, visor or rear snout.
        d.rectangle((23, 30, 47, 51), fill=C["edge"])
        d.rectangle((24, 31, 46, 49), fill=C["turquoise"])
        d.rectangle((25, 31, 45, 34), fill=C["light"])
        d.line([(24, 31), (45, 31)], fill=C["hi"])
        d.rectangle((25, 35, 45, 47), fill=C["turquoise"])
        d.rectangle((25, 47, 46, 49), fill=C["mid"])
        d.rectangle((24, 50, 47, 51), fill=C["edge"])
        d.polygon([(28, 30), (27, 26), (30, 30)], fill=C["red_d"])
        d.polygon([(43, 30), (45, 25), (45, 30)], fill=C["red"])
        d.ellipse((45, 39, 53, 54), fill=C["c_edge"])
        d.ellipse((46, 40, 52, 53), fill=C["c_med"])
        d.ellipse((47, 41, 51, 52), fill=C["c_light"])
        d.line([(47, 42), (48, 41)], fill=C["c_hi"])
    # Apply the authentic per-frame head displacement to all Otis helmet
    # parts together, including the chrome and rotating muzzle.
    if head_dy:
        head = ImageChops.offset(head, 0, head_dy)
    im.alpha_composite(head)
    return ImageOps.mirror(im) if mirror else im



def frame(view: str, kind: str = "idle", index: int = 0,
          expression: str = "neutral") -> Image.Image:
    """Native source renderer, also used by the catalog's face loop builder."""
    return apply_pixel_override(helmet(T.frame(view, kind, index, expression),
                                       view, index), view, kind, index)


def build() -> None:
    pixel_patches = load_pixel_overrides()
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
                otis = apply_pixel_override(otis, view, kind, index, pixel_patches)
                otis.save(HERE / folder / f"otis_{view}_{kind}_f{index}.png", optimize=True)
        # Purely for 4-view QA of idle shape.
        (HERE / f"otis_{view}.png").write_bytes(
            (HERE / "frames" / f"otis_{view}_idle_f0.png").read_bytes())

    # The opaque visor deliberately hides eyes and brows: no fake facial
    # animation sheet is emitted for Otis. Helmet gestures still use motions.

    print("OTIS: Theodore body/poses preserved, custom rotating helmet,",
          len(VIEWS), "directions,", sum(COUNTS.values()) * len(VIEWS),
          "actor-specific animation frames,", 0, "visible facial variants (opaque visor)")


if __name__ == "__main__":
    build()
