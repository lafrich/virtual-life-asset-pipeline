"""Regression coverage for promoted v6b packaging & attachment primitives."""
import unittest

from tools.iso_asset_primitives import (
    draw_slanted_pixel_text,
    iso_panel_barcode,
    iso_side_anchor_x,
    isometric_face_y,
)


class PixelRecorder:
    def __init__(self):
        self.calls = []

    def point(self, xy, fill):
        self.calls.append((xy, fill))


class IsometricPixelsTests(unittest.TestCase):
    def test_text_columns_follow_plane_without_tilting_letter_stems(self):
        pen = PixelRecorder()
        glyphs = {"a": ("101", "101", "111")}
        draw_slanted_pixel_text(pen, "a", glyphs, 10, 20, "#fff", slope=7 / 27)
        self.assertIn(((10, 20), "#fff"), pen.calls)
        self.assertIn(((10, 21), "#fff"), pen.calls)
        self.assertIn(((12, isometric_face_y(12, origin_x=10, origin_y=20, slope=7/27)), "#fff"), pen.calls)
        self.assertEqual(len(pen.calls), 7)

    def test_letter_orientation_reflects_with_slope(self):
        pen = PixelRecorder()
        glyph = {"i": ("111",)}
        draw_slanted_pixel_text(pen, "i", glyph, 10, 20, "#000", slope=-1)
        self.assertEqual([pos for pos, _ in pen.calls], [(10, 20), (11, 19), (12, 18)])

    def test_mirrored_barcode_slopes_agree_with_panel(self):
        ne = iso_panel_barcode("ne")
        nw = iso_panel_barcode("nw")
        self.assertEqual(len(ne), 9)
        self.assertEqual(len(nw), 9)
        self.assertGreater(ne[-1][1], ne[0][1], "NE descends right")
        sorted_nw = sorted(nw)
        self.assertLess(sorted_nw[-1][1], sorted_nw[0][1], "NW descends left")
        for (xn, yn, hn), (xw, yw, hw) in zip(ne, nw):
            self.assertEqual(xn + xw, 63)
            self.assertEqual((yn, hn), (yw, hw))
            self.assertTrue(0 <= xn < 64 and 0 <= xw < 64)
            self.assertGreater(hn, 0)

    def test_barcode_bob_is_just_vertical_translation(self):
        for d in ("ne", "nw"):
            original = iso_panel_barcode(d)
            translated = iso_panel_barcode(d, bob=-1)
            self.assertEqual([(x, y - 1, h) for x, y, h in original], translated)

    def test_hidden_views_never_receive_rear_bars(self):
        self.assertEqual(iso_panel_barcode("se"), [])
        self.assertEqual(iso_panel_barcode("sw"), [])

    def test_side_attachment_is_inside_panel(self):
        self.assertEqual(iso_side_anchor_x(41, 50), 45)
        self.assertLess(iso_side_anchor_x(41, 50), 50)
        self.assertRaises(ValueError, iso_side_anchor_x, 50, 41)

    def test_invalid_columns_rejected(self):
        with self.assertRaises(ValueError):
            iso_panel_barcode("ne", columns=3)


if __name__ == "__main__":
    unittest.main()
