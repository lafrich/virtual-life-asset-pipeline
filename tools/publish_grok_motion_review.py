#!/usr/bin/env python3
"""Publish Grok-authored V6B motion sheets for owner review, not gameplay."""
import hashlib
import io
import json
import re
import zipfile
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"assets/grok_motion_review"
OUT=ROOT/"_site/grok-motion-preview"
ACTOR={"ichsan","npc","noor"}
DIRECTIONS={"se","sw","ne","nw"}
SAFE=re.compile(r"^[a-z][a-z0-9_]{0,70}$")

def main():
    paths=[SRC/f"preview-{i:02d}.zip" for i in range(4)]
    assert all(x.is_file() for x in paths),"Grok motion source ZIP segment missing"
    OUT.mkdir(parents=True,exist_ok=True)
    library=None
    images={}
    for path in paths:
        with zipfile.ZipFile(path) as archive:
            if "catalog.json" in archive.namelist():
                assert library is None,"Duplicate motion catalog"
                library=json.loads(archive.read("catalog.json"))
            for name in archive.namelist():
                if not name.startswith("sheets/"):continue
                leaf=name.removeprefix("sheets/")
                assert re.fullmatch(r"(?:ichsan|npc|noor)_[a-z0-9_]+_sheet\.png",leaf),name
                assert leaf not in images,"Duplicate sheet"
                images[leaf]=archive.read(name)
    assert library and library["schema"]=="mahluk-grok-motion-preview-v1"
    assert library["reviewStatus"]=="pending_owner_review" and library["isGameInstalled"] is False
    assert library["tile"]==[64,112] and library["pivot"]==[32,100]
    assert set(library["directions"])==DIRECTIONS
    actions=library["actions"]
    assert len(actions)==49 and len({a["id"] for a in actions})==49
    actual=set()
    for action in actions:
        assert SAFE.fullmatch(action["id"]) and action["reviewStatus"]=="pending_owner_review"
        assert 1<=action["frames"]<=30 and len(action["frame_ms"])==action["frames"]
        assert all(40<=ms<=1000 for ms in action["frame_ms"])
        for actor,view in action["sheets"].items():
            assert actor in ACTOR
            filename=f"{actor}_{action['id']}_sheet.png"
            assert filename in images and filename not in actual
            actual.add(filename)
            pixels=images[filename]
            assert hashlib.sha256(pixels).hexdigest()==view["sha256"],filename+" SHA mismatch"
            assert view["url"]==f"/virtual-life-asset-pipeline/grok-motion-preview/{filename}"
            with Image.open(io.BytesIO(pixels)) as png:
                assert png.format=="PNG" and png.mode=="RGBA" and png.size==(64*action["frames"],448),filename+" dimension mismatch"
                assert png.getchannel("A").getbbox(),filename+" empty"
            (OUT/filename).write_bytes(pixels)
    assert len(actual)==108 and len(images)==108,"Motion sheet coverage mismatch"
    (OUT/"catalog.json").write_text(json.dumps(library,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
    print(f"Grok motion review: {len(actions)} actions, {len(actual)} validated 4-view sheets (not approved/gameplay)")
if __name__=="__main__":
    main()
