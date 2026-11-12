#!/usr/bin/env python3
"""Promote Lafrich's six 4-view artist reference sprites to rig-bound Pakaian v2.

Source assets are immutable archived pixels in site/media/lgr1/wardrobe-artist-reference.
The original Pixel Editor exported every category under top/tee and C-colour keys.
The artist explicitly designated category by the uploaded filename. The six
source records already record that intent. This builder changes only the
category-specific colour KEY RGB codes (C->P for pants, C->S for shoes) and the
metadata; never resizes, shifts, mirrors, patches, or otherwise redraws pixels.

The published fallback masters are built from those records, not from
retired V6P stock garments, and remain scoped to the official rig checksums.
"""
import argparse
import base64
import io
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "site/media/lgr1/wardrobe-artist-reference"
INDEX = ROOT / "site/media/lgr1/base/index.json"
KEY_SRC = ROOT / "site/lgr-wear.js"
FOUR = ("se", "sw", "ne", "nw")
VARIANTS = {
    "male_top_tee": ("male", "top", "tee"),
    "female_top_tee": ("female", "top", "tee"),
    "male_pants_trousers": ("male", "pants", "trousers"),
    "female_pants_trousers": ("female", "pants", "trousers"),
    "male_shoes_shoes": ("male", "shoes", "shoes"),
    "female_shoes_shoes": ("female", "shoes", "shoes"),
}
REMAP = {
    "pants": {"C1": "P1", "C2": "P2", "C3": "P3", "C4": "P4", "C5": "P4"},
    "shoes": {"C1": "S0", "C2": "S1", "C3": "S2", "C4": "S3", "C5": "S3"},
}


def palette_keys():
    text = KEY_SRC.read_text(encoding="utf-8")
    m = re.search(r"const K=(\{.*?\});", text)
    if not m:
        raise ValueError("Could not parse source-of-truth LGRWear.K palette")
    return json.loads(m.group(1))


def decode(uri):
    if not isinstance(uri, str) or not uri.startswith("data:image/png;base64,"):
        raise ValueError("Invalid encoded PNG")
    im = Image.open(io.BytesIO(base64.b64decode(uri.split(",", 1)[1]))).convert("RGBA")
    if im.size != (256, 112):
        raise ValueError("Expected exact source 256x112 RGBA strip")
    return im


def to_uri(im):
    b = io.BytesIO()
    im.save(b, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode("ascii")


def remap_pixels(im, group, keys):
    """Only replace RGB components of opaque source C-key pixels."""
    if group == "top":
        return im
    trans = {tuple(bytes.fromhex(keys[src][1:])): tuple(bytes.fromhex(keys[dst][1:]))
             for src, dst in REMAP[group].items()}
    src = list(im.getdata())
    out = []
    for rgba in src:
        if rgba[3] not in (0, 255):
            raise ValueError("Anti-aliased pixel in native wardrobe")
        if not rgba[3]:
            out.append(rgba)
            continue
        rgb = trans.get(rgba[:3])
        if rgb is None:
            raise ValueError("Unrecognized source key in artist reference: " + repr(rgba))
        out.append((*rgb, rgba[3]))
    img = Image.new("RGBA", im.size, (0, 0, 0, 0))
    img.putdata(out)
    before = [p[3] for p in src]
    after = [p[3] for p in img.getdata()]
    if before != after:
        raise AssertionError("Alpha geometry changed while remapping colour keys")
    return img


def build(output):
    output.mkdir(parents=True, exist_ok=True)
    keys = palette_keys()
    bases = json.loads(INDEX.read_text(encoding="utf-8"))
    result = {"format": "lgr1-wardrobe-official-reference-index-v1",
              "source": "Lafrich artist-authored Pixel Editor exports",
              "baseVersion": bases["version"], "entries": []}
    for ident, (gender, group, variant) in VARIANTS.items():
        src = json.loads((INPUT / (ident + ".json")).read_text(encoding="utf-8"))
        if (src["gender"], src["group"], src["variant"]) != (gender, group, variant):
            raise ValueError("Category mismatch in " + ident)
        if src["baseVersion"] != bases["version"]:
            raise ValueError("Outdated Genesis version in " + ident)
        if src["baseRigSha256"] != bases["bases"][gender]["rigSha256"]:
            raise ValueError("Outdated Genesis checksum in " + ident)
        if src["dirs"] != list(FOUR) or src["strip"] != [256, 112]:
            raise ValueError("Wrong 4-view geometry for " + ident)
        files = {}
        for path, uri in src["files"].items():
            original = decode(uri)
            if path.endswith("_back") or path.endswith("_back_f"):
                if group != "top":
                    raise ValueError("Unexpected rear garment layer " + ident)
            mapped = remap_pixels(original, group, keys)
            if path.split("/")[0] != group:
                raise ValueError("Category path incorrect: " + path)
            files[path] = to_uri(mapped)
        front = group + "/" + variant + ("_f" if gender == "female" else "")
        if front not in files:
            raise ValueError("Required main garment missing " + ident)
        if not all(decode(files[front]).crop((i*64, 0, (i+1)*64, 112)).getbbox()
                   for i in range(4)):
            raise ValueError("One or more directions are blank in " + ident)
        stamp = src["sourceUpdated"]
        entry = {
            "format": "lgr1-pakaian-v2", "schema": 2, "id": ident,
            "gender": gender, "group": group, "variant": variant,
            "name": variant.replace("_", " ").title(),
            "baseVersion": src["baseVersion"], "baseRigSha256": src["baseRigSha256"],
            "files": files,
            "note": "Artist-approved reference baseline; source " + src["originalFilename"]
                    + "; pixels retained, category keys normalized.",
            "approved": True, "rev": 1, "created": stamp, "updated": stamp,
        }
        (output / (ident + ".json")).write_text(
            json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8")
        result["entries"].append({"id": ident, "gender": gender,
                                  "group": group, "variant": variant,
                                  "path": ident + ".json"})
        print("Built " + ident + " (" + ", ".join(files) + ")")
    (output / "index.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(ROOT / "_site/media/lgr1/wardrobe-approved"))
    args = parser.parse_args()
    build(Path(args.out))
