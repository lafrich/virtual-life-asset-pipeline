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
        if y < 45:
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
    cfg = json.loads(BASE.read_text(encoding="utf-8"))
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


def generate(media: Path):
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
    manifest = {
        "format": "mahluk-original-source-rig-v1",
        "art_style": "original_v6b",
        "generator": "chars-iso/v6b/tools/live_v6b.py",
        "reference": "new editable reference using original source art; archived character listings remain hidden",
        "directions": list(DIRS), "emotions": list(EMOTIONS),
        "frame_size": list(SIZE), "pivot": [32, 100], "slots": slots,
        "pixels_preserved": True,
        "validation": "28 exact pixel reconstruction checks (4 directions × 7 expressions)"
    }
    (dest / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n",
                                          encoding="utf-8")
    print(f"ORIGINAL V6B CUTOUTS: {len(slots)} slots, 4 views, 7 faces, pixel-perfect.")


if __name__ == "__main__":
    generate(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "_site" / "media")
