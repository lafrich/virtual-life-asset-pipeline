#!/usr/bin/env python3
"""Code-drawn Aladdin Sane-inspired v6b NPC. Run from repository root.

Uses the unmodified v6b game NPC renderer; a makeup layer is added on its
native face-code grid BEFORE compositing. No generative image assets.
"""
import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "chars-iso/v6b/tools"))
import live_v6b as lv
import npc_v6b as nv

NAME = "aladdin_sane"
FAMILY = ROOT / "assets/npc_aladdin_sane"
SPRITES = FAMILY / "sprites"
PREVIEW = FAMILY / "preview"
# All four RGBs already exist in game/index_extract.txt; no newly invented hex.
RED = {"LR": (220, 50, 40), "LD": (215, 38, 30)}
BLUE = {"LB": (62, 111, 168), "LH": (120, 186, 245)}
MAKEUP = {**RED, **BLUE}
# Native reference-block coordinates. Body/hair occlusion uses v6b existing layers.
BOLT = {
    8: (19, 20), 9: (18, 19, 20), 10: (17, 18, 19),
    11: (16, 17, 18), 12: (16, 17), 13: (15, 16),
    14: (15, 16), 15: (15, 16, 17), 16: (16, 17),
    17: (15, 16), 18: (14, 15), 19: (13, 14),
    20: (12, 13), 21: (11, 12), 22: (10, 11),
}
BLUE_EDGE = {9: (17,), 10: (16,), 11: (15,), 12: (15,),
             13: (14,), 14: (14,), 15: (14,), 16: (15,),
             17: (14,), 18: (13,), 19: (12,), 20: (11,),
             21: (10,)}

# Shared game NPC templates, original v6b skin, hair, jeans, shoe primitives.
nv.NPCS[NAME] = dict(
    body="m", skin="light", hair="mid", hc="walnut",
    top="tee_long", tc="paper", pants="trousers", pc="slate",
    shoes="boots", sc="walnut", quiff=True, tufts=True,
)
nv.OUT = str(SPRITES)
_source_build = lv.build_char_layers
_source_face = lv.face_layer
face_silhouette = set()

def build_with_makeup_palette(C, O):
    global face_silhouette
    se, pal = _source_build(C, O)
    face_silhouette = {(x, y) for y in range(7, 24)
                       for x in range(lv.CW) if se["body"][y, x]}
    pal.update(MAKEUP)
    return se, pal

def face_with_lightning(expr, C, view, sitD=0, bob=0, glasses=False, dx=0):
    F, B, G = _source_face(expr, C, view, sitD, bob, glasses, dx)
    if view != "se":
        return F, B, G
    for code, strokes in (("LR", BOLT), ("LB", BLUE_EDGE)):
        for y, xs in strokes.items():
            for x in xs:
                cx = x + lv.OX
                yy = y + sitD + bob
                xx = cx + dx
                # Only apply over the native skin silhouette. Preserve pupils.
                if (cx, y) not in face_silhouette:
                    continue
                if y in (13, 14, 15) and x in (10, 11, 12, 13, 19, 20, 21):
                    continue
                if 0 <= yy < lv.CH and 0 <= xx < lv.CW:
                    F[yy, xx] = code
    # One-pixel highlight on the upper lightning edge and red lower tip.
    for x, y, code in ((19, 9, "LD"), (12, 20, "LD"), (17, 10, "LH")):
        cx, yy, xx = x + lv.OX, y + sitD + bob, x + lv.OX + dx
        if (cx, y) in face_silhouette and 0 <= yy < lv.CH and 0 <= xx < lv.CW:
            F[yy, xx] = code
    return F, B, G

def native_frame(sheet, row, col):
    return sheet.crop((col * 64, row * 112, (col + 1) * 64, (row + 1) * 112))

def make_previews(sheet):
    PREVIEW.mkdir(parents=True, exist_ok=True)
    ink = (231, 235, 242, 255)
    bg = (25, 29, 39, 255)
    s = 4
    col_w, row_h = 64 * s + 24, 112 * s + 30
    out = Image.new("RGBA", (col_w * 6 + 20, row_h * 8 + 50), bg)
    draw = ImageDraw.Draw(out)
    for group, start in (("WALK", 0), ("IDLE", 4)):
        for di, direction in enumerate(lv.DIRS):
            ridx = (0 if group == "WALK" else 4) + di
            y0 = 30 + ridx * row_h
            draw.text((18, y0), group + " / " + direction.upper(), fill=ink)
            for f in range(6 if group == "WALK" else 4):
                x0 = 15 + f * col_w
                fr = native_frame(sheet, start + di, f)
                out.alpha_composite(fr.resize((64*s, 112*s), Image.Resampling.NEAREST), (x0, y0 + 20))
    out.save(PREVIEW / "contact_sheet_4x.png")
    for di, direction in enumerate(lv.DIRS):
        frames = []
        for f in range(6):
            c = Image.new("RGBA", (64*s, 112*s), bg)
            c.alpha_composite(native_frame(sheet, di, f).resize((64*s,112*s), Image.Resampling.NEAREST))
            frames.append(c.convert("RGB"))
        frames[0].save(PREVIEW / ("walk_" + direction + "_4x.gif"),
                       save_all=True, append_images=frames[1:], duration=125, loop=0)
    # A 2:1 floor tile + 4x NPC contextual mock; does not enter the sprite/audit folder.
    mock = Image.new("RGBA", (512, 460), bg)
    md = ImageDraw.Draw(mock)
    for r in range(7):
        for c in range(7):
            x, y = 248 + (c-r)*32, 244 + (c+r)*16
            md.polygon([(x,y),(x+32,y+16),(x,y+32),(x-32,y+16)],
                       fill=(73, 89, 106, 255) if (c+r)%2 else (85, 102, 119, 255),
                       outline=(57, 70, 87, 255))
    mock.alpha_composite(native_frame(sheet, 4, 0).resize((256,448), Image.Resampling.NEAREST),
                         (128, 4))
    mock.save(PREVIEW / "mock_4x.png")

