#!/usr/bin/env python3
"""Render ONLY review media from Mahluk's checked-in native Happy Baby sprites.
Do not write to site/media, stock indices, or the Animation Database.
Run python tools/render_happy_baby_review.py
"""
import json
import re
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
SHEETS=ROOT/"site/media/v6p-act"
DEST=ROOT/"docs/previews/happy-baby-rocking"
DEST.mkdir(parents=True, exist_ok=True)
COMPOSITOR=(ROOT/"site/v6p-compositor.js").read_text()
def js_obj(name,following):
    match=re.search(r"const "+name+r"=(\{.*?\});\s*const "+following+r"=",COMPOSITOR,re.S)
    if not match:
        raise RuntimeError("Cannot parse canonical V6P "+name+" palette")
    return json.loads(match.group(1))
K=js_obj("K","P")
P=js_obj("P","FR")
DIRS=("se","sw","ne","nw")
FRAMES=(0,1,2,3,2,1)
XOFF=(0,0,1,1,0,0)
YOFF=(0,0,-2,-4,-2,0)
DURATION=150
W,H=64,112
SCALE=5
FRAME_COLS=6
ACT_ROW=20
FONT=ImageFont.load_default()

def hex_rgb(value):
    value=value.lstrip("#")
    return tuple(int(value[i:i+2],16) for i in (0,2,4))
def mix(a,b,weight):
    return tuple(round(x+(y-x)*weight) for x,y in zip(a,b))
def color_key_mapping(gender):
    skin=P["skin"]["porcelain" if gender=="female" else "light"]
    hair=P["hair"]["black"]
    top=P["top"]["white"]
    pants=P["pants"]["slate"]
    shoes=P["shoes"]["walnut"]
    display={}
    for i in range(5):display["H"+str(i)]=hex_rgb(hair[i])
    display.update({"B":hex_rgb(hair[0]),"Mu":hex_rgb(hair[1])})
    for key,value in skin.items():display["K"+key]=hex_rgb(value)
    display["St"]=mix(hex_rgb(skin["i"]),hex_rgb(hair[1]),.16)
    display["St2"]=mix(hex_rgb(skin["i"]),hex_rgb(hair[1]),.28)
    for i in range(5):
        display["C"+str(i+1)]=hex_rgb(top["C"][i])
        display["O"+str(i+1)]=hex_rgb(top["O"][i])
    display["OD"]=hex_rgb("#2A3242")
    for i in range(4):display["P"+str(i+1)]=hex_rgb(pants[i])
    for i in range(4):display["S"+str(i)]=hex_rgb(shoes[i])
    display["GL"]=hex_rgb(P["glasses"])
    return {hex_rgb(rgb):display[code] for code,rgb in K.items() if code in display}
def source(name,view,frame):
    file=SHEETS/(name+".png")
    if not file.is_file():raise RuntimeError("Missing published native part: "+str(file))
    with Image.open(file) as image:
        if image.size!=(384,2688):raise RuntimeError("Wrong atlas size "+str(file))
        x=frame*W;y=(ACT_ROW+DIRS.index(view))*H
        return image.crop((x,y,x+W,y+H)).convert("RGBA")
def recolor(image,mapping):
    array=np.array(image)
    original=array[:,:,:3].copy()
    alpha=array[:,:,3]
    for src,dst in mapping.items():
        selector=(np.all(original==src,axis=2) & (alpha==255))
        if selector.any():array[selector,:3]=dst
    return Image.fromarray(array,"RGBA")
def native_pose(gender,view,frame):
    suffix="_f" if gender=="female" else ""
    parts=(
      "base/body"+suffix,
      "top/nude_back"+suffix,
      "shoes/nude"+suffix,
      "pants/nude"+suffix,
      "top/nude"+suffix,
      "base/body_front"+suffix,
      "face/"+("f" if gender=="female" else "m")+"_blank"
    )
    base=Image.new("RGBA",(W,H),(0,0,0,0))
    base.alpha_composite(source("base/shadow",view,frame))
    colors=color_key_mapping(gender)
    dy=YOFF[frame] if False else 0
    return base,parts,colors
