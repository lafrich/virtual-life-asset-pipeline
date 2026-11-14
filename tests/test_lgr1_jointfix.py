"""LGR-1 joint-fix (JOINT_MODE "v2") on the ACTIVE official bases (index.json packages):
JS == Python pixel parity, rest pose byte-identical to legacy, head/Emosi anchors unchanged,
legacy mode still available. Never touches Drive."""
import json
import unittest
from pathlib import Path

from tests.test_lgr1_parity import ROOT, rt, node_render

BASE = ROOT / "site" / "media" / "lgr1" / "base"


def active(gender):
    idx = json.loads((BASE / "index.json").read_text())
    rig = json.loads((BASE / idx["bases"][gender]["package"]).read_text())["rig"]
    return rig, {"rig": rig, "views": {d: {"pivots": rig["pivots"][d], "maskBase64": rig["masks"][d]} for d in rt.DIRECTIONS}}


class JointFixTest(unittest.TestCase):
    def test_mode_default(self):
        self.assertEqual(rt.JOINT_MODE, "v2")

    def test_active_bases(self):
        lib = rt.load_library()
        for gender in ("male", "female"):
            rig, binding = active(gender)
            sides = rt.sides_of(rig)
            for d in rt.DIRECTIONS:
                i = rt.binding_inputs(binding, d)
                args = (i["layers"], i["mask"], i["pivots"], i["placements"], i["order"], i["caps"], i["wear"])
                v2, old = rt.prepare_raw(*args), rt.prepare_raw(*args, joint_mode="legacy")
                z = rt.zero_pose()
                self.assertEqual(bytes(rt.render_raw(v2, z)), bytes(rt.render_raw(old, z)), f"{gender} {d}: rest changed")
                for p in ("head", "torso", "pelvis", "arm_near_upper", "arm_far_upper", "arm_near_lower", "arm_far_lower"):
                    self.assertEqual(v2["pivots"][p], i["pivots"][p], f"{gender} {d}: {p} pivot moved")
                frames = []
                for m in lib["motions"]:
                    for f in range(len(m["frames"])):
                        pose = rt.frame_pose(lib["poses"], m, f, d, sides)
                        order = rt.frame_order(i["order"], m, f, d, sides)
                        frames.append({"pose": pose, "order": order})
                        hv = rt.raw_matrices(v2["pivots"], v2["placements"], pose)["head"]
                        ho = rt.raw_matrices(old["pivots"], old["placements"], pose)["head"]
                        self.assertEqual(hv, ho, f"{gender} {d} {m['id']}: head transform changed")
                js = node_render(i, frames)
                for n, fr in enumerate(frames):
                    self.assertEqual(js[n], bytes(rt.render_raw(v2, fr["pose"], fr["order"])), f"{gender} {d} frame {n}: JS != Python")


if __name__ == "__main__":
    unittest.main()
