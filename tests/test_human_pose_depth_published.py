"""Published Male/Female native face/torso depth atlases used by ACT Editor.

For both poses, all four frames of the requested directions must contain
real source actor pixels. Other directions must remain fully transparent.
This is NOT an action-fallback or a pasted unrelated character.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image

root=Path("_site")
cat=json.loads((root/"catalog.json").read_text())["characters"]
for gender in ("male","female"):
 actor=next(x for x in cat if x["id"]==f"human_{gender}_base")
 for action,front in (("lie_idle",(0,1)),("knee_chest_idle",(2,3))):
  clip=next(m for m in actor["motions"] if m["id"]==action and m["available"])
  assert clip.get("depth_front"),(gender,action,"missing authoring metadata")
  path=root/clip["depth_front"]
  assert path.exists(),(gender,action,path)
  with Image.open(path) as sheet:
   assert sheet.size==(clip["frames"]*64,4*112),(gender,action,sheet.size)
   atlas=np.asarray(sheet.convert("RGBA"))
  for view in range(4):
   for frame in range(clip["frames"]):
    tile=atlas[view*112:(view+1)*112,frame*64:(frame+1)*64]
    count=int(np.count_nonzero(tile[...,3]))
    if view in front:
     assert count>150,(gender,action,view,frame,"foreground empty")
    else:
     assert count==0,(gender,action,view,frame,"wrong direction changed")
 print("PASS",gender,action,"authored front-depth atlas with isolated directions")
