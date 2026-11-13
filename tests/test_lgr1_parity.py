"""LGR-1 JS/Python pixel parity: site/lgr1-raster.js (via node) and
site/genesis_procedural_runtime.py must render identical RGBA for every
shared motion frame in all four directions, with Custom Wear (incl. a
per-outfit tweak) and an Emosi face. Uses a fixture binding produced by the
workbench's current V6B seed; never touches Drive."""
import base64
import importlib.util
import json
import shutil
import subprocess
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("lgr1_rt", ROOT/"site"/"genesis_procedural_runtime.py")
rt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rt)
FIXTURE = ROOT/"tests"/"fixtures"/"lgr1_male_bound.json"
b64 = lambda raw: base64.b64encode(bytes(raw)).decode()


def node_render(inputs, frames, wear=None, tweak=None, face=None):
    payload = {"layers": {k: b64(v) for k, v in inputs["layers"].items()},
               "wear": {k: b64(v) for k, v in (wear or {}).items()},
               "mask": b64(inputs["mask"]), "tweak": b64(tweak) if tweak else None,
               "pivots": inputs["pivots"], "placements": inputs["placements"],
               "order": inputs["order"], "caps": inputs["caps"],
               "face": b64(face) if face else None, "frames": frames}
    out = subprocess.run(["node", str(ROOT/"tests"/"lgr1_raster_cli.cjs")], input=json.dumps(payload),
                         capture_output=True, text=True, check=True).stdout
    return [base64.b64decode(x) for x in json.loads(out)]


def synthetic_wear(inputs):
    """A 'shirt' covering torso+arms rows and spilling 2 px outside the body,
    plus long back hair: exercises wear ownership expansion and hair slot."""
    body = inputs["layers"]["body"]
    top, hair = bytearray(rt.N*4), bytearray(rt.N*4)
    for y in range(50, 82):
        xs = [x for x in range(64) if body[(y*64+x)*4+3]]
        if not xs:
            continue
        for x in range(max(0, xs[0]-2), min(64, xs[-1]+3)):
            k = (y*64+x)*4
            top[k:k+4] = bytes((40, 90, 160, 255))
    for y in range(30, 70):
        for x in range(20, 44):
            k = (y*64+x)*4
            hair[k:k+4] = bytes((90, 50, 20, 255))
    return {"top": top, "hair_back": hair}


def synthetic_face():
    face = bytearray(rt.N*4)
    for x, y in ((28, 40), (35, 40), (30, 45), (31, 45), (32, 45), (33, 45)):
        k = (y*64+x)*4
        face[k:k+4] = bytes((20, 20, 30, 255))
    return face


