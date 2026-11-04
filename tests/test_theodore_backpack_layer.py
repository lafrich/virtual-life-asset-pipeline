"""Theodore's rear backpack must sit on the upper back, never the butt.

In NE/NW the panel is visible on the back of the shirt; near arm, neck,
head and helmet always layer above it. SE/SW sees only an edge behind body.
All motion directions retain the original 64x112 native V6B silhouette.
"""
from __future__ import annotations
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
for folder in ("assets/npc_theodore","assets/npc_gfunk","assets/npc_preview_v2",
               "chars-iso/v6b/tools"):
    sys.path.insert(0,str(ROOT/folder))
import make_theodore as t


class TheodoreBackpack(unittest.TestCase):
    def test_rear_panel_is_on_upper_back_not_hips(self):
        for view in ("ne","nw"):
            for anim,f in (("idle",0),("idle",1),("idle",2),
                           ("walk",0),("walk",2),("sit",0),("sit_type",1)):
                with self.subTest(view=view,anim=anim,frame=f):
                    full,_=t.build(view,anim,f,modular=False)
                    bare,_=t.build(view,anim,f,modular=True)
                    changed=np.any(full[...,:3]!=bare[...,:3],axis=2)
                    on_shirt=(bare[...,3]==255)
                    upper=on_shirt.copy()
                    upper[:53]=False
                    upper[69:]=False
                    self.assertGreater(int((changed&upper).sum()),30,
                        "Rear panel must be visible on upper back / shirt")
                    hips=changed.copy()
                    hips[:74]=False
                    self.assertEqual(int(hips.sum()),0,
                        "Backpack must not protrude over pants or buttocks")

    def test_front_backpack_is_occluded_by_suit_and_head(self):
        for view in ("se","sw"):
            for anim,f in (("idle",0),("walk",2),("sit",0)):
                with self.subTest(view=view,anim=anim,frame=f):
                    full,_=t.build(view,anim,f,modular=False)
                    bare,_=t.build(view,anim,f,modular=True)
                    opaque=(bare[...,3]==255)
                    torso=opaque.copy();torso[:55]=False
                    torso[74:]=False
                    same=np.all(full[...,:3]==bare[...,:3],axis=2)
                    self.assertGreater(float(same[torso].mean()),.95,
                       "Front-facing backpack must be concealed behind torso")

    def test_pack_rear_geometry_stops_above_waist(self):
        rear=t.pack("ne")
        self.assertGreater(int((rear[49:69,:,3]>0).sum()),150,
                           "Upper-back pack should remain substantial")
        self.assertEqual(int((rear[70:,:,3]>0).sum()),0,
                         "No pack nozzle dangling at the hips")
        front=t.pack("se")
        self.assertGreater(int(front[...,3].sum()),0,
                           "Front-view backpack edge should still exist")


if __name__=="__main__":
    unittest.main()
