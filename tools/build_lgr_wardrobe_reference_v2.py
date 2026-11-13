#!/usr/bin/env python3
"""Publish the six artist-approved Genesis base garment strips as Pakaian v2.

Source of truth: site/media/lgr1/wardrobe-artist-reference/*_{tee,trousers,shoes}.json
(2026-11-13 exports from Genesis Outfit Adjust). All six PNGs already have the
correct group-specific colour keys. Never recolour, resize, crop, mirror,
smooth, translate or overwrite any individual pixel. Published files retain
the source PNG data URIs byte-for-byte and are bound to the official rig SHA.
"""
import argparse
import base64
import hashlib
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
# Kept as a declarative set of valid output key colours for regression tests.
REMAP = {
    "pants": {"P1": "P1", "P2": "P2", "P3": "P3", "P4": "P4"},
    "shoes": {"S0": "S0", "S1": "S1", "S2": "S2", "S3": "S3"},
}
FAMILIES = {"top": "C", "pants": "P", "shoes": "S"}
ALLOWED = {
    "top": ("C1", "C2", "C3", "C4", "C5", "O1", "O2", "O3", "O4", "O5",
            "Ki", "Kh", "Ke", "Ka", "K7", "K5"),
    "pants": ("P1", "P2", "P3", "P4"),
    "shoes": ("S0", "S1", "S2", "S3"),
}


def palette_keys():
    text = KEY_SRC.read_text(encoding="utf-8")
    found = re.search(r"const K=(\{.*?\});", text)
    if not found:
        raise ValueError("LGRWear.K palette unavailable")
    return json.loads(found.group(1))


def decode(uri):
    if not isinstance(uri, str) or not uri.startswith("data:image/png;base64,"):
        raise ValueError("Expected PNG data URI")
    data = base64.b64decode(uri.split(",", 1)[1], validate=True)
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Invalid PNG magic")
    image = Image.open(io.BytesIO(data)).convert("RGBA")
    if image.size != (256, 112):
        raise ValueError("Expected exact 4-view 256x112 RGBA strip")
    return image


def validate_native_keys(image, group, keys):
    """Validation only: no source/target pixel transformation."""
    accepted = {tuple(bytes.fromhex(keys[code][1:])) for code in ALLOWED[group]}
    for rgba in image.getdata():
        if rgba[3] not in (0, 255):
            raise ValueError("Anti-aliased or partial-alpha garment pixel")
        if rgba[3] and rgba[:3] not in accepted:
            raise ValueError("Unknown " + group + " palette key " + repr(rgba[:3]))
    return image


def build(output):
    output.mkdir(parents=True, exist_ok=True)
    keys = palette_keys()
    bases = json.loads(INDEX.read_text(encoding="utf-8"))
    result = {
        "format": "lgr1-wardrobe-official-reference-index-v1",
        "source": "2026-11-13 artist-approved six Genesis Outfit Adjust base exports",
        "baseVersion": bases["version"],
        "entries": [],
    }
    for ident, (gender, group, variant) in VARIANTS.items():
        src = json.loads((INPUT / (ident + ".json")).read_text(encoding="utf-8"))
        if src.get("format") != "lafrich-wardrobe-artist-reference-v1":
            raise ValueError("Invalid artist source format " + ident)
        if (src.get("id"), src.get("gender"), src.get("group"), src.get("variant")) != (
                ident, gender, group, variant):
            raise ValueError("Artist source category mismatch " + ident)
        if src["baseVersion"] != bases["version"] or src["baseRigSha256"] != bases["bases"][gender]["rigSha256"]:
            raise ValueError("Official Genesis version or rig SHA mismatch " + ident)
        if src["dirs"] != list(FOUR) or src["cell"] != [64, 112] or src["strip"] != [256, 112]:
            raise ValueError("Unexpected four-view source geometry " + ident)
        if src["sourceKeyFamily"] != FAMILIES[group] or src["targetKeyFamily"] != FAMILIES[group]:
            raise ValueError("Source has wrong native colour key family " + ident)
        if not src.get("approvedReference") or src.get("gameMaster"):
            raise ValueError("Expected an approved ARTIST reference, not another game master")
        front = group + "/" + variant + ("_f" if gender == "female" else "")
        expected = {front}
        if group == "top":
            expected.add("top/tee_back" + ("_f" if gender == "female" else ""))
        if set(src["files"]) != expected:
            raise ValueError("Missing or extraneous front/back files " + ident)
        art_hasher = hashlib.sha256()
        for name in sorted(src["files"]):
            uri = src["files"][name]
            image = validate_native_keys(decode(uri), group, keys)
            if name == front and not all(
                image.crop((i * 64, 0, (i + 1) * 64, 112)).getbbox()
                for i in range(4)
            ):
                raise ValueError("Empty four-direction front art in " + ident)
            art_hasher.update(name.encode("utf-8"))
            art_hasher.update(image.tobytes())
        stamp = src["sourceUpdated"]
        art_sha = art_hasher.hexdigest()
        entry = {
            "format": "lgr1-pakaian-v2", "schema": 2, "id": ident,
            "gender": gender, "group": group, "variant": variant,
            "name": variant.replace("_", " ").title(),
            "baseVersion": src["baseVersion"],
            "baseRigSha256": src["baseRigSha256"],
            "files": src["files"],  # Exact PNG bytes, NOT re-encoded
            "note": "Artist-approved 2026-11-13 Genesis base; source " + src["originalFilename"],
            "approved": True, "rev": 2, "created": stamp, "updated": stamp,
            "artistBase": True, "artSha256": art_sha,
        }
        (output / (ident + ".json")).write_text(
            json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        result["entries"].append({
            "id": ident, "gender": gender, "group": group, "variant": variant,
            "path": ident + ".json", "updated": stamp, "artSha256": art_sha,
        })
        print("Built 2026-11-13 canonical " + ident + " (" + ", ".join(sorted(src["files"])) + ")")
    (output / "index.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(ROOT / "_site/media/lgr1/wardrobe-approved"))
    args = parser.parse_args()
    build(Path(args.out))
