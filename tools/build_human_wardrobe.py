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
  ("short_black","Short / Black",dict(hair="short",hc="black")),
  ("swept_black","Swept / Black",dict(hair="swept",hc="black")),
  ("curtain_brown","Curtain / Brown",dict(hair="mid_curtain",hc="walnut")),
  ("bob_brown","Bob / Chestnut",dict(hair="mid",hc="darkwalnut")),
  ("long_black","Long / Black",dict(hair="long",hc="black")),
  ("wavy_brown","Wavy / Brown",dict(hair="wavy",hc="walnut")),
  ("short_silver","Short / Silver",dict(hair="short",hc="silver")),
 ],
 "shirt":[
  ("tee_white","T-Shirt / White",dict(top="tee",tc="paper")),
  ("tee_black","T-Shirt / Black",dict(top="tee",tc="black")),
  ("long_navy","Long Sleeve / Navy",dict(top="tee_long",tc="navy")),
  ("shirt_ivory","Button Shirt / Ivory",dict(top="shirt",tc="ivory")),
  ("shirt_blue","Button Shirt / Blue",dict(top="shirt_l",tc="steel")),
  ("hoodie_red","Hoodie / Burgundy",dict(top="hoodie",tc="oxblood")),
 ],
 "pants":[
  ("trousers_black","Trousers / Black",dict(pants="trousers",pc="night")),
  ("denim_blue","Denim / Blue",dict(pants="trousers",pc="steel")),
  ("baggy_grey","Baggy / Grey",dict(pants="baggy",pc="slate")),
  ("ripped_dark","Ripped / Dark",dict(pants="trousers_ripped",pc="charcoal")),
 ],
 "shoes":[
  ("sneakers_white","Sneakers / White",dict(shoes="sneakers",sc="paper")),
  ("sneakers_dark","Sneakers / Dark",dict(shoes="sneakers",sc="night")),
  ("boots_brown","Boots / Brown",dict(shoes="boots",sc="walnut")),
  ("hightops_grey","High Tops / Grey",dict(shoes="hightops",sc="grey")),
 ]
}
STACK={
 "hair":("hair_back","hair_front"),
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
    for index,direction in enumerate(DIRS):
     _,layers,_=base6.render(cfg,f=0,d=direction,expr="neutral",anim="idle")
     part=Image.new("RGBA",FRAME)
     for key in STACK[slot]:
      if key in layers:part.alpha_composite(layers[key].convert("RGBA"))
     if part.getchannel("A").getbbox() is None:
      raise ValueError(f"Missing native {slot}: {gender}/{variant}/{direction}")
     strip.alpha_composite(part,(index*64,0))
    filename=f"wardrobe-{gender}-{slot}-{variant}.png"
    strip.save(media/filename,optimize=True)
    records.append({"id":f"preset_{base}_{slot}_{variant}",
       "name":label,"category":slot,"template_base":base,
       "sheet":"media/"+filename,"directions":list(DIRS),
       "size":[64,112],"source":"native-v6b-wardrobe"})
 result={"version":1,"format":"mahluk-hidup-native-wardrobe-v1",
   "directions":list(DIRS),"frame":[64,112],"pivot":[32,100],
   "presets":records}
 (site/"wardrobe-presets.json").write_text(
  json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",
  encoding="utf-8")
 return records
