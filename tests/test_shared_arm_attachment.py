"""Shared v6b attachment tests for both shoulders and the rear neckline."""
from __future__ import annotations
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"chars-iso"/"v6b"/"tools"))
import live_v6b as lv


class SharedArmAttachment(unittest.TestCase):
    def scaffold(self):
        L={k:lv.empty() for k in lv.ORDER}
        for y in range(22,40):
            for x in range(12,24):
                L["shirt"][y,x]="k"
        for y in range(32,45):
            for x in range(7,10):
                L["arm_near"][y,x]="i"
            for x in range(26,29):
                L["arm_far"][y,x]="e"
        return L

    def test_both_shoulders_are_welded_without_moving_hands(self):
        L=self.scaffold()
        near_before=L["arm_near"].copy()
        far_before=L["arm_far"].copy()
        lv.attach_arm_roots(L)
        for y in range(32,37):
            self.assertEqual(list(L["arm_near"][y,10:12]),["i","i"])
            self.assertEqual(list(L["arm_far"][y,24:26]),["e","e"])
        self.assertTrue((L["arm_near"][40:]==near_before[40:]).all(),
                        "Hand/forearm movement must be unchanged")
        self.assertTrue((L["arm_far"][40:]==far_before[40:]).all())
        self.assertEqual(L["shirt"][33,12],"k","Do not change original clothing")

    def test_mirror_facing_also_joins_sides(self):
        L=self.scaffold()
        for k in L:
            L[k]=lv.mirror(L[k])
        lv.attach_arm_roots(L)
        for y in range(32,37):
            solid=(L["shirt"][y]!="")|(L["arm_near"][y]!="")|(L["arm_far"][y]!="")
            xs=[x for x in range(lv.CW) if solid[x]]
            self.assertTrue(all(solid[x] for x in range(min(xs),max(xs)+1)),
                            "Rear view has an unattached shoulder")

    def test_previously_touching_arms_are_not_fattened(self):
        L=self.scaffold()
        for y in range(32,45):
            L["arm_near"][y,10:12]="i"
            L["arm_far"][y,24:26]="e"
        before={k:v.copy() for k,v in L.items()}
        lv.attach_arm_roots(L)
        self.assertTrue(all((L[k]==v).all() for k,v in before.items()),
                        "Do not alter shoulders that already connect")

    def test_no_neck_double_vertical_edge_stripes(self):
        se,C,O=self.scaffold(),{"hair_style":"short","arms":"down"},{}
        # Use short-haired source scaffold from actual rear-head test for
        # realistic hair, neck and connected torso.
        for y in range(0,18):
            for x in range(lv.OX+5,lv.OX+23):
                se["hair_front"][y,x]="3"
        for y in range(17,23):
            for x in range(lv.OX+10,lv.OX+17):
                se["body"][y,x]="i"
        rear=lv.back_layers(se,C,O)
        body=rear["body"]
        for y in range(18,23):
            # old code stamped '7' at two neck columns for every row
            self.assertNotEqual(body[y,lv.CW-1-(lv.OX+10)],"7",
                                "Double dark neck line returns at left")
            self.assertNotEqual(body[y,lv.CW-1-(lv.OX+16)],"7",
                                "Double dark neck line returns at right")


if __name__=="__main__":
    unittest.main()
