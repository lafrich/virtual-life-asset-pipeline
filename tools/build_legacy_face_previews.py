#!/usr/bin/env python3
"""Build original NPC facial-expression loops from their own source renderers.

The generic 44-row v6b face overlay cannot be copied onto a custom legacy rig:
these characters use their own heads/helmets and authored facial pixels.
Render genuine same-actor idle poses, with a brief source-authored sleepy-eye
blink every 12 frames. This does not modify any NPC generator or live game.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

from PIL import Image

VIEWS = ("se", "sw", "ne", "nw")
EXPRS = ("neutral", "happy", "surprised", "angry", "sleepy")
FRAME = (64, 112)
LOOP_FRAMES = 12
BLINK_FRAME = 9
EYES_BOX = (22, 35, 44, 49)  # Only eyes and brows; keep original mouth expression.
PORTRAIT_BOX = (17, 30, 48, 62)  # Full authentic face, not the whole body.
ACTORS = {"gfunk", "theodore", "yerbies"}


def load_renderer(root: Path, actor: str):
    if actor not in ACTORS:
        raise ValueError("No reviewed facial-expression source for " + actor)
    # These original generators use project-relative sys.path entries.
    for path in (root / "assets/npc_gfunk", root / "assets/npc_preview_v2",
                 root / "chars-iso/v6b/tools"):
        if str(path) not in sys.path:
            sys.path.insert(0, str(path))
    script = root / "assets" / ("npc_" + actor) / ("make_" + actor + ".py")
    spec = importlib.util.spec_from_file_location("paint_face_" + actor, script)
    if spec is None or spec.loader is None:
        raise ValueError("Could not load actor renderer: " + actor)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def render_four(module, actor: str, view: str, expression: str) -> list[Image.Image]:
    if actor == "theodore":
        poses = [module.frame(view, "idle", i, expression) for i in range(4)]
    else:
        poses = module.frames(view, "idle", expression)
    if len(poses) != 4:
        raise ValueError(actor + ": expected four original idle poses")
    for image in poses:
        if image.size != FRAME or image.mode != "RGBA":
            raise ValueError(actor + ": expected 64x112 RGBA original poses")
    return poses


def build_faces(root: Path, folder: Path, actor: str, media: Path,
                idle_frames: dict) -> list[dict]:
    """Return browser-ready 4-view atlases. No cross-character retargeting."""
    if actor not in ACTORS:
        return []
    originals = folder / "expr"
    for expression in EXPRS:
        if not (originals / f"{actor}_se_{expression}.png").is_file():
            # The source generator has not built; do not advertise fake faces.
            return []
    if any(len(idle_frames.get(view, {})) < 4 for view in VIEWS):
        return []

    module = load_renderer(root, actor)
    result = []
    for expression in EXPRS:
        regular = {view: render_four(module, actor, view, expression)
                   for view in ("se", "sw")}
        # The original sprites have no visible facial features on rear views.
        # Use the exact authored idle frames, never a fabricated rear face.
        regular.update({
            view: [Image.open(idle_frames[view][i]).convert("RGBA")
                   for i in range(4)]
            for view in ("ne", "nw")
        })
        if expression != "sleepy":
            blinking = {view: render_four(module, actor, view, "sleepy")[1]
                        for view in ("se", "sw")}
        else:
            blinking = {}
        with Image.open(originals / f"{actor}_se_{expression}.png") as reference:
            if regular["se"][0].tobytes() != reference.convert("RGBA").tobytes():
                raise ValueError(actor + ": regenerated face differs from source: " + expression)
        sheet = Image.new("RGBA", (64 * LOOP_FRAMES, 112 * len(VIEWS)))
        for di, direction in enumerate(VIEWS):
            for fi in range(LOOP_FRAMES):
                frame = regular[direction][fi % 4]
                if fi == BLINK_FRAME and direction in blinking:
                    # Copy the actor's genuine sleepy lids, not its mouth.
                    # Both inputs are rendered from the SAME pose index.
                    frame = frame.copy()
                    frame.paste(blinking[direction].crop(EYES_BOX), EYES_BOX[:2])
                sheet.paste(frame, (fi * 64, di * 112))
        slug = "legacy_" + actor + "-face-" + expression
        atlas = slug + "-4dir.png"
        thumb = slug + "-thumb.png"
        portrait = slug + "-portrait.png"
        sheet.save(media / atlas, optimize=True)
        regular["se"][0].save(media / thumb, optimize=True)
        regular["se"][0].crop(PORTRAIT_BOX).save(media / portrait, optimize=True)
        result.append({
            "id": expression,
            "label": expression.title(),
            "image": "media/" + thumb,
            "sprite": "media/" + thumb,
            "portrait": "media/" + portrait,
            "sheet": "media/" + atlas,
            "frames": LOOP_FRAMES,
            "frame_ms": [210] * LOOP_FRAMES,
            "overlay": "",
            "preview_mode": "custom_sheet",
            "source": "assets/npc_" + actor + "/make_" + actor + ".py",
        })
    return result
