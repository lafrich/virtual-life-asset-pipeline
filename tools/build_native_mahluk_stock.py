#!/usr/bin/env python3
"""Bake Mahluk native V6P keyed *part* sprites into V6P activity bands.

This reads the SAME editable 384x4928 source part sheets that Idle/Walk use.
It writes 384x2688 per-part V6P activity sheets, preserving all existing
pushup and squat pixel bytes. No image generation, no runtime rig.
NEW FOUR MOTIONS ARE DRAFTS UNTIL THE OWNER REVIEWS THEIR ANATOMY.
"""
from __future__ import annotations
from pathlib import Path
import argparse
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "site/media/v6p"
TARGET = ROOT / "site/media/v6p-act"
FW,FH = 64,112
CW,CH = 384,2688
DIRS = ("se","sw","ne","nw")
BANDS = {
    "yoga_sphinx_idle":(8,4,500),
    "yoga_puppy_idle":(12,4,500),
    "hip_shake":(16,6,120),
    "yoga_happy_baby_idle":(20,4,450),
}

def source_cell(sheet, row, col=0):
    return np.asarray(sheet.crop((FW*col,FH*row,FW*(col+1),FH*(row+1))).convert("RGBA")).copy()

def warp(src, action, frame, direction):
    """Integer native-pixel pose baking. 4 poses / 4 directions, no rig."""
    yy,xx=np.indices((FH,FW),dtype=float)
    u=xx if direction in ("se","ne") else FW-1-xx
    if action=="yoga_happy_baby_idle":
        # Rebuild bent raised legs from the native reclining silhouette.
        # Hip at u=37, knee at u=46, feet return toward the torso.
        # Two-segment projection: lying thigh -> vertical knee -> inward shin.
        out=np.zeros_like(src)
        ys,xs=np.nonzero(src[...,3])
        phase=(0,-1,0,1)[frame%4]
        for y,x in zip(ys,xs):
            uu=x if direction in ("se","ne") else (FW-1-x)
            if uu<=37:
                nu=uu;ny=y+phase*(0.35 if uu>23 else 0)
            elif uu<=46:
                nu=uu;ny=y-(uu-37)*2.25+phase*0.3
            else:
                nu=46-(uu-46)*0.66;ny=y-20.25-(uu-46)*0.80+phase*0.7
            nx=nu if direction in ("se","ne") else (FW-1-nu)
            ix,iy=int(round(nx)),int(round(ny))
            if 0<=ix<FW and 0<=iy<FH:
                out[iy,ix]=src[y,x]
        return out
    if action=="hip_shake":
        sway=(-2,-4,-2,2,4,2)[frame]
        waist=np.maximum(0,1-np.abs(yy-76)/25)
        shoulders=np.maximum(0,1-np.abs(yy-51)/19)
        sx=xx-np.rint(sway*waist-0.45*sway*shoulders)
        sy=yy
    else:
        head=np.clip((35-u)/21,0,1)
        hips=np.clip((u-24)/27,0,1)
        breath=(0,-1,0,1)[frame%4]
        if action=="yoga_sphinx_idle":
            lift=(-14*head+3.5*hips)+breath*(0.5*head+0.2*hips)
        else: # Puppy: forehead grounded, raised hips, slow breathing
            lift=(2.5*head-12*hips)+breath*(0.35*head+0.7*hips)
        sx=xx
        sy=yy-np.rint(lift)
    sx=np.rint(sx).astype(np.int32)
    sy=np.rint(sy).astype(np.int32)
    valid=(sx>=0)&(sx<FW)&(sy>=0)&(sy<FH)
    out=np.zeros_like(src)
    out[valid]=src[sy[valid],sx[valid]]
    return out

def shadow(action, frame, direction):
    yy,xx=np.mgrid[0:FH,0:FW]
    ax=18 if action!="hip_shake" else 10
    ry=3 if action=="hip_shake" else 4
    yc=100 if action=="hip_shake" else 96
    inside=((xx-32)/ax)**2+((yy-yc)/ry)**2<=1
    out=np.zeros((FH,FW,4),np.uint8)
    out[inside]=(0,0,0,56)
    return out

