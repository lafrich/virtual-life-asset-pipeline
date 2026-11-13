"""Contract: six 2026-11-13 Lafrich-approved Genesis base sprites never change pixels."""
import base64
import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from tools import build_lgr_wardrobe_reference_v2 as build


def to_image(value):
    return Image.open(io.BytesIO(base64.b64decode(value.split(",", 1)[1]))).convert("RGBA")


class ArtistReferencesTest(unittest.TestCase):
    def test_generate_six_exact_source_rgba_and_native_keys(self):
        with tempfile.TemporaryDirectory() as tmp:
            catalog = build.build(Path(tmp))
            self.assertEqual(len(catalog["entries"]), 6)
            keys = build.palette_keys()
            for ident, (gender, group, variant) in build.VARIANTS.items():
                source = json.loads((build.INPUT / (ident + ".json")).read_text())
                final = json.loads((Path(tmp) / (ident + ".json")).read_text())
                self.assertEqual(final["format"], "lgr1-pakaian-v2")
                self.assertTrue(final["approved"])
                self.assertTrue(final["artistBase"])
                self.assertEqual(final["rev"], 2)
                self.assertEqual(final["id"], ident)
                self.assertEqual(final["gender"], gender)
                self.assertEqual(final["group"], group)
                self.assertEqual(final["variant"], variant)
                self.assertEqual(final["baseRigSha256"], source["baseRigSha256"])
                self.assertEqual(final["baseVersion"], "official-9")
                self.assertEqual(final["schema"], 2)
                self.assertEqual(final["updated"], source["sourceUpdated"])
                self.assertEqual(len(final["files"]), 2 if group == "top" else 1)
                self.assertEqual(source["sourceKeyFamily"], build.FAMILIES[group])
                self.assertEqual(source["targetKeyFamily"], build.FAMILIES[group])
                self.assertEqual(set(final["files"]), set(source["files"]))
                hasher = hashlib.sha256()
                for path in sorted(source["files"]):
                    raw_uri = source["files"][path]
                    produced_uri = final["files"][path]
                    self.assertEqual(raw_uri, produced_uri, ident + " " + path + " PNG bytes not preserved")
                    raw = to_image(raw_uri)
                    new = to_image(produced_uri)
                    self.assertEqual(raw.size, (256, 112))
                    self.assertEqual(new.tobytes(), raw.tobytes(), ident + " " + path + " rgba changed")
                    self.assertTrue(all(pixel[3] in (0, 255) for pixel in new.getdata()))
                    hasher.update(path.encode("utf-8"))
                    hasher.update(raw.tobytes())
                    allowed = {tuple(bytes.fromhex(keys[v][1:])) for v in build.ALLOWED[group]}
                    for pixel in new.getdata():
                        if pixel[3]:
                            self.assertIn(pixel[:3], allowed, path + " invalid native KEY")
                self.assertEqual(final["artSha256"], hasher.hexdigest())
                front = group + "/" + variant + ("_f" if gender == "female" else "")
                image = to_image(final["files"][front])
                for i in range(4):
                    self.assertIsNotNone(image.crop((i*64, 0, (i+1)*64, 112)).getbbox(),
                                         ident + " missing direction " + str(i))
                matching = [e for e in catalog["entries"] if e["id"] == ident]
                self.assertEqual(len(matching), 1)
                self.assertEqual(matching[0]["artSha256"], final["artSha256"])
                self.assertEqual(matching[0]["updated"], source["sourceUpdated"])

    def test_source_files_are_from_latest_six_adjust_exports_not_legacy_misnamed_files(self):
        for ident, (gender, group, variant) in build.VARIANTS.items():
            source = json.loads((build.INPUT / (ident + ".json")).read_text())
            self.assertEqual(source["originalFilename"], "LGR_REF_" + ident + "_4view.json")
            self.assertEqual(source["originalExportGroup"], group)
            self.assertEqual(source["originalExportVariant"], variant)
            self.assertEqual(source["sourceKeyFamily"], build.FAMILIES[group])
            self.assertTrue(source["sourceUpdated"].startswith("2026-11-13T06:"))
            self.assertTrue(source["approvedReference"])
            self.assertFalse(source["gameMaster"])


if __name__ == "__main__":
    unittest.main()
