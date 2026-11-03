"""Pixel-art contour regression for unclothed HUMAN male/female templates.

Outlines belong to the opaque BODY perimeter only, not the bald head, and
must retain 64x112 sprite/alpha alignment in all animation frames.
"""
import sys
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from build_human_templates import outline_human_body, BODY_START_Y

class HumanOutlineTest(unittest.TestCase):
    def test_contour_torso_arms_legs_feet_without_head_artifacts(self):
        pixels=np.zeros((112,64,4),dtype=np.uint8)
        skin=(221,174,139,255)
        # Head intentionally touches the shoulders as a real character does.
        pixels[33:54,25:39]=skin
        pixels[53:79,24:40]=skin      # body
        pixels[59:84,20:24]=skin      # left arm
        pixels[59:84,40:44]=skin      # right arm
        pixels[79:101,25:31]=skin     # left leg
        pixels[79:101,34:40]=skin     # right leg
        pixels[101:104,23:32]=skin    # left foot
        pixels[101:104,34:43]=skin    # right foot
        src=Image.fromarray(pixels,"RGBA")
        out=outline_human_body(src,(105,72,55))
        result=np.asarray(out)
        dark=np.array((105,72,55),dtype=np.uint8)  # exactly the bald-head K7 edge
        self.assertEqual(out.size,(64,112))
        self.assertTrue(np.array_equal(result[...,3],pixels[...,3]),
                        "Silhouette cannot alter visible area/anchor")
        for x,y in ((20,72),(43,72),(24,54),(39,54),(25,91),(39,91),
                    (23,102),(42,102)):
            self.assertTrue(np.array_equal(result[y,x,:3],dark),
                            f"Missing one-pixel outline on anatomy at {(x,y)}")
        self.assertTrue(np.array_equal(result[70,30,:3],skin[:3]),
                        "Do not fill entire body with dark contour")
        self.assertTrue(np.array_equal(result[42,25,:3],skin[:3]),
                        "Bald scalp must not be affected")
        self.assertTrue(np.array_equal(result[53,31,:3],skin[:3]),
                        "No horizontal painted line at neck junction")
        self.assertTrue(np.array_equal(result[50,30,:3],skin[:3]),
                        "Original head stays as rendered")
        self.assertEqual(result[60,0,3],0,"Outside sprite stays transparent")

    def test_blank_and_hair_only_frames_stay_unchanged(self):
        transparent=Image.new("RGBA",(64,112),(0,0,0,0))
        self.assertEqual(outline_human_body(transparent,(100,65,50)).tobytes(),
                         transparent.tobytes())
        frame=np.zeros((112,64,4),dtype=np.uint8)
        frame[35:50,23:41]=[210,170,135,255]
        out=outline_human_body(Image.fromarray(frame,"RGBA"),(100,65,50))
        self.assertTrue(np.array_equal(np.asarray(out),frame))

    def test_body_section_threshold(self):
        self.assertGreaterEqual(BODY_START_Y,52)
        self.assertLessEqual(BODY_START_Y,57)

if __name__=="__main__":
    unittest.main()
