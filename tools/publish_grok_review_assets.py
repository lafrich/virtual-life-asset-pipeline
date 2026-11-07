#!/usr/bin/env python3
"""Publish exact Grok V6B review PNGs to Pages without overwriting old Semesta assets."""
from __future__ import annotations
import hashlib, io, json, re, zipfile
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"site/v6b-asset-generator/data"
OUT=ROOT/"_site/grok-assets"
PREFIX="V6B_Asset_Generator/"
DIRS={"sw","se","ne","nw"}
ARCHIVE_SHA="87995580a79f2b47505915c014e166c623e68d48e6e68f142ea702876d56a172"
SAFE=re.compile(r"^[a-z0-9][a-z0-9_-]{2,90}$")

def main():
    parts=sorted(DATA.glob("part-*.bin"))
    assert [x.name for x in parts]==[f"part-{i:02d}.bin" for i in range(17)],"V6B source segments missing"
    original=b"".join(x.read_bytes() for x in parts)
    assert hashlib.sha256(original).hexdigest()==ARCHIVE_SHA,"Original V6B source SHA mismatch"
    items={}
    with zipfile.ZipFile(io.BytesIO(original)) as z:
        def add(row,batch,category):
            name,side=row["id"],row["dir"]
            assert SAFE.fullmatch(name) and side in DIRS
            if category=="furniture":
                source=f"{PREFIX}source/{batch}/{row['file']}"
            else:
                source=f"{PREFIX}source/B4R2c/files/{name}_{side}.png"
            data=z.read(source)
            assert hashlib.sha256(data).hexdigest()==row["sha256"],source+" SHA mismatch"
            with Image.open(io.BytesIO(data)) as img:
                assert img.format=="PNG" and img.mode=="RGBA" and list(img.size)==row["size"] and img.getchannel("A").getbbox(),source+" PNG invalid"
            size,pivot=row["size"],row["pivot"]
            assert len(pivot)==2 and all(0<=pivot[i]<=size[i] for i in range(2)),source+" pivot invalid"
            if category=="furniture":
                fp=row["footprint"]
                assert len(fp)==2 and all(0.25<=float(a)<=12 for a in fp),source+" footprint invalid"
            else: fp=None
            item=items.setdefault(name,{
                "id":name,"label":name.removeprefix("furniture-").removeprefix("id200_transport_").replace("_"," ").replace("-"," ").title(),
                "category":category,"batch":batch,"footprint":fp,"state":"review-preview","playable":False,"views":{}
            })
            assert side not in item["views"] and item["batch"]==batch and item["category"]==category and item["footprint"]==fp
            folder=OUT/category
            folder.mkdir(parents=True,exist_ok=True)
            filename=f"{name}_{side}.png"
            (folder/filename).write_bytes(data)
            item["views"][side]={
                "size":size,"pivot":pivot,"sha256":row["sha256"],
                "url":f"/virtual-life-asset-pipeline/grok-assets/{category}/{filename}"
            }
        for batch in ("I1","I2","I3","I4","I5","I6"):
            manifest=json.loads(z.read(f"{PREFIX}source/{batch}/{batch.lower()}-manifest.json"))
            for row in manifest["files"]: add(row,batch,"furniture")
        veh=json.loads(z.read(f"{PREFIX}source/B4R2c/b4/b4r2-manifest.json"))
        for row in veh: add(row,"B4R2c","vehicle")
    all_items=sorted(items.values(),key=lambda x:(x["category"],x["batch"],x["id"]))
    assert sum(x["category"]=="furniture" for x in all_items)==61
    assert sum(x["category"]=="vehicle" for x in all_items)==6
    assert all(set(x["views"])==DIRS for x in all_items),"Missing four-direction PNGs"
    obj={
        "schema":"semesta-grok-v6b-review-gallery-v1","sourceSha256":ARCHIVE_SHA,
        "note":"Exact original proposed sprites. Independent previews: no existing Semesta sprite, Mahluk Hidup character or animation changed.",
        "count":len(all_items),"fourWayPngs":len(all_items)*4,"items":all_items
    }
    OUT.mkdir(parents=True,exist_ok=True)
    payload=json.dumps(obj,ensure_ascii=False,separators=(",",":"),sort_keys=True)
    (OUT/"manifest.json").write_text(payload+"\n",encoding="utf8")
    (OUT/"manifest.js").write_text("/* Generated from original V6B review archive */\nwindow.VLGrokAssetReview=Object.freeze("+payload+");\n",encoding="utf8")
    print(f"Grok gallery: {len(all_items)} archive assets and {len(all_items)*4} verified PNGs")

if __name__=="__main__":
    main()
