"""Legacy work-pose arm/root attachment regression.

Native pose tests do NOT cover custom Pak Ogah, parking attendants, baristas,
or statue/bottle gestures, which replace their arms after the common v6b rig.
"""
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"assets/npc_pak_ogah"))
from job_common import weld_arm_rgba_layers

W,H=64,112
P=(55,91,145,255)
S=(30,62,95,255)
def layer():
    return np.zeros((H,W,4),dtype=np.uint8)

class LegacyArms(unittest.TestCase):
    def layers(self,mirror=False):
        shirt=layer()
        shirt[53:78,25:40]=P
        left=layer()
        left[55:91,20:23]=S
        right=layer()
        right[55:91,43:46]=S
        if mirror:
            shirt,left,right=(a[:,::-1].copy() for a in (shirt,left,right))
        return {"shirt":shirt,"outer":layer(),"arm_near":left,"arm_far":right}

    def assert_joined(self,layers):
        body=layers["shirt"][...,3]>0
        for slot in ("arm_near","arm_far"):
            arm=layers[slot][...,3]>0
            for y in range(56,60):
                xs=np.flatnonzero(body[y]|arm[y])
                # Both shoulder and torso must be a SINGLE 4-connected run.
                self.assertTrue(np.all(body[y,xs.min():xs.max()+1]|
                                       arm[y,xs.min():xs.max()+1]),
                                f"{slot}: disconnected shoulder at {y}")
            self.assertEqual(int(np.count_nonzero(arm[85])),3,
                             "Do not thicken/draw on wrists or fingers")

    def test_left_and_right_weld_without_replacing_art(self):
        for mirrored in (False,True):
            with self.subTest(mirrored=mirrored):
                layers=self.layers(mirrored)
                shirt=layers["shirt"].copy()
                left=layers["arm_near"].copy()
                right=layers["arm_far"].copy()
                near,far=weld_arm_rgba_layers(layers)
                self.assertIsNone(near)
                self.assertIsNone(far)
                self.assert_joined(layers)
                self.assertTrue(np.array_equal(shirt,layers["shirt"]))
                for slot,original in (("arm_near",left),("arm_far",right)):
                    after=layers[slot]
                    original_opaque=original[...,3]>0
                    self.assertTrue(np.array_equal(after[original_opaque],
                                                   original[original_opaque]),
                                    "Must preserve all original arm pixel colors")

    def test_custom_replacement_arms_overrides_are_welded(self):
        layers=self.layers()
        near=layers["arm_near"].copy()
        far=layers["arm_far"].copy()
        layers["arm_near"][:]=0
        layers["arm_far"][:]=0
        near,far=weld_arm_rgba_layers(layers,near,far)
        self.assert_joined({"shirt":layers["shirt"],"arm_near":near,"arm_far":far})
        self.assertEqual(np.count_nonzero(layers["arm_near"]),0,
                         "Custom action arm shouldn't write into dead base arm")

    def test_far_away_props_and_gestures_stay_separate(self):
        layers=self.layers()
        layers["arm_near"][:]=0
        layers["arm_near"][54:91,5:7]=S
        before=layers["arm_near"].copy()
        weld_arm_rgba_layers(layers)
        self.assertTrue(np.array_equal(before,layers["arm_near"]),
                        "Never stretch arm across a large empty distance to torso")

    def test_all_legacy_custom_generators_use_final_weld(self):
        sources=[
            "assets/npc_pak_ogah/make_pak_ogah.py",
            "assets/npc_babeh_loak/make_babeh_loak.py",
            "assets/npc_kang_parkir/make_kang_parkir.py",
            "assets/npc_manusia_silver/make_manusia_silver.py",
            "assets/npc_pemuda_golda/make_pemuda_golda.py",
            "assets/barista_famima/src/barista.py",
        ]
        for source in sources:
            with self.subTest(source=source):
                body=(ROOT/source).read_text()
                self.assertIn("weld_arm_rgba_layers(",body)

if __name__=="__main__":
    unittest.main()
