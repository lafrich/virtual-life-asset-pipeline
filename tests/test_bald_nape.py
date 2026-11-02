"""Regression tests for the full lower rear bald skull and neck junction."""
import sys
import unittest
from pathlib import Path
from PIL import Image
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"assets/npc_preview_v2"))
sys.path.insert(0,str(ROOT/"assets/npc_gfunk"))
from make_npcs_v2 import bald

W,H=64,112
PAL={"Ki":(225,182,145),"K7":(120,80,63),"Kh":(175,120,96),"Ke":(157,105,83)}
def fake(back):
    h=np.zeros((H,W,4),dtype=np.uint8)
    for y in range(34,49):
        width=round(12*np.sqrt(max(0,1-((y-43)/12)**2)))
        h[y,32-width:33+width]=(*PAL["Ki"],255)
    h[48,29:36]=0  # native v6b shaves the rear hairline
    body=np.zeros_like(h)
    body[48:54,29:36]=(*PAL["Ki"],255)
    face=np.zeros_like(h)
    if not back:face[44,32]=(*PAL["K7"],255)
    return {"hair_front":Image.fromarray(h,"RGBA"),
            "body":Image.fromarray(body,"RGBA"),
            "face":Image.fromarray(face,"RGBA"),
            "brows":Image.new("RGBA",(W,H))}

class TestBaldNape(unittest.TestCase):
    def test_back_keeps_full_lower_skull(self):
        layers=fake(True);before=np.array(layers["hair_front"])
        self.assertFalse(np.any(before[50,:,3]))
        bald(layers,PAL)
        a=np.array(layers["hair_front"])
        for y in (49,50,51,52):
            self.assertTrue(np.any(a[y,:,3]),f"missing nape at y={y}")
        self.assertTrue(np.all(a[50,30:35,3]==255),"taper must join existing neck")
        self.assertTrue(np.any(a[43,:,3]),"original scalp preserved")
    def test_front_face_not_extended(self):
        layers=fake(False)
        bald(layers,PAL)
        self.assertFalse(np.any(np.array(layers["hair_front"])[50,:,3]),
                         "front profile must not receive the rear nape patch")
    def test_rear_mirror_preserves_taper(self):
        layers=fake(True);bald(layers,PAL)
        pixels=np.array(layers["hair_front"])[...,3]
        mirrored=np.fliplr(pixels)
        self.assertEqual(np.count_nonzero(pixels[50]),np.count_nonzero(mirrored[50]))
        self.assertGreater(np.count_nonzero(pixels[51]),0)

if __name__=="__main__":
    unittest.main()
