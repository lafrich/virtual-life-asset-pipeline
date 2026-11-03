"""Theodore's backpack must be behind head and torso, for all directions."""
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
    def test_backpack_does_not_paint_over_existing_body_or_head(self):
        for view in ("se","ne"):
            with self.subTest(view=view):
                # Build both versions of the identical frame and torso:
                # the ONLY change is the extra backpack.
                equipped,_=t.build(view,"idle",0,modular=False)
                bare,_=t.build(view,"idle",0,modular=True)
                pack=np.asarray(t.pack("se" if view=="se" else "ne"))
                bare_opaque=bare[...,3]>0
                pack_opaque=pack[...,3]>0
                # The backpack lies behind the torso; these pixels are
                # visually covered by the original character.
                overlap=bare_opaque & pack_opaque
                self.assertGreater(int(overlap.sum()),30,"Must exercise pack/body overlap")
                same=np.all(equipped[...,:3]==bare[...,:3],axis=2)
                self.assertGreater(float(same[overlap].mean()),.90,
                    "Backpack painted over the original body or rear head")

    def test_pack_is_visible_outside_body(self):
        a,_=t.build("ne","idle",0,modular=False)
        b,_=t.build("ne","idle",0,modular=True)
        extra=(a[...,3]>0)&(b[...,3]==0)
        self.assertGreater(int(extra.sum()),2,"Backpack disappeared completely")

if __name__=="__main__":
    unittest.main()
