"""Regression for active official-7: exact uploads, rigs, skin-key fidelity and historical fallback."""
import base64,hashlib,io,json,unittest
from pathlib import Path
from PIL import Image
B=Path(__file__).resolve().parents[1]/"site/media/lgr1/base"
DIRS=("se","sw","ne","nw")
def read(p): return json.loads(p.read_text(encoding="utf-8"))
def sha(x): return hashlib.sha256(x).hexdigest()
def im(uri): return Image.open(io.BytesIO(base64.b64decode(uri.split(",",1)[1]))).convert("RGBA")
class GenesisOfficial7Test(unittest.TestCase):
 def test_active_final_sources(self):
  index=read(B/"index.json")
  self.assertEqual(index["version"],"official-7")
  self.assertEqual(read(B/"archive/index-official-6.json")["version"],"official-6")
  for g in ("male","female"):
   with self.subTest(gender=g):
    info=index["bases"][g];data=(B/info["source"]).read_bytes();source=json.loads(data)
    pkg=read(B/info["package"])
    self.assertEqual(len(data),info["sourceBytes"])
    self.assertEqual(sha(data),info["sourceSha256"])
    self.assertEqual(pkg["format"],"lafrich-genesis-base-v1")
    self.assertEqual(pkg["gender"],g)
    self.assertEqual(pkg["rig"]["gender"],g)
    self.assertEqual(pkg["rig"]["id"],"lafrich_"+g)
    self.assertEqual(pkg["rigSha256"],info["rigSha256"])
    self.assertEqual(pkg["rigSha256"],sha(json.dumps(pkg["rig"],ensure_ascii=False,separators=(",",":")).encode()))
    self.assertEqual(pkg["skin"]["encoding"],"v6p-key-ramp-v1")
    self.assertEqual(set(pkg["skin"]["tones"]),{"porcelain","light","tan","medium","brown","deep"})
    orig=source["rig"] if g=="male" else source["record"]["rig"]
    for field in ("masks","pivots","placements","drawOrders","sides","capRadius"):
     self.assertEqual(pkg["rig"][field],orig[field],field)
    if g=="male":
     self.assertEqual(source,pkg)
    else:
     self.assertEqual(pkg["manualSlice"],source["record"]["manual"])
    keys={tuple(bytes.fromhex(v[1:])):k for k,v in pkg["skin"]["keys"].items()}
    light=pkg["skin"]["tones"]["light"]
    keyed=0
    for layer,views in pkg["rig"]["layers"].items():
     for direction,new_url in views.items():
      self.assertIn(direction,DIRS)
      new=list(im(new_url).getdata())
      self.assertEqual(len(new),64*112)
      keyed+=sum(1 for r,gc,b,a in new if a and (r,gc,b) in keys)
      if g=="female":
       old=list(im(orig["layers"][layer][direction]).getdata())
       restored=[]
       for r,gc,b,a in new:
        k=keys.get((r,gc,b)) if a else None
        restored.append((*bytes.fromhex(light[k][1:]),a) if k else (r,gc,b,a))
       self.assertEqual(restored,old,layer+"/"+direction)
     for direction in DIRS:
      self.assertEqual(len(base64.b64decode(pkg["rig"]["masks"][direction])),64*112)
    self.assertEqual(keyed,pkg["skin"]["keyedPixels"])
    self.assertEqual(keyed,5490 if g=="male" else 5411)
if __name__=="__main__":unittest.main()
