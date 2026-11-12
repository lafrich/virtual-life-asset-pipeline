"""Regression for Nova official-5: exact skin-key pixel recovery and rig preservation."""
import base64
import hashlib
import io
import json
import unittest
from pathlib import Path
from PIL import Image

BASE=Path(__file__).resolve().parents[1]/"site"/"media"/"lgr1"/"base"
DIRS=("se","sw","ne","nw")
def sha(data): return hashlib.sha256(data).hexdigest()
def j(path): return json.loads(path.read_text(encoding="utf-8"))
def rgba(uri): return Image.open(io.BytesIO(base64.b64decode(uri.split(",",1)[1]))).convert("RGBA")

class NovaOfficial5Test(unittest.TestCase):
 def test_nova_exact_source_and_rig(self):
  ix=j(BASE/"archive"/"index-official-5.json")
  self.assertEqual(ix["version"],"official-5")
  self.assertEqual(j(BASE/"archive"/"index-official-4.json")["version"],"official-4")
  for gender in ("male","female"):
   with self.subTest(gender=gender):
    info=ix["bases"][gender]; source=BASE/info["source"]
    original=source.read_bytes()
    self.assertEqual(len(original),info["sourceBytes"])
    self.assertEqual(sha(original),info["sourceSha256"])
    draft=json.loads(original)
    pkg=j(BASE/info["package"])
    self.assertEqual(pkg["format"],"lafrich-genesis-base-v1")
    self.assertEqual(pkg["gender"],gender)
    self.assertEqual(pkg["rig"]["gender"],gender)
    self.assertEqual(pkg["id"],"lafrich_"+gender)
    self.assertEqual(pkg["rig"]["id"],"lafrich_"+gender)
    self.assertEqual(pkg["rigSha256"],info["rigSha256"])
    self.assertEqual(sha(json.dumps(pkg["rig"],ensure_ascii=False,separators=(",",":")).encode()),pkg["rigSha256"])
    self.assertEqual(pkg["skin"]["encoding"],"v6p-key-ramp-v1")
    self.assertEqual(pkg["skin"]["preview"]["tone"],"light")
    self.assertEqual(pkg["skin"]["keys"]["i"],"#FF2CE8")
    self.assertEqual(pkg["skin"]["keys"]["h"],"#FF32E5")
    self.assertEqual(pkg["skin"]["keys"]["7"],"#FF44DC")
    self.assertEqual(pkg["parts"],["leg_far_upper","leg_far_lower","arm_far_upper","arm_far_lower","torso","leg_near_upper","leg_near_lower","arm_near_upper","arm_near_lower","head","pelvis"])
    self.assertTrue((BASE/info["sheet"]).exists())
    old=draft["record"]["rig"];new=pkg["rig"]
    for field in ("masks","pivots","placements","drawOrders","sides","capRadius"):
     self.assertEqual(old[field],new[field],f"{gender} {field} changed")
    self.assertEqual(pkg["manualSlice"],draft["record"]["manual"])
    if gender=="female":
     self.assertEqual(draft["gender"],"male","Uploaded Female metadata must remain unmodified")
     self.assertEqual(draft["record"]["rig"]["gender"],"male")
    for direction in DIRS:
     with self.subTest(gender=gender,direction=direction):
      original_png=rgba(old["layers"]["body"][direction])
      keyed_png=rgba(new["layers"]["body"][direction])
      self.assertEqual(original_png.size,(64,112))
      self.assertEqual(keyed_png.size,(64,112))
      mapped=[]
      for r,g,b,a in keyed_png.getdata():
       target=next((pkg["skin"]["tones"]["light"][k] for k,v in pkg["skin"]["keys"].items()
                    if (r,g,b)==tuple(bytes.fromhex(v[1:])) and a),None)
       mapped.append((*bytes.fromhex(target[1:]),a) if target else (r,g,b,a))
      self.assertEqual(list(original_png.getdata()),mapped,"Skin-key-to-Light must recover source pixel-for-pixel")
      self.assertEqual(len(base64.b64decode(new["masks"][direction])),64*112)
      self.assertEqual(len(new["pivots"][direction]),11)
    for layer,dirs in old["layers"].items():
     if layer=="body":continue
     self.assertEqual(dirs,new["layers"][layer],f"Non-body art changed: {layer}")

if __name__=="__main__": unittest.main()
