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
                tweak=None, face=None) -> dict:
    """Raw-RGBA twin of LGR1Raster.prepare (bytes/bytearray of 64*112*4)."""
    wear = wear or {}
    order = list(order) if _valid_order(order) else list(DRAW_ORDER)
    capr = dict(CAP_RADIUS)
    capr.update(caps or {})
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
    return {"order": order, "pivots": pivots, "placements": placements or {},
            "groups": groups, "face": face_entry}


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


def _draw_entry(out, entry, tr):
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
    ox0, ox1 = max(0, math.floor(min(xs)) - 1), min(W - 1, math.ceil(max(xs)) + 1)
    oy0, oy1 = max(0, math.floor(min(ys)) - 1), min(H - 1, math.ceil(max(ys)) + 1)
    img = entry["img"]
    sc = None if right else _scaled(entry)
    for y in range(oy0, oy1 + 1):
        for x in range(ox0, ox1 + 1):
            sx, sy = map_point(inv, x + .5, y + .5)
            if right:
                ix, iy = math.floor(sx), math.floor(sy)
                if ix < x0 or ix > x1 or iy < y0 or iy > y1:
                    continue
                o = (iy * W + ix) * 4
                if img[o + 3]:
                    _over(out, y * W + x, img[o], img[o + 1], img[o + 2], img[o + 3])
            else:
                u, v = math.floor((sx - sc["ox"]) * 8), math.floor((sy - sc["oy"]) * 8)
                if u < 0 or v < 0 or u >= sc["w"] or v >= sc["h"]:
                    continue
                p = sc["data"][v * sc["w"] + u]
                if p:
                    _over(out, y * W + x, p >> 24, (p >> 16) & 255, (p >> 8) & 255, p & 255)


def render_raw(prep: dict, pose: dict, order=None) -> bytearray:
    out = bytearray(N * 4)
    tr = raw_matrices(prep["pivots"], prep["placements"], pose)
    order = order if _valid_order(order) else prep["order"]
    for name, _ in GROUPS:
        g = prep["groups"][name]
        s = g["still"]
        for k in range(N):
            c = k * 4
            if s[c + 3]:
                _over(out, k, s[c], s[c + 1], s[c + 2], s[c + 3])
        for part in order:
            _draw_entry(out, g["parts"][part], tr[part])
        if name == "main" and prep["face"]:
            _draw_entry(out, prep["face"], tr["head"])
    return out


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
           face: bytes | None = None, order=None, tweak=None):
    """Render one 64x112 RGBA frame (Pillow image). ``layer_overrides`` are
    Custom Wear layers: they inherit the body mask and pixels outside the body
    outline follow the nearest part. ``face`` is an optional Emosi RGBA cell."""
    from PIL import Image
    validate(binding)
    if direction not in DIRECTIONS:
        raise ValueError("Unknown direction")
    i = binding_inputs(binding, direction, layer_overrides)
    prep = prepare_raw(i["layers"], i["mask"], i["pivots"], i["placements"], i["order"],
                       i["caps"], i["wear"], tweak, face)
    out = render_raw(prep, pose, order)
    return Image.frombytes("RGBA", (W, H), bytes(out))


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
