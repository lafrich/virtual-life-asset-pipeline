"""Regression: artist-uploaded final 2 files become active official-8 without geometry drift."""
import base64,hashlib,io,json,unittest
from pathlib import Path
from PIL import Image
B=Path(__file__).resolve().parents[1]/"site/media/lgr1/base"
DIRS=("se","sw","ne","nw")
def read(p):return json.loads(p.read_text(encoding="utf-8"))
def sha(buf):return hashlib.sha256(buf).hexdigest()
def rgba(uri):return Image.open(io.BytesIO(base64.b64decode(uri.split(",",1)[1]))).convert("RGBA")
class Official8Test(unittest.TestCase):
 def test_approved_final_2(self):
  idx=read(B/"index.json")
  self.assertEqual(idx["version"],"official-8")
  self.assertEqual(read(B/"archive/index-official-7.json")["version"],"official-7")
  for gender in ("male","female"):
   with self.subTest(gender=gender):
    info=idx["bases"][gender];raw=(B/info["source"]).read_bytes()
    self.assertEqual(sha(raw),info["sourceSha256"])
    self.assertEqual(len(raw),info["sourceBytes"])
    source=json.loads(raw);pkg=read(B/info["package"])
    self.assertEqual(pkg["format"],"lafrich-genesis-base-v1")
    self.assertEqual(pkg["gender"],gender)
    self.assertEqual(pkg["id"],"lafrich_"+gender)
    self.assertEqual(pkg["rig"]["id"],"lafrich_"+gender)
    self.assertEqual(pkg["rig"]["gender"],gender)
    self.assertEqual(pkg["rigSha256"],info["rigSha256"])
    self.assertEqual(sha(json.dumps(pkg["rig"],ensure_ascii=False,separators=(",",":")).encode()),pkg["rigSha256"])
    self.assertEqual(pkg["skin"]["encoding"],"v6p-key-ramp-v1")
    self.assertEqual(set(pkg["skin"]["tones"]),{"porcelain","light","tan","medium","brown","deep"})
    orig=source["record"]["rig"] if gender=="male" else source["rig"]
    for field in ("masks","pivots","placements","drawOrders","sides","capRadius"):
     self.assertEqual(pkg["rig"][field],orig[field],field)
    self.assertEqual(pkg["manualSlice"],source["record"]["manual"] if gender=="male" else source["manualSlice"])
    keycolors={tuple(bytes.fromhex(c[1:])):k for k,c in pkg["skin"]["keys"].items()}
    light=pkg["skin"]["tones"]["light"]
    count=0
    for layer,views in pkg["rig"]["layers"].items():
     for d,url in views.items():
      self.assertIn(d,DIRS)
      new=list(rgba(url).getdata())
      old=list(rgba(orig["layers"][layer][d]).getdata())
      self.assertEqual(len(new),64*112)
      count+=sum(1 for r,g,b,a in new if a and (r,g,b) in keycolors)
      if gender=="male":
       back=[]
       for r,g,b,a in new:
        key=keycolors.get((r,g,b)) if a else None
        back.append((*bytes.fromhex(light[key][1:]),a) if key else (r,g,b,a))
       self.assertEqual(back,old,"Male skin roundtrip "+layer+"/"+d)
      else:
       self.assertEqual(new,old,"Female artwork must be metadata-only "+layer+"/"+d)
    for d in DIRS:
     self.assertEqual(len(base64.b64decode(pkg["rig"]["masks"][d])),64*112)
     self.assertEqual(len(pkg["rig"]["pivots"][d]),11)
    self.assertEqual(count,pkg["skin"]["keyedPixels"])
    self.assertEqual(count,5173 if gender=="male" else 5101)
if __name__=="__main__":unittest.main()
