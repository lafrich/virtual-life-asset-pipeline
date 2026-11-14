"""LGR-1 runtime (Python 3) — Python twin of site/lgr1-raster.js and
site/lgr1-motion.js.

Reads the workbench's LGR-1 binding JSON (wire format
``lafrich-genesis-binding-v1``) and renders 64x112 frames from keyframe
motions in the SHARED data file ``site/media/lgr1/motions.json``. The raster
algorithm (layer groups, per-direction draw order, joint caps / hidden fill,
RotSprite-style Scale2x×3 rotation, Custom Wear nearest-part mask) is kept
line-for-line identical to the JavaScript renderer; tests/test_lgr1_parity.py
asserts 0 differing pixels.

Emosi faces are optional RGBA inputs drawn with the head transform between the
main body group and front hair; they are never generated here.
"""
from __future__ import annotations

import base64
import io
import json
import math
from collections import deque
from pathlib import Path

W, H = 64, 112
# Overflow canvas (option A, preview). Logical 64x112 and pivot (32,100) stay the contract.
# canvas = (x+OX, y+OY); pivot maps to (64, 116). Both flags default off (live-safe).
BW, BH, OX, OY = 128, 128, 32, 16
LOWER_SPRITES = False
CANVAS = "legacy64"  # or "overflow128"
_LEGACY_GEOM = {"cw": W, "ch": H, "ox": 0, "oy": 0, "cn": W * H}
_OVERFLOW_GEOM = {"cw": BW, "ch": BH, "ox": OX, "oy": OY, "cn": BW * BH}
LEG_PARTS = ("leg_far_upper", "leg_far_lower", "leg_near_upper", "leg_near_lower")
DIRECTIONS = ("se", "sw", "ne", "nw")
PARTS = ("leg_far_upper", "leg_far_lower", "arm_far_upper", "arm_far_lower",
         "torso", "leg_near_upper", "leg_near_lower", "arm_near_upper",
         "arm_near_lower", "head", "pelvis")
# Pre-pelvis 10-part contract (still accepted; migrated in memory only).
LEGACY_PARTS = PARTS[:10]
LEGACY_WAIST, LEGACY_HIP, LEGACY_TORSO_PIVOT_Y = 75, 79, 66
N = W * H

def validate(binding: dict) -> dict:
    """Validate all directions and the *existing* source and slice contract."""
    if not isinstance(binding, dict) or binding.get("format") != "lafrich-genesis-binding-v1":
        raise ValueError("Unsupported Genesis binding")
    if binding.get("rigFormat") != "LGR-1":
        raise ValueError("Foreign rig format rejected: expected LGR-1")
    if binding.get("gender") not in ("male", "female"):
        raise ValueError("Invalid Genesis gender")
    if binding.get("id") != "lafrich_genesis_" + binding["gender"]:
        raise ValueError("Invalid master ID")
    if binding.get("sourceId") != "genesis_" + binding["gender"] + "_nude":
        raise ValueError("Only approved V6B Genesis sources are permitted")
    hierarchy = binding.get("hierarchy", {})
    parts = tuple(hierarchy.get("parts", ()))
    if parts not in (PARTS, LEGACY_PARTS):
        raise ValueError("Genesis needs all 11 ordered body parts (or the legacy 10)")
    root = "pelvis" if parts == PARTS else "torso"
    reviews = binding.get("reviewed", {})
    if not isinstance(reviews, dict) or any(
        reviews.get(direction + "|" + part) is not True
        for direction in DIRECTIONS for part in parts
    ):
        raise ValueError("LGR-1 requires manual review of all %d part-angle combinations" % (4 * len(parts)))
    parents = hierarchy.get("parents", {})
    if set(parents) != set(parts) or parents[root] is not None:
        raise ValueError("Incomplete parent graph")
    for part in parts:
        seen, parent = set(), part
        while parent is not None:
            if parent in seen or parent not in parts:
                raise ValueError("Invalid cycle or parent")
            seen.add(parent)
            parent = parents[parent]
    if set(binding.get("views", {})) != set(DIRECTIONS):
        raise ValueError("All four Genesis views must be bound")
    for direction in DIRECTIONS:
        v = binding["views"][direction]
        pivots = v.get("pivots", {})
        if set(pivots) != set(parts):
            raise ValueError("Missing view pivot for " + direction)
        for point in pivots.values():
            if not isinstance(point.get("x"), int) or not isinstance(point.get("y"), int):
                raise ValueError("Pivot coordinates must be integers")
            if not (0 <= point["x"] < W and 0 <= point["y"] < H):
                raise ValueError("Pivot outside native V6B frame")
        try:
            masks = base64.b64decode(v["maskBase64"], validate=True)
        except (KeyError, ValueError) as exc:
            raise ValueError("Corrupt Genesis slice mask") from exc
        if len(masks) != N or any(b != 255 and b >= len(parts) for b in masks):
            raise ValueError("Invalid mask dimensions or body part index")
        if not str(v.get("spritePng", "")).startswith("data:image/png;base64,"):
            raise ValueError("Missing 64x112 PNG source")
    if binding.get("faceSource") != "emosi.exe":
        raise ValueError("Emosi.exe is the only face authoring source")
    return binding

def read_binding(path: str | Path) -> dict:
    """Read .json exported by the Genesis workbench (no arbitrary Python exec)."""
    return validate(json.loads(Path(path).read_text(encoding="utf-8")))


DEG = math.pi / 180
LIBRARY_PATH = Path(__file__).resolve().parent / "media" / "lgr1" / "motions.json"
PARENTS = {"pelvis": None, "torso": "pelvis", "head": "torso",
           "arm_near_upper": "torso", "arm_near_lower": "arm_near_upper",
           "arm_far_upper": "torso", "arm_far_lower": "arm_far_upper",
           "leg_near_upper": "pelvis", "leg_near_lower": "leg_near_upper",
           "leg_far_upper": "pelvis", "leg_far_lower": "leg_far_upper"}
DRAW_ORDER = ("leg_far_lower", "leg_far_upper", "arm_far_lower", "arm_far_upper",
              "pelvis", "torso", "leg_near_lower", "leg_near_upper", "arm_near_upper",
              "arm_near_lower", "head")
GROUPS = (("back", ("hair_back",)),
          ("main", ("body", "pants", "shoes", "top_back", "top", "body_front")),
          ("front", ("hair_front", "accessory")))
LAYERS = ("hair_back", "body", "pants", "shoes", "top_back", "top", "body_front",
          "hair_front", "accessory")
CAP_RADIUS = {"pelvis": 0, "torso": 3, "head": 2, "arm_near_upper": 3, "arm_near_lower": 3,
              "arm_far_upper": 3, "arm_far_lower": 3, "leg_near_upper": 3,
              "leg_near_lower": 3, "leg_far_upper": 3, "leg_far_lower": 3}
