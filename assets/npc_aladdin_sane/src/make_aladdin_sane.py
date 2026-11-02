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
    body="m", skin="light", hair="mid", hc="bowie_copper",
    top="tee", tc="paper", pants="trousers", pc="slate",
    shoes="boots", sc="walnut", quiff=True, tufts=True,
)
# All five copper/rust tones are established colors in the existing game's palette.
nv.HR["bowie_copper"] = [
    "#6E2F1B", "#8A1F22", "#A33A26", "#C85F2A", "#E07A3F"
]
nv.OUT = str(SPRITES)
_source_build = lv.build_char_layers
_source_face = lv.face_layer
_source_back = lv.back_layers
_source_quiff = nv.quiff
_source_pose = lv.pose_layers
face_silhouette = set()

def bare_torso(L, back=False):
    """Replace the v6b garment silhouette with skin-code pixels, on the same
    native pixel grid. Keeps original anatomy, waist, pivot and shadow.
    Applies to both front and back (the base renderer synthesizes a back shirt).
    """
    shirt, body = L["shirt"], L["body"]
    for y in range(21, 44):
        xs = np.flatnonzero(shirt[y] != "")
        if not len(xs):
            continue
        lo, hi = int(xs[0]), int(xs[-1])
        for x in xs:
            x = int(x)
            edge = x == lo or x == hi
            # reference skin ramp, warm and left-lit, with subtle muscle shading
            if edge:
                color = "K7" if x > (lo + hi)//2 else "Ke"
            elif x > (lo + hi)//2 + 2:
                color = "Kh"
            elif y >= 37:
                color = "Kh" if x > (lo + hi)//2 else "Ki"
            else:
                color = "Ki"
            body[y, x] = color
    shirt[:] = ""
    L["shirt_graphic"][:] = ""
    L["acc"][:] = ""
    L["outer"][:] = ""
    if not back:
        # Slim chest, two very faint marks and a small navel. All native codes.
        for x, y, c in [(12, 28, "Kh"), (13, 28, "Kh"),
                        (18, 28, "Kh"), (19, 28, "Kh"),
                        (12, 32, "Ke"), (20, 32, "Ke"),
                        (16, 39, "K7")]:
            cx = x + lv.OX
            if 0 <= y < lv.CH and shirt.shape[1] > cx and body[y, cx] != "":
                body[y, cx] = c
    else:
        # subtle back spine/muscle shading; no vest or top seam
        for x, y in [(15, 30), (15, 32), (15, 34)]:
            cx = x + lv.OX
            if body[y, cx] != "": body[y, cx] = "Kh"

def back_without_shirt(se, C, O):
    back = _source_back(se, C, O)
    bare_torso(back, back=True)
    return back

