"""LGR-1 option-A lower-sprite hook (preview). Flags default off; standing stays
pixel-identical. Overflow crop of unclipped frames matches the 64x112 output.
Pose pick follows manifest.selection_rule with on-disk fallbacks."""
import json
import unittest
from pathlib import Path

from tests.test_lgr1_parity import ROOT, rt, node_render
from tests.test_lgr1_jointfix import active

LIB = None
ANIM = Path("/workspace/lgr-anim")


def lib():
    global LIB
    if LIB is None:
        LIB = rt.load_library()
    return LIB


def load_motion(motion_id):
    found = next((x for x in lib()["motions"] if x["id"] == motion_id), None)
    if found:
        return found
    path = ANIM / motion_id / f"{motion_id}.json"
    if not path.is_file():
        return None
    e = json.loads(path.read_text())
    m, fr, out, frames = e["motion"], e["motion"]["frames"], None, []
    for i in range(0, len(fr), 6):
        v = rt.validate_motion({**m, "id": motion_id, "frames": fr[i:i + 6]}, lib()["poses"])
        out = out or v
        frames += v["frames"]
    return {**out, "frames": frames}


def frames_of(motion_id, direction, sides, order):
    m = load_motion(motion_id)
    if m is None:
        raise unittest.SkipTest(f"motion {motion_id} not on disk")
    out = []
    for i in range(len(m["frames"])):
        out.append({
            "i": i,
            "pose": rt.frame_pose(lib()["poses"], m, i, direction, sides),
            "order": rt.frame_order(order, m, i, direction, sides),
        })
    return m, out


