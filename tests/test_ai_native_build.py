import json
import sys
import tempfile
from pathlib import Path
import unittest
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from generate_npc_from_spec import build


class NativeV6BDraftRenderTests(unittest.TestCase):
    def test_native_source_sheet_four_views_and_real_poses(self):
        spec={
            "id":"ai_testnative123", "name":"Test Native",
            "body":"female","skin":"medium","hair":"long","hair_color":"walnut",
            "top":"tee","top_color":"steel","pants_color":"slate",
            "shoes":"sneakers","shoes_color":"paper",
            "skirt":"none","glasses":True,"ponytail":False,
            "quiff":False,"tufts":False,"apron":False,
            "notes":"Native renderer smoke test",
        }
        with tempfile.TemporaryDirectory() as tmp:
            folder=build(spec,Path(tmp))
            manifest=json.loads((folder/"manifest.json").read_text())
            self.assertEqual(manifest["directions"],["se","sw","ne","nw"])
            self.assertEqual(manifest["row_starts"]["idle"],4)
            self.assertEqual(manifest["row_starts"]["walk"],0)
            with Image.open(folder/manifest["sheet"]) as im:
                self.assertEqual(im.size,(384,4928))
                self.assertEqual(im.mode,"RGBA")
                # Real male/female native output and all four views must be populated.
                for row in [0,1,2,3,4,5,6,7,12,16,20]:
                    frame=im.crop((0,row*112,64,(row+1)*112))
                    self.assertIsNotNone(frame.getchannel("A").getbbox())
            self.assertGreater(len(list((folder/"sprites").glob("*_f*.png"))),0)
            with Image.open(folder/manifest["previews"][0]) as gif:
                self.assertGreaterEqual(gif.n_frames,24)
            self.assertTrue((folder/"spec.json").exists())


if __name__=="__main__":
    unittest.main()