@unittest.skipUnless(shutil.which("node"), "node required for parity")
class LGR1ParityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.binding = json.loads(FIXTURE.read_text())
        cls.lib = rt.load_library()

    def frames(self, inputs, direction):
        sides = rt.sides_of(self.binding.get("rig"))
        out = []
        for m in self.lib["motions"]:
            for i in range(len(m["frames"])):
                out.append({"pose": rt.frame_pose(self.lib["poses"], m, i, direction, sides),
                            "order": rt.frame_order(inputs["order"], m, i, direction, sides)})
        # free (non-snapped) angles exercise the Scale2x rotation path
        p = rt.zero_pose(); p["arm_near_upper"]["a"] = 33; p["head"]["a"] = -7; p["torso"]["x"] = 2
        out.append({"pose": p, "order": None})
        return out

    def assert_parity(self, wear=None, tweak_for=None, face=None):
        frames_total = 0
        for d in rt.DIRECTIONS:
            inputs = rt.binding_inputs(self.binding, d)
            w = wear(inputs) if wear else None
            tweak = tweak_for(inputs) if tweak_for else None
            frames = self.frames(inputs, d)
            js = node_render(inputs, frames, w, tweak, face)
            prep = rt.prepare_raw(inputs["layers"], inputs["mask"], inputs["pivots"], inputs["placements"],
                                  inputs["order"], inputs["caps"], w, tweak, face)
            for n, (f, j) in enumerate(zip(frames, js)):
                py = bytes(rt.render_raw(prep, f["pose"], f["order"]))
                if py != j:
                    diff = sum(1 for k in range(rt.N) if py[k*4:k*4+4] != j[k*4:k*4+4])
                    self.fail(f"{d} frame {n}: {diff} px differ")
                frames_total += 1
        self.assertGreater(frames_total, 4*len(self.lib["motions"]))

    def test_body_all_motions_four_directions(self):
        self.assert_parity()

    def test_custom_wear_with_tweak(self):
        def tweak(inputs):
            t = bytearray([rt.INHERIT])*rt.N
            for k in range(60*64, 61*64):
                t[k] = rt.PARTS.index("torso")
            return t
        self.assert_parity(wear=synthetic_wear, tweak_for=tweak)

    def test_emosi_face_follows_head(self):
        self.assert_parity(face=synthetic_face())

    def test_rendering_closes_joint_gaps(self):
        """Joint caps + hidden fill: posed frames must not open see-through
        holes (transparent pixels enclosed by the sprite) at the joints."""
        def holes(raw):
            seen = bytearray(rt.N)
            stack = [k for k in range(rt.N) if (k % 64 in (0, 63) or k // 64 in (0, 111)) and not raw[k*4+3]]
            for k in stack:
                seen[k] = 1
            while stack:
                k = stack.pop(); x, y = k % 64, k // 64
                for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
                    if 0 <= nx < 64 and 0 <= ny < 112:
                        n = ny*64+nx
                        if not seen[n] and not raw[n*4+3]:
                            seen[n] = 1; stack.append(n)
            return [(k % 64, k // 64) for k in range(rt.N) if not raw[k*4+3] and not seen[k]]
        for d in rt.DIRECTIONS:
            inputs = rt.binding_inputs(self.binding, d)
            prep = rt.prepare_raw(inputs["layers"], inputs["mask"], inputs["pivots"], inputs["placements"],
                                  inputs["order"], inputs["caps"])
            rest = rt.render_raw(prep, rt.zero_pose())
            for m in self.lib["motions"]:
                for i in range(len(m["frames"])):
                    pose = rt.frame_pose(self.lib["poses"], m, i, d, rt.sides_of(None))
                    mats = rt.raw_matrices(inputs["pivots"], inputs["placements"], pose)
                    joints = [rt.map_point(mats[rt.PARENTS[c]]["mat"], inputs["pivots"][c]["x"], inputs["pivots"][c]["y"])
                              for c in rt.PARTS if rt.PARENTS.get(c)]
                    tx, ty = round(pose["torso"]["x"]), round(pose["torso"]["y"])
                    opaque = lambda x, y: 0 <= x-tx < 64 and 0 <= y-ty < 112 and rest[((y-ty)*64+x-tx)*4+3]
                    bad = [p for p in holes(rt.render_raw(prep, pose))
                           if opaque(*p) and
                           any((p[0]-jx)**2 + (p[1]-jy)**2 <= 6.25 for jx, jy in joints)]
                    # ≤4 px tolerance: crossing legs in 3/4 views can leave a
                    # 1-px sliver gap behind the near leg; real joint tears
                    # (the old renderer) open far more.
                    self.assertLessEqual(len(bad), 4, f"joint holes {d} {m['id']} frame {i}: {bad}")

    def test_motion_mapping_matches_js(self):
        script = ("const M=require('./site/lgr1-motion.js');const lib=M.validateLibrary(require('./site/media/lgr1/motions.json'));"
                  "const out={};for(const m of lib.motions)for(const d of M.DIRS)for(let i=0;i<m.frames.length;i++)"
                  "out[m.id+'|'+d+'|'+i]={pose:M.framePose(lib.poses,m,i,d,M.DEFAULT_SIDES),"
                  "order:M.frameOrder(M.DEFAULT_SIDES&&require('./site/lgr1-raster.js').DRAW_ORDER.slice(),m,i,d,M.DEFAULT_SIDES)};"
                  "process.stdout.write(JSON.stringify(out))")
        js = json.loads(subprocess.run(["node", "-e", script], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
        for m in self.lib["motions"]:
            for d in rt.DIRECTIONS:
                for i in range(len(m["frames"])):
                    j = js[f"{m['id']}|{d}|{i}"]
                    py = rt.frame_pose(self.lib["poses"], m, i, d, rt.sides_of(None))
                    for part in rt.PARTS:
                        for k in "xya":
                            self.assertEqual(float(py[part][k]), float(j["pose"][part][k]) + 0.0, f"{m['id']} {d} {i} {part}.{k}")
                    self.assertEqual(list(rt.frame_order(list(rt.DRAW_ORDER), m, i, d, rt.sides_of(None))), j["order"])

    def test_back_views_have_a_head(self):
        for d in ("ne", "nw"):
            body = rt.binding_inputs(self.binding, d)["layers"]["body"]
            head = sum(1 for y in range(46) for x in range(64) if body[(y*64+x)*4+3])
            self.assertGreaterEqual(head, 40, d + " is headless")


if __name__ == "__main__":
    unittest.main()


class ShapeSliceTest(unittest.TestCase):
    """Head = skull + chin + neck down to the shoulder line; arms are only the
    arm (shoulders stay torso); legs split at the real gap; empty canvas
    belongs to no part. The fixture is the current (shape-sliced) seed."""

    def slice(self, d, mask=None):
        b = json.loads(FIXTURE.read_text())
        layers = [v for k, v in rt.binding_inputs(b, d)["layers"].items()]
        comp = bytearray(rt.N*4)
        for l in layers:
            for k in range(rt.N):
                if l[k*4+3]:
                    comp[k*4:k*4+4] = l[k*4:k*4+4]
        script = ("const C=require('./site/lafrich-puppet-core.js');const i=JSON.parse(require('fs').readFileSync(0,'utf8'));"
                  "const v=Uint8Array.from(Buffer.from(i.px,'base64'));const s=C.shapeSlice(v,i.d);"
                  "const r=i.mask?C.resliceFromShape(Uint8Array.from(Buffer.from(i.mask,'base64')),v,i.d):null;"
                  "process.stdout.write(JSON.stringify({mask:Buffer.from(s.mask).toString('base64'),shoulder:s.shoulder,waist:s.waist,legTop:s.legTop,arms:s.arms,pivot:s.headPivot,"
                  "re:r&&{mask:Buffer.from(r.mask).toString('base64'),changed:r.changed,parts:r.parts}}))")
        out = json.loads(subprocess.run(["node", "-e", script], cwd=ROOT, input=json.dumps(
            {"px": b64(comp), "d": d, "mask": b64(mask) if mask else None}), capture_output=True, text=True, check=True).stdout)
        vis = bytes(1 if comp[k*4+3] else 0 for k in range(rt.N))
        return vis, out

    def test_shape_slices_four_directions(self):
        HEAD, TORSO, PELVIS = rt.PARTS.index("head"), rt.PARTS.index("torso"), rt.PARTS.index("pelvis")
        b = json.loads(FIXTURE.read_text())
        for d, shoulder in (("se", 54), ("sw", 54), ("ne", 53), ("nw", 53)):
            vis, out = self.slice(d)
            mask = base64.b64decode(out["mask"])
            self.assertEqual(b["views"][d]["maskBase64"], out["mask"], d + " fixture is not the current seed")
            self.assertEqual(out["shoulder"], shoulder, d)
            self.assertEqual(out["pivot"]["y"], shoulder, d)
            self.assertTrue(out["arms"]["left"] and out["arms"]["right"], d + " arm lines not found")
            for k in range(rt.N):
                x, y = k % 64, k // 64
                if not vis[k]:
                    self.assertEqual(mask[k], 255, f"{d} empty pixel owned")
                elif y < shoulder - 1:
                    self.assertEqual(mask[k], HEAD, f"{d} chin/neck not head at y{y}")
                elif y < 62:
                    self.assertIn(mask[k], (HEAD, TORSO), f"{d} shoulder ({x},{y}) not torso")
            # the head ends in a clean neck stem: below the shoulder line only a
            # real neck (back views, <= 8 px wide) runs on; the flare is torso
            for y in range(shoulder - 1, 62):
                cols = [k % 64 for k in range(y*64, y*64+64) if vis[k] and mask[k] == HEAD]
                if cols:
                    self.assertLessEqual(max(cols) - min(cols), 10, f"{d} head flare at y{y}")
                if y >= shoulder:
                    self.assertTrue(not cols or (d in ("ne", "nw") and len(cols) <= 8), f"{d} head below shoulder at y{y}")
            if d in ("ne", "nw"):
                self.assertEqual(sum(1 for x in range(64) if mask[shoulder*64+x] == HEAD), 7, d + " neck stem")
            # pelvis = hips band between the waist and the leg split; parent of both thighs
            self.assertEqual(out["waist"], out["legTop"] - 6, d)
            for k in range(rt.N):
                y = k // 64
                if vis[k] and out["waist"] <= y < out["legTop"] and mask[k] not in (PELVIS,) and not rt.PARTS[mask[k]].startswith("arm"):
                    self.fail(f"{d} hip pixel ({k % 64},{y}) not pelvis")
                if vis[k] and shoulder <= y < out["waist"] and mask[k] == PELVIS:
                    self.fail(f"{d} chest pixel in pelvis")
            for side in ("left", "right"):
                arm = out["arms"][side]
                self.assertGreaterEqual(arm["top"], 61, d)
                for y in range(arm["top"], arm["bottom"]+1):
                    inner = arm["x"] + (1 if side == "left" else -1)
                    if vis[y*64+inner]:
                        self.assertIn(mask[y*64+inner], (TORSO, PELVIS), f"{d} {side} arm takes torso at ({inner},{y})")
            # legs never cross the gap: one leg per side of each empty gap column
            for y in range(out["legTop"], 101):
                parts = [mask[y*64+x] for x in range(64) if vis[y*64+x]]
                if not parts:
                    continue
                left = {rt.PARTS[p].split("_")[1] for p in parts[:3]}
                right = {rt.PARTS[p].split("_")[1] for p in parts[-3:]}
                self.assertEqual(len(left), 1, f"{d} y{y}"); self.assertEqual(len(right), 1, f"{d} y{y}")
                self.assertNotEqual(left, right, f"{d} y{y} both sides same leg")

    def test_reslice_old_draft(self):
        old = bytearray(rt.N)
        for k in range(rt.N):  # the pre-shape rectangular default slice
            x, y = k % 64, k // 64
            old[k] = rt.PARTS.index("head") if y < 50 else rt.PARTS.index("arm_near_upper") if 61 <= y < 81 and x <= 24 else rt.PARTS.index("torso") if y < 81 else rt.PARTS.index("leg_near_upper")
        vis, out = self.slice("se", bytes(old))
        self.assertGreater(out["re"]["changed"], 0)
        self.assertEqual(out["re"]["mask"], out["mask"])
        self.assertIn("head", out["re"]["parts"])


class LegacyMigrationTest(unittest.TestCase):
    """Old 10-part masters/drafts still open: JS and Python derive the pelvis
    from the lower torso identically, in memory, without touching the input."""

    def test_js_and_python_migrate_identically_and_render_equal(self):
        legacy = json.loads((ROOT/"tests"/"fixtures"/"lgr1_male_bound_legacy10.json").read_text())
        self.assertEqual(len(legacy["hierarchy"]["parts"]), 10)
        rt.validate(legacy)
        script = ("const C=require('./site/lafrich-puppet-core.js');const b=JSON.parse(require('fs').readFileSync(0,'utf8'));"
                  "const m=C.validateMaster(b.rig);const o={};for(const d of C.DIRS)o[d]={mask:m.masks[d],pivots:m.pivots[d]};"
                  "process.stdout.write(JSON.stringify(o))")
        js = json.loads(subprocess.run(["node", "-e", script], cwd=ROOT, input=json.dumps(legacy),
                                       capture_output=True, text=True, check=True).stdout)
        lib = rt.load_library()
        bow = next(m for m in lib["motions"] if m["id"] == "bow")
        for d in rt.DIRECTIONS:
            inputs = rt.binding_inputs(legacy, d)
            self.assertEqual(base64.b64encode(inputs["mask"]).decode(), js[d]["mask"], d)
            self.assertEqual(inputs["pivots"], js[d]["pivots"], d)
            self.assertNotIn("pelvis", legacy["views"][d]["pivots"])
            frames = [{"pose": rt.frame_pose(lib["poses"], bow, 2, d, rt.sides_of(None)), "order": list(inputs["order"])}]
            j = node_render(inputs, frames)[0]
            prep = rt.prepare_raw(inputs["layers"], inputs["mask"], inputs["pivots"], inputs["placements"],
                                  inputs["order"], inputs["caps"])
            self.assertEqual(bytes(rt.render_raw(prep, frames[0]["pose"], frames[0]["order"])), j, d)


@unittest.skipUnless(shutil.which("node"), "node required for parity")
class OfficialBaseParityTest(LGR1ParityTests):
    """The approved official Male/Female base (site/media/lgr1/base) renders
    identically in JS and Python in every motion frame, 4 directions."""
    GENDER = None

    @classmethod
    def setUpClass(cls):
        cls.lib = rt.load_library()

    def run_gender(self, g):
        pkg = json.loads((ROOT/"site"/"media"/"lgr1"/"base"/f"genesis-base-{g}.json").read_text())
        rig = pkg["rig"]
        self.binding = {"rig": rig, "views": {d: {"pivots": rig["pivots"][d], "maskBase64": rig["masks"][d]}
                                              for d in rt.DIRECTIONS}}
        self.assert_parity()
        self.assert_parity(face=synthetic_face())

    def test_official_male(self):
        self.run_gender("male")

    def test_official_female(self):
        self.run_gender("female")

    # inherited fixture-specific tests are covered by LGR1ParityTests
    test_body_all_motions_four_directions = test_custom_wear_with_tweak = None
    test_emosi_face_follows_head = test_rendering_closes_joint_gaps = None
    test_motion_mapping_matches_js = test_back_views_have_a_head = None


class JointFillTest(unittest.TestCase):
    """official-2: render-time joint fill closes bow seams, never draws over
    art, and leaves the rest pose byte-identical (JS == Python is covered by
    OfficialBaseParityTest, which renders with the fill on)."""
    def test_rest_unchanged_and_bow_filled(self):
        lib = rt.load_library()
        bow = next(m for m in lib["motions"] if m["id"] == "bow")
        self.assertEqual(rt.JOINT_FILL, 4)
        for gender in ("male", "female"):
            rig = json.loads((ROOT/"site"/"media"/"lgr1"/"base"/f"genesis-base-{gender}.json").read_text())["rig"]
            binding = {"rig": rig, "views": {d: {"pivots": rig["pivots"][d], "maskBase64": rig["masks"][d]} for d in rt.DIRECTIONS}}
            for d in rt.DIRECTIONS:
                i = rt.binding_inputs(binding, d)
                prep = rt.prepare_raw(i["layers"], i["mask"], i["pivots"], i["placements"], i["order"], i["caps"], i["wear"])
                z = rt.zero_pose()
                self.assertEqual(bytes(rt.render_raw(prep, z)), bytes(rt._render_parts(prep, z)), f"{gender} {d} rest changed")
                filled = 0
                for f in range(len(bow["frames"])):
                    pose = rt.frame_pose(lib["poses"], bow, f, d, rt.sides_of(rig))
                    order = rt.frame_order(i["order"], bow, f, d, rt.sides_of(rig))
                    a, b = rt.render_raw(prep, pose, order), rt._render_parts(prep, pose, order)
                    for k in range(rt.N):
                        if b[k*4+3]:
                            self.assertEqual(a[k*4:k*4+4], b[k*4:k*4+4], "fill drew over art")
                        elif a[k*4+3]:
                            filled += 1
                self.assertGreater(filled, 0, f"{gender} {d}: bow seams not filled")
