"""Pose-specific occlusion, not a global sprite-layer reorder.

Only lie_idle SE/SW has head in FRONT of body, and only knee_chest_idle
NE/NW has upper back/shoulders in FRONT of knees. Never modify originals.
"""
from pathlib import Path
import sys,unittest
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from build_human_templates import (
    depth_order,compose_pose_layers,split_knee_chest_rear_upper,
    NATIVE_DEPTH_ORDER,
)
FRAME=(64,112)
def pixel(color,xy):
    rgba=Image.new("RGBA",FRAME)
    rgba.putpixel(xy,(*color,255))
    return rgba
class DepthTest(unittest.TestCase):
    def test_front_lie_head_is_last_over_body_not_both_rear_views(self):
        self.assertNotIn("pose_head_front",NATIVE_DEPTH_ORDER)
        for direction in ("se","sw"):
            order=depth_order("lie_idle",direction)
            self.assertGreater(order.index("pose_head_front"),order.index("shirt"))
            self.assertGreater(order.index("pose_head_front"),order.index("arm_near"))
            self.assertLess(order.index("pose_head_front"),order.index("face"))
            composed=compose_pose_layers({
                "shirt":pixel((15,110,180),(26,72)),
                "pose_head_front":pixel((210,160,125),(26,72))},
                "lie_idle",direction)
            self.assertEqual(composed.getpixel((26,72))[:3],(210,160,125))
        for direction in ("ne","nw"):
            self.assertEqual(depth_order("lie_idle",direction),NATIVE_DEPTH_ORDER)
    def test_rear_knee_chest_torso_over_knees_lower_legs_behind(self):
        for direction in ("ne","nw"):
            order=depth_order("knee_chest_idle",direction)
            self.assertGreater(order.index("pose_upper_body_front"),order.index("pants"))
            self.assertGreater(order.index("arm_far"),order.index("pants"))
            actor=Image.new("RGBA",FRAME)
            for y in (66,80,96):actor.putpixel((31,y),(200,140,100,255))
            legs=Image.new("RGBA",FRAME)
            for y in (66,80,96):legs.putpixel((31,y),(50,65,90,255))
            original=actor.tobytes()
            parts=split_knee_chest_rear_upper({"body":actor,"pants":legs},direction)
            self.assertEqual(actor.tobytes(),original,"native actor data mutated")
            built=compose_pose_layers(parts,"knee_chest_idle",direction)
            self.assertEqual(built.getpixel((31,80))[:3],(200,140,100))
            self.assertEqual(built.getpixel((31,96))[:3],(50,65,90))
            self.assertEqual(built.getpixel((31,66))[:3],(200,140,100))
        for direction in ("se","sw"):
            self.assertEqual(depth_order("knee_chest_idle",direction),NATIVE_DEPTH_ORDER)
    def test_other_poses_keep_exact_original_order(self):
        for action in ("idle","walk","lie","sit","bathtub_bathe","squat_idle",
                       "squat_up","squat_down","bathe"):
            for view in ("se","sw","ne","nw"):
                self.assertEqual(depth_order(action,view),NATIVE_DEPTH_ORDER)
if __name__=="__main__":unittest.main()
