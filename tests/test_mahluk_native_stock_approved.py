#!/usr/bin/env python3
"""Validate the exact five owner-approved Mahluk V6P stock activities.

This checks *committed native keyed part-sheet bytes*, not generated mockups.
"""
import hashlib, json, re
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
ACT=ROOT/"site"/"media"/"v6p-act"
READY=json.loads((ACT/"READINESS.json").read_text())
HASH=json.loads((ACT/"HASH_MANIFEST.json").read_text())
ACTIONS={
 "pushup":(4,6,160),
 "yoga_sphinx_idle":(8,4,500),
 "yoga_puppy_idle":(12,4,500),
 "hip_shake":(16,6,125),
 "yoga_happy_baby_idle":(20,4,500)
}
DIRS=("se","sw","ne","nw")
assert READY["sheet"]["w"]==384 and READY["sheet"]["h"]==2688
assert READY["sheet"]["cell"]==[64,112]
assert READY["sheet"]["pivot"]==[32,100]
assert READY["sheet"]["dir_order"]==list(DIRS)
assert len(HASH["outputs"])==18
part_images={}
for name,meta in HASH["outputs"].items():
    filename=ACT/name
    assert filename.is_file(),name
    actual=hashlib.sha256(filename.read_bytes()).hexdigest()
    assert actual==meta["sha256"],(name,"mismatched sprite payload")
    im=Image.open(filename).convert("RGBA")
    assert im.size==(384,2688)
    part_images[name]=np.asarray(im)
    assert READY["parts"][name]["sha256"]==actual
for action,(start,frames,ms) in ACTIONS.items():
    band=READY["bands"][action]
    assert (band["start"],band["frames"],band["ms_per_frame"])==(start,frames,ms)
    assert band["status"]=="authored"
    for di,dir in enumerate(DIRS):
        for gender in ("","_f"):
            key=f"base/body{gender}.png"
            states=[]
            for frame in range(frames):
                cell=part_images[key][(start+di)*112:(start+di+1)*112,frame*64:(frame+1)*64]
                yy,xx=np.where(cell[:,:,3]>0)
                assert len(xx)>30,(action,dir,gender,frame,"empty")
                assert 0<xx.min() and xx.max()<63 and 0<yy.min() and yy.max()<111,(action,dir,gender,frame,"clipped")
                moving_key=(f"pants/nude{gender}.png" if action in ("hip_shake","yoga_happy_baby_idle") else key)
                moving=part_images[moving_key][(start+di)*112:(start+di+1)*112,frame*64:(frame+1)*64]
                states.append(moving.tobytes())
            # Head is intentionally fixed in Hip Shake and Happy Baby; the motion lives in the hips/legs.
            assert len(set(states))>=2,(action,dir,gender,"static")
# Head and hair MUST be exactly unchanged throughout 6 hip-shake frames.
for di,direction in enumerate(DIRS):
    for name in ("base/body.png","base/body_f.png","hair/mid_curtain_back.png",
                 "hair/mid_curtain_front.png","hair/long_back.png","hair/long_front.png",
                 "face/m_blank.png","face/f_blank.png"):
        a=part_images[name]
        frames=[a[(16+di)*112:(17+di)*112,f*64:(f+1)*64] for f in range(6)]
        if name.startswith("base/body"):
            frames=[frame[:58] for frame in frames]
        assert all(np.array_equal(frames[0],v) for v in frames[1:]),(name,direction,"head moved")
# Existing Squat draft preserved as the same first-band raw counts from the source manifest.
for name in ("base/body.png","base/body_f.png"):
    pixels=part_images[name][:448,:,3]
    assert int(np.count_nonzero(pixels))==HASH["outputs"][name]["squat_opaque_pixels"]
# Source is a raster frame database. No runtime skeletal animation allowed.
for name in ACTIONS:
    assert name in (ROOT/"site"/"v6p-activity-contract.js").read_text()
print("PASS: 5 stock clips / 40 directional gender tracks / 192 frames / 18 native sheets / fixed hip-shake head / no clipping")