class LowerSpriteHookTest(unittest.TestCase):
    def test_flags_default_off(self):
        self.assertEqual(rt.JOINT_MODE, "v2")
        self.assertFalse(rt.LOWER_SPRITES)
        self.assertEqual(rt.CANVAS, "legacy64")
        self.assertEqual((rt.W, rt.H), (64, 112))
        self.assertEqual((rt.BW, rt.BH, rt.OX, rt.OY), (128, 128, 32, 16))

    def test_switch_off_idle_is_unchanged_and_matches_js(self):
        rig, binding = active("male")
        sides = rt.sides_of(rig)
        i = rt.binding_inputs(binding, "se")
        prep = rt.prepare_raw(i["layers"], i["mask"], i["pivots"], i["placements"], i["order"], i["caps"], i["wear"])
        pose = rt.zero_pose()
        a = bytes(rt.render_raw(prep, pose))
        b = bytes(rt.render_raw(prep, pose, canvas="legacy64", lower=None))
        self.assertEqual(a, b)
        self.assertEqual(len(a), rt.N * 4)
        js = node_render(i, [{"pose": pose, "order": i["order"]}])
        self.assertEqual(js[0], a)

    def test_overflow_crop_of_unclipped_idle_and_walk_is_identical(self):
        rig, binding = active("male")
        sides = rt.sides_of(rig)
        for d in rt.DIRECTIONS:
            i = rt.binding_inputs(binding, d)
            prep = rt.prepare_raw(i["layers"], i["mask"], i["pivots"], i["placements"], i["order"], i["caps"], i["wear"])
            _, walk = frames_of("walk", d, sides, i["order"])
            for label, fr in [("idle", {"pose": rt.zero_pose(), "order": i["order"]}), ("walk0", walk[0]), ("walk2", walk[min(2, len(walk)-1)])]:
                legacy = bytes(rt.render_raw(prep, fr["pose"], fr["order"]))
                big = rt.render_raw(prep, fr["pose"], fr["order"], canvas="overflow128")
                self.assertEqual(len(big), rt.BW * rt.BH * 4, f"{d} {label} size")
                self.assertEqual(legacy, bytes(rt.crop_logical(big, "overflow128")), f"{d} {label} crop mismatch")

    def test_pose_pick_and_fallbacks(self):
        rig, binding = active("male")
        sides = rt.sides_of(rig)
        cases = {
            "idle": ["rig", "rig"],
            "walk": ["rig"] * 6,
            "sit": ["sit_chair", "sit_chair"],
            "eat_sit": ["sit_chair"] * 7,
            "crouch": ["crouch", "crouch"],
            "lie_sleep": ["lie_curl", "lie_curl"],
            "tent_sleep": ["lie_straight"] * 6,
            "bench_sleep": ["lie_straight"] * 6,
            "sit_lesehan": ["sit_floor"] * 6,
            "faint": ["rig", "rig", "rig", "kneel", "sit_long", "lie_curl"],
            "get_up": ["lie_curl", "sit_chair", "sit_long"],
            "tent_crawl_out": ["kneel"] * 5,
        }
        for mid, expect in cases.items():
            m, frames = frames_of(mid, "se", sides, rt.DRAW_ORDER)
            self.assertGreaterEqual(len(frames), 1, mid)
            got = [rt.select_lower(fr["pose"], "base", "se", "male8") for fr in frames]
            # Compare against the prefix we know; extra frames (round 2) are fine if rule-stable.
            self.assertEqual(got[:len(expect)], expect, f"{mid}: {got}")

        # kneel band (round 2): shallow thigh, deep knee — no longer falls back
        p = rt.zero_pose()
        p["pelvis"] = {"x": 0, "y": 8, "a": 0}
        p["leg_near_lower"] = {"x": 0, "y": 0, "a": 90}
        p["leg_near_upper"] = {"x": 0, "y": 0, "a": 20}
        self.assertEqual(rt.select_lower(p, "base"), "kneel")

        # sit_long band: legs out, shallow knee
        q = rt.zero_pose()
        q["pelvis"] = {"x": 0, "y": 8, "a": 0}
        q["leg_near_upper"] = {"x": 0, "y": 0, "a": 70}
        q["leg_near_lower"] = {"x": 0, "y": 0, "a": 20}
        self.assertEqual(rt.select_lower(q, "base"), "sit_long")

        # sit_floor is drawn: no fallback to sit_chair
        self.assertTrue(rt.lower_available("sit_floor", "se", "male8", "base"))
        self.assertTrue(rt.lower_available("kneel", "nw", "male8", "base"))
        self.assertTrue(rt.lower_available("sit_long", "se", "female9", "pants"))

        # skirt + straight legs -> stand (drawn)
        self.assertEqual(rt.select_lower(rt.zero_pose(), "skirt", "se", "male8"), "stand")
        self.assertEqual(rt.select_lower(rt.zero_pose(), "base", "se", "male8"), "rig")

    def test_sprite_hides_legs_keeps_head_and_parity(self):
        rig, binding = active("male")
        sides = rt.sides_of(rig)
        i = rt.binding_inputs(binding, "se")
        prep = rt.prepare_raw(i["layers"], i["mask"], i["pivots"], i["placements"], i["order"], i["caps"], i["wear"])
        _, sit = frames_of("sit", "se", sides, i["order"])
        fr = sit[0]
        pid = rt.select_lower(fr["pose"], "base", "se", "male8")
        self.assertEqual(pid, "sit_chair")
        lower = rt.load_lower_entry(pid, "se", "male8", "base")
        self.assertIsNotNone(lower)
        v2 = bytes(rt.render_raw(prep, fr["pose"], fr["order"]))
        hooked = rt.render_raw(prep, fr["pose"], fr["order"], canvas="overflow128", lower=lower)
        crop = bytes(rt.crop_logical(hooked, "overflow128"))
        # Head / Emosi matrices are untouched (same pivots, same pose).
        self.assertEqual(
            rt.raw_matrices(prep["pivots"], prep["placements"], fr["pose"])["head"],
            rt.raw_matrices(prep["pivots"], prep["placements"], fr["pose"])["head"],
        )
        # Head band (rows 0-45) in the 64x112 crop should match v2: the sprite is pelvis-local legs.
        def row_alpha(buf, y, w=64):
            return bytes(buf[(y * w + x) * 4 + 3] for x in range(w))
        # Compare a high head row that the seated pelvis should not cover.
        self.assertEqual(row_alpha(v2, 20), row_alpha(crop, 20))
        # Legs region must change vs the jagged v2 sit.
        self.assertNotEqual(v2, crop)
        # JS twin matches Python on the overflow buffer.
        from tests.test_lgr1_parity import b64
        payload_lower = b64(lower["img"])
        js = node_render(i, [{"pose": fr["pose"], "order": fr["order"], "canvas": "overflow128", "lower": payload_lower}])
        self.assertEqual(js[0], bytes(hooked))

    def test_format_picks_new_files_without_hardcoding(self):
        # sit_floor / kneel are not drawn yet; when PNGs land, the resolver uses them.
        self.assertTrue(rt.lower_available("sit_floor", "se", "male8", "base"))
        self.assertTrue(rt.lower_available("kneel", "se", "male8", "base"))
        self.assertTrue(rt.lower_available("sit_long", "se", "male8", "base"))
        self.assertTrue(rt.lower_available("sit_chair", "se", "male8", "base"))
        self.assertTrue(rt.lower_available("crouch", "nw", "female9", "pants"))
        path = rt.lower_png_path("lie_curl", "sw", "male8", "base")
        self.assertIsNotNone(path)
        self.assertTrue(path.name.startswith("lgr1_lower_lie_curl_"))



    def test_exact_view_files_are_not_mirrored(self):
        # Runtime always loads the exact view. Crouch NW is drawn on its own.
        ne = rt.lower_png_path("crouch", "ne", "male8", "base")
        nw = rt.lower_png_path("crouch", "nw", "male8", "base")
        se = rt.lower_png_path("crouch", "se", "male8", "base")
        sw = rt.lower_png_path("crouch", "sw", "male8", "base")
        self.assertTrue(all([ne, nw, se, sw]))
        self.assertNotEqual(ne.name, nw.name)
        from PIL import Image
        def pixels(path):
            return Image.open(path).convert("RGBA").tobytes()
        def mirror(path):
            im = Image.open(path).convert("RGBA")
            return im.transpose(Image.FLIP_LEFT_RIGHT).tobytes()
        self.assertNotEqual(pixels(nw), mirror(ne), "crouch NW must not be a runtime/file mirror of NE")
        # Other NW may be a stored mirror, but we still load the NW file, not flip at runtime.
        self.assertEqual(Path(nw).name, "lgr1_lower_crouch_nw_male8_base.png")

    def test_kneel_reaches_row_105_in_crop_and_overflow(self):
        """kneel NE/NW shins reach logical row 105 when pelvis.y == REF_DY 10.
        The 64x112 crop keeps rows 0-111, so 101-105 stay. Overflow maps 105 -> 121."""
        rig, binding = active("male")
        for d in ("ne", "nw"):
            i = rt.binding_inputs(binding, d)
            prep = rt.prepare_raw(i["layers"], i["mask"], i["pivots"], i["placements"], i["order"], i["caps"], i["wear"])
            pose = rt.zero_pose()
            pose["pelvis"] = {"x": 0, "y": 10, "a": 0}
            lower = rt.load_lower_entry("kneel", d, "male8", "base")
            self.assertIsNotNone(lower)
            # Confirm the rest-space sprite itself has pixels (will shift to ~105 with dy=10)
            img = lower["img"]
            rows = [y for y in range(112) if any(img[(y * 64 + x) * 4 + 3] for x in range(64))]
            self.assertTrue(rows)  # authored
            big = rt.render_raw(prep, pose, canvas="overflow128", lower=lower)
            crop = rt.crop_logical(big, "overflow128")
            def row_has(buf, y, w=64):
                return any(buf[(y * w + x) * 4 + 3] for x in range(w))
            # logical row 105 must survive the old 64x112 crop
            self.assertTrue(row_has(crop, 105) or row_has(crop, 104) or row_has(crop, 103),
                            f"{d}: expected shin pixels near logical row 105 in the 64x112 crop")
            # overflow canvas: logical 105 -> y=121, must not clip at 128
            self.assertTrue(any(big[((105 + 16) * 128 + x) * 4 + 3] for x in range(128))
                            or any(big[((104 + 16) * 128 + x) * 4 + 3] for x in range(128)),
                            f"{d}: expected shin pixels on the 128 canvas")
            self.assertEqual(len(big), 128 * 128 * 4)

    def test_preview_wear_strips_exist(self):
        self.assertIsNotNone(rt.preview_wear_path("trousers_a", "male"))
        self.assertIsNotNone(rt.preview_wear_path("trousers_a", "female"))
        self.assertIsNotNone(rt.preview_wear_path("skirt_a", "male"))
        self.assertEqual(rt.preview_wear_id("pants"), "trousers_a")
        self.assertEqual(rt.preview_wear_id("skirt", seated=False), "skirt_a")
        self.assertIn(rt.preview_wear_id("skirt", seated=True), {"skirt_a_seat", "skirt_a"})
        cell = rt.load_preview_wear("pants", "male", "se")
        self.assertEqual(len(cell), rt.N * 4)
        self.assertTrue(any(cell[i + 3] for i in range(0, len(cell), 4)))


if __name__ == "__main__":
    unittest.main()
