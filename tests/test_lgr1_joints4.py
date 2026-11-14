"""LGR-1 JOINT_MODE v4 (R3 joint-safe rig), preview only.

Default stays v2. v4 rest must be pixel-identical to v2/live; head/Emosi
untouched except the raised-near-arm overlap; JS == Python; HIP_CENTRE and
the elbow crack fill stay off.
"""
import json
import unittest

from tests.test_lgr1_jointfix import BASE, active, rt
from tests.test_lgr1_parity import node_render, synthetic_face

MOTIONS = ("idle", "walk", "wave", "crouch", "sit", "arms_up")


def args_of(binding, d):
    i = rt.binding_inputs(binding, d)
    return i, (i["layers"], i["mask"], i["pivots"], i["placements"], i["order"], i["caps"], i["wear"])


def head_leaks(v2, v4, pose, order, face=None):
    """Pixels that changed on the head/face and are not the raised near-arm."""
    kw = {}
    r2 = rt.render_raw(v2, pose, order)
    r4 = rt.render_raw(v4, pose, order)
    hd2 = rt._render_parts(v2, pose, order, only={"head"})
    hd4 = rt._render_parts(v4, pose, order, only={"head"})
    arm = rt._render_parts(v4, pose, order, only={"arm_near_upper", "arm_near_lower"})
    leaks = 0
    for k in range(len(r2) // 4):
        if r2[k * 4:k * 4 + 4] == r4[k * 4:k * 4 + 4]:
            continue
        if (hd2[k * 4 + 3] or hd4[k * 4 + 3]) and not arm[k * 4 + 3]:
            leaks += 1
    return leaks


class Joints4Test(unittest.TestCase):
    def test_defaults_live_safe(self):
        self.assertEqual(rt.JOINT_MODE, "v2")
        self.assertFalse(rt.HIP_CENTRE)
        self.assertFalse(rt.V4_CRACK)
        self.assertEqual(rt.RAISE_FRONT, 120)
        self.assertEqual(rt.SH_DY, 0)
        self.assertFalse(rt.LOWER_SPRITES)
        self.assertEqual(rt.CANVAS, "legacy64")

    def test_rest_identical_to_live(self):
        for gender in ("male", "female"):
            _, binding = active(gender)
            for d in rt.DIRECTIONS:
                i, args = args_of(binding, d)
                v2 = rt.prepare_raw(*args)
                v4 = rt.prepare_raw(*args, joint_mode="v4")
                z = rt.zero_pose()
                for cv in (None, "overflow128"):
                    self.assertEqual(bytes(rt.render_raw(v2, z, canvas=cv)),
                                     bytes(rt.render_raw(v4, z, canvas=cv)),
                                     f"{gender} {d} {cv or 'legacy'}: rest changed")
                # Head / limb pivots stay put (deltoid re-ownership does not move them).
                for p in ("head", "torso", "pelvis", "arm_near_upper", "arm_far_upper",
                          "arm_near_lower", "arm_far_lower"):
                    self.assertEqual(v4["pivots"][p], i["pivots"][p], f"{gender} {d}: {p} pivot moved")
                # Deltoid actually moved onto the torso.
                t2 = v2["groups"]["main"]["parts"]["torso"]["img"]
                t4 = v4["groups"]["main"]["parts"]["torso"]["img"]
                self.assertGreater(
                    sum(1 for k in range(rt.N) if t4[k * 4 + 3] and not t2[k * 4 + 3]), 0,
                    f"{gender} {d}: no deltoid pixels moved to torso")

    def test_head_and_emosi_untouched(self):
        face = synthetic_face()
        lib = rt.load_library()
        for gender in ("male", "female"):
            rig, binding = active(gender)
            sides = rt.sides_of(rig)
            for d in rt.DIRECTIONS:
                i, args = args_of(binding, d)
                v2 = rt.prepare_raw(*args, face=face)
                v4 = rt.prepare_raw(*args, face=face, joint_mode="v4")
                z = rt.zero_pose()
                self.assertEqual(bytes(rt.render_raw(v2, z)), bytes(rt.render_raw(v4, z)),
                                 f"{gender} {d}: rest with Emosi face changed")
                for mid in MOTIONS:
                    m = next(x for x in lib["motions"] if x["id"] == mid)
                    for f in sorted({0, len(m["frames"]) // 2, len(m["frames"]) - 1}):
                        pose = rt.frame_pose(lib["poses"], m, f, d, sides)
                        order = rt.frame_order(i["order"], m, f, d, sides)
                        hv = rt.raw_matrices(v4["pivots"], v4["placements"], pose)["head"]
                        ho = rt.raw_matrices(v2["pivots"], v2["placements"], pose)["head"]
                        self.assertEqual(hv, ho, f"{gender} {d} {mid} f{f}: head transform changed")
                        leaks = head_leaks(v2, v4, pose, order)
                        self.assertEqual(leaks, 0, f"{gender} {d} {mid} f{f}: head/Emosi pixels changed")
                # Synthetic raise past the 120° front threshold.
                left = v4["pivots"]["arm_near_upper"]["x"] < 32
                pose = {**rt.zero_pose(), "arm_near_upper": {"x": 0, "y": 0, "a": 135 if left else -135}}
                self.assertEqual(head_leaks(v2, v4, pose, i["order"]), 0,
                                 f"{gender} {d} raise135: head pixels changed outside the arm")

    def test_js_python_parity_v4(self):
        lib = rt.load_library()
        for gender in ("male", "female"):
            rig, binding = active(gender)
            sides = rt.sides_of(rig)
            for d in rt.DIRECTIONS:
                i, args = args_of(binding, d)
                v4 = rt.prepare_raw(*args, joint_mode="v4")
                frames = [{"pose": rt.zero_pose(), "order": i["order"]}]
                for mid in MOTIONS:
                    m = next(x for x in lib["motions"] if x["id"] == mid)
                    f = len(m["frames"]) // 2
                    frames.append({"pose": rt.frame_pose(lib["poses"], m, f, d, sides),
                                   "order": rt.frame_order(i["order"], m, f, d, sides)})
                left = v4["pivots"]["arm_near_upper"]["x"] < 32
                frames.append({"pose": {**rt.zero_pose(),
                                        "arm_near_upper": {"x": 0, "y": 0, "a": 135 if left else -135}},
                               "order": i["order"]})
                js = node_render(i, frames, joint_mode="v4")
                for n, fr in enumerate(frames):
                    py = bytes(rt.render_raw(v4, fr["pose"], fr["order"]))
                    self.assertEqual(js[n], py, f"{gender} {d} frame {n}: JS != Python")

    def test_baked_joints4_preview_bases(self):
        for pkg, gender in (("genesis-base-male-official-8-joints4-preview.json", "male"),
                            ("genesis-base-female-official-9-joints4-preview.json", "female")):
            path = BASE / pkg
            self.assertTrue(path.is_file(), f"missing baked preview {pkg}")
            rig = json.loads(path.read_text())["rig"]
            baked = {"rig": rig, "views": {d: {"pivots": rig["pivots"][d],
                                               "maskBase64": rig["masks"][d]} for d in rt.DIRECTIONS}}
            _, official = active(gender)
            for d in rt.DIRECTIONS:
                ib, ab = args_of(baked, d)
                io, ao = args_of(official, d)
                pb = rt.prepare_raw(*ab, joint_mode="v4")
                po = rt.prepare_raw(*ao, joint_mode="v4")
                self.assertEqual(bytes(rt.render_raw(pb, rt.zero_pose())),
                                 bytes(rt.render_raw(po, rt.zero_pose())),
                                 f"baked {gender} {d} rest != official+v4")


if __name__ == "__main__":
    unittest.main()
