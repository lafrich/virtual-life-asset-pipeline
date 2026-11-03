"""Check REAL final-pose sprite layers rather than just artificial arm fixtures."""
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"assets/npc_preview_v2"))
sys.path.insert(0,str(ROOT/"assets/npc_gfunk"))
sys.path.insert(0,str(ROOT/"chars-iso/v6b/tools"))
import base6

class ActualShoulderSprites(unittest.TestCase):
    def test_both_gender_bases_each_direction_have_attached_shoulders(self):
        for gender in ("m","f"):
            config={"body":gender,"skin":"light","hair":"short","hc":"black",
                    "top":"tee_long","tc":"paper","pants":"trousers","pc":"paper",
                    "shoes":"shoes","sc":"paper"}
            for direction in ("se","sw","ne","nw"):
                for action in ("idle","walk"):
                    with self.subTest(gender=gender,direction=direction,action=action):
                        _, layers, _=base6.render(config,f=0,d=direction,anim=action)
                        torso=np.asarray(layers["shirt"].convert("RGBA"))[...,3]>0
                        torso |= np.asarray(layers["outer"].convert("RGBA"))[...,3]>0
                        for slot in ("arm_near","arm_far"):
                            arm=np.asarray(layers[slot].convert("RGBA"))[...,3]>0
                            ys=np.flatnonzero(np.any(arm,axis=1))
                            self.assertTrue(len(ys)>3,f"{slot} missing")
                            # The upper shoulder needs to touch the garment.
                            # Lower hands and dangling arms may swing independently.
                            root=ys[:min(6,len(ys))]
                            contacts=[]
                            for y in root:
                                aa=np.flatnonzero(arm[y])
                                tt=np.flatnonzero(torso[y])
                                if not len(aa) or not len(tt):continue
                                ac=(aa[0]+aa[-1])/2
                                tc=(tt[0]+tt[-1])/2
                                if ac<tc:
                                    gap=max(0,int(tt[0])-int(aa[-1])-1)
                                else:
                                    gap=max(0,int(aa[0])-int(tt[-1])-1)
                                contacts.append(gap)
                            self.assertTrue(contacts and min(contacts)==0,
                                f"{gender}/{direction}/{action}/{slot}: "+
                                f"shoulder gap after final body shaping = {contacts}")
if __name__=="__main__":
    unittest.main()