INHERIT, UNASSIGNED = 254, 255
# Render-time joint fill radius (px; the waist gets +2). 0 disables. Twin of
# LGR1Raster.JOINT_FILL. Fills only empty seam pixels; the rest pose is unchanged.
JOINT_FILL = 4
# Joint mode (twin of LGR1Raster.JOINT_MODE). "v2" = joint-fix preview:
#  - leg slice clean-up: below the crotch every leg/pelvis pixel belongs to the leg run it sits in,
#    thigh pixels above the crotch go to the pelvis, knee seam at KNEE_Y;
#  - pivots: knee = (shin-run centre, KNEE_Y); hip pivots stay as drawn (HIP_Y=0; set e.g. 78 to re-centre);
#  - no radius caps (head cap kept), no JOINT_FILL crack/web fill;
#  - joint capsules: per joint a rounded end in the child's own fill/outline colours, rotating with
#    the child, drawn under the lower of (parent, child) and clipped so the rest pose is unchanged;
#  - pinhole fill: only enclosed transparent specks of <= PINHOLE px are closed.
# "legacy" = the previous behaviour (caps + JOINT_FILL).
JOINT_MODE = "v2"
KNEE_Y, HIP_Y, PINHOLE, BALL_MAX_R = 90, 0, 2, 4.0  # HIP_Y 0 = keep the artist hip pivots
ANAT = ("head", "torso", "pelvis", "arm_r_upper", "arm_r_lower", "arm_l_upper", "arm_l_lower",
        "leg_r_upper", "leg_r_lower", "leg_l_upper", "leg_l_lower")
DEFAULT_SIDES = {"se": "right", "sw": "left", "ne": "right", "nw": "left"}
FACING = {"se": 1, "sw": -1, "ne": 1, "nw": -1}
SNAPS = (1, 5, 10, 15, 30, 45, 90)


