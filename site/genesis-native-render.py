"""Genesis V6B native procedural pose renderer (preview/staging).

Uses the original live_v6b.py pixel-code layers, palettes, direction handling
and per-pixel rasterization. Does NOT rotate pre-cut sprite pieces.
This renderer previews Ichsan/Noor live generator configurations as male/female
diagnostics. It does not claim to apply arbitrary Mahluk Custom Wear or install
motions into gameplay: those require verified garment/character adaptation.
"""
import base64
import io
import json
import math
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
import live_v6b as native

BASE = Path(__file__).resolve().parents[1]
CONFIG = {"male": "ichsan", "female": "noor"}
FRAME = (64, 112)
DIRS = ("se", "sw", "ne", "nw")
ANCHORS = {
    "head": (32,44), "neck": (32,53), "torso": (32,67),
    "shoulder_near": (22,63), "elbow_near": (21,70), "hand_near": (20,76),
    "shoulder_far": (42,63), "elbow_far": (43,70), "hand_far": (44,76),
    "hip_near": (28,80), "knee_near": (27,90), "foot_near": (26,100),
    "hip_far": (37,80), "knee_far": (38,90), "foot_far": (39,100),
}
ANGLES = ("head", "torso", "elbow_near", "elbow_far", "knee_near", "knee_far")

def validate(data, gender, direction, frame):
    if gender not in CONFIG or direction not in DIRS:
        raise ValueError("Invalid Genesis diagnostic source / direction")
    if data.get("format") != "genesis-v6b-native-animation-v1":
        raise ValueError("Not a Genesis V6B native animation")
    if data.get("template") not in native.ROWMAP:
        raise ValueError("Native template not found")
    rows = data.get("poses", {}).get(direction)
    if not isinstance(rows, list) or not 0 <= frame < len(rows):
        raise ValueError("Missing frame")
    p = rows[frame]
    if set(p.get("joints", {})) != set(ANCHORS) or set(p.get("angles", {})) != set(ANGLES):
        raise ValueError("Missing anatomy fields")
    for name, coords in p["joints"].items():
        if type(coords.get("x")) is not int or type(coords.get("y")) is not int or not (0 <= coords["x"] < 64 and 0 <= coords["y"] < 112):
            raise ValueError("Invalid joint " + name)
    for v in p["angles"].values():
        if type(v) is not int or abs(v) > 180:
            raise ValueError("Invalid angle")
    return p

@lru_cache(maxsize=2)
def source(gender):
    path = BASE / "live" / "chars" / (CONFIG[gender] + ".json")
    C = json.loads(path.read_text(encoding="utf8"))
    O = C["outfits"][C["default_outfit"]]
    se, pal = native.build_char_layers(C, O)
    ne = native.back_layers(se, C, O)
    return C, O, se, ne, pal

def default_joint(p, name):
    j = p["joints"][name]
    return int(j["x"]), int(j["y"])

def delta(p, name):
    x, y = default_joint(p, name)
    ax, ay = ANCHORS[name]
    return x - ax, y - ay

def draw_arm(layer, shoulder, elbow, hand, palette, sleeve=False):
    """Generate fresh pixel-code line art into the original native arm layer."""
    a = native.empty()
    from PIL import Image as PILImage, ImageDraw as PILDraw
    # Rasterize paths at 1 pixel per original reference block.
    mask = PILImage.new("L", (native.CW, native.CH), 0)
    drawer = PILDraw.Draw(mask)
    points = [(round(x-native.FX), round(y-native.FY)) for x,y in (shoulder,elbow,hand)]
    drawer.line(points[:2], fill=255, width=3)
    drawer.line(points[1:], fill=255, width=3)
    drawer.ellipse((points[-1][0]-1,points[-1][1]-1,points[-1][0]+1,points[-1][1]+1),fill=255)
    pix = np.array(mask)
    for y, x in zip(*np.nonzero(pix)):
        if 0 <= x < native.CW and 0 <= y < native.CH:
            if sleeve and y <= points[-1][1]-2:
                a[y,x] = ("O4","O1","O2")[x%3]
            else:
                a[y,x] = palette[x%3]
    return a

