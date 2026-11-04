"""Theodore's rear backpack must sit on the upper back, never the butt.

In NE/NW the panel overlaps the lower scalp/nape while the helmet and
upper head stay above it. Arms remain on the foreground layer. SE/SW sees only an edge behind body.
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
    def test_rear_head_uses_native_shoulder_pivot_not_shifted_away(self):
        # Previous 1px right / 2px up translation DETACHED the head from
        # its collar. The backpack depth, not its shoulder pivot, must change.
        self.assertEqual(t.REAR_HEAD_OFFSET, (0, 0))
        for view in ("ne", "nw"):
            for motion, frame in (("idle",0),("idle",2),("walk",1),
                                  ("talk",2),("sit",0)):
                with self.subTest(view=view,motion=motion,frame=frame):
                    canonical="ne"
                    _, native, pal=t.base6.render(t.CFG, f=frame, d=canonical,
                                                   anim=motion)
                    brow=native["brows"]
                    t.M.bald(native,pal)
                    native["brows"]=brow
                    original=native["hair_front"]
                    layers, _, head_anchor, _, _=t.render(view,motion,frame)
                    expected=t.translate_rgba(original,*t.REAR_HEAD_OFFSET)
                    self.assertEqual(layers["hair_front"].tobytes(),
                                     expected.tobytes(),
                                     "Scalp/nape must follow rear offset")
                    source_ref=t.base6.render(t.CFG, f=0,d=canonical,
                                              anim="idle")[1]
                    motion_ref=t.base6.render(t.CFG, f=frame,d=canonical,
                                              anim=motion)[1]
                    x0,y0=t.bbox(source_ref["hair_front"])
                    x1,y1=t.bbox(motion_ref["hair_front"])
                    self.assertEqual(head_anchor,
                        (x1-x0,y1-y0),
                        "Helmet/goggle anchor must match translated skull")
                    # Body pivot and arm geometry are not translated.
                    self.assertEqual(layers["body"].tobytes(),
                                     native["body"].tobytes())
                    self.assertEqual(layers["shirt"].tobytes(),
                                     native["shirt"].tobytes())

    def test_rear_panel_occludes_lower_scalp_but_not_helmet(self):
        for view in ("ne", "nw"):
            for motion, frame in (("idle",0),("idle",2),
                                  ("walk",0),("sit",0)):
                with self.subTest(view=view,motion=motion,frame=frame):
                    layers,_,_,base,_=t.render(view,motion,frame)
                    bodyd=t.BODYD
                    raw_pack=np.roll(t.pack(base),bodyd,axis=0)
                    hair=np.asarray(layers["hair_front"])
                    yy=np.arange(t.FH)[:,None]
                    overlap=(raw_pack[...,3]>0)&(hair[...,3]>0)&(yy<52)
                    self.assertGreater(int(overlap.sum()),3,
                       "Upper back pack must physically overlap the nape")
                    full,_=t.build(view,motion,frame,modular=False)
                    bare,_=t.build(view,motion,frame,modular=True)
                    visible=np.any(full[...,:3]!=bare[...,:3],axis=2)
                    self.assertGreater(int((overlap&visible).sum()),3,
                       "Lower scalp should be hidden by backpack rear panel")
                    self.assertEqual(int(np.count_nonzero(
                        raw_pack[:46,...,3])),0,
                        "The backpack must not cross the upper scalp")

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
