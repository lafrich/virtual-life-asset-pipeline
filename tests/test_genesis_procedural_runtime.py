"""Contract tests for the new four-direction procedural Genesis runtime."""
import base64
import importlib.util
import json
import math
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "genesis_procedural_runtime", ROOT/"site"/"genesis_procedural_runtime.py"
)
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


def fixture():
    parts = runtime.PARTS
    parents = {"torso": None, "head": "torso",
        "arm_near_upper": "torso", "arm_near_lower": "arm_near_upper",
        "arm_far_upper": "torso", "arm_far_lower": "arm_far_upper",
        "leg_near_upper": "torso", "leg_near_lower": "leg_near_upper",
        "leg_far_upper": "torso", "leg_far_lower": "leg_far_upper"}
    image = "data:image/png;base64,iVBORw0KGgo="
    mask = base64.b64encode(bytes([0])*runtime.N).decode()
    return {
        "format": "lafrich-genesis-binding-v1",
        "id": "lafrich_genesis_male", "sourceId": "genesis_male_nude",
        "gender": "male", "faceSource": "emosi.exe",
        "rigFormat": "LGR-1",
        "reviewed": {d + "|" + p: True for d in runtime.DIRECTIONS for p in parts},
        "hierarchy": {"parts": list(parts), "parents": parents,
                      "drawOrder": list(parts)},
        "views": {d: {"pivots": {p: {"x": 32, "y": 50} for p in parts},
                      "maskBase64": mask, "spritePng": image}
                  for d in runtime.DIRECTIONS}
    }


class GenesisRigTests(unittest.TestCase):
    def test_four_views_and_ten_parts(self):
        m = fixture()
        self.assertIs(runtime.validate(m), m)
        self.assertEqual(len(runtime.PARTS), 10)

    def test_missing_side_rejected(self):
        m = fixture()
        del m["views"]["nw"]
        with self.assertRaises(ValueError):
            runtime.validate(m)

    def test_rejects_wrong_original(self):
        m = fixture()
        m["sourceId"] = "ichsan_base"
        with self.assertRaises(ValueError):
            runtime.validate(m)

    def test_mask_bounds_rejected(self):
        m = fixture()
        m["views"]["se"]["maskBase64"] = base64.b64encode(b"\xff").decode()
        with self.assertRaises(ValueError):
            runtime.validate(m)

    def test_identity_pose_keeps_every_pivot_fixed(self):
        m = fixture()
        for d in runtime.DIRECTIONS:
            transforms = runtime.matrices(m, d, runtime.zero_pose())
            for p in runtime.PARTS:
                self.assertEqual(tuple(round(v,6) for v in transforms[p]),
                                 (1,0,0,1,0,0))

    def test_parent_transform_moves_child(self):
        m = fixture()
        pose = runtime.zero_pose()
        pose["torso"]["x"] = 7
        mat = runtime.matrices(m, "se", pose)
        x, y = runtime.map_point(mat["head"], 32, 50)
        self.assertAlmostEqual(x, 39)
        self.assertAlmostEqual(y, 50)

    def test_rotation_around_pivot(self):
        m = fixture()
        pose = runtime.zero_pose()
        pose["head"]["a"] = 90
        head = runtime.matrices(m,"sw",pose)["head"]
        x,y=runtime.map_point(head,32,50)
        self.assertAlmostEqual(x,32)
        self.assertAlmostEqual(y,50)
        x,y=runtime.map_point(head,34,50)
        self.assertAlmostEqual(x,32)
        self.assertAlmostEqual(y,52)

    def test_animation_procedural_not_frame_atlas(self):
        # Poses come from the shared motion library (media/lgr1/motions.json),
        # the same data the JS workbench uses; no hard-coded presets.
        lib = runtime.load_library()
        walk = next(m for m in lib["motions"] if m["id"] == "walk")
        p0 = runtime.procedural_pose("walk", .0, library=lib)
        t1 = walk["frames"][0]["ms"] / 1000 + 0.001
        p1 = runtime.procedural_pose("walk", t1, library=lib)
        self.assertEqual(p0, runtime.frame_pose(lib["poses"], walk, 0, "se"))
        self.assertEqual(p1, runtime.frame_pose(lib["poses"], walk, 1, "se"))
        self.assertNotEqual(p0, p1)
        self.assertEqual(set(p1), set(runtime.PARTS))

    def test_mirroring_keeps_the_anatomical_hand(self):
        lib = runtime.load_library()
        wave = next(m for m in lib["motions"] if m["id"] == "wave")
        se = runtime.frame_pose(lib["poses"], wave, 0, "se")
        sw = runtime.frame_pose(lib["poses"], wave, 0, "sw")
        # Right hand waves: near in SE, far in SW (mirrored view).
        self.assertNotEqual(se["arm_near_upper"]["a"], 0)
        # Sideways raise uses per-direction overrides so the arm goes UP in both.
        self.assertEqual(sw["arm_far_upper"]["a"], se["arm_near_upper"]["a"])
        self.assertEqual(sw["arm_near_upper"]["a"], 0)
        self.assertEqual(runtime.rig_part("arm_r_upper", "se"), "arm_near_upper")
        self.assertEqual(runtime.rig_part("arm_r_upper", "sw"), "arm_far_upper")
        self.assertEqual(runtime.rig_part("arm_r_upper", "ne"), "arm_near_upper")
        self.assertEqual(runtime.rig_part("arm_r_upper", "nw"), "arm_far_upper")
        self.assertEqual(runtime.rig_part("arm_r_upper", "sw", {"sw": "right"}), "arm_near_upper")

    def test_motion_validation_and_snap(self):
        lib = runtime.load_library()
        with self.assertRaises(ValueError):
            runtime.validate_motion({"id": "Bad Id", "frames": [{"ms": 100, "parts": {}}]}, lib["poses"])
        with self.assertRaises(ValueError):
            runtime.validate_motion({"id": "x", "frames": []}, lib["poses"])
        with self.assertRaises(ValueError):
            runtime.validate_motion({"id": "x", "frames": [{"ms": 100, "parts": {}}]*7}, lib["poses"])
        self.assertEqual(runtime.snap(12.5, 5), 15)
        self.assertEqual(runtime.snap(-12.5, 5), -10)
        self.assertEqual(runtime.snap(7, 1), 7)

    def test_unreviewed_part_angle_rejected(self):
        m = fixture()
        del m["reviewed"]["sw|head"]
        with self.assertRaisesRegex(ValueError,"40 part-angle"):
            runtime.validate(m)

    def test_placements_match_js_affine_hierarchy(self):
        m = fixture()
        m["rig"] = {"placements": {"se": {
            "torso": {"x": 4, "y": 1},
            "arm_near_upper": {"x": 3, "y": -2},
            "arm_near_lower": {"x": 2, "y": 1},
        }}}
        pose = runtime.zero_pose()
        mat = runtime.matrices(m, "se", pose)
        x, y = runtime.map_point(mat["arm_near_lower"], 32, 50)
        self.assertEqual((x, y), (41, 50))
        x, y = runtime.map_point(mat["head"], 32, 50)
        self.assertEqual((x, y), (36, 51))

    def test_matrix_inverse(self):
        a = runtime.compose(runtime.translate(3,4),runtime.rotate(21))
        inverse = runtime.inverse(a)
        x,y=runtime.map_point(a,12.3,13.4)
        rx,ry=runtime.map_point(inverse,x,y)
        self.assertAlmostEqual(rx,12.3)
        self.assertAlmostEqual(ry,13.4)


if __name__ == "__main__":
    unittest.main()
