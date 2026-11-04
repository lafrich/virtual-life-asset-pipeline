"""Dimorphic HUMAN sprite fitting-template regression.

The generated pixel base must differ in real alpha silhouette, not only a
recolor of identical male/female clothes. All shapes stay inside 64x112 and
retain the original pose anchors for modular outfit layers.
"""
import sys
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from build_human_templates import sculpt_human_layers,shade_human_anatomy,FRAME


def colored(left,right,top,bottom,color=(215,175,141,255)):
    a=np.zeros((112,64,4),dtype=np.uint8)
    a[top:bottom,left:right]=color
    return Image.fromarray(a,"RGBA")

def mask(image):
    return np.asarray(image.convert("RGBA"))[...,3]>0


class HumanMorphology(unittest.TestCase):
    def test_neither_gender_gets_extra_wide_shoulders_or_hip_bulges(self):
        """M/F native rig already sculpts the silhouette. Never grow arbitrary
        rectangular wings on shoulders or hips after all motion is posed.
        """
        original_shirt=colored(25,39,54,78)
        original_pants=colored(26,38,77,105)
        for gender in ("male","female"):
            with self.subTest(gender=gender):
                source={"shirt":original_shirt.copy(),"pants":original_pants.copy()}
                result=sculpt_human_layers(source,gender)
                self.assertEqual(result["shirt"].size,FRAME)
                self.assertEqual(result["pants"].size,FRAME)
                self.assertTrue(np.array_equal(mask(result["shirt"]),mask(original_shirt)),
                    "Shoulder must retain original V6B outline")
                self.assertTrue(np.array_equal(mask(result["pants"]),mask(original_pants)),
                    "Buttocks/hips must retain original V6B outline")
                self.assertEqual(result["shirt"].tobytes(),original_shirt.tobytes())
                self.assertEqual(result["pants"].tobytes(),original_pants.tobytes())
        self.assertEqual(int(mask(original_shirt)[55].sum()),14,
                         "Input source template was mutated")

    def test_no_motion_or_gender_independent_layers_are_modified(self):
        head=colored(24,39,31,54)
        arm=colored(19,23,58,83)
        source={"shirt":colored(25,39,55,79),
                "pants":colored(25,39,78,106),
                "head":head,"arm_near":arm}
        for gender in ("male","female"):
            result=sculpt_human_layers(dict(source),gender)
            self.assertEqual(result["head"].tobytes(),head.tobytes())
            self.assertEqual(result["arm_near"].tobytes(),arm.tobytes())
        with self.assertRaises(ValueError):
            sculpt_human_layers(dict(source),"other")

    def test_no_artificial_pelvis_buttock_or_chest_dots_in_native_pose(self):
        sprite=np.zeros((112,64,4),dtype=np.uint8)
        sprite[32:55,23:42]=[218,172,137,255]   # head
        sprite[55:81,23:42]=[218,172,137,255]   # torso
        sprite[80:105,25:39]=[218,172,137,255]  # hips / legs
        source=Image.fromarray(sprite,"RGBA")
        original=source.tobytes()
        for gender in ("male","female"):
            for direction in ("se","sw","ne","nw"):
                with self.subTest(gender=gender,direction=direction):
                    output=shade_human_anatomy(source,gender,direction,55,78,
                                              (159,112,87),(239,199,167))
                    self.assertEqual(output.tobytes(),original,
                        "No standalone chest marks, fake butt cheeks or pelvis V")
                    self.assertIsNot(output,source)
        self.assertEqual(source.tobytes(),original)


if __name__=="__main__":
    unittest.main()
