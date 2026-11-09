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
        p0 = runtime.procedural_pose("walk", .0)
        p1 = runtime.procedural_pose("walk", .25)
        self.assertAlmostEqual(p0["leg_near_upper"]["a"],0)
        self.assertGreater(p1["leg_near_upper"]["a"], 20)
        self.assertEqual(set(p1),set(runtime.PARTS))

    def test_matrix_inverse(self):
        a = runtime.compose(runtime.translate(3,4),runtime.rotate(21))
        inverse = runtime.inverse(a)
        x,y=runtime.map_point(a,12.3,13.4)
        rx,ry=runtime.map_point(inverse,x,y)
        self.assertAlmostEqual(rx,12.3)
        self.assertAlmostEqual(ry,13.4)


if __name__ == "__main__":
    unittest.main()
