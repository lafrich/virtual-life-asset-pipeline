"""Theodore's backpack belongs to his BACK, below the head, in all four views.

Front views: pack behind entire character.
Rear views: panel visible on outer back torso, head and near arm stay in front.
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
    def test_backpack_is_rearmost_in_every_view_and_pose(self):
        # The actual character's opaque torso/arm pixels must cover its pack.
        for view in ("se", "sw", "ne", "nw"):
            for pose, frame in (("idle",0),("idle",1),("walk",0),
                                ("walk",2),("sit",0),("sit_type",1)):
                with self.subTest(view=view,pose=pose,frame=frame):
                    equipped,_=t.build(view,pose,frame,modular=False)
                    bare,_=t.build(view,pose,frame,modular=True)
                    opaque=(bare[...,3]==255)
                    torso=opaque.copy()
                    torso[:56]=False  # head/helmet are deliberately different
                    self.assertGreater(int(torso.sum()),200)
                    same=np.all(equipped[...,:3]==bare[...,:3],axis=2)
                    self.assertGreater(float(same[torso].mean()),.97,
                        "Backpack is drawn over the body in "+view)

    def test_near_arm_and_rear_skull_are_in_front_of_pack(self):
        for view in ("ne","nw"):
            for frame in (0,1,2):
                with self.subTest(view=view,frame=frame):
                    equipped,_=t.build(view,"idle",frame,modular=False)
                    bare,_=t.build(view,"idle",frame,modular=True)
                    opaque=bare[...,3]==255
                    torso=opaque.copy()
                    torso[:53]=False
                    torso[85:]=False
                    same=np.all(equipped[...,:3]==bare[...,:3],axis=2)
                    self.assertGreater(int(torso.sum()),100)
                    self.assertGreater(float(same[torso].mean()),.97,
                        "Rear pack cannot cover back torso or arms")

    def test_pack_extends_beyond_body_silhouette(self):
        for view in ("se","ne"):
            a,_=t.build(view,"idle",0,modular=False)
            b,_=t.build(view,"idle",0,modular=True)
            extra=(a[...,3]>0)&(b[...,3]==0)
            self.assertGreater(int(extra.sum()),2,
                "Backpack must retain its actual outer silhouette")

if __name__=="__main__":
    unittest.main()
