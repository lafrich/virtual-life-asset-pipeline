"""Rig Studio must import only real actor source sprites; model types never fabricate poses."""
from __future__ import annotations
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

from tools.build_rig_studio import build_rig_packs, clip_for, profile_for

ROOT=Path(__file__).resolve().parents[1]
DEFS=json.loads((ROOT/"assets/animation_library/model_types.json").read_text())


class RigStudioTests(unittest.TestCase):
    def test_model_types_are_distinct_and_all_special_characters_mapped(self):
        expected={
            "aladdin_sane":"HUMANOID","ichsan":"HUMANOID",
            "milk_mascot":"MASCOT","legacy_gfunk":"ALIEN_SUIT",
            "legacy_yerbies":"ALIEN_SUIT","legacy_theodore":"HELMETED",
            "legacy_otis":"HELMETED",
            "native_bowie":"HUMANOID","legacy_kang_parkir":"HUMANOID",
        }
        self.assertEqual(len(DEFS["types"]),4)
        for actor,kind in expected.items():
            found,reason=profile_for({"id":actor},DEFS)
            self.assertEqual(found,kind)
            self.assertNotEqual(reason,"provisional_fallback")
        self.assertEqual(len({m["adapter"] for m in DEFS["types"]}),4)
        self.assertFalse(any(m["allow_unreviewed_retarget"] for m in DEFS["types"]))

    def test_real_native_custom_and_unapproved_dont_mix(self):
        with tempfile.TemporaryDirectory() as tmp:
            site=Path(tmp)
            (site/"media").mkdir()
            Image.new("RGBA",(384,4928)).save(site/"media/person.png")
            Image.new("RGBA",(256,448)).save(site/"media/person-action.png")
            actor={"id":"aladdin_sane","sheet":"media/person.png"}
            walk={"id":"walk","name":"WALK","source":"native","available":True,
                  "row":0,"frames":6,"frame_ms":[140]*6,"loop":True}
            touch={"id":"wave","name":"WAVE","source":"custom","available":True,
                   "sheet":"media/person-action.png","row":0,
                   "frames":4,"frame_ms":[200]*4,"loop":False}
            self.assertIsNone(clip_for(actor,{**walk,"available":False},site))
            native=clip_for(actor,walk,site)
            self.assertEqual((native["columns"],native["row_start"]),(6,0))
            self.assertEqual(native["atlas"],"media/person.png")
            custom=clip_for(actor,touch,site)
            self.assertEqual((custom["columns"],custom["rows"]),(4,4))
            self.assertEqual(custom["atlas"],"media/person-action.png")
            with self.assertRaises(ValueError):
                clip_for(actor,{**touch,"sheet":"../../bad.png"},site)

    def test_character_packs_are_playable_only_with_source_frames(self):
        with tempfile.TemporaryDirectory() as tmp:
            site=Path(tmp)/"site"
            (site/"media").mkdir(parents=True)
            Image.new("RGBA",(384,4928)).save(site/"media/bowie.png")
            characters=[
                {"id":"aladdin_sane","name":"Bowie","sheet":"media/bowie.png",
                 "motions":[
                     {"id":"walk","name":"WALK","source":"native","available":True,
                      "row":0,"frames":6,"frame_ms":[140]*6,"loop":True},
                     {"id":"pick_up","name":"PICK UP","available":False,"reason":"NEEDS CHARACTER RIG"}]},
                {"id":"milk_mascot","name":"Milk","sheet":"",
                 "motions":[{"id":"walk","available":False}]},
                {"id":"legacy_gfunk","name":"Gfunk","sheet":"","motions":[]},
                {"id":"legacy_theodore","name":"Theodore","sheet":"","motions":[]},
            ]
            rig=build_rig_packs(site,characters,ROOT)
            self.assertEqual(len(rig["characters"]),4)
            self.assertEqual(len(rig["types"]),4)
            self.assertEqual(len(rig["registry"]),203)
            self.assertEqual([x["model_type"] for x in characters],
                             ["HUMANOID","MASCOT","ALIEN_SUIT","HELMETED"])
            bowie=json.loads((site/characters[0]["motion_pack"]).read_text())
            milk=json.loads((site/characters[1]["motion_pack"]).read_text())
            self.assertEqual(len(bowie["clips"]),1)
            self.assertEqual(bowie["clips"][0]["id"],"walk")
            self.assertEqual(milk["clips"],[])
            self.assertFalse(milk["usable_in_game"])
            self.assertNotIn("pick_up",[a["id"] for a in bowie["clips"]])
            self.assertNotIn("pee_wall",[a["id"] for a in bowie["clips"]])


if __name__=="__main__":
    unittest.main()
