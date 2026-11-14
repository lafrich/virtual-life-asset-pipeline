"""LGR-1 W4 joint-safe wear (PREVIEW ONLY): tee_v4 / trousers_v4 with their _under / _under_own strips.

JS port of lgr-outfit-v4/tools/w4.py (BAYMAX-HOOK-WEAR R4/R5): under-strip injection, armpit and seat/knee
under-fill, raised arm drawn over the torso (>= 60 deg), garment-aware edge repair, seal, despeckle.
Off by default (W4 flag false, prepare() without w4 is unchanged); the W4 passes keep the v4 rest pose; every frame
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


def strip(name, gender, d):
    f = "_f" if gender == "female" else ""
    im = Image.open(PREVIEW / f"{name}{f}.png").convert("RGBA")
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

    def test_reference_parity_and_rest(self):
        lib = rt.load_library()
        for gender in ("male", "female"):
            rig, binding = active(gender)
            sides = rt.sides_of(rig)
            for d in rt.DIRECTIONS:
                i = rt.binding_inputs(binding, d)
                wear = {"top": strip("tee_v4", gender, d), "pants": strip("trousers_v4", gender, d)}
                under = [(strip(n + "_under", gender, d), strip(n + "_under_own", gender, d)) for n in ("tee_v4", "trousers_v4")]
                frames = [{"pose": rt.zero_pose(), "order": i["order"]}]
                for name, mid, f in FIX["poses"]:
                    m = next(x for x in lib["motions"] if x["id"] == mid)
                    frames.append({"pose": rt.frame_pose(lib["poses"], m, f, d, sides),
                                   "order": rt.frame_order(i["order"], m, f, d, sides)})
                w4 = js(i, wear, frames, True, under)
                # the W4 passes alone leave the rest pose as v4; the _under strips themselves show 2-11 px at
                # rest (art, identical in the w4.py reference)
                bare = js(i, wear, frames[:1], True)
                v4 = js(i, wear, frames[:1], False)
                self.assertEqual(bare[0], v4[0], f"{gender} {d}: W4 (no under strips) rest != v4 rest")
                for (name, _, _), px in zip(FIX["poses"], w4[1:]):
                    self.assertEqual(hashlib.sha256(px).hexdigest(), FIX["sha256"][gender][d][name],
                                     f"{gender} {d} {name}: JS W4 != w4.py reference")


if __name__ == "__main__":
    unittest.main()