def identity() -> tuple[float, ...]:
    return (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def compose(a, b):
    """Compose two [a,b,c,d,tx,ty] affine matrices as a @ b."""
    aa, ab, ac, ad, ax, ay = a
    ba, bb, bc, bd, bx, by = b
    return (aa * ba + ac * bb, ab * ba + ad * bb,
            aa * bc + ac * bd, ab * bc + ad * bd,
            aa * bx + ac * by + ax, ab * bx + ad * by + ay)


def translate(x: float, y: float):
    return (1.0, 0.0, 0.0, 1.0, float(x), float(y))


def _q9(v: float) -> float:
    return math.floor(v * 1e9 + 0.5) / 1e9


def rotate(degrees: float):
    rad = float(degrees) * DEG
    c, s = _q9(math.cos(rad)), _q9(math.sin(rad))
    return (c, s, -s, c, 0.0, 0.0)


def inverse(m):
    a, b, c, d, x, y = m
    det = a*d-b*c
    if abs(det) < 1e-12:
        raise ValueError("Singular puppet transform")
    return (d/det, -b/det, -c/det, a/det,
            (c*y-d*x)/det, (b*x-a*y)/det)


def map_point(m, x: float, y: float):
    a, b, c, d, tx, ty = m
    return (a*x+c*y+tx, b*x+d*y+ty)


def zero_pose():
    return {part: {"x": 0.0, "y": 0.0, "a": 0.0} for part in PARTS}


# ---------------------------------------------------------------- motions
def _num(v):
    try:
        n = float(v)
    except (TypeError, ValueError):
        return 0.0
    return n if math.isfinite(n) else 0.0


def _check_pose(p, label):
    out = {}
    for k, v in (p or {}).items():
        if k not in ANAT:
            raise ValueError("LGR-1 motion: unknown part %s in %s" % (k, label))
        if not isinstance(v, dict):
            raise ValueError("LGR-1 motion: invalid " + label)
        t = {"x": _num(v.get("x")), "y": _num(v.get("y")), "a": _num(v.get("a"))}
        if abs(t["x"]) > 32 or abs(t["y"]) > 32 or abs(t["a"]) > 360:
            raise ValueError("LGR-1 motion: %s out of range" % label)
        out[k] = t
    return out


def validate_motion(m: dict, poses: dict | None = None) -> dict:
    import re
    if not isinstance(m, dict) or not re.fullmatch(r"[a-z0-9_]{1,40}", str(m.get("id", ""))):
        raise ValueError("LGR-1 motion id must be a-z0-9_ (1-40)")
    source = str(m.get("source") or "neutral")
    if poses is not None and source not in poses:
        raise ValueError("unknown source pose " + source)
    snap_step = m.get("angleSnap")
    snap_step = snap_step if snap_step in SNAPS else 5
    frames = m.get("frames")
    if not isinstance(frames, list) or not 1 <= len(frames) <= 6:
        raise ValueError("LGR-1 motion needs 1-6 keyframes")
    out_frames = []
    for i, f in enumerate(frames):
        ms = f.get("ms") if isinstance(f, dict) else None
        if not isinstance(ms, int) or isinstance(ms, bool) or not 40 <= ms <= 2000:
            raise ValueError("frame %d: ms must be 40-2000" % (i + 1))
        frame = {"ms": ms, "parts": _check_pose(f.get("parts"), m["id"])}
        behind = [p for p in (f.get("behindTorso") or []) if p in ANAT and p not in ("torso", "head", "pelvis")]
        if behind:
            frame["behindTorso"] = behind
        dirs = {}
        for d, p in (f.get("dirs") or {}).items():
            if d not in DIRECTIONS:
                raise ValueError("unknown direction " + d)
            checked = _check_pose(p, m["id"] + "/" + d)
            if checked:
                dirs[d] = checked
        if dirs:
            frame["dirs"] = dirs
        out_frames.append(frame)
    return {"format": "lgr1-motion-v1", "id": m["id"], "name": str(m.get("name") or m["id"])[:60],
            "source": source, "angleSnap": snap_step, "loop": m.get("loop") is not False,
            "frames": out_frames}


def load_library(path: str | Path | None = None) -> dict:
    lib = json.loads(Path(path or LIBRARY_PATH).read_text(encoding="utf-8"))
    if lib.get("format") != "lgr1-motion-library-v1":
        raise ValueError("Not an LGR-1 motion library")
    poses = {k: _check_pose(v, "pose " + k) for k, v in (lib.get("poses") or {}).items()}
    poses.setdefault("neutral", {})
    motions = [validate_motion(m, poses) for m in lib.get("motions", [])]
    return {"format": lib["format"], "poses": poses, "motions": motions}


def sides_of(rig: dict | None) -> dict:
    sides = (rig or {}).get("sides") or {}
    return {d: sides.get(d) if sides.get(d) in ("left", "right") else DEFAULT_SIDES[d]
            for d in DIRECTIONS}


def rig_part(anat: str, direction: str, sides: dict | None = None) -> str:
    if anat in ("head", "torso", "pelvis"):
        return anat
    limb, side, seg = anat.split("_")
    near_side = (sides or DEFAULT_SIDES).get(direction) or DEFAULT_SIDES[direction]
    near = (side == "r") == (near_side == "right")
    return limb + "_" + ("near" if near else "far") + "_" + seg


def snap(a: float, step) -> float:
    s = _num(step) or 1
    return a if s <= 1 else math.floor(a / s + 0.5) * s


def duration(m: dict) -> int:
    return sum(f["ms"] for f in m["frames"])


def frame_index_at(m: dict, ms: float) -> int:
    total = duration(m)
    t = max(0.0, _num(ms))
    t = math.fmod(t, total) if m["loop"] else min(t, total - 1)
    for i, f in enumerate(m["frames"]):
        if t < f["ms"]:
            return i
        t -= f["ms"]
    return len(m["frames"]) - 1


def frame_pose(poses: dict, m: dict, index: int, direction: str, sides: dict | None = None) -> dict:
    f = m["frames"][max(0, min(len(m["frames"]) - 1, int(index)))]
    base, facing, out = poses.get(m["source"], {}), FACING[direction], {}
    for anat in ANAT:
        b, d = base.get(anat, {}), f["parts"].get(anat, {})
        o = f.get("dirs", {}).get(direction, {}).get(anat)
        if o:
            v = {"x": _num(o.get("x")), "y": _num(o.get("y")), "a": _num(o.get("a"))}
        else:
            v = {"x": (_num(b.get("x")) + _num(d.get("x"))) * facing,
                 "y": _num(b.get("y")) + _num(d.get("y")),
                 "a": (_num(b.get("a")) + _num(d.get("a"))) * facing}
        v["a"] = snap(v["a"], m["angleSnap"])
        out[rig_part(anat, direction, sides)] = v
    # torso x/y move the whole body (legacy-identical); pelvis a tilts the hips;
    # torso a bends the upper body at the waist (same rule as lgr1-motion.js).
    out["pelvis"] = {"x": out["pelvis"]["x"] + out["torso"]["x"],
                     "y": out["pelvis"]["y"] + out["torso"]["y"], "a": out["pelvis"]["a"]}
    out["torso"] = {"x": 0, "y": 0, "a": out["torso"]["a"]}
    return out


def frame_order(base_order, m: dict, index: int, direction: str, sides: dict | None = None):
    f = m["frames"][max(0, min(len(m["frames"]) - 1, int(index)))]
    if not f.get("behindTorso"):
        return list(base_order)
    behind = {rig_part(a, direction, sides) for a in f["behindTorso"]}
    rest = [p for p in base_order if p not in behind]
    moved = [p for p in base_order if p in behind]
    t = min(rest.index(p) for p in ("pelvis", "torso") if p in rest)
    return rest[:t] + moved + rest[t:]


def procedural_pose(action: str, t: float, speed: float = 1.0, direction: str = "se",
                    library: dict | None = None, sides: dict | None = None):
    """Pose of a SHARED library motion at time t (seconds). Kept for API
    compatibility; there are no hard-coded presets any more."""
    if not math.isfinite(t) or not math.isfinite(speed):
        raise ValueError("Expected finite time and speed")
    lib = library or load_library()
    motion = next((m for m in lib["motions"] if m["id"] == action), None)
    if motion is None:
        raise ValueError("Unknown LGR-1 motion " + str(action))
    index = frame_index_at(motion, float(t) * max(0.0, speed) * 1000)
    return frame_pose(lib["poses"], motion, index, direction, sides)


# ---------------------------------------------------------------- raster
def _div255(x: int) -> int:
    return (x + 127) // 255


def _over(dst, i, r, g, b, a):
    if a == 0:
        return
    o = i * 4
    if a == 255 or dst[o + 3] == 0:
        dst[o], dst[o + 1], dst[o + 2], dst[o + 3] = r, g, b, a
        return
    da = dst[o + 3]
    inv = 255 - a
    oa = a + _div255(da * inv)
    den = oa * 255

    def mix(s, d):
        num = s * a * 255 + d * da * inv
        return (2 * num + den) // (2 * den)
    dst[o], dst[o + 1], dst[o + 2], dst[o + 3] = mix(r, dst[o]), mix(g, dst[o + 1]), mix(b, dst[o + 2]), oa


def expand_mask(mask) -> bytearray:
    out = bytearray(mask)
    queue = deque(k for k in range(N) if out[k] != UNASSIGNED)
    while queue:
        k = queue.popleft()
        x, owner = k % W, out[k]
        for n in (k - W if k >= W else -1, k - 1 if x > 0 else -1,
                  k + 1 if x < W - 1 else -1, k + W if k + W < N else -1):
            if n >= 0 and out[n] == UNASSIGNED:
                out[n] = owner
                queue.append(n)
    return out


def body_mask(mask, layers: dict) -> bytearray:
    """Mask restricted to pixels where the master body art is visible."""
    out = bytearray([UNASSIGNED]) * N
    for layer in LAYERS:
        src = layers.get(layer)
        if not src:
            continue
        for k in range(N):
            if src[k * 4 + 3]:
                out[k] = mask[k]
    return out


def _valid_order(order) -> bool:
    return isinstance(order, (list, tuple)) and len(order) == len(PARTS) and all(p in order for p in PARTS)


def _bbox(img):
    x0, y0, x1, y1 = W, H, -1, -1
    for k in range(N):
        if img[k * 4 + 3]:
            x, y = k % W, k // W
            x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
    return None if x1 < 0 else (x0, y0, x1, y1)


def prepare_raw(layers: dict, mask, pivots: dict, placements: dict | None = None,
                order=None, caps: dict | None = None, wear: dict | None = None,
                tweak=None, face=None, joint_mode=None) -> dict:
    """Raw-RGBA twin of LGR1Raster.prepare (bytes/bytearray of 64*112*4)."""
    wear = wear or {}
    order = list(order) if _valid_order(order) else list(DRAW_ORDER)
    capr = dict(CAP_RADIUS)
    capr.update(caps or {})
    mode = joint_mode or JOINT_MODE
    if mode == "v2":
        mask, pivots = fix_slice(mask, pivots)
        capr = {k: (v if k == "head" else 0) for k, v in capr.items()}
    expanded = expand_mask(body_mask(mask, layers)) if any(wear.get(l) for l in LAYERS) else None
    groups = {}
    for name, glayers in GROUPS:
        parts = [bytearray(N * 4) for _ in PARTS]
        still = bytearray(N * 4)
        for layer in glayers:
            from_wear = bool(wear.get(layer))
            src = wear.get(layer) or layers.get(layer)
            if not src:
                continue
            # Hair always belongs to the head (long hair must not ride on an arm).
            hair = layer in ("hair_back", "hair_front")
            head = PARTS.index("head")
            for k in range(N):
                a = src[k * 4 + 3]
                if not a:
                    continue
                owner = head if hair else mask[k]
                if from_wear:
                    if tweak is not None and tweak[k] != INHERIT:
                        owner = tweak[k]
                    elif not hair:
                        owner = expanded[k]
                dst = still if owner == UNASSIGNED or owner >= len(PARTS) else parts[owner]
                _over(dst, k, src[k * 4], src[k * 4 + 1], src[k * 4 + 2], a)
        under = [None] * len(PARTS)
        for ci, child in enumerate(PARTS):
            parent = PARENTS[child]
            if not parent:
                continue
            pi = PARTS.index(parent)
            c_img, p_img = parts[ci], parts[pi]
            try:
                r = max(0, min(6, math.floor(float(capr.get(child) or 0))))
            except (TypeError, ValueError):
                r = 0
            pv = pivots[child]
            above = order.index(child) > order.index(parent)
            for k in range(N):
                c = k * 4
                if c_img[c + 3] != 255:
                    continue
                x, y = k % W, k // W
                dx, dy = x - pv["x"], y - pv["y"]
                src = -1
                if r > 0 and dx * dx + dy * dy <= r * r:
                    src = c
                elif above:
                    xl = xr = -1
                    for s in range(x - 1, -1, -1):
                        if p_img[(y * W + s) * 4 + 3] == 255:
                            xl = s
                            break
                    for s in range(x + 1, W):
                        if p_img[(y * W + s) * 4 + 3] == 255:
                            xr = s
                            break
                    if xl >= 0 and xr >= 0:
                        src = (y * W + (xl if x - xl <= xr - x else xr)) * 4
                if src < 0:
                    continue
                img = c_img if src == c else p_img
                if under[pi] is None:
                    under[pi] = bytearray(N * 4)
                under[pi][c:c + 4] = img[src:src + 4]
        entries = {}
        for i, part in enumerate(PARTS):
            img = parts[i]
            if under[i] is not None:
                merged = under[i]
                for k in range(N):
                    c = k * 4
                    if img[c + 3]:
                        _over(merged, k, img[c], img[c + 1], img[c + 2], img[c + 3])
                img = merged
            entries[part] = {"img": img, "bbox": _bbox(img), "scaled": None}
        groups[name] = {"still": still, "parts": entries}
    face_entry = {"img": face, "bbox": _bbox(face), "scaled": None} if face else None
    balls = build_balls(groups["main"]["parts"], pivots, order) if mode == "v2" else {}
    return {"order": order, "pivots": pivots, "placements": placements or {},
            "groups": groups, "face": face_entry, "mode": mode, "balls": balls}


def _runs(xs):
    out, cur = [], []
    for x in xs:
        if cur and x == cur[-1] + 1:
            cur.append(x)
        else:
            if cur:
                out.append(cur)
            cur = [x]
    if cur:
        out.append(cur)
    return out


def fix_slice(mask, pivots):
    """v2 leg slice + hip/knee pivots (in memory; masters untouched). Twin of LGR1Raster.fixSlice."""
    out = bytearray(mask)
    pv = {k: {"x": v["x"], "y": v["y"]} for k, v in pivots.items()}
    pel = PARTS.index("pelvis")
    leg = {"near": (PARTS.index("leg_near_upper"), PARTS.index("leg_near_lower")),
           "far": (PARTS.index("leg_far_upper"), PARTS.index("leg_far_lower"))}
    legset = {leg["near"][0], leg["near"][1], leg["far"][0], leg["far"][1], pel}
    top = next((k // W for k in range(N) if out[k] == leg["far"][0]), -1)
    if top < 0:
        return bytes(out), pv
    row = lambda y: [x for x in range(W) if out[y * W + x] in legset]
    c = top
    while c < KNEE_Y and len(_runs(row(c))) < 2:
        c += 1
    if c >= KNEE_Y:
        return bytes(mask), {k: {"x": v["x"], "y": v["y"]} for k, v in pivots.items()}
    hipx = {s: pv["leg_" + s + "_upper"]["x"] for s in ("near", "far")}
    cent = {}
    for y in range(c, H):
        for run in _runs(row(y)):
            m = (run[0] + run[-1] + 1) / 2
            side = "near" if abs(hipx["near"] - m) <= abs(hipx["far"] - m) else "far"
            for x in run:
                o = mask[y * W + x]
                s = "near" if o in leg["near"] else "far" if o in leg["far"] else side
                out[y * W + x] = leg[s][0 if y < KNEE_Y else 1]
            if (y == c or y == KNEE_Y) and (side, y) not in cent:
                cent[(side, y)] = math.floor(m + 0.5)
    uppers_lowers = {leg["near"][0], leg["near"][1], leg["far"][0], leg["far"][1]}
    for k in range(c * W):
        if out[k] in uppers_lowers:
            out[k] = pel
    for s in ("near", "far"):
        if HIP_Y and (s, c) in cent:
            pv["leg_" + s + "_upper"] = {"x": cent[(s, c)], "y": HIP_Y}
        if (s, KNEE_Y) in cent:
            pv["leg_" + s + "_lower"] = {"x": cent[(s, KNEE_Y)], "y": KNEE_Y}
    return bytes(out), pv


def _seam_run(img, pv):
    px, py = pv["x"], pv["y"]
    for dy in (0, 1, 2, -1, 3, 4, 5, 6, 7, 8):
        y = py + dy
        if not 0 <= y < H:
            continue
        xs = [x for x in range(max(0, px - 5), min(W, px + 5)) if img[(y * W + x) * 4 + 3] == 255]
        if xs:
            best = None
            for run in _runs(xs):
                if best is None or abs((run[0] + run[-1] + 1) / 2 - px) < abs((best[0] + best[-1] + 1) / 2 - px):
                    best = run
            return y, best
    return None, None


def build_balls(parts, pivots, order):
    """v2 joint capsules (twin of LGR1Raster.buildBalls)."""
    balls = {}
    for child, parent in PARENTS.items():
        if not parent or child == "head":
            continue
        cimg = parts[child]["img"]
        pv = pivots[child]
        ys, run = _seam_run(cimg, pv)
        if not run or len(run) < 2:
            continue
        col = lambda x: bytes(cimg[(ys * W + x) * 4:(ys * W + x) * 4 + 4])
        rim = col(run[0])
        inner = [col(x) for x in run[1:-1]] or [rim]
        counts = {}
        for c in inner:
            counts[c] = counts.get(c, 0) + 1
        fill, best = None, -1
        for c, n in counts.items():
            if n > best:
                fill, best = c, n
        r = min(BALL_MAX_R, len(run) / 2)
        cx, cy = pv["x"], pv["y"]
        slot = min(order.index(child), order.index(parent))
        cover = bytearray(N)
        for part in order[slot:]:
            im = parts[part]["img"]
            for k in range(N):
                if im[k * 4 + 3] == 255:
                    cover[k] = 1
        lo, hi, x0r, x1r = min(cy, ys), max(cy, ys), run[0], run[-1]

        def inside(x, y):
            if (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r:
                return True
            return y >= cy and lo <= y < hi + 1 and x0r <= x <= x1r
        img = bytearray(N * 4)
        for y in range(math.floor(lo - r) - 1, math.floor(hi + r) + 2):
            for x in range(math.floor(cx - r) - 2, math.floor(cx + r) + 3):
                if not (0 <= x < W and 0 <= y < H) or not inside(x, y) or not cover[y * W + x]:
                    continue
                edge = not (inside(x + 1, y) and inside(x - 1, y) and inside(x, y + 1) and inside(x, y - 1))
                img[(y * W + x) * 4:(y * W + x) * 4 + 4] = rim if edge else fill
        bb = _bbox(img)
        if bb:
            balls[child] = {"img": img, "bbox": bb, "scaled": None}
    return balls


def canvas_geom(mode=None):
    """Active output canvas. Default legacy 64x112 so existing callers stay pixel-identical."""
    mode = CANVAS if mode is None else mode
    return dict(_OVERFLOW_GEOM if mode == "overflow128" else _LEGACY_GEOM)


def crop_logical(out, canvas=None):
    """Crop an overflow buffer back to the 64x112 logical frame. Byte-identical for unclipped frames."""
    g = canvas_geom(canvas)
    if g["ox"] == 0 and g["oy"] == 0 and g["cw"] == W and g["ch"] == H:
        return out
    cropped = bytearray(N * 4)
    for y in range(H):
        src = ((y + g["oy"]) * g["cw"] + g["ox"]) * 4
        cropped[y * W * 4:(y + 1) * W * 4] = out[src:src + W * 4]
    return cropped


def lower_art_roots():
    media = Path(__file__).resolve().parent / "media" / "lgr1"
    alt = Path("/workspace/lgr-leg-fix-a")
    return (media, alt)


def load_lower_manifest():
    for root in lower_art_roots():
        for p in (root / "lower-manifest.json", root / "manifest.json"):
            if p.is_file():
                return json.loads(p.read_text()), root
    return None, None


def lower_png_path(pose, view, body, outfit, root=None):
    name = f"lgr1_lower_{pose}_{view}_{body}_{outfit}.png"
    roots = (root,) if root is not None else lower_art_roots()
    for r in roots:
        if r is None:
            continue
        for p in (r / "lower" / name, r / "art" / "lower" / name, r / name):
            if p.is_file():
                return p
    return None


def lower_available(pose, view=None, body=None, outfit=None):
    if view and body and outfit:
        return lower_png_path(pose, view, body, outfit) is not None
    pat = f"lgr1_lower_{pose}_*.png"
    for r in lower_art_roots():
        for d in (r / "lower", r / "art" / "lower"):
            if d.is_dir() and next(d.glob(pat), None):
                return True
    return False


def body_id(gender, manifest=None):
    if manifest is None:
        manifest = (load_lower_manifest()[0] or {})
    gender = "female" if gender == "female" else "male"
    for k in (manifest.get("bodies") or {}):
        if k.startswith(gender):
            return k
    return "female9" if gender == "female" else "male8"


def _ang(pose, part):
    return float(((pose or {}).get(part) or {}).get("a", 0) or 0)


def lower_angles(pose):
    return dict(
        thigh=max(abs(_ang(pose, "leg_near_upper")), abs(_ang(pose, "leg_far_upper"))),
        knee=max(abs(_ang(pose, "leg_near_lower")), abs(_ang(pose, "leg_far_lower"))),
        pa=_ang(pose, "pelvis"),
        dy=float(((pose or {}).get("pelvis") or {}).get("y", 0) or 0),
    )


def select_lower(pose, outfit=None, view=None, body=None):
    """Manifest selection_rule + on-disk existence fallbacks. Returns 'rig' or a pose id."""
    a = lower_angles(pose)
    if abs(a["pa"]) >= 60:
        pid = "lie_curl" if (a["knee"] >= 60 or a["thigh"] >= 40) else "lie_straight"
    elif a["dy"] >= 12 and a["knee"] >= 180:
        pid = "sit_floor"
    elif a["dy"] >= 12 and a["knee"] >= 120 and a["thigh"] >= 55:
        pid = "crouch"
    elif a["dy"] >= 6 and a["thigh"] >= 50 and a["knee"] >= 50:
        pid = "sit_chair"
    elif a["dy"] >= 6 and a["thigh"] >= 60 and a["knee"] < 50:
        pid = "sit_long"
    elif a["thigh"] <= 30 and a["knee"] >= 80:
        pid = "kneel"
    else:
        pid = "rig"
    if pid == "rig" and outfit == "skirt" and not any(_ang(pose, p) for p in LEG_PARTS):
        pid = "stand"
    def has(p):
        return lower_available(p, view, body, outfit) if (view and body and outfit) else lower_available(p)
    # Missing art falls back to the rig (no sit_floor → sit_chair). Walk stays on v2 joints.
    if pid != "rig" and not has(pid):
        pid = "rig"
    return pid



# Preview wear (official trousers/skirt files are never written). Used on every
# frame while LOWER_SPRITES is on, including walk/idle rig frames.
SEATED_POSES = frozenset({"sit_chair", "sit_floor", "sit_long", "crouch"})
_PREVIEW_WEAR_NAMES = {
    ("pants", False): "trousers_a",
    ("pants", True): "trousers_a",
    ("skirt", False): "skirt_a",
    ("skirt", True): "skirt_a_seat",
}


def preview_wear_id(outfit, seated=False):
    if outfit not in ("pants", "skirt"):
        return "none"
    name = _PREVIEW_WEAR_NAMES[(outfit, bool(seated) and outfit == "skirt")]
    # Fall back to skirt_a if the optional seated variant is absent.
    if outfit == "skirt" and seated and preview_wear_path(name, "male") is None:
        name = "skirt_a"
    return name


def preview_wear_roots():
    media = Path(__file__).resolve().parent / "media" / "lgr1"
    alt = Path("/workspace/lgr-leg-fix-a")
    return (
        media / "mh-wear" / "preview",
        media / "mh-wear" / "skirt",
        media / "mh-wear" / "pants",
        alt / "art" / "wear",
    )


def preview_wear_path(name, gender):
    suffix = "_f" if gender == "female" else ""
    filename = f"{name}{suffix}.png"
    for root in preview_wear_roots():
        p = root / filename
        if p.is_file():
            return p
    return None


def load_preview_wear(outfit, gender, direction, seated=False):
    """64x112 pants-layer cell (key colours) for one view, or None."""
    name = preview_wear_id(outfit, seated)
    if name == "none":
        return None
    path = preview_wear_path(name, gender)
    if not path:
        return None
    from PIL import Image
    im = Image.open(path).convert("RGBA")
    if im.size[1] != H or im.size[0] % W:
        raise ValueError(f"preview wear must be Nx{H}: {path}")
    di = DIRECTIONS.index(direction)
    cell = im.crop((di * W, 0, di * W + W, H))
    return bytearray(cell.tobytes())


def load_lower_entry(pose_id, view, body, outfit):
    path = lower_png_path(pose_id, view, body, outfit)
    if not path:
        return None
    from PIL import Image
    im = Image.open(path).convert("RGBA")
    if im.size != (W, H):
        raise ValueError(f"lower sprite must be {W}x{H}: {path}")
    img = bytearray(im.tobytes())
    return {"img": img, "bbox": _bbox(img), "scaled": None, "pose": pose_id, "path": str(path)}


def pinhole_fill(out, maxsize=None, geom=None):
    """v2: close only enclosed transparent specks (<= PINHOLE px, 4-connected); twin of LGR1Raster.pinholeFill."""
    maxsize = PINHOLE if maxsize is None else maxsize
    g = geom or canvas_geom()
    cw, ch, cn = g["cw"], g["ch"], g["cn"]
    seen = bytearray(cn)
    st = []
    for k in range(cn):
        x, y = k % cw, k // cw
        if (x == 0 or x == cw - 1 or y == 0 or y == ch - 1) and not out[k * 4 + 3]:
            seen[k] = 1
            st.append(k)
    while st:
        k = st.pop()
        x, y = k % cw, k // cw
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < cw and 0 <= ny < ch:
                n = ny * cw + nx
                if not seen[n] and not out[n * 4 + 3]:
                    seen[n] = 1
                    st.append(n)
    for k in range(cn):
        if out[k * 4 + 3] or seen[k]:
            continue
        comp = [k]
        seen[k] = 1
        i = 0
        while i < len(comp):
            j = comp[i]
            i += 1
            x, y = j % cw, j // cw
            for n in (j - 1, j + 1, j - cw, j + cw):
                if not seen[n] and not out[n * 4 + 3]:
                    seen[n] = 1
                    comp.append(n)
        if len(comp) > maxsize:
            continue
        for j in comp:
            counts = {}
            for n in (j - 1, j + 1, j - cw, j + cw):
                if out[n * 4 + 3] == 255:
                    c = bytes(out[n * 4:n * 4 + 4])
                    counts[c] = counts.get(c, 0) + 1
            best, bn, bs = None, 0, 0
            for c, n in counts.items():
                s3 = c[0] + c[1] + c[2]
                if best is None or n > bn or (n == bn and s3 < bs):
                    best, bn, bs = c, n, s3
            if best is not None:
                out[j * 4:j * 4 + 4] = best


def _pack(d, o):
    return ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) if d[o + 3] else 0


def _scale2x(src, w, h):
    w2 = w * 2
    out = [0] * (w * h * 4)

    def at(x, y):
        return 0 if x < 0 or y < 0 or x >= w or y >= h else src[y * w + x]
    for y in range(h):
        for x in range(w):
            e = src[y * w + x]
            b, d, f, hh = at(x, y - 1), at(x - 1, y), at(x + 1, y), at(x, y + 1)
            e0 = e1 = e2 = e3 = e
            if b != hh and d != f:
                if d == b:
                    e0 = d
                if b == f:
                    e1 = f
                if d == hh:
                    e2 = d
                if hh == f:
                    e3 = f
            o = (2 * y) * w2 + 2 * x
            out[o], out[o + 1], out[o + w2], out[o + w2 + 1] = e0, e1, e2, e3
    return out


def _scaled(entry):
    if entry["scaled"]:
        return entry["scaled"]
    x0, y0, x1, y1 = entry["bbox"]
    ox, oy, w, h = x0 - 1, y0 - 1, x1 - x0 + 3, y1 - y0 + 3
    cur = [0] * (w * h)
    for y in range(h):
        for x in range(w):
            sx, sy = ox + x, oy + y
            cur[y * w + x] = 0 if sx < 0 or sy < 0 or sx >= W or sy >= H else _pack(entry["img"], (sy * W + sx) * 4)
    cw, ch = w, h
    for _ in range(3):
        cur = _scale2x(cur, cw, ch)
        cw, ch = cw * 2, ch * 2
    entry["scaled"] = {"data": cur, "w": cw, "h": ch, "ox": ox, "oy": oy}
    return entry["scaled"]


def raw_matrices(pivots: dict, placements: dict | None, pose: dict) -> dict:
    out = {}
    for part in PARTS:
        chain, node = [], part
        while node is not None:
            chain.insert(0, node)
            node = PARENTS[node]
        mat, angle = (1, 0, 0, 1, 0, 0), 0.0
        for bone in chain:
            t = (pose or {}).get(bone, {}) or {}
            f = (placements or {}).get(bone, {"x": 0, "y": 0}) or {}
            dx = float(t.get("x", 0) or 0) + float(f.get("x", 0) or 0)
            dy = float(t.get("y", 0) or 0) + float(f.get("y", 0) or 0)
            a = float(t.get("a", 0) or 0)
            if not all(math.isfinite(v) for v in (dx, dy, a)):
                raise ValueError("Non-finite procedural pose")
            p = pivots[bone]
            mat = compose(mat, compose(translate(dx, dy), compose(translate(p["x"], p["y"]),
                                                                   compose(rotate(a), translate(-p["x"], -p["y"])))))
            angle += a
        out[part] = {"mat": mat, "angle": angle}
    return out


def _js_round(v):
    return math.floor(v + 0.5)


def _draw_entry(out, entry, tr, geom=None):
    if not entry or not entry["bbox"]:
        return
    x0, y0, x1, y1 = entry["bbox"]
    m = tr["mat"]
    inv = inverse(m)
    right = abs(tr["angle"] - 90 * _js_round(tr["angle"] / 90)) < 1e-9
    xs, ys = [], []
    for cx, cy in ((x0, y0), (x1 + 1, y0), (x0, y1 + 1), (x1 + 1, y1 + 1)):
        px, py = map_point(m, cx, cy)
        xs.append(px)
        ys.append(py)
    g = geom or canvas_geom()
    cw, ch, ox, oy = g["cw"], g["ch"], g["ox"], g["oy"]
    ox0, ox1 = max(0, math.floor(min(xs)) - 1 + ox), min(cw - 1, math.ceil(max(xs)) + 1 + ox)
    oy0, oy1 = max(0, math.floor(min(ys)) - 1 + oy), min(ch - 1, math.ceil(max(ys)) + 1 + oy)
    img = entry["img"]
    sc = None if right else _scaled(entry)
    for y in range(oy0, oy1 + 1):
        for x in range(ox0, ox1 + 1):
            sx, sy = map_point(inv, x - ox + .5, y - oy + .5)
            if right:
                ix, iy = math.floor(sx), math.floor(sy)
                if ix < x0 or ix > x1 or iy < y0 or iy > y1:
                    continue
                o = (iy * W + ix) * 4
                if img[o + 3]:
                    _over(out, y * cw + x, img[o], img[o + 1], img[o + 2], img[o + 3])
            else:
                u, v = math.floor((sx - sc["ox"]) * 8), math.floor((sy - sc["oy"]) * 8)
                if u < 0 or v < 0 or u >= sc["w"] or v >= sc["h"]:
                    continue
                p = sc["data"][v * sc["w"] + u]
                if p:
                    _over(out, y * cw + x, p >> 24, (p >> 16) & 255, (p >> 8) & 255, p & 255)


def render_raw(prep: dict, pose: dict, order=None, canvas=None, lower=None) -> bytearray:
    geom = canvas_geom(canvas)
    out = _render_parts(prep, pose, order, geom=geom, lower=lower)
    if prep.get("mode") == "v2":
        if PINHOLE > 0:
            pinhole_fill(out, geom=geom)
        return out
    if geom["cw"] != W or geom["ch"] != H:
        return out
    if JOINT_FILL > 0:
        tr = raw_matrices(prep["pivots"], prep["placements"], pose)
        joint_fill(out, prep, tr, JOINT_FILL)
        joint_fill(out, prep, tr, JOINT_FILL)
    return out


def _render_parts(prep: dict, pose: dict, order=None, geom=None, lower=None) -> bytearray:
    geom = geom or canvas_geom()
    cw, ox, oy, cn = geom["cw"], geom["ox"], geom["oy"], geom["cn"]
    out = bytearray(cn * 4)
    tr = raw_matrices(prep["pivots"], prep["placements"], pose)
    order = order if _valid_order(order) else prep["order"]
    hide_legs = bool(lower)
    for name, _ in GROUPS:
        grp = prep["groups"][name]
        still = grp["still"]
        for k in range(N):
            c = k * 4
            if still[c + 3]:
                x, y = k % W, k // W
                _over(out, (y + oy) * cw + (x + ox), still[c], still[c + 1], still[c + 2], still[c + 3])
        if name == "main" and lower:
            _draw_entry(out, lower, tr["pelvis"], geom)
        balls = (prep.get("balls") or {}) if name == "main" else {}
        if hide_legs:
            balls = {k: v for k, v in balls.items() if not str(k).startswith("leg_")}
        for idx, part in enumerate(order):
            for child, ball in balls.items():
                if min(order.index(child), order.index(PARENTS[child])) == idx:
                    _draw_entry(out, ball, tr[child], geom)
            if hide_legs and part in LEG_PARTS:
                continue
            _draw_entry(out, grp["parts"][part], tr[part], geom)
        if name == "main" and prep["face"]:
            _draw_entry(out, prep["face"], tr["head"], geom)
    return out


def _crack(al, x, y):
    h = (al(x - 1, y) or al(x - 2, y)) and (al(x + 1, y) or al(x + 2, y)) and (al(x - 1, y) or al(x + 1, y))
    v = (al(x, y - 1) or al(x, y - 2)) and (al(x, y + 1) or al(x, y + 2)) and (al(x, y - 1) or al(x, y + 1))
    return bool(h or v)


def _outside(out):
    """1 = transparent and connected to the canvas border."""
    seen = bytearray(N)
    st = [k for k in range(N) if (k % W in (0, W - 1) or k // W in (0, H - 1)) and not out[k * 4 + 3]]
    for k in st:
        seen[k] = 1
    while st:
        k = st.pop()
        x, y = k % W, k // W
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < W and 0 <= ny < H:
                n = ny * W + nx
                if not seen[n] and not out[n * 4 + 3]:
                    seen[n] = 1
                    st.append(n)
    return seen


def _rest_info(prep):
    if "_rest" not in prep:
        z = zero_pose()
        r0 = _render_parts(prep, z)
        o0 = _outside(r0)
        al = lambda x, y: 0 <= x < W and 0 <= y < H and r0[(y * W + x) * 4 + 3]
        gap = bytearray(N)
        for k in range(N):
            if not r0[k * 4 + 3]:
                gap[k] = 1 if (_crack(al, k % W, k // W) or not o0[k]) else 0
        prep["_rest"] = (gap, raw_matrices(prep["pivots"], prep["placements"], z))
    return prep["_rest"]


def joint_fill(out, prep, tr, R0):
    """Render-time seam fill. Near each joint, an empty pixel that is a narrow
    crack (<=2 px) or an enclosed hole gets the joint pair's own rest colour there
    (child, then parent), else the commonest neighbour colour. Only empty pixels
    are written (never over other art); gaps that already exist at rest (crotch,
    armpits) stay open, so the rest pose renders unchanged."""
    parts = prep["groups"]["main"]["parts"]
    gap, rtr = _rest_info(prep)
    a = lambda x, y: 0 <= x < W and 0 <= y < H and out[(y * W + x) * 4 + 3]
    for child in PARTS:
        parent = PARENTS[child]
        if not parent:
            continue
        imgs = [parts[p]["img"] for p in (child, parent) if parts[p]["bbox"]]
        if not imgs:
            continue
        pv = prep["pivots"][child]
        jx, jy = map_point(tr[parent]["mat"], pv["x"], pv["y"])
        R = R0
        invs = (inverse(tr[parent]["mat"]), inverse(tr[child]["mat"]))
        outside = _outside(out)
        for y in range(max(2, math.floor(jy - R)), min(H - 2, math.ceil(jy + R) + 1)):
            for x in range(max(2, math.floor(jx - R)), min(W - 2, math.ceil(jx + R) + 1)):
                k = y * W + x
                if out[k * 4 + 3] or (x + .5 - jx) ** 2 + (y + .5 - jy) ** 2 > R * R:
                    continue
                if not (_crack(a, x, y) or not outside[k]):
                    continue
                sx, sy = map_point(invs[0], x + .5, y + .5)
                rx, ry = map_point(rtr[parent]["mat"], sx, sy)
                rx, ry = math.floor(rx), math.floor(ry)
                if not (0 <= rx < W and 0 <= ry < H) or gap[ry * W + rx]:
                    continue
                done = False
                for inv in invs:
                    sx, sy = map_point(inv, x + .5, y + .5)
                    ix, iy = math.floor(sx), math.floor(sy)
                    if not (0 <= ix < W and 0 <= iy < H):
                        continue
                    o = (iy * W + ix) * 4
                    for img in imgs:
                        if img[o + 3] == 255:
                            out[k * 4:k * 4 + 4] = img[o:o + 4]
                            done = True
                            break
                    if done:
                        break
                if not done:
                    best, bn, bs = None, 0, 0
                    cnt = {}
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                        o = (ny * W + nx) * 4
                        if out[o + 3] == 255:
                            c4 = bytes(out[o:o + 4])
                            cnt[c4] = cnt.get(c4, 0) + 1
                    for c4, n in cnt.items():
                        s3 = c4[0] + c4[1] + c4[2]
                        if best is None or n > bn or (n == bn and s3 < bs):
                            best, bn, bs = c4, n, s3
                    if best is not None:
                        out[k * 4:k * 4 + 4] = best


def matrices(binding: dict, direction: str, pose: dict):
    """World transforms computed from each view's pivots and parent hierarchy."""
    validate(binding)
    if direction not in DIRECTIONS:
        raise ValueError("Unknown direction")
    v = binding["views"][direction]
    _, pivots = migrate_legacy_view(bytes(N), v["pivots"])
    placements = binding.get("rig", {}).get("placements", {}).get(direction, {})
    return {p: v["mat"] for p, v in raw_matrices(pivots, placements, pose).items()}


def _png_rgba(data_url: str) -> bytes:
    from PIL import Image
    raw = base64.b64decode(data_url.split(",", 1)[1], validate=True)
    image = Image.open(io.BytesIO(raw)).convert("RGBA")
    if image.size != (W, H):
        raise ValueError("Physical layer must be exactly 64x112")
    return image.tobytes()


def migrate_order(order):
    """Insert pelvis before torso in a legacy 10-part draw order."""
    if not isinstance(order, list) or "pelvis" in order or "torso" not in order:
        return order
    t = order.index("torso")
    return order[:t] + ["pelvis"] + order[t:]


def migrate_legacy_view(mask: bytes, pivots: dict):
    """10-part → 11-part in memory (twin of LafrichPuppetCore.migrateLegacyView):
    torso pixels at/below the waist become pelvis; pelvis pivot = hip centre;
    a torso pivot still at the old default y66 moves to the waist."""
    if "pelvis" in pivots:
        return mask, pivots
    out = bytearray(mask)
    T, P = PARTS.index("torso"), PARTS.index("pelvis")
    for k in range(LEGACY_WAIST * W, N):
        if out[k] == T:
            out[k] = P
    tp = pivots.get("torso") or {"x": 32, "y": LEGACY_TORSO_PIVOT_Y}
    pv = dict(pivots)
    pv["pelvis"] = {"x": tp["x"], "y": LEGACY_HIP}
    if tp["y"] == LEGACY_TORSO_PIVOT_Y:
        pv["torso"] = {"x": tp["x"], "y": LEGACY_WAIST}
    return bytes(out), pv


def binding_inputs(binding: dict, direction: str, layer_overrides: dict | None = None):
    """Decode a binding view into raw RGBA inputs for prepare_raw."""
    v = binding["views"][direction]
    rig = binding.get("rig") or {}
    layers = {}
    rig_layers = rig.get("layers") or {}
    if rig_layers:
        for layer in LAYERS:
            png = rig_layers.get(layer, {}).get(direction)
            if png:
                layers[layer] = _png_rgba(png)
    else:
        layers["body"] = _png_rgba(v["spritePng"])
    wear = {}
    for layer, png in (layer_overrides or {}).items():
        if layer not in LAYERS:
            raise ValueError("Only known Genesis physical layers can be overridden")
        if png:
            if not isinstance(png, str) or not png.startswith("data:image/png;base64,"):
                raise ValueError("Invalid physical layer PNG " + layer)
            wear[layer] = _png_rgba(png)
    mask, pivots = migrate_legacy_view(base64.b64decode(v["maskBase64"], validate=True), v["pivots"])
    order = migrate_order((rig.get("drawOrders") or {}).get(direction))
    return {"layers": layers, "wear": wear, "mask": mask, "pivots": pivots,
            "placements": (rig.get("placements") or {}).get(direction, {}),
            "order": order if _valid_order(order) else list(DRAW_ORDER),
            "caps": rig.get("capRadius") or {}}


def render(binding: dict, direction: str, pose: dict, layer_overrides: dict | None = None,
           face: bytes | None = None, order=None, tweak=None, canvas=None, lower=None,
           lower_sprites=None, outfit=None, gender=None):
    """Render one RGBA frame (Pillow image). Default stays 64x112. Pass
    ``canvas='overflow128'`` for the 128x128 overflow buffer. ``layer_overrides``
    are Custom Wear layers; ``face`` is an optional Emosi RGBA cell."""
    from PIL import Image
    validate(binding)
    if direction not in DIRECTIONS:
        raise ValueError("Unknown direction")
    g = gender or binding.get("gender") or (binding.get("rig") or {}).get("gender")
    off = outfit or ("pants" if (layer_overrides or {}).get("pants") else "base")
    use = LOWER_SPRITES if lower_sprites is None else lower_sprites
    pid = select_lower(pose, off, direction, body_id(g)) if use else "rig"
    i = binding_inputs(binding, direction, layer_overrides)
    if use and off in ("pants", "skirt") and not (layer_overrides or {}).get("pants"):
        cell = load_preview_wear(off, "female" if g == "female" else "male",
                                 direction, seated=pid in SEATED_POSES)
        if cell:
            i["wear"] = dict(i["wear"] or {})
            i["wear"]["pants"] = cell
    prep = prepare_raw(i["layers"], i["mask"], i["pivots"], i["placements"], i["order"],
                       i["caps"], i["wear"], tweak, face)
    if lower is None and use:
        body = body_id(g)
        if pid != "rig":
            lower = load_lower_entry(pid, direction, body, off)
    out = render_raw(prep, pose, order, canvas=canvas, lower=lower)
    g = canvas_geom(canvas)
    return Image.frombytes("RGBA", (g["cw"], g["ch"]), bytes(out))


def render_motion(binding: dict, direction: str, motion_id: str, index: int,
                  library: dict | None = None, layer_overrides: dict | None = None):
    lib = library or load_library()
    motion = next((m for m in lib["motions"] if m["id"] == motion_id), None)
    if motion is None:
        raise ValueError("Unknown LGR-1 motion " + motion_id)
    sides = sides_of(binding.get("rig"))
    pose = frame_pose(lib["poses"], motion, index, direction, sides)
    base = binding_inputs(binding, direction)["order"]
    return render(binding, direction, pose, layer_overrides,
                  order=frame_order(base, motion, index, direction, sides))
