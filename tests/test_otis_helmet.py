"""Otis uses Theodore's real source pixels without body regressions."""
from __future__ import annotations
import unittest
from pathlib import Path
from PIL import Image, ImageChops
from assets.npc_otis import make_otis as O

ROOT = Path(__file__).resolve().parents[1]


class OtisVisualTests(unittest.TestCase):
    def test_helmet_preserves_every_pixel_below_head_region(self):
        base = Image.new("RGBA", (64, 112), (124, 36, 63, 255))
        for direction in O.VIEWS:
            front = O.helmet(base, direction, 0)
            self.assertEqual(front.size, (64, 112))
            self.assertEqual(front.mode, "RGBA")
            self.assertEqual(front.crop((0, 73, 64, 112)).tobytes(),
                             base.crop((0, 73, 64, 112)).tobytes(),
                             "Theodore's trousers, shoes, suit must never be regenerated")
            self.assertNotEqual(front.getpixel((32, 32)), base.getpixel((32, 32)))

    def test_muzzle_really_rotates_in_animation_frames(self):
        base = Image.new("RGBA", (64, 112), (40, 30, 40, 255))
        for view in ("se", "sw"):
            a = O.helmet(base, view, 0)
            b = O.helmet(base, view, 1)
            self.assertNotEqual(a.crop((31, 54, 48, 73)).tobytes(),
                                b.crop((31, 54, 48, 73)).tobytes(),
                                "Rotating cage must change actual PNG pixels")
        a = O.helmet(base, "ne", 0)
        b = O.helmet(base, "ne", 1)
        self.assertEqual(a.tobytes(), b.tobytes(),
                         "Do not add a spinning second snout to the back of helmet")

    def test_helmet_is_compact_and_rear_is_flat_and_boxy(self):
        # Use transparent source, so only explicitly authored helmet pixels
        # appear. The source V6B body is not included in these silhouette bounds.
        base = Image.new("RGBA", (64, 112))
        for direction in ("se", "sw"):
            image = O.helmet(base, direction, 0)
            px = image.load()
            top_pixels = [(x, y) for y in range(18, 54) for x in range(64)
                          if px[x, y][3] != 0]
            xs = [x for x, _ in top_pixels]
            self.assertGreaterEqual(min(xs), 23 if direction == "se" else 10)
            self.assertLessEqual(max(xs), 53)
            self.assertLessEqual(max(xs) - min(xs) + 1, 31,
                                 "Otis head may not be wider than intended")
            self.assertTrue(any(px[x, 60][3] for x in range(19, 45)),
                            "Front must retain the rotating muzzle")
        for direction in ("ne", "nw"):
            image = O.helmet(base, direction, 0)
            px = image.load()
            self.assertEqual(max(x for x in range(64) for y in range(31, 38)
                                 if px[x, y][3] != 0) -
                             min(x for x in range(64) for y in range(31, 38)
                                 if px[x, y][3] != 0) + 1, 23,
                             "Rear shell must remain a compact flat box with its side port")
            # A solid straight top edge / square back, not an arced roof.
            self.assertEqual(image.getpixel((32, 33))[3], 255)
            self.assertFalse(any(image.getpixel((x, 60))[3] for x in range(30, 45)),
                             "No second muzzle visible on rear helmet")
        # New muzzle is limited to y <= 66, never swallows chest/trousers.
        for direction in O.VIEWS:
            result = O.helmet(base, direction, 2)
            self.assertFalse(any(result.getpixel((x, y))[3] for y in range(67, 112)
                                 for x in range(64)))

    def test_face_window_keeps_theodores_glasses_pixels(self):
        base = Image.new("RGBA", (64, 112), (0, 0, 0, 0))
        from PIL import ImageDraw
        d = ImageDraw.Draw(base)
        d.ellipse((28, 45, 34, 50), fill=(245, 235, 155, 255))
        d.ellipse((37, 45, 41, 50), fill=(245, 235, 155, 255))
        result = O.helmet(base, "se", 2)
        # Interior window is not overwritten with opaque mirrored glass.
        for y in (46, 47, 48):
            for x in (29, 30, 31, 32, 33, 37, 38, 39, 40):
                self.assertEqual(result.getpixel((x, y)), base.getpixel((x, y)))

    def test_original_source_body_at_generated_frame_level(self):
        otis = ROOT / "assets/npc_otis"
        theodore = ROOT / "assets/npc_theodore"
        source = theodore / "frames/theodore_se_idle_f0.png"
        target = otis / "frames/otis_se_idle_f0.png"
        if not source.is_file() or not target.is_file():
            self.skipTest("Build-generated sprites checked by deploy workflow")
        with Image.open(source) as src, Image.open(target) as dst:
            self.assertEqual(src.crop((0, 73, 64, 112)).tobytes(),
                             dst.crop((0, 73, 64, 112)).tobytes())


if __name__ == "__main__":
    unittest.main()
