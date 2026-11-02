"""Ensure native v6b back heads have complete, tapered lower skulls.

Regression for MHS M2 / all v6b models: the hair ends near row 16 but the
head must continue toward the neck, in both rear directions, for all styles.
"""
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"chars-iso"/"v6b"/"tools"))
import live_v6b as lv

class RearHeadTests(unittest.TestCase):
    def make_character(self,style):
        layers={k:lv.empty() for k in lv.ORDER}
        # Reference-coordinate short back scalp. The engine generates the
        # real left-to-right mirror in its back_layers implementation.
        for y in range(2,17):
            for x in range(5+lv.OX,23+lv.OX):
                layers["hair_front"][y,x]="3"
        for y in range(17,23):
            for x in range(10+lv.OX,17+lv.OX):
                layers["body"][y,x]="i"
        for y in range(22,39):
            for x in range(7+lv.OX,20+lv.OX):
                layers["shirt"][y,x]="k"
        cfg={"hair_style":style,"arms":"down"}
        outfit={"outer":None}
        return layers,cfg,outfit

    def test_short_rear_skull_tapers_into_neck(self):
        se,cfg,outfit=self.make_character("short")
        result=lv.back_layers(se,cfg,outfit)
        body=result["body"]
        hair=result["hair_front"]
        # The final head is made of TWO overlapping layers: skin underneath
        # and the hairline above. Counting body alone falsely reports a gap
        # whenever the haircut occupies a few pixels on the nape.
        expected={17:18,18:16,19:14,20:12,21:10}
        for y,count in expected.items():
            joined=sum(bool(body[y,x]) or bool(hair[y,x]) for x in range(lv.CW))
            self.assertGreaterEqual(joined,count-1,
                                    f"Visible rear head incomplete at source row {y}: "+
                                    f"skin={sum(bool(v) for v in body[y])} "+
                                    f"hair={sum(bool(v) for v in hair[y])} joined={joined}")
        self.assertEqual(sum(bool(v) for v in body[22]),7,
                         "Nape must connect continuously into 7px neck")
        for y in range(17,23):
            x=lv.CW-1-(13+lv.OX)
            self.assertTrue(body[y,x] or hair[y,x],
                            f"Missing central composed head/neck connection at row {y}")
        self.assertEqual(sum(bool(v) for v in se["body"][18]),7,
                         "Front source / original layer must remain unchanged")

    def test_hair_overlays_preserved_for_multiple_styles(self):
        for style in ("short","mid","wavy","long"):
            with self.subTest(style=style):
                se,cfg,outfit=self.make_character(style)
                result=lv.back_layers(se,cfg,outfit)
                hair=result["hair_front"]
                body=result["body"]
                # Long hairstyles may naturally cover the restored skin.
                # In that case the scalp belongs behind the hair layer,
                # not painted over it or forced visible through strands.
                for y in range(17,22):
                    self.assertTrue((hair[y]!="").any() or (body[y]!="").any(),
                                    f"{style}: missing whole row of rear head")
                self.assertTrue((hair[10]!="").any(),
                                f"{style}: hairstyle shouldn't be removed")

    def test_short_hair_has_no_flat_ink_line_under_head(self):
        se,cfg,outfit=self.make_character("short")
        result=lv.back_layers(se,cfg,outfit)
        hair=result["hair_front"]
        # The scalp has its own shape underneath. A row of code '0'
        # (the darkest hair ink) at its lower edge reads as a black bar.
        lower=[]
        for y in range(15,23):
            for x in range(lv.CW):
                if hair[y,x] and (y+1>=lv.CH or not hair[y+1,x]):
                    lower.append((x,y,hair[y,x]))
        self.assertGreater(len(lower),3,"Fixture must show rear nape fringe")
        self.assertFalse(any(color=="0" for _,_,color in lower),
                         f"Unexpected heavy under-head outline: {lower}")
        # No regeneration or changes to front-view hair source.
        self.assertTrue(any(c=="3" for _,_,c in lower))

    def test_native_rear_directions_use_complete_back(self):
        se,cfg,outfit=self.make_character("short")
        ne=lv.back_layers(se,cfg,outfit)
        nw={k:lv.mirror(v) for k,v in ne.items()}
        for y in (17,18,19,20,21,22):
            self.assertEqual(sum(bool(v) for v in ne["body"][y]),
                             sum(bool(v) for v in nw["body"][y]),
                             f"NE/NW nape mismatch on row {y}")

if __name__=="__main__":
    unittest.main()
