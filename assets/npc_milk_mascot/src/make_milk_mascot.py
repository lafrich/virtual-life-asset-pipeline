#!/usr/bin/env python3
"""Milk Mascot: a game-ready 4-direction anthropomorphic carton in native v6b.

The milk carton is hand-authored pixel geometry, *not* an AI image. Legs use
the original live_v6b walking/standing pose rig; costume arms are articulated
white sleeves and gloves. Do not alter the original human sprites.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "chars-iso" / "v6b" / "tools"))
import live_v6b as lv
import npc_v6b as nv

NAME = "milk_mascot"
FOLDER = ROOT / "assets" / "npc_milk_mascot"
SPRITES = FOLDER / "sprites"
PREVIEW = FOLDER / "preview"
FW, FH, COLS, ROWS = 64, 112, 6, 44
ROW_ANIMS = lv.ROWMAP
DIRECTIONS = ("se", "sw", "ne", "nw")
EXPRESSIONS = ("angry", "blink", "emb", "happy", "sad", "sleepy", "smile", "surpr")

# Exact source-game / existing-v6b colors, audited with tools/audit_colors.py.
WHITE = (255, 255, 255)
PAPER = (236, 239, 243)   # #ECEFF3
LIT = (231, 235, 242)     # #E7EBF2
CREAM = (232, 222, 198)   # #E8DEC6
FOLD = (217, 213, 204)    # #D9D5CC
GREY = (185, 192, 204)    # #B9C0CC
DARK = (34, 53, 94)       # #22355E
BLUE_DARK = (62, 90, 136) # #3E5A88
BLUE = (62, 111, 168)     # #3E6FA8
TEAL = (28, 143, 160)     # #1C8FA0
BRIGHT = (142, 205, 235)  # #8ECDEB
SHADOW = (0, 0, 0, 56)

# Width-three (except "m") native bitmap letters, integer pixels, no antialias.
PIXEL_FONT = {
    "m": ("10001", "11011", "10101", "10101", "10101"),
    "i": ("111", "010", "010", "010", "111"),
    "l": ("100", "100", "100", "100", "111"),
    "k": ("101", "110", "100", "110", "101"),
    "s": ("111", "100", "111", "001", "111"),
    "u": ("101", "101", "101", "101", "111"),
}

def pixel_text(draw, txt, x, y, color, spacing=1):
    for char in txt.lower():
        glyph = PIXEL_FONT.get(char)
        if not glyph:
            x += 3 + spacing
            continue
        for gy, row in enumerate(glyph):
            for gx, v in enumerate(row):
                if v == "1":
                    draw.point((x + gx, y + gy), fill=color)
        x += len(glyph[0]) + spacing

def make_rig():
    # The underlying v6b rig only supplies the *moving legs*; there is no
    # hidden human head or human torso in the final assembled sprite.
    npc = dict(body="m", skin="light", hair="short", hc="black",
               top="tee", tc="paper", pants="trousers", pc="lgrey",
               shoes="shoes", sc="paper")
    C, O = nv.make_cfg(npc)
    C["arms"] = "down"
    C["sleeves"] = "short"
    se, _ = lv.build_char_layers(C, O)
    ne = lv.back_layers(se, C, O)
    return C, O, se, ne

def capsule(draw, points, width, light, mid, shade):
    # Hard-edged three-ramp v6b costume sleeve drawn behind body.
    draw.line(points, fill=shade, width=width + 2, joint="curve")
    draw.line(points, fill=mid, width=width, joint="curve")
    inset = [(x - 1, y - 1) for x, y in points]
    draw.line(inset, fill=light, width=max(1, width - 3), joint="curve")

def draw_arms(layer, view, t, bob, kind):
    d = ImageDraw.Draw(layer)
    swing = [0, 2, 1, 0, -2, -1][t % 6] if kind == "walk" else 0
    # Articulated white sleeves/gloves emerge out of the *carton* and never
    # show skin. Left/right phases oppose each other on every walk step.
    for left in (True, False):
        ss = swing if left else -swing
        if left:
            start = (16, 50 + bob)
            elbow = (10 - ss, 60 + bob - ss // 2)
            wrist = (7 - ss, 70 + bob - ss)
            hand = (6 - ss, 74 + bob - ss)
            palm_light = PAPER
        else:
            start = (47, 51 + bob)
            elbow = (52 + ss, 61 + bob + ss // 2)
            wrist = (55 + ss, 70 + bob + ss)
            hand = (56 + ss, 74 + bob + ss)
            palm_light = WHITE
        capsule(d, [start, elbow, wrist], 4, palm_light, PAPER, GREY)
        hx, hy = hand
        d.ellipse((hx - 3, hy - 4, hx + 3, hy + 2), fill=GREY)
        d.ellipse((hx - 3, hy - 4, hx + 1, hy), fill=palm_light)
        # Two rounded glove fingers, avoiding sharp humanoid claws.
        if left:
            d.rectangle((hx - 4, hy, hx - 2, hy + 2), fill=PAPER)
        else:
            d.rectangle((hx + 1, hy, hx + 3, hy + 2), fill=PAPER)

def draw_native_legs(layer, rig, base, kind, frame, view):
    C, O = rig
    # The "pants"/"shoes" movement and z-order are from the project v6b rig.
    native = kind if kind in ("walk", "idle", "talk", "sit", "sit_type",
                              "sleep", "tired", "perch") else "idle"
    P = lv.pose_layers(base, native, frame, view, C, O)
    pats = (P["pants"] != "")
    feet = (P["shoes"] != "")
    a = np.asarray(layer).copy()
    # Native v6b code-grid -> frame offset: FX=15, FY=31.
    for cy in range(lv.CH):
        fy = cy + lv.FY
        if fy < 75 or fy > 100:
            continue
        for cx in range(lv.CW):
            fx = cx + lv.FX
            if not (0 <= fx < FW):
                continue
            if pats[cy, cx]:
                # White fabric trousers retain the original walking silhouette.
                a[fy, fx] = (*((PAPER if cx % 5 else GREY) if view == "se" else
                               (LIT if cx % 6 else GREY)), 255)
            if feet[cy, cx]:
                a[fy, fx] = (*(WHITE if cy % 4 else FOLD), 255)
    return Image.fromarray(a, "RGBA")

def draw_carton(layer, rear, bob, expression="neutral", show_label=True):
    d = ImageDraw.Draw(layer)
    def shift(poly):
        return [(x, y + bob) for x, y in poly]
    def polygon(points, fill):
        d.polygon(shift(points), fill=fill)
    def line(points, fill, width=1):
        d.line(shift(points), fill=fill, width=width)

    # 2:1 isometric roof and three-plane gable carton, true vertical edges.
    # No black outline: all edges use neighboring material colors.
    polygon([(14, 35), (41, 42), (41, 82), (14, 75)], PAPER)   # broad face
    polygon([(41, 42), (50, 34), (50, 74), (41, 82)], CREAM)   # right face
    polygon([(14, 35), (22, 19), (42, 23), (50, 34), (41, 42)], LIT)
    polygon([(22, 19), (23, 13), (43, 17), (45, 25), (42, 23)], FOLD)
    polygon([(24, 14), (42, 17), (43, 19), (24, 16)], WHITE)
    line([(15, 35), (41, 42), (50, 34)], FOLD)
    line([(41, 42), (41, 82)], GREY)
    line([(16, 75), (41, 82)], FOLD)
    line([(23, 19), (43, 23)], GREY)
    line([(14, 35), (22, 19)], GREY)

    # Bold, simple painted label on the folded carton roof.
    polygon([(15, 32), (21, 22), (43, 27), (48, 33), (41, 39)], TEAL)
    polygon([(16, 33), (21, 27), (41, 32), (43, 37)], BLUE)
    line([(17, 33), (40, 39)], BLUE_DARK)

    if rear:
        # Back view is the printed information panel, NOT a second face.
        polygon([(15, 34), (41, 42), (41, 56), (15, 48)], BLUE_DARK)
        polygon([(15, 48), (41, 56), (41, 60), (15, 52)], TEAL)
        line([(16, 58 + bob), (38, 65 + bob)], BLUE, 1)
        line([(16, 61 + bob), (36, 67 + bob)], GREY, 1)
        line([(16, 64 + bob), (37, 70 + bob)], GREY, 1)
        line([(16, 68 + bob), (33, 73 + bob)], GREY, 1)
        # Bar code: sparse readable stripes, 1× pixel strokes.
        for x in range(21, 34, 2):
            d.line([(x, 71 + bob), (x, 74 + bob)], fill=BLUE_DARK)
        if show_label:
            pixel_text(d, "milk", 17, 41 + bob, WHITE)
        polygon([(42, 46), (49, 41), (49, 57), (42, 61)], BLUE)
        line([(43, 56), (48, 52)], DARK)
    else:
        # Front: blue top, warm-white body, eyes and smiling milk-pack face.
        polygon([(14, 36), (41, 43), (41, 55), (14, 49)], TEAL)
        polygon([(16, 38), (40, 44), (40, 47), (16, 42)], BLUE)
        polygon([(14, 49), (41, 55), (41, 58), (14, 52)], BLUE_DARK)
        polygon([(42, 43), (49, 37), (49, 48), (42, 55)], BLUE_DARK)
        # Side information bars continue across the gusset, like printed type.
        for y in range(57, 69, 3):
            line([(43, y), (48, y - 3)], BLUE_DARK)
        # The native 3×5 bitmap word is legible at 1×, on one solid plane.
        if show_label:
            pixel_text(d, "milk", 17, 42 + bob, WHITE)
        # Avoid fully circular eyeballs; chunky 5×5 pixel concentric eyes.
        for x, y in ((21, 61), (33, 64)):
            x, y = x, y + bob
            d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=BLUE_DARK)
            d.ellipse((x - 2, y - 2, x + 2, y + 2), fill=WHITE)
            if expression not in ("blink", "sleepy"):
                d.rectangle((x, y, x + 1, y + 1), fill=DARK)
            else:
                d.line([(x - 2, y), (x + 2, y)], fill=DARK)
        # Small brows; smile + different expression marks.
        line([(18, 56), (22, 55)], BLUE)
        line([(32, 59), (36, 60)], BLUE)
        if expression == "angry":
            line([(21, 72), (28, 71), (36, 74)], DARK)
        elif expression == "sad":
            line([(20, 73), (28, 72), (35, 75)], BLUE_DARK)
        elif expression == "surpr":
            d.ellipse((26, 71 + bob, 30, 75 + bob), fill=BLUE_DARK)
        else:
            line([(20, 71), (25, 74), (32, 75), (36, 73)], BLUE_DARK)
            if expression in ("happy", "smile"):
                line([(22, 74), (28, 76), (34, 74)], BLUE)
        # "pasteurised" equivalent compressed into simple geometric dots.
        for x in range(20, 36, 3):
            d.point((x, 78 + bob - ((x - 20) // 3)), fill=BLUE)
    # Grounded, unbranded feet are below the carton front; no costume head.
    return layer

def render_one(rig, se, ne, anim, t, direction, expression="neutral"):
    rear = direction in ("ne", "nw")
    mirrored = direction in ("sw", "nw")
    view = "ne" if rear else "se"
    base = ne if rear else se
    kind = anim if anim in ("walk", "idle", "talk", "sit", "sit_type",
                            "sleep", "tired", "perch") else "idle"
    bob = (-1 if t % 6 in (1, 4) else 0) if anim == "walk" else (
        -1 if t in (2, 3) and anim == "idle" else 0)
    if anim == "tired":
        bob = 1
    if anim in ("sit", "sit_type", "perch"):
        bob = 4
    frame = Image.new("RGBA", (FW, FH))
    d = ImageDraw.Draw(frame)
    d.ellipse((20, 98, 44, 102), fill=SHADOW)
    frame = draw_native_legs(frame, rig, base, kind, t, view)
    sleeves = Image.new("RGBA", (FW, FH))
    draw_arms(sleeves, view, t, bob, kind)
    frame.alpha_composite(sleeves)
    carton = Image.new("RGBA", (FW, FH))
    draw_carton(carton, rear, bob, expression, show_label=not mirrored)
    frame.alpha_composite(carton)
    if mirrored:
        frame = frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        # v6b SW/NW mirror the physical character, but the carton typography
        # must stay readable, not reverse into a fake brand.
        d = ImageDraw.Draw(frame)
        pixel_text(d, "milk", 29, (41 if rear else 42) + bob, WHITE)
    return frame

def preview(sheet):
    PREVIEW.mkdir(parents=True, exist_ok=True)
    bg = (26, 29, 37, 255)
    frames = []
    duration = []
    for di, d in enumerate(DIRECTIONS):
        for t in range(6):
            src = sheet.crop((t * FW, di * FH, (t + 1) * FW, (di + 1) * FH))
            canvas = Image.new("RGBA", (432, 505), bg)
            draw = ImageDraw.Draw(canvas)
            draw.text((25, 25), "MILK MASCOT   /   V6B", fill=LIT)
            draw.text((25, 49), "COSTUMED NPC   -   4 DIRECTIONS", fill=GREY)
            draw.text((25, 74), "WALK " + d.upper() + " / " + str(t+1) + " OF 6", fill=BRIGHT)
            draw.polygon([(216, 348), (336, 408), (216, 468), (96, 408)],
                         fill=(58, 70, 84), outline=(88, 101, 117))
            canvas.alpha_composite(src.resize((256, 448), Image.Resampling.NEAREST),
                                   (88, 14))
            frames.append(canvas.convert("RGB"))
            duration.append(300 if t == 0 else 130)
    frames[0].save(PREVIEW / "milk_mascot_walk_4dirs_4x.gif", save_all=True,
                   append_images=frames[1:], duration=duration, loop=0,
                   optimize=False)
    # Inspect all 24 walk frames; frame image pixels remain nearest-neighbor.
    contact = Image.new("RGBA", (6 * 264, 4 * 460), bg)
    for di in range(4):
        for t in range(6):
            f = sheet.crop((t*FW, di*FH, (t+1)*FW, (di+1)*FH))
            contact.alpha_composite(f.resize((256,448), Image.Resampling.NEAREST),
                                    (t*264, di*460 + 8))
    contact.save(PREVIEW / "walk_contact_4x.png")
    return frames

def build():
    SPRITES.mkdir(parents=True, exist_ok=True)
    C, O, se, ne = make_rig()
    sheet = Image.new("RGBA", (FW * COLS, FH * ROWS))
    overlays = {ex: Image.new("RGBA", sheet.size) for ex in EXPRESSIONS}
    for name, row in ROW_ANIMS.items():
        count = 6 if name in ("walk", "swim") else 4
        for di, direction in enumerate(DIRECTIONS):
            for f in range(count):
                pos = (f * FW, (row + di) * FH)
                neutral = render_one((C,O), se, ne, name, f, direction)
                sheet.paste(neutral, pos)
                # A full facial-reprint region as a transparent overlay; these
                # are optional game expression sheets and remain pixel-registered.
                for ex in EXPRESSIONS:
                    if direction in ("ne", "nw"):
                        continue
                    altered = render_one((C,O), se, ne, name, f, direction, ex)
                    # Overlay includes changed opaque face-area pixels only.
                    # The white/blue label pixels are intact on both renders.
                    a = np.asarray(neutral)
                    b = np.asarray(altered)
                    changes = np.any(a != b, axis=2)
                    overlay = np.zeros_like(b)
                    overlay[changes] = b[changes]
                    overlays[ex].paste(Image.fromarray(overlay, "RGBA"), pos)
    base = SPRITES / (NAME + "_v6b_sheet.png")
    sheet.save(base, optimize=True)
    for ex, image in overlays.items():
        image.save(SPRITES / (NAME + "_v6b_f" + ex + ".png"), optimize=True)
    preview(sheet)
    outputs = sorted(SPRITES.glob("*.png"))
    manifest = {
      "name": NAME, "type": "npc", "engine": "virtual-life-v6b",
      "generator": "assets/npc_milk_mascot/src/make_milk_mascot.py",
      "sheet": "sprites/" + base.name,
      "sprites": ["sprites/" + p.name for p in outputs],
      "previews": ["preview/milk_mascot_walk_4dirs_4x.gif",
                   "preview/walk_contact_4x.png"],
      "width": 384, "height": 4928,
      "frame": [FW, FH], "pivot": [32, 100], "columns": 6, "rows": 44,
      "directions": list(DIRECTIONS), "row_starts": dict(ROW_ANIMS),
      "walk_frames": 6, "idle_frames": 4,
      "outfit": "blue-and-cream milk-carton costume, white arms, gloves, legs and shoes",
      "hairstyle": "none — carton costume replaces head and torso",
      "rig": "native live_v6b legs with code-drawn articulated mascot sleeves",
      "supported_animated_actions": ["walk", "idle", "talk"],
      "experimental_rows": ["sit", "sit_type", "sleep", "tired", "swim", "float", "lie", "perch"],
      "new_hex": [],
      "notes": "Pixel-authored original milk carton, no image-generation. Costume panel reads MILK; other non-walk rows use simplified placeholder costume poses."
    }
    (FOLDER / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("BUILT", base, "sprites", len(outputs), "walk rows", 4, "frames each", 6)
    print("GIF", PREVIEW / "milk_mascot_walk_4dirs_4x.gif")
    # Audit native sprites locally; there must never be opaque pixels below feet pivot.
    for di in range(4):
        for f in range(6):
            arr = np.asarray(sheet.crop((f*FW, di*FH, (f+1)*FW,(di+1)*FH)))
            if (arr[103:, :, 3] == 255).any():
                raise AssertionError(f"walk row {di} frame {f} has pixels below ground")
    return manifest

if __name__ == "__main__":
    build()
