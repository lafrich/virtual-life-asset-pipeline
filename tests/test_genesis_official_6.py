"""Regression for official-6: source integrity, metadata-only correction and skin-key fidelity."""
import base64, hashlib, io, json, unittest
from pathlib import Path
from PIL import Image

B = Path(__file__).resolve().parents[1] / "site/media/lgr1/base"
DIRS = ("se", "sw", "ne", "nw")
SKIN = ("i", "h", "e", "a", "7", "5")
def sha(buf): return hashlib.sha256(buf).hexdigest()
def read(path): return json.loads(path.read_text(encoding="utf-8"))
def image(uri): return Image.open(io.BytesIO(base64.b64decode(uri.split(",", 1)[1]))).convert("RGBA")

class GenesisOfficial6Test(unittest.TestCase):
 def test_final_packages(self):
  ix = read(B/"archive/index-official-6.json")
  self.assertEqual(ix["version"], "official-6")
  self.assertEqual(read(B/"archive/index-official-5.json")["version"], "official-5")
  for gender in ("male", "female"):
   with self.subTest(gender=gender):
    info=ix["bases"][gender]; raw=(B/info["source"]).read_bytes()
    self.assertEqual(sha(raw),info["sourceSha256"])
    self.assertEqual(len(raw),info["sourceBytes"])
    src=json.loads(raw); out=read(B/info["package"])
    self.assertEqual(src["format"],"lafrich-genesis-base-v1")
    self.assertEqual(out["format"],src["format"])
    self.assertEqual(out["gender"],gender)
    self.assertEqual(out["id"],"lafrich_"+gender)
    self.assertEqual(out["rig"]["gender"],gender)
    self.assertEqual(out["rig"]["id"],"lafrich_"+gender)
    self.assertEqual(out["rig"]["name"],"Lafrich "+gender.capitalize())
    self.assertEqual(out["rigSha256"],info["rigSha256"])
    self.assertEqual(sha(json.dumps(out["rig"],ensure_ascii=False,separators=(",",":")).encode()),out["rigSha256"])
    self.assertEqual(out["skin"],src["skin"])
    self.assertEqual(out["skin"]["encoding"],"v6p-key-ramp-v1")
    self.assertEqual(set(out["skin"]["keys"]),set(SKIN))
    self.assertEqual(set(out["skin"]["tones"]),{"porcelain","light","tan","medium","brown","deep"})
    self.assertEqual(out["parts"],src["parts"])
    self.assertEqual(out["parents"],src["parents"])
    self.assertEqual(out["manualSlice"],src["manualSlice"])
    for field in ("layers","masks","pivots","placements","drawOrders","sides","capRadius"):
     self.assertEqual(src["rig"][field],out["rig"][field],gender+" "+field+" changed")
    self.assertEqual(out["skin"]["keyedPixels"],5531 if gender=="male" else 5452)
    self.assertEqual(out["skin"]["offRamp"]["count"],4 if gender=="male" else 8)
    count=0;other=0
    keys={tuple(bytes.fromhex(v[1:])) for v in out["skin"]["keys"].values()}
    for layer, views in out["rig"]["layers"].items():
     for direction, encoded in views.items():
      if not encoded: continue
      rgba=image(encoded); self.assertEqual(rgba.size,(64,112))
      for r,g,b,a in rgba.getdata():
       if not a: continue
       if (r,g,b) in keys:count+=1
       else:other+=1
    self.assertEqual(count,out["skin"]["keyedPixels"])
    self.assertEqual(other,out["skin"]["offRamp"]["count"])
    for d in DIRS:
     self.assertEqual(len(base64.b64decode(out["rig"]["masks"][d])),64*112)
     self.assertEqual(len(out["rig"]["pivots"][d]),11)
    if gender=="female":
     self.assertEqual(src["gender"],"male")
     self.assertEqual(src["rig"]["gender"],"male")

if __name__=="__main__": unittest.main()
