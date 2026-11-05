"""Non-destructive smoke tests for the original V6B Python-backed Studio."""
import io
import shutil
import unittest

from PIL import Image
import server


class ConfigurationTests(unittest.TestCase):
    def test_native_templates_are_used(self):
        for template in ("ichsan", "noor"):
            with self.subTest(template=template):
                cfg = server.make_config({"template": template, "name": "Unit Test!"})
                self.assertEqual(cfg["name"], "unit_test")
                self.assertEqual(cfg["arms"], "down")
                self.assertEqual(cfg["default_outfit"], "default")
                self.assertIn("shirt", cfg["outfits"]["default"])
                self.assertIn("hair_map", cfg)
                self.assertIn("skin_map", cfg)

    def test_settings_roundtrip_and_color(self):
        cfg = server.make_config({
            "template": "noor", "name": "sample",
            "hair_style": "long", "fringe": "curtain",
            "hair_color": "#777777", "skin_color": "#cba68c",
            "shirt_kind": "cardigan", "shirt_color": "#112233",
            "outer_color": "#445566", "pants_kind": "baggy",
            "pants_color": "#223344", "shoes_color": "#101820",
            "cardigan_dots": True, "rips": True,
            "glasses": True, "glasses_shape": "round",
        })
        self.assertEqual(cfg["hair_map"]["3"], "#777777")
        self.assertEqual(cfg["skin_map"]["i"], "#CBA68C")
        self.assertEqual(cfg["outfits"]["default"]["outer"]["color"], "#445566".upper())
        self.assertTrue(cfg["outfits"]["default"]["pants"]["rips"])
        self.assertEqual(cfg["_studio"]["hair_style"], "long")

    def test_reject_unsupported_modes(self):
        for field, value in (
            ("template", "../evil"), ("hair_style", "raster_clone"),
            ("pants_kind", "unknown"), ("fringe", "random")
        ):
            with self.subTest(field=field):
                with self.assertRaises(ValueError):
                    server.make_config({field: value})


class NativeRenderSmokeTests(unittest.TestCase):
    def test_original_engine_png_and_four_view_atlas(self):
        result = server.generate({
            "name": "v6b_test_character",
            "template": "ichsan",
            "hair_style": "mid",
            "fringe": "curtain",
            "shirt_kind": "tee",
            "pants_kind": "trousers",
            "glasses": True,
            "mustache": True,
        })
        job = server.JOBS[result["id"]]
        try:
            with Image.open(job["sheet"]) as img:
                self.assertEqual(img.size, (384, 4928))
                self.assertEqual(img.mode, "RGBA")
                self.assertIsNotNone(img.getbbox())
            idle_png = server.atlas(job, "idle", "neutral")
            with Image.open(io.BytesIO(idle_png)) as img:
                self.assertEqual(img.size, (256, 448))
                self.assertIsNotNone(img.getbbox())
            walk_png = server.atlas(job, "walk", "happy")
            with Image.open(io.BytesIO(walk_png)) as img:
                self.assertEqual(img.size, (384, 448))
                self.assertIsNotNone(img.getbbox())
            self.assertEqual(result["pivot"], [32, 100])
            self.assertEqual(list(result["directions"]), ["se", "sw", "ne", "nw"])
        finally:
            server.JOBS.pop(result["id"], None)
            shutil.rmtree(job["root"], ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
