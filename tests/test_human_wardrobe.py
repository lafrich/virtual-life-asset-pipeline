"""Validate real 4-sided wardrobe artwork published by the Human source rig."""
from __future__ import annotations
import json,unittest,sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from tools.build_human_wardrobe import PRESETS,STACK
class Wardrobe(unittest.TestCase):
 def test_recipe_names_and_source_layers(self):
  self.assertEqual(set(PRESETS),{"hair","shirt","pants","shoes"})
  self.assertEqual(len({x[0] for rows in PRESETS.values() for x in rows}),
                   sum(len(rows) for rows in PRESETS.values()))
  self.assertEqual(set(STACK),set(PRESETS))
  self.assertTrue(all(len(variants)>=4 for variants in PRESETS.values()))
 def test_published_four_direction_assets(self):
  out=ROOT/"_site"
  manifest=json.loads((out/"wardrobe-presets.json").read_text())
  entries=manifest["presets"]
  self.assertEqual(len(entries),sum(len(x) for x in PRESETS.values())*2)
  self.assertEqual(manifest["pivot"],[32,100])
  self.assertEqual({x["template_base"] for x in entries},
                   {"human_male_base","human_female_base"})
  for row in entries:
   if row["category"]=="hair":
    self.assertIn("back_sheet",row)
    with Image.open(out/row["back_sheet"]) as rear:
     self.assertEqual(rear.size,(256,112))
     self.assertTrue(all(rear.crop((d*64,0,(d+1)*64,112)).getbbox() for d in range(4)))
   else:self.assertNotIn("back_sheet",row)
   self.assertEqual(row["directions"],["se","sw","ne","nw"])
   with Image.open(out/row["sheet"]) as sheet:
    self.assertEqual(sheet.mode,"RGBA")
    self.assertEqual(sheet.size,(256,112))
    for index in range(4):
     view=sheet.crop((index*64,0,(index+1)*64,112))
     self.assertIsNotNone(view.getchannel("A").getbbox(),
                           (row["id"],index))
if __name__=="__main__":unittest.main()
