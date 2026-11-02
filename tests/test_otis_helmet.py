"""Otis V6B pixel regression: source Theodore body, opaque helm and 4 facings."""
from __future__ import annotations

import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from assets.npc_otis import make_otis as O

ROOT = Path(__file__).resolve().parents[1]


class OtisVisualTests(unittest.TestCase):
    def test_preserve_source_body_and_pivot(self):
        base = Image.new("RGBA", (64, 112), (124, 36, 63, 255))
        for direction in O.VIEWS:
            image = O.helmet(base, direction, 0)
            self.assertEqual(image.size, (64, 112))
            self.assertEqual(image.mode, "RGBA")
            self.assertEqual(image.crop((0, 73, 64, 112)).tobytes(),
                             base.crop((0, 73, 64, 112)).tobytes(),
                             "Do not modify Theodore trousers, feet or grounded pivot")
            self.assertNotEqual(image.getpixel((32, 32)), base.getpixel((32, 32)))

    def test_opaque_chrome_visor_hides_theodore_eyes(self):
        # Source face/goggles must be fully replaced by metal, not transmitted
        # through a glass pane or a thin alpha overlay.
        base = Image.new("RGBA", (64, 112), (10, 10, 10, 0))
        draw = ImageDraw.Draw(base)
        draw.rectangle((27, 43, 43, 53), fill=(250, 0, 230, 255))
        for direction in ("se", "sw"):
            visor = O.helmet(base, direction, 0)
            for x in range(27, 43):
                for y in range(44, 52):
                    pixel = visor.getpixel((x, y))
                    self.assertEqual(pixel[3], 255)
                    self.assertNotEqual(pixel[:3], (250, 0, 230),
                                        "Facial identity must not leak through visor")
        # Changing the source facial expression must not affect the visible
        # face-window region after Otis's opaque chrome plate is applied.
        a = Image.new("RGBA", (64, 112), (0, 0, 0, 0))
        b = a.copy()
        ImageDraw.Draw(a).rectangle((25, 44, 43, 52), fill=(240, 200, 160, 255))
        ImageDraw.Draw(b).rectangle((25, 44, 43, 52), fill=(20, 20, 20, 255))
        for direction in ("se", "sw"):
            self.assertEqual(O.helmet(a, direction).crop((25, 43, 43, 53)).tobytes(),
                             O.helmet(b, direction).crop((25, 43, 43, 53)).tobytes())

    def test_muzzle_rotates_only_on_front_facing_views(self):
        base = Image.new("RGBA", (64, 112))
        for direction in ("se", "sw"):
            a = O.helmet(base, direction, 0)
            b = O.helmet(base, direction, 1)
            self.assertNotEqual(a.crop((19, 55, 46, 69)).tobytes(),
                                b.crop((19, 55, 46, 69)).tobytes(),
                                "Steel cage rotation must be present in real PNG pixels")
        for direction in ("ne", "nw"):
            self.assertEqual(O.helmet(base, direction, 0).tobytes(),
                             O.helmet(base, direction, 1).tobytes(),
                             "No extra rotating muzzle on the back of the helmet")

    def test_side_disc_follows_theodore_body_facing(self):
        # Theodore's SE/NE V6B faces viewer-right, and SW/NW faces left.
        # Canonical Otis art was authored facing left; the previous code
        # swapped only the HEAD mirror mapping and pointed the cap backward.
        # Check the opaque circular ear/endcap's actual pixel location,
        # rather than merely checking that SE and SW sheets differ.
        empty = Image.new("RGBA", (64, 112))
        for facing, side_x in (("se", 15), ("sw", 49),
                               ("ne", 15), ("nw", 49)):
            frame = O.helmet(empty, facing)
            self.assertEqual(frame.getpixel((side_x, 48))[:3],
                             tuple(bytes.fromhex(O.C["c_light"].lstrip("#"))),
                             f"{facing}: helmet endcap must be on body's rearward side")
            opposite = 49 if side_x == 15 else 15
            self.assertNotEqual(frame.getpixel((opposite, 48))[:3],
                                tuple(bytes.fromhex(O.C["c_light"].lstrip("#"))),
                                f"{facing}: cannot leave endcap on forward side")
        # No change to leg sprites or torso/face orientation.
        original = O.T.frame("se", "idle", 0)
        updated = O.helmet(original, "se")
        self.assertEqual(updated.crop((0, 73, 64, 112)).tobytes(),
                         original.crop((0, 73, 64, 112)).tobytes())

    def test_helmet_tracks_original_head_bob_not_static_overlay(self):
        # Source head advances by one pixel in Theodore's existing walk
        # poses. The entire Otis helmet must advance with it, in both front
        # views, without translating the red suit/feet.
        palette = {tuple(bytes.fromhex(O.C[name].lstrip("#")))
                   for name in ("light", "turquoise", "mid", "hi")}
        for direction in ("se", "sw", "ne", "nw"):
            sources = []
            for y in (30, 29):
                source = Image.new("RGBA", (64, 112))
                ImageDraw.Draw(source).rectangle((20, y, 45, y + 10),
                                                fill=(120, 120, 120, 255))
                sources.append(source)
            frames = [O.helmet(src, direction) for src in sources]
            def shell_top(im):
                return min(y for y in range(24, 43) for x in range(64)
                           if im.getpixel((x, y))[:3] in palette
                           and im.getpixel((x, y))[3] == 255)
            self.assertEqual(shell_top(frames[1]), shell_top(frames[0]) - 1,
                             f"{direction}: helmet must follow Theodore head bob")
            for frame, src in zip(frames, sources):
                self.assertEqual(frame.crop((0, 73, 64, 112)).tobytes(),
                                 src.crop((0, 73, 64, 112)).tobytes())

    def test_compact_helmet_and_flat_square_rear(self):
        base = Image.new("RGBA", (64, 112))
        for direction in ("se", "sw"):
            image = O.helmet(base, direction)
            upper = [(x, y) for y in range(20, 56) for x in range(64)
                     if image.getpixel((x, y))[3] != 0]
            self.assertGreaterEqual(min(x for x, _ in upper), 10)
            self.assertLessEqual(max(x for x, _ in upper), 53)
            self.assertLessEqual(max(x for x, _ in upper) - min(x for x, _ in upper) + 1, 36)
            self.assertTrue(any(image.getpixel((x, 61))[3] for x in range(19, 46)))
        for direction in ("ne", "nw"):
            image = O.helmet(base, direction)
            self.assertEqual(image.getpixel((32, 33))[3], 255)
            # A continuous flat horizontal top at y31, no curved dome.
            top_range = range(19, 39) if direction == "ne" else range(25, 45)
            self.assertTrue(all(image.getpixel((x, 31))[3] == 255
                                for x in top_range))
            # A rear shell has no protruding black snorkel below y56.
            self.assertFalse(any(image.getpixel((x, 59))[3] for x in range(21, 46)))
        for direction in O.VIEWS:
            image = O.helmet(base, direction)
            self.assertFalse(any(image.getpixel((x, y))[3]
                                 for y in range(69, 112) for x in range(64)))

    def test_real_source_body_matches_rendered_derived_pixels(self):
        base = ROOT / "assets/npc_theodore"
        derived = ROOT / "assets/npc_otis"
        for direction in O.VIEWS:
            source = base / "frames" / f"theodore_{direction}_idle_f0.png"
            output = derived / "frames" / f"otis_{direction}_idle_f0.png"
            if not source.is_file() or not output.is_file():
                self.skipTest("Generated sprites are validated in full build")
            with Image.open(source) as original, Image.open(output) as otis:
                self.assertEqual(original.size, otis.size)
                self.assertEqual(original.crop((0, 73, 64, 112)).tobytes(),
                                 otis.crop((0, 73, 64, 112)).tobytes())
                self.assertNotEqual(original.crop((18, 24, 54, 69)).tobytes(),
                                    otis.crop((18, 24, 54, 69)).tobytes())


if __name__ == "__main__":
    unittest.main()
