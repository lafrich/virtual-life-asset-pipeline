"""LGR-1 W4 joint-safe wear (PREVIEW ONLY): tee_v4 / trousers_v4 and the calmer tee_v5 / trousers_v5 (wired) with their _under / _under_own strips.

JS port of lgr-outfit-v4/tools/w4.py (BAYMAX-HOOK-WEAR R4/R5): under-strip injection, armpit and seat/knee
under-fill, raised arm drawn over the torso (>= 60 deg), garment-aware edge repair, seal, despeckle.
Off by default (W4 flag false, prepare() without w4 is unchanged); under strips masked at rest so W4 rest == v4 rest; shoes drawn; every frame
matches the reference renders of w4.py (sha256 fixture, generated on the site runtime's own draw/v4_post twins).
"""
import hashlib
import json
import subprocess
import unittest

from PIL import Image

from tests.test_lgr1_jointfix import active, rt
from tests.test_lgr1_parity import ROOT, b64

PREVIEW = ROOT / "site/media/lgr1/mh-wear/preview"
FIX = json.loads((ROOT / "tests/fixtures/lgr1_w4_reference.json").read_text())
FIX5 = json.loads((ROOT / "tests/fixtures/lgr1_w4_v5_reference.json").read_text())


def strip(name, gender, d, base=PREVIEW):
    f = "_f" if gender == "female" else ""
    im = Image.open(base / f"{name}{f}.png").convert("RGBA")
    j = rt.DIRECTIONS.index(d)
    return im.crop((j * 64, 0, j * 64 + 64, 112)).tobytes()


def js(i, wear, frames, w4, under=()):
    payload = {"layers": {k: b64(v) for k, v in i["layers"].items()}, "wear": {k: b64(v) for k, v in wear.items()},
               "mask": b64(i["mask"]), "pivots": i["pivots"], "placements": i["placements"], "order": i["order"],
               "caps": i["caps"], "jointMode": "v4", "canvas": "overflow128", "w4": w4,
               "under": [[b64(u), b64(o)] for u, o in under], "frames": frames}
    out = subprocess.run(["node", str(ROOT / "tests" / "lgr1_raster_cli.cjs")], input=json.dumps(payload),
                         capture_output=True, text=True, check=True).stdout
    import base64
    return [base64.b64decode(x) for x in json.loads(out)]


class W4Test(unittest.TestCase):
    def test_default_off(self):
        out = subprocess.run(["node", "-e", "const R=require('./site/lgr1-raster.js');"
                              "process.stdout.write(JSON.stringify([R.W4,R.jointMode]))"],
                             cwd=ROOT, capture_output=True, text=True, check=True).stdout
        self.assertEqual(json.loads(out), [False, "v2"])

    def _parity(self, top, pants, fix):
        lib = rt.load_library()
        for gender in ("male", "female"):
            rig, binding = active(gender)
            sides = rt.sides_of(rig)
            for d in rt.DIRECTIONS:
                i = rt.binding_inputs(binding, d)
                wear = {"top": strip(top, gender, d), "pants": strip(pants, gender, d),
                        "shoes": strip("shoes", gender, d, ROOT / "site/media/lgr1/mh-wear/shoes")}
                under = [(strip(n + "_under", gender, d), strip(n + "_under_own", gender, d)) for n in (top, pants)]
                frames = [{"pose": rt.zero_pose(), "order": i["order"]}]
                for name, mid, f in fix["poses"]:
                    m = next(x for x in lib["motions"] if x["id"] == mid)
                    frames.append({"pose": rt.frame_pose(lib["poses"], m, f, d, sides),
                                   "order": rt.frame_order(i["order"], m, f, d, sides)})
                w4 = js(i, wear, frames, True, under)
                # rest mask: the _under strips never show in the rest pose, so W4 rest == v4 rest
                v4 = js(i, wear, frames[:1], False)
                self.assertEqual(w4[0], v4[0], f"{top} {gender} {d}: W4 rest != v4 rest")
                for (name, _, _), px in zip(fix["poses"], w4[1:]):
                    self.assertEqual(hashlib.sha256(px).hexdigest(), fix["sha256"][gender][d][name],
                                     f"{top} {gender} {d} {name}: JS W4 != w4.py reference")

    def test_reference_parity_and_rest(self):
        self._parity("tee_v4", "trousers_v4", FIX)

    def test_v5_reference_parity_and_rest(self):
        self._parity("tee_v5", "trousers_v5", FIX5)

    def test_v5_is_v4_shape_with_calmer_tones(self):
        K = json.loads(subprocess.run(["node", "-e", "process.stdout.write(JSON.stringify(require('./site/lgr-wear.js').K))"],
                                      cwd=ROOT, capture_output=True, text=True, check=True).stdout)
        key = lambda c: (int(K[c][1:3], 16), int(K[c][3:5], 16), int(K[c][5:7], 16), 255)
        for f in ("", "_f"):
            for n, allowed in (("tee", {"C1", "C2", "C3", "C4"}), ("trousers", {"P1", "P2", "P3", "P4"})):
                a, b = (Image.open(PREVIEW / f"{n}_{v}{f}.png").convert("RGBA") for v in ("v4", "v5"))
                self.assertEqual(a.getchannel("A").tobytes(), b.getchannel("A").tobytes(), n + f + " silhouette")
                for u in ("_under", "_under_own"):
                    self.assertEqual((PREVIEW / f"{n}_v4{u}{f}.png").read_bytes(), (PREVIEW / f"{n}_v5{u}{f}.png").read_bytes())
                tones = {c for c in b.get_flattened_data() if c[3]}
                self.assertLessEqual(tones, {key(c) for c in allowed}, n + f + " tones")
                self.assertNotIn(key("OD"), tones)
                px, W, H = b.load(), b.width, b.height
                if n == "trousers":   # no one-pixel vertical crease left inside a leg
                    for x in range(1, W - 1):
                        if x % 64 in (0, 63): continue
                        for y in range(H):
                            c, l, r = px[x, y], px[x - 1, y], px[x + 1, y]
                            # leg outlines next to the crotch strip (P4 between P1) are kept on purpose
                            self.assertFalse(c[3] and l == r and (l, c) in ((key("P1"), key("P3")), (key("P2"), key("P4"))),
                                             f"{n}{f} crease at {x},{y}")
        src = (ROOT / "site/lgr-wear.js").read_text()
        self.assertIn('const W4_WEAR={top:"tee_v5",pants:"trousers_v5"};', src)

if __name__ == "__main__":
    unittest.main()
