"""Female-only official-9: exact approved draft, reversible skin ramp, unchanged Male."""
import base64,hashlib,io,json,unittest
from pathlib import Path
from PIL import Image
B=Path(__file__).resolve().parents[1]/"site/media/lgr1/base"
D=("se","sw","ne","nw")
def read(path):return json.loads(path.read_text(encoding="utf-8"))
def sha(buf):return hashlib.sha256(buf).hexdigest()
def img(uri):return Image.open(io.BytesIO(base64.b64decode(uri.split(",",1)[1]))).convert("RGBA")
class GenesisOfficial9Test(unittest.TestCase):
 def test_latest_female_source_and_fixed_male(self):
  index=read(B/"index.json")
  prior=read(B/"archive/index-official-8.json")
  self.assertEqual(index["version"],"official-9")
  self.assertEqual(prior["version"],"official-8")
  self.assertEqual(index["bases"]["male"],prior["bases"]["male"])
  male=read(B/index["bases"]["male"]["package"])
  self.assertEqual(male["rigSha256"],index["bases"]["male"]["rigSha256"])
  self.assertEqual(index["bases"]["male"]["package"],"genesis-base-male-official-8.json")
  info=index["bases"]["female"]
  self.assertEqual(info["package"],"genesis-base-female-official-9.json")
  self.assertNotEqual(info["rigSha256"],prior["bases"]["female"]["rigSha256"])
  raw=(B/info["source"]).read_bytes()
  self.assertEqual(len(raw),info["sourceBytes"])
  self.assertEqual(sha(raw),info["sourceSha256"])
  src=json.loads(raw)
  self.assertEqual(src["format"],"lgr-1-draft-v1")
  self.assertEqual(src["gender"],"female")
  orig=src["record"]["rig"]
  pkg=read(B/info["package"])
  self.assertEqual(pkg["format"],"lafrich-genesis-base-v1")
  self.assertEqual(pkg["gender"],"female")
  self.assertEqual(pkg["id"],"lafrich_female")
  self.assertEqual(pkg["rig"]["id"],"lafrich_female")
  self.assertEqual(pkg["rig"]["gender"],"female")
  self.assertEqual(pkg["rigSha256"],info["rigSha256"])
  self.assertEqual(sha(json.dumps(pkg["rig"],ensure_ascii=False,separators=(",",":")).encode()),pkg["rigSha256"])
  for key in ("masks","pivots","placements","drawOrders","sides","capRadius"):
   self.assertEqual(pkg["rig"][key],orig[key],key)
  self.assertEqual(pkg["manualSlice"],src["record"]["manual"])
  self.assertEqual(set(pkg["skin"]["tones"]),{"porcelain","light","tan","medium","brown","deep"})
  kfrom={tuple(bytes.fromhex(v[1:])):k for k,v in pkg["skin"]["keys"].items()}
  light=pkg["skin"]["tones"]["light"]
  keyed=0
  for layer,views in orig["layers"].items():
   self.assertEqual(set(pkg["rig"]["layers"][layer]),set(views))
   for d,url in views.items():
    before=list(img(url).getdata())
    after=list(img(pkg["rig"]["layers"][layer][d]).getdata())
    self.assertEqual(len(before),64*112)
    keyed+=sum(1 for r,g,b,a in after if a and (r,g,b) in kfrom)
    restored=[]
    for r,g,b,a in after:
     key=kfrom.get((r,g,b)) if a else None
     restored.append((*bytes.fromhex(light[key][1:]),a) if key else (r,g,b,a))
    self.assertEqual(restored,before,layer+"/"+d)
  for d in D:
   self.assertEqual(len(base64.b64decode(pkg["rig"]["masks"][d])),7168)
   self.assertEqual(len(base64.b64decode(pkg["manualSlice"][d])),7168)
   self.assertEqual(len(pkg["rig"]["pivots"][d]),11)
  self.assertEqual(keyed,5101)
  self.assertEqual(pkg["skin"]["keyedPixels"],5101)
if __name__=="__main__":unittest.main()
