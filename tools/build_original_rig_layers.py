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


def mask(part: str, x: int, y: int):
    """Semantics are editable; pixel values and generator edges never change."""
    if part == "hair_back":
        return "hair_back"
    if part == "body":
        return "head" if y < 55 else ("neck" if y < 60 else "torso")
    if part == "arm_far":
        return "shoulder_r" if y < 69 else ("elbow_r" if y < 80 else "wrist_r")
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
        return "shoulder_l" if y < 69 else ("elbow_l" if y < 81 else "wrist_l")
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


def split_source(image: Image.Image, source_key: str):
    """An opaque source pixel is assigned to one, and only one, part."""
    data = np.asarray(image.convert("RGBA"))
    ys, xs = np.nonzero(data[:, :, 3] > 0)
    segments = {}
    for y, x in zip(ys, xs):
        bone = mask(source_key, int(x), int(y))
        if bone not in segments:
            segments[bone] = np.zeros((112, 64, 4), np.uint8)
        segments[bone][y, x] = data[y, x]
    return {bone: Image.fromarray(data, "RGBA") for bone, data in segments.items()}


def native_gender_models(media: Path):
    """Generate true outfit-free Male/Female bodies + matching clothed sprites.

    The nude source is the already validated native human template guide:
    no clothing or hair is baked in. The clothed reference uses the SAME
    male/female body type and native V6B renderer, only with garment layers.
    Both variants share one rig hierarchy and retain unmodified RGBA pixels.
    """
    extra = ROOT / "assets" / "npc_preview_v2"
    if str(extra) not in sys.path:
        sys.path.insert(0, str(extra))
    import base6
    import make_npcs_v2 as characters
    variants = {}
    for gender, code in (("male", "m"), ("female", "f")):
        guide_path = media / f"human-{gender}-base-guide.png"
        if not guide_path.is_file():
            raise FileNotFoundError(f"Native unclothed {gender} base not built: {guide_path}")
        guide = Image.open(guide_path).convert("RGBA")
        if guide.size != (256, 112):
            raise AssertionError(f"{gender} nude human guide must contain four native 64x112 views")
        cfg = {"body": code, "skin": "light", "hair": "short", "hc": "black",
               "top": "tee_long", "tc": "paper", "pants": "trousers",
               "pc": "paper", "shoes": "shoes", "sc": "paper"}
        for direction_index, direction in enumerate(DIRS):
            nude = guide.crop((direction_index * 64, 0, (direction_index + 1) * 64, 112))
            clothed, parts, palette = base6.render(cfg, f=0, d=direction,
                                                    expr="neutral", anim="idle")
            characters.bald(parts, palette)
            # Recompose the *real* native torso/arm/leg materials (no proxy
            # costume pasted over a different humanoid).
            dressed = Image.new("RGBA", SIZE)
            for part in parts.values():
                dressed.alpha_composite(part.convert("RGBA"))
            variants[(gender, "base", direction)] = nude
            variants[(gender, "outfit", direction)] = dressed
        # Force exact direction pairs, including anatomy and 1px highlights:
        # SE<->SW and NE<->NW, never mixing front SW with rear NE.
        for mode in ("base", "outfit"):
            for source, target in (("se", "sw"), ("ne", "nw")):
                variants[(gender, mode, target)] = variants[(gender, mode, source)].transpose(
                    Image.Transpose.FLIP_LEFT_RIGHT)
    return variants


