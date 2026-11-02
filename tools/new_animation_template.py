#!/usr/bin/env python3
"""Scaffold an animation family from a reusable timing/phase preset.

Example:
  python tools/new_animation_template.py --name scratch_head --preset emote_loop

This intentionally does NOT fabricate a pose or claim a clip is finished.
Use the 64x112 native v6b pose engine to author every directional frame, then
run the generated source/make_animation.py to validate/pack a real GIF.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRESETS = {
    "one_shot": "action_one_shot.json",
    "emote_loop": "emote_loop.json",
    "interact_prop": "interact_prop.json",
}
ENTRYPOINT = '''#!/usr/bin/env python3
"""Pack authored v6b frames; replace or extend this with native pose generation.

Frames must be produced at 1x with STYLE.md rules and 64x112 RGBA pixels.
No placeholder action frames will be silently created.
"""
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from tools.pack_animation_preview import render

if __name__ == "__main__":
    render(Path(__file__).resolve().parents[1] / "manifest.json")
'''


def create(name: str, preset: str) -> Path:
    if not re.fullmatch(r"[a-z][a-z0-9_]{1,40}", name):
        raise ValueError("Use a lowercase slug: a-z, 0-9, underscore, at least 2 chars")
    preset_path = ROOT / "assets" / "animation_library" / "templates" / PRESETS[preset]
    data = json.loads(preset_path.read_text(encoding="utf-8"))
    folder = ROOT / "assets" / ("anim_" + name)
    if folder.exists():
        raise FileExistsError(f"Refusing to overwrite: {folder}")
    slug = name
    catalog = {
        "id": slug, "name": name.replace("_", " ").upper(),
        "group": data["group"], "status": "template",
        "note": f"DRAFT • {data['note']}",
        "source": f"assets/anim_{slug}/src/make_animation.py",
        "preview": f"assets/anim_{slug}/preview/{slug}_4views.gif",
        "directions": ["se", "sw", "ne", "nw"],
        "layout": "four_up",
        "frame_count": data["frame_count"],
        "frame_ms": data["frame_ms"],
        "loop": data["loop"],
    }
    manifest = {
        "name": "anim_" + slug,
        "type": "animation_template",
        "engine": "virtual-life-v6b",
        "frame": [64, 112],
        "pivot": [32, 100],
        "dirs": ["se", "sw", "ne", "nw"],
        "frame_count": data["frame_count"],
        "frame_ms": data["frame_ms"],
        "loop": data["loop"],
        "states": data.get("example_phases", []),
        "events": data.get("events", {}),
        "review_status": "unapproved_template",
        "animation_catalog": catalog,
    }
    (folder / "src").mkdir(parents=True)
    (folder / "frames").mkdir()
    (folder / "preview").mkdir()
    (folder / "src" / "make_animation.py").write_text(ENTRYPOINT, encoding="utf-8")
    (folder / "frames" / ".gitkeep").write_text("", encoding="utf-8")
    (folder / "preview" / ".gitkeep").write_text("", encoding="utf-8")
    (folder / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (folder / "README.md").write_text(
        f"# {slug} / ANIMATION TEMPLATE\n\n"
        f"Preset: {preset}; {manifest['frame_count']} native frames per direction.\n"
        "STATUS: DRAFT, not reviewed, not integrated into the game.\n\n"
        f"1. Author 64x112 RGBA frames in frames/{slug}_<se|sw|ne|nw>_f<i>.png using native v6b pipeline.\n"
        "2. Run: python assets/anim_" + slug + "/src/make_animation.py\n"
        "3. Run color/alpha audit, inspect 1x/4x, and get owner approval.\n"
        "4. Update manifest review_status and animation_catalog status to preview after approval.\n"
        "5. Commit native frames, output GIF and asset-learning record together.\n",
        encoding="utf-8",
    )
    print("Scaffold:", folder.relative_to(ROOT))
    print("No GIF generated yet. Missing poses are never fabricated.")
    return folder


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", required=True, help="lowercase action slug, e.g. scratch_head")
    parser.add_argument("--preset", choices=sorted(PRESETS), default="one_shot")
    args = parser.parse_args()
    create(args.name, args.preset)
