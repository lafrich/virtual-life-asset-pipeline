#!/usr/bin/env python3
"""Build a pixel-perfect, RIGGABLE reference from the *original* V6B pipeline.

This does not synthesize any alternate art. Every pixel is painted by the
existing native generator, and only then routed into transparent bone layers.
Source layers are kept in original z-order, so a neutral rig reassembles
exactly to the generator sprite without seams, double ownership or repaint.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "chars-iso" / "v6b" / "tools"))
import live_v6b as v6b  # noqa: E402

SIZE = (64, 112)
DIRS = ("se", "sw", "ne", "nw")
EMOTIONS = {
    "neutral": "neutral",
    "happy": "happy",
    "mischievous": "smile",
    "angry": "angry",
    "surprised": "surprised",
    "blush": "embarrassed",
    "grin": "happy",
}
ORDER = tuple(x for x in v6b.ORDER if x not in ("shadow", "fx"))
BASE = (ROOT / "chars-iso" / "v6b" / "live" / "chars" / "ichsan.json")


def mask(part: str, x: int, y: int, direction: str = "se"):
    """Assign stable anatomical bones, even when source art faces backwards.

    V6B draw_arms(view="ne") mirrors near/far arm pixels before NW is
    mirrored again. Their *screen positions* change, but an anatomical
    wrist_l should not suddenly become wrist_r. Preserve source pixels,
    only correct the label of the arm plane in the 4-view atlas.
    """
    rear = direction in ("ne", "nw")
    near_side, far_side = ("r", "l") if rear else ("l", "r")
    """Semantics are editable; pixel values and generator edges never change."""
    if part == "hair_back":
        return "hair_back"
    if part == "body":
        return "head" if y < 55 else ("neck" if y < 60 else "torso")
    if part == "arm_far":
        return ("shoulder_" if y < 69 else
                "elbow_" if y < 80 else "wrist_") + far_side
    if part in ("shoes", "shoes_over"):
        return "ankle_l" if x < 33 else "ankle_r"
    if part in ("pants", "rips"):
        if y < 76:
            return "pelvis"
        if y < 89:
            return "hip_l" if x < 33 else "hip_r"
        return "knee_l" if x < 33 else "knee_r"
    if part in ("shirt", "shirt_graphic", "outer", "acc"):
        return "torso"
    if part in ("arm_near", "body_front"):
        return ("shoulder_" if y < 69 else
                "elbow_" if y < 81 else "wrist_") + near_side
    if part == "held":
        return "phone"
    if part == "hair_front":
        if y < 39:
            return "hair_cap"
        if x < 30:
            return "fringe_l"
        if x < 38:
            return "fringe_mid"
        return "fringe_r"
    if part == "face":
        if y < 49:
            return "eye_l" if x < 35 else "eye_r"
        if y < 51 and 33 <= x < 37:
            return "nose"
        return "mouth"
    if part == "acc_head":
        return "glasses"
    if part == "brows":
        return "brow_l" if x < 35 else "brow_r"
    return "torso"


def original_frames():
    # Use the original native drawing language/palette, not the archived
    # character's face identity. New editable reference uses a clean face
    # and an alternate native hair silhouette from the same source engine.
    cfg = json.loads(BASE.read_text(encoding="utf-8"))
    cfg.pop("mustache", None)
    cfg.pop("stubble", None)
    cfg["hair_style"] = "wavy"
    cfg["fringe"] = "curtain"
    cfg["name"] = "modular_source_reference"
    outfit = cfg["outfits"][cfg["default_outfit"]]
    se, palette = v6b.build_char_layers(cfg, outfit)
    ne = v6b.back_layers(se, cfg, outfit)
    frames = {}
    for dir_id in DIRS:
        view = "se" if dir_id in ("se", "sw") else "ne"
        flip = dir_id in ("sw", "nw")
        posed = v6b.pose_layers(se if view == "se" else ne, "idle", 0,
                                view, cfg, outfit)
        for key, color_map in palette.get("_maps", {}).items():
            posed[key] = v6b.recolor(posed[key], color_map)
        v6b.attach_arm_roots(posed)
        raw = {key: v6b.to_img(v, palette) for key, v in posed.items()
               if isinstance(v, np.ndarray) and v.shape == (v6b.CH, v6b.CW)}
        images = v6b.frame_img(raw)
        for emotion, expr in EMOTIONS.items():
            f, b, g = v6b.face_layer(expr, cfg, view, 0, 0, True)
            pieces = v6b.frame_img({
                "face": v6b.to_img(f, palette), "brows": v6b.to_img(b, palette),
                "acc_head": v6b.to_img(g, palette)
            })
            for key, image in pieces.items():
                images[(key, emotion)] = image
        if flip:
            images = {key: image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                      for key, image in images.items()}
        frames[dir_id] = images
    return frames


def split_source(image: Image.Image, source_key: str, direction: str = "se"):
    """An opaque source pixel is assigned to one, and only one, part."""
    data = np.asarray(image.convert("RGBA"))
    ys, xs = np.nonzero(data[:, :, 3] > 0)
    segments = {}
    for y, x in zip(ys, xs):
        bone = mask(source_key, int(x), int(y), direction)
        if bone not in segments:
            segments[bone] = np.zeros((112, 64, 4), np.uint8)
        segments[bone][y, x] = data[y, x]
    return {bone: Image.fromarray(data, "RGBA") for bone, data in segments.items()}


def native_gender_models(media: Path):
    """Use exact source layers emitted by the unclothed human generator.

    The native base final pixels and paint layer masks come from the SAME
    frame call. The outfit is kept separately as native garments, never as
    another full-bodied sprite. Both modes share anatomical rig sources.
    """
    extra = ROOT / "assets" / "npc_preview_v2"
    if str(extra) not in sys.path:
        sys.path.insert(0, str(extra))
    import base6
    import make_npcs_v2 as characters

    variants, nude_layers, clothing_layers = {}, {}, {}
    for gender, code in (("male", "m"), ("female", "f")):
        base_name = f"human-{gender}-base"
        meta_path = media / f"{base_name}-rig-source.json"
        source_path = media / f"{base_name}-rig-source.npz"
        if not meta_path.exists() or not source_path.exists():
            raise FileNotFoundError(f"Missing authored naked anatomical layers: {base_name}")
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        if meta.get("format") != "mahluk-native-human-anatomy-source-v1":
            raise AssertionError("Invalid native anatomy source format")
        source_keys = meta.get("source_layers", [])
        order = [name for name in meta.get("layer_order", []) if name in source_keys]
        order += [name for name in source_keys if name not in order]
        cfg = {
            "body": code, "skin": "light", "hair": "short", "hc": "black",
            "top": "tee_long", "tc": "paper", "pants": "trousers",
            "pc": "paper", "shoes": "shoes", "sc": "paper",
        }
        with np.load(source_path, allow_pickle=False) as src:
            for direction_index, direction in ((0, "se"), (2, "ne")):
                final = np.asarray(src["final"][direction_index]).copy()
                if final.shape != (112, 64, 4):
                    raise AssertionError("Wrong authored naked sprite geometry")
                variants[(gender, "base", direction)] = Image.fromarray(final, "RGBA")
                nude_layers[(gender, direction)] = {
                    name: Image.fromarray(np.asarray(
                        src["source__" + name][direction_index]).copy(), "RGBA")
                    for name in order if "source__" + name in src.files
                }
                _, outfit_parts, palette = base6.render(
                    cfg, f=0, d=direction, expr="neutral", anim="idle")
                characters.bald(outfit_parts, palette)
                garment_names = (
                    "pants", "shoes", "shoes_over", "rips", "shirt",
                    "shirt_graphic", "outer", "acc",
                )
                # These native garment materials are the only additional
                # render layers when OUTFIT ON; skin and bones stay unchanged.
                garment = {
                    name: outfit_parts[name].convert("RGBA").copy()
                    for name in garment_names if name in outfit_parts
                }
                clothing_layers[(gender, direction)] = garment
                dressed = variants[(gender, "base", direction)].copy()
                for name in garment_names:
                    if name in garment:
                        dressed.alpha_composite(garment[name])
                variants[(gender, "outfit", direction)] = dressed
        for original, mirrored in (("se", "sw"), ("ne", "nw")):
            nude_layers[(gender, mirrored)] = {
                name: im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                for name, im in nude_layers[(gender, original)].items()
            }
            clothing_layers[(gender, mirrored)] = {
                name: im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                for name, im in clothing_layers[(gender, original)].items()
            }
            for mode in ("base", "outfit"):
                variants[(gender, mode, mirrored)] = variants[
                    (gender, mode, original)
                ].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return variants, nude_layers, clothing_layers


def _limb_split(mask: np.ndarray, source: str):
    """Divide ONLY the continuous original arm matte at true arm-axis joints.

    The division follows the full arm silhouette. Never classify torso
    pixels merely because they sit outside a hard-coded x boundary.
    """
    ys, _ = np.nonzero(mask)
    if not len(ys):
        return (0, 0)
    top = int(ys.min())
    bottom = int(ys.max()) + 1
    span = max(3, bottom - top)
    # Shoulder cover / upper arm, forearm and articulated wrist are three
    # consecutive intact regions of the source arm layer.
    return top + max(2, round(span * 0.43)), top + max(3, round(span * 0.78))


def _leg_boundary(layers: dict) -> float:
    """Estimate hip centre from native trouser/shoe silhouettes only."""
    pants = layers.get("pants")
    if pants is None:
        return 32.0
    mask = np.asarray(pants.convert("RGBA"))[..., 3] > 0
    widths = []
    for y in range(82, 98):
        xs = np.flatnonzero(mask[y])
        if len(xs) >= 6:
            widths.append((float(xs[0]) + float(xs[-1])) / 2)
    return float(np.median(widths)) if widths else 32.0


def classify_native_layer(key: str, x: int, y: int, boundary: float,
                          direction: str, splits: dict):
    """Deterministic bone ownership from the layer that actually painted it."""
    mirrored = direction in ("sw", "nw")
    left = (x < boundary) != mirrored
    side = "l" if left else "r"
    if key in ("arm_near", "arm_far"):
        # Far and near are independent native arm layers, NOT screen regions.
        # The authored NE/NW sprites have reversed near/far camera sides.
        # Keep the actual limb identity stable for all four character views.
        rear = direction in ("ne", "nw")
        anatomical = ("r" if rear else "l") if key == "arm_near" else (
            "l" if rear else "r")
        elbow, wrist = splits[key]
        return ("shoulder_" if y < elbow else
                "elbow_" if y < wrist else "wrist_") + anatomical
    if key == "body_front":
        return "wrist_l"
    if key in ("pants", "rips"):
        if y < 79:
            return "pelvis"
        if y < 89:
            return "hip_" + side
        return "knee_" + side
    if key in ("shoes", "shoes_over"):
        return "ankle_" + side
    if key in ("shirt", "shirt_graphic", "outer", "acc"):
        return "torso"
    if key == "body":
        # The exact native head/neck/torso source mask, not a blended 3-part
        # crop of the entire character. Head-child emotions remain independent.
        return "head" if y < 54 else "neck" if y < 59 else "torso"
    if key == "face":
        if y < 49:
            return "eye_" + side
        return "nose" if y < 52 and 31 <= x <= 37 else "mouth"
    if key == "brows":
        return "brow_" + side
    if key == "glasses":
        return "glasses"
    if key == "hair_back":
        return "hair_back"
    if key == "hair_front":
        return "fringe_l" if x < boundary - 5 else (
            "fringe_r" if x > boundary + 5 else "fringe_mid")
    if key == "held":
        return "phone"
    return "torso"


def native_owner_map(layers: dict, direction: str):
    """Last visible original layer owns the source pixel (native z-order).

    This is intentionally a source-layer provenance map. When the nude guide
    re-shades every garment to skin, its original shoulder, belly and leg
    alpha silhouettes still correspond to these same native layer mattes.
    """
    boundary = _leg_boundary(layers)
    arm_splits = {}
    for part in ("arm_near", "arm_far"):
        image = layers.get(part)
        matte = (np.asarray(image.convert("RGBA"))[..., 3] > 0
                 if image is not None else np.zeros((112, 64), bool))
        arm_splits[part] = _limb_split(matte, part)
    owner = np.full((112, 64), "", dtype="<U20")
    for source, image in layers.items():
        if source in ("shadow", "fx"):
            continue
        opaque = np.asarray(image.convert("RGBA"))[..., 3] > 0
        ys, xs = np.nonzero(opaque)
        for y, x in zip(ys, xs):
            owner[y, x] = classify_native_layer(source, int(x), int(y),
                                                boundary, direction, arm_splits)
    return owner


def _complete_ownership(owner: np.ndarray, visible: np.ndarray):
    """Recover only genuinely unmatched native pixels, never split by x/y.

    They attach to the nearest already assigned source pixel. In practice the
    guide retains the native silhouette, so this is only an edge-case guard.
    """
    from collections import deque

    valid = visible & (owner != "")
    if not np.any(valid):
        raise AssertionError("Native human source mattes contain no visible body bones")
    pending = visible & ~valid
    if not np.any(pending):
        return owner
    # Multi-source 8-connected expansion, bounded to the actual visible body.
    queue = deque((int(y), int(x)) for y, x in zip(*np.nonzero(valid)))
    visited = valid.copy()
    while queue:
        y, x = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1),
                       (-1, -1), (-1, 1), (1, -1), (1, 1)):
            py, px = y + dy, x + dx
            if not (0 <= py < 112 and 0 <= px < 64):
                continue
            if not visible[py, px] or visited[py, px]:
                continue
            visited[py, px] = True
            owner[py, px] = owner[y, x]
            queue.append((py, px))
    # Any disconnected source island missing from a native layer is nearest
    # seeded pixel in image space, never an arbitrary hand/torso rectangular cut.
    remaining = visible & (owner == "")
    if np.any(remaining):
        seed_y, seed_x = np.nonzero(owner != "")
        for y, x in zip(*np.nonzero(remaining)):
            k = np.argmin((seed_y - y)**2 + (seed_x - x)**2)
            owner[y, x] = owner[seed_y[k], seed_x[k]]
    return owner


JOINT_SEAMS = (
    ("torso", "neck"), ("neck", "head"), ("torso", "pelvis"),
    ("torso", "shoulder_l"), ("torso", "shoulder_r"),
    ("shoulder_l", "elbow_l"), ("shoulder_r", "elbow_r"),
    ("elbow_l", "wrist_l"), ("elbow_r", "wrist_r"),
    ("pelvis", "hip_l"), ("pelvis", "hip_r"),
    ("hip_l", "knee_l"), ("hip_r", "knee_r"),
    ("knee_l", "ankle_l"), ("knee_r", "ankle_r"),
)


def overlap_joint_seams(parts: dict, owner: np.ndarray,
                        rgba: np.ndarray) -> dict:
    """Give a body part a 1px hidden source-colour cushion at each hinge.

    The renderer is a cutout puppet: if the torso and arm have *no* common
    pixels, rotating the arm exposes a transparent crack. Pad only their
    touching boundary with exact opaque original source pixels. At neutral
    pose both parts draw the SAME original colour at the same coordinates,
    so the composite remains pixel-perfect. Never enlarge exterior edges,
    add synthetic flesh, or duplicate semi-transparent face details.
    """
    opaque = rgba[..., 3] == 255
    h, w = owner.shape
    buffers = {name: np.asarray(image.convert("RGBA")).copy()
               for name, image in parts.items()}

    def neighbours(mask: np.ndarray):
        pad = np.pad(mask, 1, constant_values=False)
        result = np.zeros_like(mask)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1),
                       (-1, -1), (-1, 1), (1, -1), (1, 1)):
            result |= pad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        return result

    for first, second in JOINT_SEAMS:
        if first not in buffers or second not in buffers:
            continue
        a, b = owner == first, owner == second
        border = ((a & neighbours(b)) | (b & neighbours(a))) & opaque
        if not np.any(border):
            continue
        for bone in (first, second):
            buffers[bone][border] = rgba[border]
    return {name: Image.fromarray(buffer, "RGBA")
            for name, buffer in buffers.items()}


def split_body_pixels(sprite: Image.Image, direction: str,
                      native_layers: dict, require_anatomy: bool = True,
                      bridge_joints: bool = True):
    """Split the original human sprite by native BODY / ARM / PANTS / FOOT mattes.

    Each pixel is stored exactly once. Skin, highlights and anatomical detail
    are read from the original guide unchanged, and never pixel recoloured.
    """
    rgba = np.asarray(sprite.convert("RGBA"))
    visible = rgba[..., 3] > 0
    owner = native_owner_map(native_layers, direction)
    owner[~visible] = ""
    owner = _complete_ownership(owner, visible)
    if np.any(visible & (owner == "")):
        raise AssertionError("Undressed reference lost source-pixel ownership")
    parts = {}
    for bone in np.unique(owner[visible]):
        data = np.zeros((112, 64, 4), dtype=np.uint8)
        select = visible & (owner == bone)
        data[select] = rgba[select]
        if np.any(select):
            parts[str(bone)] = Image.fromarray(data, "RGBA")
    if require_anatomy:
        if "torso" not in parts or "head" not in parts:
            raise AssertionError("Missing native head/torso after rig cutout")
        if not any(part.startswith("shoulder_") for part in parts):
            raise AssertionError("Native arm mattes were not processed")
    return overlap_joint_seams(parts, owner, rgba) if bridge_joints else parts


def publish_gender_bases(media: Path, dest: Path):
    """Publish the stable universal rig: anatomy FIRST, clothing as an overlay.

    A bone's human skin atlas is identical in both outfit modes. It is
    impossible for an outfit toggle to secretly select a differently cut
    or differently rigged body. The garment atlas only contains materials
    from the real source renderer (shirt, pants, shoes etc.).
    """
    variants, anatomy_sources, clothing_sources = native_gender_models(media)
    slots = []

    def assemble(parts: dict[str, Image.Image]):
        out = Image.new("RGBA", SIZE)
        for part in parts.values():
            out.alpha_composite(part)
        return out

    qa_parts = {}
    for gender in ("male", "female"):
        # SE/SW are strictly mirrored. NE/NW are strictly mirrored.
        for mode in ("base", "outfit"):
            for source, target in (("se", "sw"), ("ne", "nw")):
                expected = variants[(gender, mode, source)].transpose(
                    Image.Transpose.FLIP_LEFT_RIGHT)
                if not np.array_equal(np.asarray(expected),
                                      np.asarray(variants[(gender, mode, target)])):
                    raise AssertionError(f"Broken mirror {gender}/{mode}/{target}")

        body_parts = {}
        garment_parts = {}
        for direction in DIRS:
            body = variants[(gender, "base", direction)]
            body_parts[direction] = split_body_pixels(
                body, direction, anatomy_sources[(gender, direction)])
            clothing = clothing_sources[(gender, direction)]
            overlay = Image.new("RGBA", SIZE)
            for image in clothing.values():
                overlay.alpha_composite(image)
            garment_parts[direction] = split_body_pixels(
                overlay, direction, clothing, require_anatomy=False,
                bridge_joints=False)
            if not np.array_equal(
                np.asarray(assemble(body_parts[direction])),
                np.asarray(body)
            ):
                raise AssertionError(f"{gender}/{direction}: nude body changed after part split")
            if not np.array_equal(
                np.asarray(assemble(garment_parts[direction])),
                np.asarray(overlay)
            ):
                raise AssertionError(f"{gender}/{direction}: clothing overlay changed after split")
            dressed = body.copy()
            dressed.alpha_composite(overlay)
            if not np.array_equal(np.asarray(dressed),
                                  np.asarray(variants[(gender, "outfit", direction)])):
                raise AssertionError(f"{gender}/{direction}: outfit changed source appearance")

        qa_parts[gender] = (body_parts, garment_parts)
        for layer_type, by_view in (("body", body_parts), ("garment", garment_parts)):
            names = sorted(set().union(*(part.keys() for part in by_view.values())))
            for bone in names:
                atlas = Image.new("RGBA", (64, 448))
                for row, direction in enumerate(DIRS):
                    part = by_view[direction].get(bone)
                    if part is not None:
                        atlas.alpha_composite(part, (0, row*112))
                if not atlas.getbbox():
                    continue
                filename = f"{gender}-{layer_type}-{bone.replace('_', '-')}.png"
                atlas.save(dest / filename, optimize=True)
                slots.append({
                    "name": f"{gender}-{layer_type}-{bone}",
                    "gender": gender,
                    "mode": "base" if layer_type == "body" else "outfit",
                    "layer_type": layer_type,
                    "bone": bone, "expression": False,
                    "src": "media/original-rig/" + filename,
                })

    # Source review contact sheet: 4 directions × 2 outfit states × 2
    # anatomies. Every image is a transparent source RGBA raster at 4x.
    contact = Image.new("RGBA", (2048, 896), (245, 243, 239, 255))
    for gender_index, gender in enumerate(("male", "female")):
        for mode_index, mode in enumerate(("base", "outfit")):
            for row, direction in enumerate(DIRS):
                sprite = variants[(gender, mode, direction)]
                contact.alpha_composite(
                    sprite.resize((256, 448), Image.Resampling.NEAREST),
                    (mode_index*1024 + row*256, gender_index*448))
    contact.save(dest / "gender-bases.png", optimize=True)

    # Diagnostic proof that source cutouts remain independent when elbow and
    # knee rotate. This is generated FROM THE SAME RGBA ATLAS MATERIALS;
    # no hand-drawn replacement sprites, animations or third-party assets.
    pose_cases = (
        ("NEUTRAL", (), 0, (0, 0)),
        ("ELBOW +22", ("elbow_l", "wrist_l"), 22, (19, 71)),
        ("ELBOW -22", ("elbow_l", "wrist_l"), -22, (19, 71)),
        ("KNEE +18", ("knee_l", "ankle_l"), 18, (27, 89)),
        ("KNEE -18", ("knee_l", "ankle_l"), -18, (27, 89)),
    )
    qa = Image.new("RGBA", (len(pose_cases)*256, 8*448),
                   (246, 243, 238, 255))
    row = 0
    for gender in ("male", "female"):
        body_by_view, clothing_by_view = qa_parts[gender]
        for mode in ("base", "outfit"):
            for direction in ("se", "ne"):
                native = variants[(gender, mode, direction)]
                for column, (_, affected, degrees, pivot) in enumerate(pose_cases):
                    sprite = Image.new("RGBA", SIZE)
                    for content in (
                        body_by_view[direction],
                        clothing_by_view[direction] if mode=="outfit" else {},
                    ):
                        for bone, tile in content.items():
                            if bone in affected:
                                tile = tile.rotate(
                                    degrees, resample=Image.Resampling.NEAREST,
                                    center=pivot, expand=False,
                                )
                            sprite.alpha_composite(tile)
                    if not affected and not np.array_equal(
                        np.asarray(sprite), np.asarray(native)
                    ):
                        raise AssertionError(
                            f"Joint QA neutral changed source: {gender}/{mode}/{direction}")
                    qa.alpha_composite(
                        sprite.resize((256, 448), Image.Resampling.NEAREST),
                        (column*256, row*448),
                    )
                row += 1
    qa.save(dest / "rotation-qa.png", optimize=True)
    for gender in ("male", "female"):
        body = [row for row in slots if row["gender"] == gender
                and row["layer_type"] == "body"]
        clothes = [row for row in slots if row["gender"] == gender
                   and row["layer_type"] == "garment"]
        if len(body) < 8 or len(clothes) < 3:
            raise AssertionError(
                f"{gender}: expected independent anatomical cutouts and removable garments"
            )
    return slots



def generate(media: Path, with_gender: bool = True):
    dest = media / "original-rig"
    dest.mkdir(parents=True, exist_ok=True)
    frames = original_frames()
    # All four orientations are built from the same source's own original
    # art. Emotion layers vary, body layers never get redrawn per emotion.
    slots = []
    for layer in ORDER:
        key_emotion = layer in ("face", "brows", "acc_head")
        names = set()
        for direction in DIRS:
            for emotion in EMOTIONS if key_emotion else ("neutral",):
                image = frames[direction].get((layer, emotion) if key_emotion else layer)
                if image is not None:
                    names.update(split_source(image, layer, direction))
        for bone in sorted(names):
            tag = f"{layer}-{bone}".replace("_", "-")
            atlas = Image.new("RGBA", (64 * (len(EMOTIONS) if key_emotion else 1),
                                       112 * len(DIRS)))
            for direction_index, direction in enumerate(DIRS):
                for emotion_index, emotion in enumerate(EMOTIONS if key_emotion else ("neutral",)):
                    image = frames[direction].get((layer, emotion) if key_emotion else layer)
                    if image is None:
                        continue
                    tile = split_source(image, layer, direction).get(bone)
                    if tile is not None:
                        atlas.alpha_composite(tile, (emotion_index * 64, direction_index * 112))
            if not atlas.getbbox():
                continue
            filename = f"{tag}.png"
            atlas.save(dest / filename, optimize=True)
            slots.append({"name": tag, "bone": bone, "source": layer,
                          "expression": key_emotion,
                          "src": "media/original-rig/" + filename})
    # Native zero-transform reconstruction is an *exact RGBA comparison*,
    # not just a similar looking preview.
    for direction_index, direction in enumerate(DIRS):
        for emotion_index, emotion in enumerate(EMOTIONS):
            expected = Image.new("RGBA", SIZE)
            actual = Image.new("RGBA", SIZE)
            for key in ORDER:
                image = frames[direction].get((key, emotion) if key in
                                               ("face", "brows", "acc_head") else key)
                if image is not None:
                    expected.alpha_composite(image)
            for slot in slots:
                with Image.open(media / slot["src"].split("media/", 1)[1]) as atlas:
                    x = emotion_index * 64 if slot["expression"] else 0
                    source = atlas.crop((x, direction_index * 112, x + 64,
                                         (direction_index + 1) * 112))
                    actual.alpha_composite(source)
            if not np.array_equal(np.asarray(expected), np.asarray(actual)):
                raise AssertionError(f"{direction}/{emotion}: split rig mismatches native V6B pixels")
    gender_slots = publish_gender_bases(media, dest) if with_gender else []
    # Human-review contact sheet: same unmodified pixels, only 4x NEAREST.
    contact = Image.new("RGBA", (64 * 4 * len(DIRS), 112 * 4), (242, 240, 234, 255))
    for i, direction in enumerate(DIRS):
        tile = Image.new("RGBA", SIZE)
        for key in ORDER:
            image = frames[direction].get((key, "neutral") if key in
                                          ("face", "brows", "acc_head") else key)
            if image is not None:
                tile.alpha_composite(image)
        contact.alpha_composite(tile.resize((256, 448), Image.Resampling.NEAREST),
                                (i * 256, 0))
    contact.save(dest / "source-contact-sheet.png", optimize=True)
    manifest = {
        "preview": "media/original-rig/gender-bases.png",
        "rotation_qa": "media/original-rig/rotation-qa.png",
        "gender_bases": ["male", "female"],
        "outfit_modes": ["base", "outfit"],
        "anatomy_source": "human-male-base and human-female-base",
        "anatomy_layers_shared_across_outfits": True,
        "outfit_layer_mode": "additive_native_garments",
        "rig_pivot": [32, 100],
        "format": "mahluk-original-source-rig-v1",
        "art_style": "original_v6b",
        "generator": "chars-iso/v6b/tools/live_v6b.py",
        "reference": "new editable reference using original source art; archived character listings remain hidden",
        "directions": list(DIRS), "emotions": list(EMOTIONS),
        "frame_size": list(SIZE), "pivot": [32, 100], "slots": slots + gender_slots,
        "pixels_preserved": True,
        "validation": "28 exact pixel reconstruction checks (4 directions × 7 expressions)"
    }
    (dest / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n",
                                          encoding="utf-8")
    print(f"ORIGINAL V6B CUTOUTS: {len(slots)} source + {len(gender_slots)} gender/mode slots, four views, pixel-perfect.")


if __name__ == "__main__":
    generate(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "_site" / "media",
             with_gender="--source-only" not in sys.argv)