def bowie_spiky_mullet(se, ne):
    """Keep the native v6b hairstyle rig but sculpt a raised jagged crown,
    swept forelock and several tapering nape strands in both base views.
    Derived entirely from the existing indexed hair layers.
    """
    _source_quiff(se, ne)
    for layers, backwards in ((se, False), (ne, True)):
        front = layers["hair_front"]
        back = layers["hair_back"]
        occupied = np.argwhere(front != "")
        if not len(occupied): continue
        top = int(occupied[:, 0].min())
        base_y = min(top + 6, 13)
        xx = np.flatnonzero(front[base_y] != "")
        if len(xx) < 7:
            xx = occupied[:, 1]
        left, right = int(xx.min()), int(xx.max())
        width = right - left
        # Four connected triangular clumps (not disconnected top-of-head dots).
        peaks = [
          (left + max(2,width//8), max(0, top-1), -3),
          (left + width//3, max(0,top-2), -1),
          (left + width*2//3, max(0,top-2), 1),
          (right - max(1,width//9), max(0,top), 4),
        ]
        for anchor, tipy, sweep in peaks:
            foot_y = min(top + 7, 15)
            tipx = max(1,min(lv.CW-2, anchor + sweep))
            for y in range(tipy, foot_y + 1):
                t = (y-tipy)/max(1,foot_y-tipy)
                center = int(round(tipx*(1-t) + anchor*t))
                thickness = 1 if t < .3 else (2 if t < .65 else 3)
                for x in range(max(1,center-thickness//2), min(lv.CW-1,center+(thickness+1)//2)):
                    if 0 <= y < lv.CH:
                        front[y,x] = "H3" if (x+y)%5 else "H4"
                        if x == center-thickness//2: front[y,x] = "H1"
        # Canted side-swept fringe: reduces the rounded/bowl look.
        for k in range(6):
            y = top + 4 + k
            x = right + 2 - k//2 if not backwards else left - 2 + k//2
            if 0 <= x < lv.CW and 0 <= y < lv.CH:
                front[y, x] = "H1" if k < 2 else "H3"
        # Feathered long nape, behind the jaw/neck, from existing hair mass.
        nape = np.flatnonzero(back[min(21,lv.CH-1)] != "")
        if len(nape):
            lo, hi = int(nape.min()), int(nape.max())
            for idx, bx in enumerate((lo+2,lo+5,hi-5,hi-2)):
                if not (1 <= bx < lv.CW-2): continue
                for k in range(12):
                    y = 20 + k
                    x = bx + (k//6) * (-1 if idx < 2 else 1)
                    if 0 <= y < lv.CH and 0 <= x < lv.CW:
                        back[y,x] = "H1" if k > 8 else ("H4" if k%5==0 else "H3")
        # Bowie sideburns: narrow both sides WITHOUT trimming the tall crown.
        # The original mid-hair generator is a wide, almost square helmet.
        # Taper from temple (row 10) down to the ends (row 29).
        for y in range(10, min(31, lv.CH)):
            row = np.flatnonzero(front[y] != "")
            if len(row) < 13:
                continue
            cut = 2 if y <= 12 else (3 if y <= 20 else 4)
            for x in row[:cut]:
                front[y, int(x)] = ""
            for x in row[-cut:]:
                front[y, int(x)] = ""
        # Ear windows: leave the larger top / back hair masses untouched.
        # Native v6b coordinates (not frame pixels), so these move perfectly
        # with each walk/idle/sit pose, with right-side views mirrored.
        body = layers["body"]
        if not backwards:
            ear_centers = ((11, 15, "near"), (27, 15, "far"))
        else:
            # The v6b back view normally hides the ear under the whole hair cap.
            ear_centers = ((10, 15, "near"), (28, 15, "far"))
        for ex, ey, side in ear_centers:
            ear_shape = ((0,0),(1,0),(-1,1),(0,1),(1,1),
                         (-1,2),(0,2),(1,2),(0,3),(1,3))
            for dx, dy in ear_shape:
                x, y = ex + dx, ey + dy
                if not (0 <= x < lv.CW and 0 <= y < lv.CH):
                    continue
                # Cut a clear negative-space ear silhouette into BOTH hair
                # layers; then paint native skin codes on the existing body.
                front[y,x] = ""
                back[y,x] = ""
                outer = dx == -1 or dx == 1 or dy == 3
                body[y,x] = "K7" if outer else ("Ke" if side == "far" else "Ki")
            # Two-pixel inner-ear fold; deliberately unobtrusive at native 1x.
            x, y = ex, ey+2
            body[y,x] = "Ka"
            if 0 <= x+1 < lv.CW: body[y,x+1] = "Kh"
        # Strip the broad side curtains completely: the Aladdin Sane haircut
        # is layered and tight around the ears, NOT two thick long panels.
        for y in range(13, 31):
            if backwards:
                left_limit, right_limit = (12, 26) if y < 21 else (11, 27)
            else:
                left_limit, right_limit = (13, 26) if y < 21 else (12, 27)
            for x in range(lv.CW):
                if (x < left_limit or x > right_limit):
                    front[y, x] = ""
            # Back hair shares the panel silhouette only near the temples.
            # Preserve center nape/neck while leaving the skin ears exposed.
            if 14 <= y <= 19:
                for ex, _, _ in ear_centers:
                    for x in range(max(0,ex-1),min(lv.CW,ex+2)):
                        back[y,x] = ""
        # Thin graduated nape strands, reaching just past the ears.
        # Leave whitespace between strands, so the result stays airy at 1x.
        for x0, lean in ((12,-1),(27,1)):
            for k in range(8):
                y = 21 + k
                x = x0 + (lean if k > 5 else 0)
                if 0 <= x < lv.CW and y < lv.CH and k not in (5,7):
                    front[y, x] = "H1" if k >= 5 else "H3"
        # Ear cutouts win over ALL hair strands, including the back layer.
        for ex,ey,_side in ear_centers:
            for dx,dy in ear_shape:
                x,y = ex+dx,ey+dy
                if 0 <= x < lv.CW and 0 <= y < lv.CH:
                    front[y,x] = ""
                    back[y,x] = ""
        # Back-left cleanup: remove the redundant tuft on the OUTSIDE of the
        # visible left ear. The haircut grows down the centre nape, not as
        # another lock before the ear. Mirroring gives the matching NW view.
        if backwards:
            for y in range(13, 32):
                left_clear = 9 if y <= 20 else 12
                for x in range(left_clear):
                    front[y, x] = ""
                    back[y, x] = ""
        # Slender tapered sideburn just above the exposed ears.
        for x0 in (8, 30):
            for y in range(10,14):
                if 0 <= x0 < lv.CW and front[y,x0]:
                    front[y,x0] = "H1"
        # Reduce the rigid square silhouette at the ends of the front mullet.
        for y in range(21, min(35,lv.CH)):
            xs = np.flatnonzero(front[y] != "")
            if len(xs) > 4:
                trim = min(3,max(0,(y-22)//4))
                for x in xs[:trim]: front[y,int(x)] = ""
                if y > 27:
                    for x in xs[-trim:]: front[y,int(x)] = ""


def fix_walk_arms_and_boots(base, kind, t, view, C, O):
    """Repair native pose geometry rather than painting over final frames.

    The shared sleeved rig starts hanging arms at row 32. For a bare torso,
    shoulder edges must connect a little higher on BOTH arms. Keep hands,
    steps and the original articulated walk pose unchanged.
    """
    P = _source_pose(base, kind, t, view, C, O)
    if kind not in ("idle", "idle0", "walk", "talk", "tired"):
        return P
    torso = P["body"]
    for key in ("arm_near", "arm_far"):
        arm = P[key]
        ys, xs = np.nonzero(arm != "")
        use = ys[(ys >= 27) & (ys <= 46)]
        if not len(use):
            continue
        top = int(use.min())
        xr = np.flatnonzero(arm[top] != "")
        # Continue the shoulder upward to meet the shirtless chest.
        for y in range(max(26, top - 3), top):
            for x in xr:
                arm[y, int(x)] = arm[top, int(x)]
        # Bridge any one/two-pixel tear between the torso and upper arm,
        # respecting which side of the torso that arm belongs to.
        for y in range(max(26, top-3), min(42, top+5)):
            ax = np.flatnonzero(arm[y] != "")
            bx = np.flatnonzero(torso[y] != "")
            if not len(ax) or not len(bx):
                continue
            am = (int(ax.min()) + int(ax.max())) / 2
            bm = (int(bx.min()) + int(bx.max())) / 2
            if am < bm:
                edge = int(ax.max())
                inside = bx[bx >= edge]
                if not len(inside): continue
                inner = int(inside.min())
                if 0 < inner - edge <= 5:
                    for x in range(edge+1,inner):
                        arm[y,x] = "i" if x < inner-1 else "h"
            else:
                edge = int(ax.min())
                inside = bx[bx <= edge]
                if not len(inside): continue
                inner = int(inside.max())
                if 0 < edge - inner <= 5:
                    for x in range(inner+1,edge):
                        arm[y,x] = "e" if x < edge-1 else "7"
    # Original boot base reaches frame row 102 despite pivot y=100.
    # Keep the boot shaft and toe, remove only the 2px outsole overhang.
    P["shoes"][70:] = ""
    return P

def build_with_makeup_palette(C, O):
    global face_silhouette
    C["sleeves"] = "short"  # bare arms even during walk/talk/sleep
    C["fringe"] = False   # visible face and diagonal lightning
    se, pal = _source_build(C, O)
    bare_torso(se)
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
    make_animated_preview(sheet, bg)
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

def make_animated_preview(sheet, bg):
    """PRIMARY REVIEW: one animated GIF cycling all four 6-frame walks.
    Produced directly from the generated native 64x112 RGBA sheet.
    """
    scale = 4
    size = (432, 500)
    frames, durations = [], []
    for di, direction in enumerate(lv.DIRS):
        for f in range(6):
            o = Image.new("RGBA", size, bg)
            d = ImageDraw.Draw(o)
            d.text((24, 24), "ALADDIN SANE  /  V6B", fill=(235,235,236,255))
            d.text((24, 45), "SHIRTLESS  -  JEANS  -  BOOTS", fill=(171,183,196,255))
            d.text((24, 69), "WALK " + direction.upper() + "  /  " + str(f+1) + " OF 6", fill=(235,235,236,255))
            # 2:1 iso ground diamond; decorative only, separate from sprite output.
            d.polygon([(216,350),(340,412),(216,474),(92,412)],
                      fill=(61,76,95,255),outline=(89,109,129,255))
            tile = native_frame(sheet, di, f).resize(
                (64*scale,112*scale), Image.Resampling.NEAREST)
            o.alpha_composite(tile,(88,18))
            frames.append(o.convert("RGB"))
            durations.append(290 if f==0 else 130)
    frames[0].save(PREVIEW / "aladdin_sane_walk_4dirs_4x.gif",
                   save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, optimize=False)
    # Walking is the only animation preview for review.

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
        (0xAC, 0xD2, 0xDA): (0xBF, 0xE6, 0xFF),
    }
    for p in SPRITES.glob("*.png"):
        a = np.asarray(Image.open(p).convert("RGBA")).copy()
        for src, dest in swap.items():
            m = np.all(a[:, :, :3] == src, axis=2) & (a[:, :, 3] > 0)
            a[m, :3] = dest
        # Legacy water pixels are compositing-only; new sprite alpha is strict.
        a[a[:, :, 3] == 46] = (0, 0, 0, 0)
        a[a[:, :, 3] == 220, 3] = 255
        # An inherited hair-part overlap is still visible under the boots
        # after the base shoe layer is clipped (the source renderer bakes it
        # into the composite). Clear only opaque out-of-pivot pixels on
        # standing poses; preserve legitimate alpha-56 ground shadows.
        for anim in ("walk", "idle", "talk", "tired"):
            row_base = lv.ROWMAP[anim]
            for di in range(4):
                y0 = (row_base + di) * lv.FH
                for f in range(6 if anim == "walk" else 4):
                    x0 = f * lv.FW
                    foot = a[y0 + 101:y0 + 112, x0:x0 + lv.FW]
                    foot[foot[:, :, 3] == 255] = (0, 0, 0, 0)
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
    lv.back_layers = back_without_shirt
    lv.pose_layers = fix_walk_arms_and_boots
    nv.quiff = bowie_spiky_mullet
    try:
        nv.build(NAME)
    finally:
        lv.build_char_layers = _source_build
        lv.face_layer = _source_face
        lv.back_layers = _source_back
        lv.pose_layers = _source_pose
        nv.quiff = _source_quiff
    sanitize_native_pngs()
    sprite_files = sorted(SPRITES.glob("*.png"))
    path = SPRITES / (NAME + "_v6b_sheet.png")
    sheet = Image.open(path).convert("RGBA")
    overlays = [Image.open(p).convert("RGBA") for p in sprite_files if p != path]
    audit_native_outputs(sheet, overlays)
    for d in range(4):
        for f in range(6):
            frame = np.asarray(native_frame(sheet, d, f))
            if np.any(frame[101:, :, 3] == 255):
                raise AssertionError("Boot pixels exceed y=100 foot pivot")
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
        "previews": [
            "preview/aladdin_sane_walk_4dirs_4x.gif",
             "preview/contact_sheet_4x.png", "preview/mock_4x.png"
        ] + [
            "preview/walk_" + d + "_4x.gif" for d in lv.DIRS
        ],
        "outfit": "shirtless, slate jeans, brown boots",
        "hairstyle": "copper-red swept spikes, slimmer sides, visible ears",
        "new_hex": [],
        "makeup_palette_existing_game": {
            k: "#" + "".join(f"{v:02X}" for v in rgb) for k, rgb in MAKEUP.items()
        },
        "notes": "Generated from native v6b code. Walk-only GIF preview. Torso and arm joints repaired; outsole aligned to pivot."
    }
    (FAMILY / "manifest.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print("BUILT", path, "sprites", len(sprite_files), "directions 4, walk 6, idle 4")
    print("PREVIEW", PREVIEW / "contact_sheet_4x.png")
    print("MOCK", PREVIEW / "mock_4x.png")

if __name__ == "__main__":
    main()
