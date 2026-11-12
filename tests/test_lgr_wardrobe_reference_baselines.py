"""Regression tests for Lafrich's six independent artist wardrobe references."""
import base64
import io
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from tools import build_lgr_wardrobe_reference_v2 as build

ROOT = Path(__file__).resolve().parents[1]


def to_image(value):
    return Image.open(io.BytesIO(base64.b64decode(value.split(",", 1)[1]))).convert("RGBA")


class ArtistReferencesTest(unittest.TestCase):
    def test_generate_preserves_exact_shape_and_per_category_keys(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            catalog = build.build(dest)
            self.assertEqual(len(catalog["entries"]), 6)
            keys = build.palette_keys()
            for ident, (gender, group, variant) in build.VARIANTS.items():
                source = json.loads((build.INPUT / (ident + ".json")).read_text())
                final = json.loads((dest / (ident + ".json")).read_text())
                self.assertEqual(final["format"], "lgr1-pakaian-v2")
                self.assertTrue(final["approved"])
                self.assertEqual(final["id"], ident)
                self.assertEqual(final["group"], group)
                self.assertEqual(final["baseRigSha256"], source["baseRigSha256"])
                self.assertEqual(final["baseVersion"], "official-9")
                self.assertEqual(final["schema"], 2)
                self.assertEqual(len(final["files"]), 2 if group == "top" else 1)
                k = group + "/" + variant + ("_f" if gender == "female" else "")
                raw = to_image(source["files"][k])
                new = to_image(final["files"][k])
                self.assertEqual(raw.size, (256, 112))
                self.assertEqual(new.size, raw.size)
                self.assertEqual(raw.getchannel("A").tobytes(), new.getchannel("A").tobytes())
                self.assertTrue(all(new.crop((i * 64, 0, (i + 1) * 64, 112)).getbbox() for i in range(4)))
                if group in build.REMAP:
                    allowed = {tuple(bytes.fromhex(keys[v][1:])) for v in build.REMAP[group].values()}
                    for rgb in new.getdata():
                        if rgb[3]:
                            self.assertIn(rgb[:3], allowed)
                else:
                    self.assertEqual(raw.tobytes(), new.tobytes())
            ids = [e["id"] for e in catalog["entries"]]
            self.assertEqual(ids, list(build.VARIANTS))


if __name__ == "__main__":
    unittest.main()
