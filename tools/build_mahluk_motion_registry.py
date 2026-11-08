#!/usr/bin/env python3
"""Discover Genesis V6B JSON assets; no editor source or manual ID list changes."""
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("site/motion-packs")
FORMAT = "genesis-v6b-universal-motion-v1"
IDS = re.compile(r"(?:clp|clip)_[a-z0-9_]{3,70}")
CATEGORY = re.compile(r"[a-z][a-z0-9_]{0,31}")
KEY = re.compile(r"[a-z0-9_]{1,32}")
DIRS = ("se", "sw", "ne", "nw")
PARTS = ("leg_l", "leg_r", "torso", "arm_l", "arm_r", "head")
FIELDS = ("x", "y", "angle", "ax", "ay")
RETIRED = {"pushup", "yoga_sphinx_idle", "yoga_puppy_idle",
           "hip_shake", "yoga_happy_baby_idle"}

def ensure(ok, message):
    if not ok:
        raise ValueError(message)

def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

def validate(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    mid = data.get("id")
    ensure(isinstance(mid, str) and IDS.fullmatch(mid), f"{path}: invalid ID")
    ensure(path.name == f"{mid}.motion.json", f"{path}: filename does not match ID")
    ensure(mid not in RETIRED and not any(mid == f"clip_{x}" for x in RETIRED),
           f"{path}: retired stock must not return")
    ensure(data.get("format") == FORMAT, f"{path}: unsupported format")
    ensure(data.get("sourceAction") in ("idle", "sit", "lie", "sleep"),
           f"{path}: unsupported V6B starting pose")
    ensure(data.get("status", "draft") in ("draft", "stock"),
           f"{path}: status must be draft or stock")
    ensure(isinstance(data.get("name"), str) and data["name"].strip(),
           f"{path}: missing name")
    ensure(isinstance(data.get("category"), str) and CATEGORY.fullmatch(data["category"]),
           f"{path}: invalid category")
    ensure(not any(key in data for key in ("characterId", "sourceId", "appearance", "wear", "faceId")),
           f"{path}: motion must not contain character or clothing")
    frames = data.get("frames")
    ensure(isinstance(frames, list) and 1 <= len(frames) <= 6,
           f"{path}: requires 1-6 frames")
    for frame in frames:
        ensure(isinstance(frame, dict) and isinstance(frame.get("key"), str)
               and KEY.fullmatch(frame["key"]) and number(frame.get("ms"))
               and 40 <= frame["ms"] <= 800,
               f"{path}: invalid frame key or duration")
    tracks = data.get("tracks")
    ensure(isinstance(tracks, dict), f"{path}: missing tracks")
    for direction in DIRS:
        poses = tracks.get(direction)
        ensure(isinstance(poses, list) and len(poses) == len(frames),
               f"{path}: incomplete {direction} frames")
        for idx, pose in enumerate(poses):
            ensure(isinstance(pose, dict) and all(part in pose for part in PARTS),
                   f"{path}: incomplete {direction} F{idx} parts")
            for part in PARTS:
                values = pose[part]
                ensure(isinstance(values, dict) and all(number(values.get(k)) for k in FIELDS),
                       f"{path}: invalid {direction} F{idx} {part}")
                ensure(abs(values["x"]) <= 128 and abs(values["y"]) <= 128
                       and abs(values["angle"]) <= 180 and 0 <= values["ax"] <= 63
                       and 0 <= values["ay"] <= 111,
                       f"{path}: pose out of bounds {direction} F{idx} {part}")
    return mid

def main():
    ensure(ROOT.is_dir(), f"Missing motion asset directory: {ROOT}")
    files = sorted(ROOT.glob("*.motion.json"))
    seen = set()
    for path in files:
        mid = validate(path)
        ensure(mid not in seen, f"Duplicate Genesis motion ID: {mid}")
        seen.add(mid)
    manifest = {"format": "genesis-v6b-motion-registry-v1",
                "files": [path.name for path in files]}
    output = ROOT / "index.json"
    value = json.dumps(manifest, indent=2) + "\n"
    if not output.exists() or output.read_text(encoding="utf-8") != value:
        output.write_text(value, encoding="utf-8")
    print(f"Genesis JSON motion registry: {len(files)} verified asset(s) -> {output}")

if __name__ == "__main__":
    main()
