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
    def test_front_views_pack_keeps_head_and_body_in_front(self):
        for view in ("se","sw"):
            with self.subTest(view=view):
                equipped,_=t.build(view,"idle",0,modular=False)
                bare,_=t.build(view,"idle",0,modular=True)
                pack=np.asarray(t.pack("se"))
                overlap=(bare[...,3]>0)&(pack[...,3]>0)
                self.assertGreater(int(overlap.sum()),30)
                same=np.all(equipped[...,:3]==bare[...,:3],axis=2)
                self.assertGreater(float(same[overlap].mean()),.90,
                    "Front-facing backpack must be UNDER the head and body")

    def test_rear_views_show_backpack_but_never_cover_skull_or_neck(self):
        for view in ("ne","nw"):
            for frame in (0,1,2):
                with self.subTest(view=view,frame=frame):
                    equipped,_=t.build(view,"idle",frame,modular=False)
                    bare,_=t.build(view,"idle",frame,modular=True)
                    pack=np.asarray(t.pack("ne"))
                    visible=(bare[...,3]>0)&(pack[...,3]>0)
                    self.assertGreater(int(visible.sum()),30)
                    same=np.all(equipped[...,:3]==bare[...,:3],axis=2)
                    # An older layer order placed the whole bag on top of the
                    # skull and neck; guard the top of the backpack silhouette.
                    upper=visible.copy()
                    upper[56:]=False
                    self.assertGreater(int(upper.sum()),1)
                    self.assertGreater(float(same[upper].mean()),.90,
                        "Rear head and neck must render IN FRONT of bag")
                    torso=visible.copy()
                    torso[:58]=False
                    changed=torso & ~same
                    self.assertGreater(int(changed.sum()),25,
                        "Rear backpack panel should be visible on the back, not hidden inside torso")

    def test_pack_extends_beyond_body_silhouette(self):
        for view in ("se","ne"):
            a,_=t.build(view,"idle",0,modular=False)
            b,_=t.build(view,"idle",0,modular=True)
            extra=(a[...,3]>0)&(b[...,3]==0)
            self.assertGreater(int(extra.sum()),2,
                "Backpack must retain its actual outer silhouette")

if __name__=="__main__":
    unittest.main()