def split_body_pixels(sprite: Image.Image, direction: str):
    """One owner per source pixel; local/body side mirrors with the view.

    SW is the mirror of SE and NW the mirror of NE. A screen-right leg in
    SW/NW is anatomical LEFT, not anatomical RIGHT. The body midline is
    derived from the real opaque shin rows, not hard-coded x=33.
    """
    rgba = np.asarray(sprite.convert("RGBA"))
    visible = rgba[..., 3] > 0
    row_centres = []
    for y in range(84, min(103, rgba.shape[0])):
        xs = np.flatnonzero(visible[y, 16:50])
        if len(xs) >= 6:
            row_centres.append(float(16 + (xs[0] + xs[-1]) / 2))
    cx = float(np.median(row_centres)) if row_centres else 32.0
    reverse = direction in ("sw", "nw")
    groups = {}
    ys, xs = np.nonzero(visible)
    for y0, x0 in zip(ys, xs):
        x, y = int(x0), int(y0)
        side = "l" if (x < cx) != reverse else "r"
        if y < 54:
            if 40 <= y < 49 and 21 <= x <= 44:
                if y < 44:
                    bone = "brow_" + side
                elif y < 48:
                    bone = "eye_" + side
                else:
                    bone = "mouth"
            else:
                bone = "head"
        elif y < 59:
            bone = "neck" if 26 <= x <= 39 else ("shoulder_" + side)
        elif y < 76:
            if x < 22 or x > 42:
                bone = ("shoulder_" if y < 66 else "elbow_") + side
            else:
                bone = "torso"
        elif y < 81:
            bone = "pelvis" if 22 <= x <= 42 else "wrist_" + side
        elif y < 90:
            bone = "hip_" + side
        elif y < 101:
            bone = "knee_" + side
        else:
            bone = "ankle_" + side
        if bone not in groups:
            groups[bone] = np.zeros((112, 64, 4), dtype=np.uint8)
        groups[bone][y, x] = rgba[y, x]
    return {bone: Image.fromarray(pixels, "RGBA") for bone, pixels in groups.items()}


def publish_gender_bases(media: Path, dest: Path):
    variants = native_gender_models(media)
    slots = []
    for gender in ("male", "female"):
        for mode in ("base", "outfit"):
            for source, target in (("se", "sw"), ("ne", "nw")):
                expected = variants[(gender, mode, source)].transpose(
                    Image.Transpose.FLIP_LEFT_RIGHT)
                if not np.array_equal(np.asarray(expected),
                                      np.asarray(variants[(gender, mode, target)])):
                    raise AssertionError(f"{gender}/{mode}: {target} must mirror {source}")
    contact = Image.new("RGBA", (2048, 896), (245, 243, 239, 255))
    for gender_index, gender in enumerate(("male", "female")):
        for mode_index, mode in enumerate(("base", "outfit")):
            parts_by_view = {direction: split_body_pixels(
                variants[(gender, mode, direction)], direction) for direction in DIRS}
            names = set().union(*(pieces.keys() for pieces in parts_by_view.values()))
            for bone in sorted(names):
                atlas = Image.new("RGBA", (64, 448))
                for index, direction in enumerate(DIRS):
                    part = parts_by_view[direction].get(bone)
                    if part:
                        atlas.alpha_composite(part, (0, index * 112))
                if not atlas.getbbox():
                    continue
                filename = f"{gender}-{mode}-{bone.replace('_', '-')}.png"
                atlas.save(dest / filename, optimize=True)
                slots.append({
                    "name": f"{gender}-{mode}-{bone}",
                    "gender": gender, "mode": mode,
                    "bone": bone, "expression": False,
                    "src": "media/original-rig/" + filename
                })
            for index, direction in enumerate(DIRS):
                source = variants[(gender, mode, direction)]
                reconstructed = Image.new("RGBA", SIZE)
                for part in parts_by_view[direction].values():
                    reconstructed.alpha_composite(part)
                if not np.array_equal(np.asarray(source), np.asarray(reconstructed)):
                    raise AssertionError(f"{gender} {mode} {direction}: source pixels changed")
                contact.alpha_composite(
                    source.resize((256, 448), Image.Resampling.NEAREST),
                    (mode_index * 1024 + index * 256, gender_index * 448))
    contact.save(dest / "gender-bases.png", optimize=True)
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
                    names.update(split_source(image, layer))
        for bone in sorted(names):
            tag = f"{layer}-{bone}".replace("_", "-")
            atlas = Image.new("RGBA", (64 * (len(EMOTIONS) if key_emotion else 1),
                                       112 * len(DIRS)))
            for direction_index, direction in enumerate(DIRS):
                for emotion_index, emotion in enumerate(EMOTIONS if key_emotion else ("neutral",)):
                    image = frames[direction].get((layer, emotion) if key_emotion else layer)
                    if image is None:
                        continue
                    tile = split_source(image, layer).get(bone)
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
        "gender_bases": ["male", "female"],
        "outfit_modes": ["base", "outfit"],
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
