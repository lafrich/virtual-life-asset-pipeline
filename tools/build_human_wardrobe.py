"""Build four-view modular wardrobe presets from the SAME native V6B Human rig.
No existing actor artwork, expression, animation or authored sprite is changed.
Each preset is a transparent 256x112 strip: SE / SW / NE / NW at native scale.
"""
from __future__ import annotations
import json,sys
from pathlib import Path
from PIL import Image

DIRS=("se","sw","ne","nw")
FRAME=(64,112)
# Human Male/Female have precisely the same supported wardrobe vocabulary,
# but images are generated separately against their own native body geometry.
PRESETS={
 "hair":[
  ("short","Short",dict(hair="short",hc="silver")),
  ("swept","Side Swept",dict(hair="swept",hc="silver")),
  ("curtain","Curtain",dict(hair="mid_curtain",hc="silver")),
  ("bob","Bob",dict(hair="mid",hc="silver")),
  ("wavy","Wavy",dict(hair="wavy",hc="silver")),
  ("wavy_curtain","Wavy Curtain",dict(hair="wavy_curtain",hc="silver")),
  ("long","Long",dict(hair="long",hc="silver")),
  ("long_curtain","Long Curtain",dict(hair="long_curtain",hc="silver")),
 ],
 "shirt":[
  ("tee","T-Shirt",dict(top="tee",tc="paper")),
  ("long_sleeve","Long Sleeve",dict(top="tee_long",tc="paper")),
  ("shirt","Button Shirt",dict(top="shirt",tc="paper")),
  ("shirt_long","Long Button Shirt",dict(top="shirt_l",tc="paper")),
  ("hoodie","Hoodie",dict(top="hoodie",tc="paper")),
  ("cardigan","Cardigan",dict(top="hoodie",tc="paper")),
 ],
 "pants":[
  ("trousers","Trousers",dict(pants="trousers",pc="paper")),
  ("denim","Denim",dict(pants="trousers",pc="paper")),
  ("baggy","Baggy",dict(pants="baggy",pc="paper")),
  ("ripped","Ripped Jeans",dict(pants="trousers_ripped",pc="paper")),
 ],
 "shoes":[
  ("shoes","Classic Shoes",dict(shoes="shoes",sc="paper")),
  ("sneakers","Sneakers",dict(shoes="sneakers",sc="paper")),
  ("boots","Boots",dict(shoes="boots",sc="paper")),
  ("hightops","High Tops",dict(shoes="hightops",sc="paper")),
 ]
}
STACK={
 "hair":("hair_front",),
 "shirt":("shirt","shirt_graphic","outer"),
 "pants":("pants","rips"),
 "shoes":("shoes","shoes_over"),
}
def _config(gender):
 return dict(body="f" if gender=="female" else "m",skin="light",hair="short",
  hc="black",top="tee_long",tc="paper",pants="trousers",pc="paper",
  shoes="shoes",sc="paper")

def build_human_wardrobe(root:Path,media:Path,site:Path)->list[dict]:
 # Reuse exact body geometry and 4-way pose/parts renderer as the Human base.
 for folder in (root/"assets/npc_preview_v2",root/"chars-iso/v6b/tools"):
  if str(folder) not in sys.path:sys.path.insert(0,str(folder))
 import base6
 records=[]
 for gender in ("male","female"):
  base="human_"+gender+"_base"
  for slot,recipes in PRESETS.items():
   for variant,label,changes in recipes:
    cfg={**_config(gender),**changes}
    strip=Image.new("RGBA",(64*4,112))
    rear=Image.new("RGBA",(64*4,112)) if slot=="hair" else None
    for index,direction in enumerate(DIRS):
     _,layers,_=base6.render(cfg,f=0,d=direction,expr="neutral",anim="idle")
     part=Image.new("RGBA",FRAME)
     for key in STACK[slot]:
      if key in layers:part.alpha_composite(layers[key].convert("RGBA"))
     if rear is not None:
      behind=layers.get("hair_back",Image.new("RGBA",FRAME)).convert("RGBA")
      rear.alpha_composite(behind,(index*64,0))
     if part.getchannel("A").getbbox() is None:
      raise ValueError(f"Missing native {slot}: {gender}/{variant}/{direction}")
     strip.alpha_composite(part,(index*64,0))
    filename=f"wardrobe-{gender}-{slot}-{variant}.png"
    strip.save(media/filename,optimize=True)
    # The original bug stacked rear hair OVER the face. Publish rear layer
    # independently and render it BEHIND the base head, in every direction.
    back_filename=f"wardrobe-{gender}-hairback-{variant}.png" if rear is not None else ""
    if rear is not None:rear.save(media/back_filename,optimize=True)
    records.append({"id":f"preset_{base}_{slot}_{variant}",
       "name":label,"category":slot,"template_base":base,
       "sheet":"media/"+filename,
       **({"back_sheet":"media/"+back_filename} if back_filename else {}),
       "directions":list(DIRS),
       "size":[64,112],"source":"native-v6b-wardrobe"})
 result={"version":2,"format":"mahluk-hidup-native-wardrobe-v1",
   "directions":list(DIRS),"frame":[64,112],"pivot":[32,100],
   "presets":records}
 (site/"wardrobe-presets.json").write_text(
  json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",
  encoding="utf-8")
 return records