def frame_canvas(gender,view,idx):
    original=FRAMES[idx]
    shadow_parts,parts,colors=native_pose(gender,view,original)
    body=Image.new("RGBA",(W,H),(0,0,0,0))
    for part in parts:
        image=recolor(source(part,view,original),colors)
        body.alpha_composite(image)
    dx=XOFF[idx]*(1 if view in ("se","ne") else -1)
    dy=YOFF[idx]
    result=shadow_parts.copy()
    result.alpha_composite(body,(dx,dy))
    return result
def view_cell(gender,view,idx):
    art=frame_canvas(gender,view,idx).resize((W*SCALE,H*SCALE),Image.Resampling.NEAREST)
    tile=Image.new("RGB",(W*SCALE,H*SCALE),(30,45,67))
    tile.paste(art,mask=art.getchannel("A"))
    return tile
def title(draw,xy,label):
    draw.text((xy[0]+7,xy[1]+6),label,font=FONT,fill=(220,231,245))
def review_grid(idx):
    gap=10; top=30; side=14
    cellw=W*SCALE;cellh=H*SCALE
    canvas=Image.new("RGB",(side*2+cellw*4+gap*3,top*2+cellh*2+gap),(19,31,50))
    draw=ImageDraw.Draw(canvas)
    draw.text((14,9),"GENESIS / HAPPY BABY ROCKING / REVIEW ONLY — NOT IN DATABASE",font=FONT,fill=(224,236,253))
    for row,gender in enumerate(("male","female")):
        for col,view in enumerate(DIRS):
            x=side+col*(cellw+gap);y=top+row*(cellh+gap)
            canvas.paste(view_cell(gender,view,idx),(x,y))
            title(draw,(x,y),gender.upper()+" / "+view.upper())
    draw.text((14,canvas.height-20),"NATIVE V6P HAPPY BABY SOURCE — F%d/6 — 150ms/frame — DO NOT PUBLISH"%(idx+1),fill=(219,224,231),font=FONT)
    return canvas
full=[review_grid(i) for i in range(6)]
full[0].save(DEST/"genesis_happy_baby_rocking_review.gif",save_all=True,append_images=full[1:],
 duration=[DURATION]*6,loop=0,optimize=False)
for gender in ("male","female"):
    for view in DIRS:
        frames=[view_cell(gender,view,i) for i in range(6)]
        frames[0].save(DEST/(gender+"_"+view+".gif"),save_all=True,append_images=frames[1:],
          duration=[DURATION]*6,loop=0,optimize=False)
# Contact sheet: reference-motion keyframes for visual QA, no background chart implying approval.
gap=12; pad=12; fw=W*SCALE; fh=H*SCALE
contact=Image.new("RGB",(pad*2+fw*6+gap*5,30+fh*2+gap),(20,31,47))
draw=ImageDraw.Draw(contact)
draw.text((12,8),"SIX NATIVE-PIXEL KEYFRAMES — SE VIEW — MALE/FEMALE — NOT STOCK",fill=(226,237,250),font=FONT)
for row,gender in enumerate(("male","female")):
 for i in range(6):
    x=pad+i*(fw+gap);y=30+row*(fh+gap)
    contact.paste(view_cell(gender,"se",i),(x,y))
    title(draw,(x,y),gender.upper()+" F"+str(i+1))
contact.save(DEST/"six_frame_review.png")
data={"title":"Yoga Happy Baby Rocking","source":"Mahluk native V6P Happy Baby keyed part sheets",
      "stage":"VISUAL REVIEW ONLY","reference":"user GIF: 508x508, six frames, 150ms each",
      "native":[64,112],"pivot":[32,100],"directions":DIRS,"genders":["male","female"],
      "frame_source_indices":FRAMES,"offset_x":XOFF,"offset_y":YOFF,
      "limitations":"Motion recipe from GIF, first pass only. Clothing is native nude-source/blank face, not custom-drawn Genesis wardrobe; no per-limb foot grip refinement. Nothing installed in Animation Stock."}
(DEST/"README.json").write_text(json.dumps(data,indent=2))
print("Rendered preview files:",[f.name for f in DEST.iterdir()])