def sanitize_native_pngs():
    """Snap renderer-derived one-offs to already-approved game colors.
    The original renderer's legacy water alpha 46/220 does not meet the new
    asset rule; quantize it before exporting this NPC, without editing game data.
    """
    swap = {
        (0x5B, 0x43, 0x31): (0x5A, 0x41, 0x2F),
        (0x7D, 0x64, 0x52): (0x7A, 0x52, 0x30),
        (0xB4, 0xE0, 0xED): (0xBF, 0xE6, 0xFF),
        (0xB0, 0xE2, 0xF0): (0xBF, 0xE6, 0xFF),
    }
    for p in SPRITES.glob("*.png"):
        a = np.asarray(Image.open(p).convert("RGBA")).copy()
        for src, dest in swap.items():
            m = np.all(a[:, :, :3] == src, axis=2) & (a[:, :, 3] > 0)
            a[m, :3] = dest
        # Legacy water pixels are compositing-only; new sprite alpha is strict.
        a[a[:, :, 3] == 46] = (0, 0, 0, 0)
        a[a[:, :, 3] == 220, 3] = 255
        Image.fromarray(a, "RGBA").save(p, optimize=True)

def audit_native_outputs(sheet, overlays):
    if sheet.size != (384, 4928):
        raise AssertionError("v6b expected 384x4928 sheet, got " + str(sheet.size))
    if sheet.mode != "RGBA":
        raise AssertionError("Sprite must be RGBA")
    for f in [sheet, *overlays]:
        a = np.asarray(f)
        allowed = {0, 56, 255}
        observed = set(map(int, np.unique(a[:,:,3])))
        if observed - allowed:
            raise AssertionError("Unexpected alpha values: " + str(observed))
    return True

def main():
    SPRITES.mkdir(parents=True, exist_ok=True)
    lv.build_char_layers = build_with_makeup_palette
    lv.face_layer = face_with_lightning
    try:
        nv.build(NAME)
    finally:
        lv.build_char_layers = _source_build
        lv.face_layer = _source_face
    sanitize_native_pngs()
    sprite_files = sorted(SPRITES.glob("*.png"))
    path = SPRITES / (NAME + "_v6b_sheet.png")
    sheet = Image.open(path).convert("RGBA")
    overlays = [Image.open(p).convert("RGBA") for p in sprite_files if p != path]
    audit_native_outputs(sheet, overlays)
    make_previews(sheet)
    metadata = {
        "name": NAME, "type": "npc", "engine": "virtual-life-v6b",
        "generator": "assets/npc_aladdin_sane/src/make_aladdin_sane.py",
        "sheet": "sprites/" + path.name, "width": 384, "height": 4928,
        "frame": [64, 112], "pivot": [32, 100], "columns": 6, "rows": 44,
        "directions": ["se", "sw", "ne", "nw"],
        "row_starts": lv.ROWMAP, "idle_frames": 4, "walk_frames": 6,
        "mirrored_views": {"sw": "se", "nw": "ne"},
        "sprites": ["sprites/" + p.name for p in sprite_files],
        "previews": ["preview/contact_sheet_4x.png", "preview/mock_4x.png"] + [
            "preview/walk_" + d + "_4x.gif" for d in lv.DIRS
        ],
        "new_hex": [],
        "makeup_palette_existing_game": {
            k: "#" + "".join(f"{v:02X}" for v in rgb) for k, rgb in MAKEUP.items()
        },
        "notes": "Generated from the game's v6b character renderer; not from image generation."
    }
    (FAMILY / "manifest.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print("BUILT", path, "sprites", len(sprite_files), "directions 4, walk 6, idle 4")
    print("PREVIEW", PREVIEW / "contact_sheet_4x.png")
    print("MOCK", PREVIEW / "mock_4x.png")

if __name__ == "__main__":
    main()