def get_parts():
    read=json.loads((TARGET/"READINESS.json").read_text())
    return [p.removesuffix(".png") for p in read["parts"].keys() if (TARGET/p).is_file()]

def build(output, *, source=SOURCE, target=TARGET, parts=None):
    output.mkdir(parents=True,exist_ok=True)
    parts=parts or get_parts()
    manifests={}
    for part in parts:
        existing_path=target/(part+".png")
        original=Image.open(existing_path).convert("RGBA")
        if original.size!=(CW,CH):
            raise ValueError(f"Activity sheet dimensions invalid: {part}: {original.size}")
        native_path=source/(part+".png")
        native=Image.open(native_path).convert("RGBA") if native_path.exists() else None
        if native is not None and native.size not in ((384,4928),(1,1)):
            raise ValueError(f"Native source dimensions invalid: {part}: {native.size}")
        dst=original.copy()
        for action,(start,n,ms) in BANDS.items():
            for di,direction in enumerate(DIRS):
                for f in range(n):
                    if part=="base/shadow":
                        pixels=shadow(action,f,direction)
                    elif action in ("yoga_sphinx_idle","yoga_puppy_idle"):
                        # Provisional grounded prone source: the ACTUAL authored
                        # pushup V6P part, never our previous composite preview.
                        # Idle yoga never cycles through push-up action phases.
                        fixed_pose=2 if action=="yoga_sphinx_idle" else 0
                        pixels=source_cell(original,4+di,fixed_pose)
                    elif native is not None and native.size==(384,4928):
                        # Native Idle for sway, native Lie for Happy Baby.
                        srcrow=(4 if action=="hip_shake" else 36)+di
                        pixels=source_cell(native,srcrow,f%4)
                    else:
                        pixels=np.zeros((FH,FW,4),dtype=np.uint8)
                    # Face/Emosi foreground is never generated from some
                    # other actor: we only deform this exact part's pixels.
                    if part!="base/shadow":
                        pixels=warp(pixels,action,f,direction)
                    if not np.isin(np.unique(pixels[...,3]),[0,56,255]).all():
                        raise AssertionError(f"Invalid alpha for {part} {action}")
                    dst.paste(Image.fromarray(pixels,"RGBA"),(f*FW,(start+di)*FH))
        before=np.asarray(original.crop((0,0,CW,8*FH)))
        after=np.asarray(dst.crop((0,0,CW,8*FH)))
        if not np.array_equal(before,after):
            raise AssertionError(f"Existing pushup/squat changed: {part}")
        file=output/(part+".png")
        file.parent.mkdir(parents=True,exist_ok=True)
        dst.save(file,optimize=True)
        manifests[part]={"source":str(native_path.relative_to(ROOT)) if native is not None else None,
                         "preserved_rows":[0,7],"new_bands":[8,23]}
    (output/"NATIVE_STOCK_REVIEW.json").write_text(json.dumps({
        "format":"v6p-native-activity-review-v1",
        "source":"site/media/v6p (native keyed Idle/Walk/Lie sprite modules) + existing authored Pushup",
        "cell":[FW,FH],"pivot":[32,100],"sheet":[CW,CH],"directions":DIRS,
        "status":"review_only_NOT_live_or_approved",
        "source_templates":{"yoga_sphinx_idle":"authored pushup","yoga_puppy_idle":"authored pushup","hip_shake":"native idle","yoga_happy_baby_idle":"native lie"},
        "clips":{k:{"band":v[0],"frames":v[1],"frame_ms":v[2],"loop":True,"status":"preview_anatomy_not_approved"} for k,v in BANDS.items()},
        "parts":manifests},indent=2),encoding="utf-8")
    print("NATIVE V6P REVIEW",len(manifests),"part sheets; preserved rows 0..7; 4 new bands")

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--out",default="build/native-mahluk-stock-review")
    a=p.parse_args()
    build(ROOT/a.out)
