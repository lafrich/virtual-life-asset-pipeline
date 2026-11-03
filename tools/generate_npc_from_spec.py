#!/usr/bin/env python3
"""Generate an unreviewed character draft using the ORIGINAL V6B NPC renderer.

Input is a strictly constrained character spec (not arbitrary generated Python).
No uploaded reference photographs are written to the public repository.
This is a first-pass native V6B draft; special hair/makeup require artist review.
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "chars-iso" / "v6b" / "tools"))
import npc_v6b as npc  # noqa: E402
import live_v6b as live  # noqa: E402

ALLOWED = {
    "body": ("male", "female"),
    "skin": ("light", "medium", "deep"),
    "hair": ("short", "mid", "long", "swept"),
    "hair_color": ("black", "walnut", "darkwalnut", "silver"),
    "top": ("tee", "tee_long", "shirt", "shirt_l", "hoodie"),
    "top_color": tuple(npc.CL.keys()),
    "pants_color": tuple(npc.CL.keys()),
    "shoes": ("shoes", "sneakers", "boots", "hightops"),
    "shoes_color": tuple(npc.CL.keys()),
    "skirt": ("none", "knee", "long"),
}
BOOL_FIELDS = ("glasses", "ponytail", "quiff", "tufts", "apron")
DEFAULT = {
    "body": "male", "skin": "light", "hair": "short",
    "hair_color": "black", "top": "tee", "top_color": "slate",
    "pants_color": "charcoal", "shoes": "sneakers",
    "shoes_color": "paper", "skirt": "none",
    "glasses": False, "ponytail": False, "quiff": False,
    "tufts": False, "apron": False,
}


def validate(raw: dict) -> dict:
    if not isinstance(raw, dict):
        raise ValueError("Character spec must be an object")
    if set(raw) - (set(ALLOWED) | set(BOOL_FIELDS) | {"id", "name", "notes"}):
        raise ValueError("Unsupported character property")
    slug = raw.get("id")
    if not isinstance(slug, str) or not re.fullmatch(r"ai_[a-z][a-z0-9_]{1,25}", slug):
        raise ValueError("Expected id: ai_<letters_numbers>")
    name = raw.get("name", "")
    if not isinstance(name, str) or not (1 <= len(name.strip()) <= 45):
        raise ValueError("Character name must be 1-45 characters")
    notes = raw.get("notes", "")
    if not isinstance(notes, str) or len(notes) > 800:
        raise ValueError("Notes too long")
    result = {**DEFAULT, "id": slug, "name": name.strip(), "notes": notes}
    for key, accepted in ALLOWED.items():
        value = raw.get(key, result[key])
        if value not in accepted:
            raise ValueError(f"Invalid {key}: {str(value)[:40]}")
        result[key] = value
    for key in BOOL_FIELDS:
        value = raw.get(key, result[key])
        if type(value) is not bool:
            raise ValueError(f"{key} must be a boolean")
        result[key] = value
    return result


def build(spec: dict, root: Path = ROOT) -> Path:
    spec = validate(spec)
    slug = spec["id"]
    folder = root / "assets" / ("npc_" + slug)
    if folder.exists() and not (folder / "spec.json").is_file():
        raise ValueError("Destination already exists without a spec")
    sprites = folder / "sprites"
    previews = folder / "preview"
    sprites.mkdir(parents=True, exist_ok=True)
    previews.mkdir(parents=True, exist_ok=True)
    config = dict(
        body="f" if spec["body"] == "female" else "m",
        skin=spec["skin"], hair=spec["hair"], hc=spec["hair_color"],
        top=spec["top"], tc=spec["top_color"],
        pants="trousers", pc=spec["pants_color"],
        shoes=spec["shoes"], sc=spec["shoes_color"],
        glasses=spec["glasses"], ponytail=spec["ponytail"],
        quiff=spec["quiff"], tufts=spec["tufts"], apron=spec["apron"],
    )
    if spec["skirt"] != "none":
        config["skirt"] = (spec["skirt"], spec["pants_color"])
    old_out = npc.OUT
    try:
        npc.OUT = str(sprites)
        npc.NPCS[slug] = config
        npc.build(slug)
    finally:
        npc.OUT = old_out
        npc.NPCS.pop(slug, None)

    sheet_path = sprites / f"{slug}_v6b_sheet.png"
    with Image.open(sheet_path) as image:
        if image.mode != "RGBA" or image.size != (384, 4928):
            raise ValueError("Native V6B sheet validation failed")
        sheet = image.copy()
    walk_frames = []
    contact = Image.new("RGBA", (6 * 64 * 4, 4 * 112 * 4))
    for d in range(4):
        for frame in range(6):
            crop = sheet.crop((frame*64, d*112, (frame+1)*64, (d+1)*112))
            tile = crop.resize((256, 448), Image.Resampling.NEAREST)
            contact.alpha_composite(tile, (frame*256, d*448))
            walk_frames.append(tile)
    gif = previews / f"{slug}_walk_4dirs_4x.gif"
    walk_frames[0].save(gif, save_all=True, append_images=walk_frames[1:],
                        duration=[210]*len(walk_frames), loop=0, disposal=2)
    contact.save(previews / "contact_sheet_4x.png", optimize=True)
    (folder / "spec.json").write_text(json.dumps(spec, indent=2, ensure_ascii=False)+"\n")
    overlays = [p.relative_to(folder).as_posix() for p in sorted(sprites.glob(f"{slug}_v6b_f*.png"))]
    metadata = {
        "name":slug,"type":"npc","engine":"virtual-life-v6b",
        "generator":"tools/generate_npc_from_spec.py",
        "sheet":f"sprites/{slug}_v6b_sheet.png","width":384,"height":4928,
        "frame":[64,112],"pivot":[32,100],"columns":6,"rows":44,
        "directions":["se","sw","ne","nw"],"row_starts":live.ROWMAP,
        "walk_frames":6,"idle_frames":4,"sprites":[*overlays,f"sprites/{slug}_v6b_sheet.png"],
        "previews":[f"preview/{slug}_walk_4dirs_4x.gif","preview/contact_sheet_4x.png"],
        "outfit":f"{spec['top']} / {spec['pants_color']} / {spec['shoes']}",
        "hairstyle":spec["hair"],"notes":(
            f"Native V6B draft for {spec['name']}. Not approved for gameplay. "
            +spec["notes"]
        ),"new_hex":[],
    }
    (folder / "manifest.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False)+"\n")
    (folder / "README.md").write_text(
        f"# {spec['name']} · V6B draft\n\n"
        "Generated with the native Mahluk Hidup npc_v6b Python renderer.\n"
        "Review all four views, hair/back, hands/feet, outfit and motion before approval.\n"
        "Any custom visual detail not present in the native config requires hand-authored code.\n"
        f"\nRegenerate: `python tools/generate_npc_from_spec.py --file assets/npc_{slug}/spec.json`\n"
    )
    return folder


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", type=Path)
    parser.add_argument("--env", action="store_true")
    args = parser.parse_args()
    if args.env:
        import os
        spec = json.loads(os.environ["V6B_SPEC_JSON"])
    elif args.file:
        spec = json.loads(args.file.read_text())
    else:
        parser.error("--file or --env required")
    print("GENERATED", build(spec).relative_to(ROOT))


if __name__ == "__main__":
    main()
