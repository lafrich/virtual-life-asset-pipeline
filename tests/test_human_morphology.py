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
    def test_male_shoulder_and_female_hip_have_real_silhouette_difference(self):
        original_shirt=colored(25,39,54,78)
        original_pants=colored(26,38,77,105)
        layers={}
        for gender in ("male","female"):
            source={"shirt":original_shirt.copy(),"pants":original_pants.copy()}
            layers[gender]=sculpt_human_layers(source,gender)
        m=layers["male"]
        f=layers["female"]
        self.assertGreater(int(mask(m["shirt"])[58].sum()),
                           int(mask(f["shirt"])[58].sum())+2,
                           "Male shoulders must actually be wider than female")
        self.assertGreater(int(mask(f["pants"])[81].sum()),
                           int(mask(m["pants"])[81].sum())+2,
                           "Female hips must actually be wider than male")
        self.assertEqual(FRAME,(64,112))
        for gender in ("male","female"):
            self.assertEqual(layers[gender]["shirt"].size,FRAME)
            self.assertEqual(layers[gender]["pants"].size,FRAME)
        # Pelvis and torso must remain connected to their original alpha,
        # not clipped, warped or shifted after pose generation.
        for gender in ("male","female"):
            self.assertTrue(np.all(mask(layers[gender]["shirt"])|~mask(original_shirt)))
            self.assertTrue(np.all(mask(layers[gender]["pants"])|~mask(original_pants)))
        self.assertTrue(np.all(mask(original_shirt)[55]==14))

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

    def test_abstract_anatomy_cues_do_not_change_any_alpha_or_head(self):
        sprite=np.zeros((112,64,4),dtype=np.uint8)
        sprite[32:55,23:42]=[218,172,137,255]   # bald head
        sprite[55:81,23:42]=[218,172,137,255]   # torso
        sprite[80:105,25:39]=[218,172,137,255]  # pelvis / legs
        src=Image.fromarray(sprite,"RGBA")
        original=src.tobytes()
        for gender in ("male","female"):
            for direction in ("se","sw","ne","nw"):
                with self.subTest(gender=gender,direction=direction):
                    out=shade_human_anatomy(src,gender,direction,55,78,
                                           (159,112,87),(239,199,167))
                    a=np.asarray(out)
                    self.assertTrue(np.array_equal(a[...,3],sprite[...,3]),
                                    "Anatomy shade changed outfit-fitting silhouette")
                    self.assertTrue(np.array_equal(a[:54],sprite[:54]),
                                    "Anatomy changed head, hairline or face")
                    self.assertFalse(np.array_equal(a[59:86],sprite[59:86]),
                                     "No visible pixel morphology in body")
                    self.assertTrue(np.array_equal(a[105:],sprite[105:]))
        self.assertEqual(src.tobytes(),original,
                         "Anatomy helper must not mutate the input canvas")


if __name__=="__main__":
    unittest.main()
