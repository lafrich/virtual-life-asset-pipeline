"""One-time bake: V6P garment/hair atlases → LGR-1 wear strips (no runtime V6P).
Each output is 256×112 = SE|SW|NE|NW idle frame 0, colours still KEY colours
(lgr-wear.js maps them to the chosen palette). Run from the repo root:
    python3 tools/bake_lgr_wear.py
"""
import json, pathlib
from PIL import Image
SRC=pathlib.Path("site/media/v6p"); OUT=pathlib.Path("site/media/lgr1/mh-wear")
IDLE_ROW=4; FW,FH=64,112
items=[]
for cat in ("top","pants","shoes","hair"):
    for p in sorted((SRC/cat).glob("*.png")):
        n=p.stem
        if n.startswith(("nude","custom")) or "_over" in n: continue
        im=Image.open(p).convert("RGBA")
        strip=Image.new("RGBA",(FW*4,FH))
        for di in range(4):
            strip.paste(im.crop((0,(IDLE_ROW+di)*FH,FW,(IDLE_ROW+di+1)*FH)),(di*FW,0))
        (OUT/cat).mkdir(parents=True,exist_ok=True)
        strip.save(OUT/cat/(n+".png"),optimize=True)
        items.append(cat+"/"+n)
json.dump({"format":"lgr1-wear-index-v1","cell":[FW,FH],"dirs":["se","sw","ne","nw"],"frame":"idle 0",
           "note":"Baked from the retired V6P atlases by tools/bake_lgr_wear.py; key colours, mapped by site/lgr-wear.js.",
           "items":items},open(OUT/"index.json","w"),indent=1)
print(len(items),"strips")
