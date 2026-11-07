#!/usr/bin/env python3
"""Preview actual Mahluk male/female V6P part-composed activity frames.

Uses game source palette keys, not synthetic redraw mannequin. This is review
material ONLY and does not register the new actions as live stock.
"""
from pathlib import Path
import re,json
import numpy as np
from PIL import Image,ImageDraw
from build_native_mahluk_stock import ROOT,FW,FH,BANDS,DIRS
OUT=ROOT/"build/native-mahluk-stock-review"
JS=(ROOT/"site/v6p-compositor.js").read_text(encoding="utf-8")
K=json.loads(re.search(r"const K=(\{.*?\});",JS,re.S).group(1))
def rgb(hexs):return tuple(bytes.fromhex(hexs.lstrip("#")))
# The SAME light skin / navy hair / neutral costume ramps used by V6P.
C={
 "H0":"#10141B","H1":"#1C2330","H2":"#232A38","H3":"#2A3242","H4":"#3E5A88",
 "B":"#10141B","Mu":"#1C2330",
 "Ki":"#F1D3B5","Kh":"#EBC8A8","Ke":"#E0AE8A","Ka":"#D9A47E",
 "K7":"#A8704E","K5":"#8A5A3C","St":"#D8B7A1","St2":"#C8A58B",
 "C1":"#3F4655","C2":"#2A3242","C3":"#262D3B","C4":"#1E2430","C5":"#1A1F29",
 "O1":"#2A3242","O2":"#262D3B","O3":"#222936","O4":"#1E2430","O5":"#1B202A",
 "OD":"#ECF0F4",
 "P1":"#4E5769","P2":"#3A4458","P3":"#333C4D","P4":"#29303E",
 "S0":"#5A412F","S1":"#4C3728","S2":"#6E5848","S3":"#E8E6E0",
 "GL":"#4C5468"
}
M={rgb(K[k]):rgb(v) for k,v in C.items() if k in K}
def recolor(im):
    data=np.asarray(im.convert("RGBA")).copy()
    for k,v in M.items():
        hit=np.all(data[...,:3]==np.array(k),axis=2)&(data[...,3]==255)
        data[hit,:3]=v
    return Image.fromarray(data,"RGBA")
def layer(name):
    file=OUT/(name+".png")
    return Image.open(file).convert("RGBA") if file.exists() else None
def composite(gender,action,dir,frame):
    start,_,_=BANDS[action];di=DIRS.index(dir);y=(start+di)*FH;x=frame*FW
    suffix="_f" if gender=="female" else ""
    # Exact z-order of the Mahluk V6P compositor's faceless nude base.
    parts=[
      "hair/mid_curtain_back",
      "base/body"+suffix,
      "top/nude_back"+suffix,
      "shoes/nude"+suffix,
      "pants/nude"+suffix,
      "top/nude"+suffix,
      "face/"+("f" if suffix else "m")+"_blank",
      "hair/mid_curtain_front",
    ]
    im=Image.new("RGBA",(FW,FH),(0,0,0,0))
    sh=layer("base/shadow")
    if sh:
        im.alpha_composite(recolor(sh.crop((x,y,x+FW,y+FH))))
    for part in parts:
        src=layer(part)
        if src is None:continue
        piece=src.crop((x,y,x+FW,y+FH))
        im.alpha_composite(recolor(piece))
    return im

def main():
    fontcolor=(228,235,244)
    acts=list(BANDS)
    cards=[]
    for action in acts:
        start,n,ms=BANDS[action]
        card=Image.new("RGB",(768,378),(24,34,48)); d=ImageDraw.Draw(card)
        d.text((12,12),f"{action.upper()} — REAL V6P BASE MALE/FEMALE · FRAME {n}",fill=fontcolor)
        for genderi,gender in enumerate(("male","female")):
            for di,dir in enumerate(DIRS):
                frame=composite(gender,action,dir,0).resize((136,238),Image.Resampling.NEAREST)
                x=14+di*188;y=36+genderi*168
                # compact overlapping rows: crop to central 80 px tall for floor poses
                tile=frame.crop((0,0,136,190))
                # scale to 100x175 with nearest for readable contact layout
                thumb=composite(gender,action,dir,0).resize((104,182),Image.Resampling.NEAREST)
                px=x+36;py=y
                back=Image.new("RGBA",(104,182),(52,65,83,255))
                back.alpha_composite(thumb)
                card.paste(back.convert("RGB"),(px,py))
                d.text((px+16,py+162),f"{gender[0].upper()} {dir.upper()}",fill=fontcolor)
        cards.append(card)
    page=Image.new("RGB",(768,378*len(cards)),(17,25,37))
    for i,card in enumerate(cards):page.paste(card,(0,i*378))
    page.save(OUT/"review_contact_sheet.png")
    # A native-GIF for SE and SW sample, not random characters.
    for action in acts:
        n,ms=BANDS[action][1:]
        sequence=[]
        for f in range(n):
            cell=Image.new("RGBA",(320,256),(36,46,62,255))
            for i,(g,d) in enumerate((("male","se"),("female","sw"))):
                sample=composite(g,action,d,f).resize((144,252),Image.Resampling.NEAREST)
                cell.alpha_composite(sample,(i*160+8,0))
            sequence.append(cell.convert("P",palette=Image.Palette.ADAPTIVE))
        sequence[0].save(OUT/(action+"_native.gif"),save_all=True,
          append_images=sequence[1:],duration=ms,loop=0,disposal=2,optimize=False)
    print("Generated authentic Mahluk V6P composite previews for four review actions")

if __name__=="__main__":main()