def redraw_arm_if_moved(L, p, side, long_sleeve):
    keys = tuple(f"{q}_{side}" for q in ("shoulder", "elbow", "hand"))
    moved = any(delta(p,k)!=(0,0) for k in keys) or p["angles"].get("elbow_"+side,0)!=0
    if not moved: return
    s,e,h = (default_joint(p,k) for k in keys)
    angle = p["angles"]["elbow_"+side]
    if angle:
        rad = math.radians(angle)
        vx,vy = h[0]-e[0],h[1]-e[1]
        h = (int(round(e[0] + vx*math.cos(rad)-vy*math.sin(rad))),
             int(round(e[1] + vx*math.sin(rad)+vy*math.cos(rad))))
    cols = ("7","i","h") if side=="near" else ("a","e","7")
    L["arm_"+side] = draw_arm(L["arm_"+side],s,e,h,cols,long_sleeve)

def reshape_leg(a, p, leg, split, key):
    """Pixel-by-pixel leg displacement on native pants/shoe code arrays."""
    knee = delta(p,"knee_"+leg)
    foot = delta(p,"foot_"+leg)
    kangle = p["angles"]["knee_"+leg]
    if knee==(0,0) and foot==(0,0) and kangle==0:
        return a
    out=a.copy()
    part = native.empty()
    for y in range(49,native.CH):
        for x in range(native.CW):
            if (x<split if leg=="near" else x>=split) and a[y,x]:
                part[y,x]=a[y,x]
                out[y,x]=""
    for y in range(49,native.CH):
        progress = min(1.0,max(0.0,(y-49)/20))
        dx = round(knee[0]*min(1,progress*1.9) + (foot[0]+round(math.sin(math.radians(kangle))*3)) * max(0,(progress-.5)*2))
        dy = round(knee[1]*min(1,progress*1.9) + foot[1]*max(0,(progress-.5)*2))
        for x in range(native.CW):
            if part[y,x]:
                xx, yy = x+dx, y+dy
                if 0<=xx<native.CW and 0<=yy<native.CH:out[yy,xx]=part[y,x]
    return out

def frame_png(data, gender, direction, frame):
    p = validate(data, gender, direction, frame)
    C, O, se, ne, pal = source(gender)
    view = "se" if direction in ("se","sw") else "ne"
    base = se if view=="se" else ne
    kind = native.KIND[data["template"]]
    # Always use the original procedural pose generator first.
    P = native.pose_layers(base,kind,frame % (6 if data["template"] in ("walk","swim") else 4),view,C,O)
    for key,mapping in pal["_maps"].items():
        P[key] = native.recolor(P[key],mapping)
    # Apply incremental anatomical instructions to native code layers BEFORE
    # converting pixel codes to RGBA. No piecewise sprite-image rotation.
    torso_dx,torso_dy=delta(p,"torso")
    if p["angles"]["torso"]:
        torso_dx+=int(round(math.sin(math.radians(p["angles"]["torso"]))*2))
    if torso_dx or torso_dy:
        for k in native.ORDER:
            if k in ("shadow","shoes","pants","rips","fx"):continue
            P[k]=native.shift_rows(P[k],0,49,torso_dy,torso_dx)
    for side in ("near","far"):
        redraw_arm_if_moved(P,p,side,C.get("sleeves")=="long")
    gap = native.leg_gap(base["pants"])
    for key in ("pants","shoes","rips"):
        for leg in ("near","far"):
            P[key]=reshape_leg(P[key],p,leg,gap,key)
    faces,brows,glasses = native.face_layer("neutral",C,view,glasses=False)
    P["face"],P["brows"],P["acc_head"]=faces,brows,glasses
    # Same 19-layer z-order and original 64x112 framing.
    composite=Image.new("RGBA",FRAME)
    for k in native.ORDER:
        if k in ("shadow","fx"):continue
        a=P.get(k)
        if a is None:continue
        rgba=native.to_img(a,pal)
        fr=native.frame_img({k:rgba})[k]
        composite.alpha_composite(fr)
    if direction in ("sw","nw"):
        composite=composite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    target=io.BytesIO()
    composite.save(target,format="PNG")
    return base64.b64encode(target.getvalue()).decode("ascii")

def render(request):
    return "data:image/png;base64,"+frame_png(
        request["data"],request["gender"],request["direction"],int(request["frame"]))
