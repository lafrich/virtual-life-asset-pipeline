"""Regression checks: rigged undressed body keeps ORIGINAL source-layer ownership."""
from __future__ import annotations

import unittest
import numpy as np
from PIL import Image, ImageDraw
from tools.build_original_rig_layers import split_body_pixels, native_owner_map


def make_frame():
    def layer(box, color):
        im = Image.new("RGBA", (64, 112))
        ImageDraw.Draw(im).rectangle(box, fill=color)
        return im
    def trousers():
        im = Image.new("RGBA", (64, 112))
        d = ImageDraw.Draw(im)
        d.rectangle((23, 76, 42, 82), fill=(66, 50, 55, 255))
        d.rectangle((24, 79, 32, 100), fill=(67, 49, 54, 255))
        d.rectangle((35, 79, 43, 100), fill=(77, 57, 60, 255))
        return im
    def shoes():
        im = Image.new("RGBA", (64, 112))
        d = ImageDraw.Draw(im)
        d.rectangle((23, 100, 33, 108), fill=(245, 242, 230, 255))
        d.rectangle((35, 100, 45, 108), fill=(220, 215, 202, 255))
        return im
    # All four are real independent SOURCE mattes; no classification of
    # arbitrary pixel x/y within the flattened full-body character.
    layers = {
        "body": layer((25, 30, 41, 74), (225, 172, 125, 255)),
        "arm_far": layer((44, 59, 51, 87), (190, 131, 96, 255)),
        "shoes": shoes(),
        "pants": trousers(),
        "shirt": layer((23, 56, 42, 76), (53, 43, 46, 255)),
        "arm_near": layer((14, 59, 21, 87), (221, 159, 110, 255)),
        "face": layer((30, 42, 38, 48), (240, 202, 165, 255)),
    }
    frame = Image.new("RGBA", (64, 112))
    for matte in layers.values():
        frame.alpha_composite(matte)
    # Alter final skin RGB at different interior points. Ownership must not
    # depend on the final colour; it belongs to the actual matte.
    pixels = np.asarray(frame).copy()
    pixels[65:70, 16:21, :3] = [113, 77, 66]
    pixels[63:66, 44:49, :3] = [247, 203, 145]
    return Image.fromarray(pixels, "RGBA"), layers


def combine(parts):
    out = Image.new("RGBA", (64, 112))
    for part in parts.values():
        out.alpha_composite(part)
    return out


def visible_pixels(part):
    y, x = np.nonzero(np.asarray(part)[..., 3] > 0)
    return x, y


class OriginalAnatomicalPartitionTests(unittest.TestCase):
    def test_nude_and_outfit_keep_arm_and_body_sources_intact(self):
        frame, layers = make_frame()
        for mode in ("base", "outfit"):
            parts = split_body_pixels(frame, "se", layers)
            self.assertTrue(np.array_equal(np.asarray(combine(parts)), np.asarray(frame)))
            for key in ("head", "torso", "shoulder_l", "elbow_l", "wrist_l",
                        "shoulder_r", "elbow_r", "wrist_r", "hip_l", "hip_r",
                        "knee_l", "knee_r", "ankle_l", "ankle_r"):
                self.assertIn(key, parts, (mode, key))
            # No torso pixel can ever be stolen by an arm on the screen edge.
            xl, _ = visible_pixels(parts["shoulder_l"])
            xr, _ = visible_pixels(parts["shoulder_r"])
            self.assertLess(max(xl), 23)
            self.assertGreater(min(xr), 42)
            # The original torso has one independent, nonfragmented source.
            xt, _ = visible_pixels(parts["torso"])
            self.assertTrue(all(22 <= x <= 42 for x in xt))

    def test_mirrored_leg_is_same_anatomical_part_on_opposite_screen_side(self):
        frame, layers = make_frame()
        mirrored = frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        mirrored_layers = {name: im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                           for name, im in layers.items()}
        front = split_body_pixels(frame, "se", layers)
        left = split_body_pixels(mirrored, "sw", mirrored_layers)
        back = split_body_pixels(frame, "ne", layers)
        right = split_body_pixels(mirrored, "nw", mirrored_layers)
        for body in (front, left, back, right):
            self.assertTrue(body["torso"].getbbox())
        for direct, flipped in ((front, left), (back, right)):
            self.assertTrue(np.array_equal(np.asarray(
                combine(flipped)), np.asarray(mirrored)))
            for bone in ("hip_l", "knee_l", "ankle_l", "hip_r", "knee_r", "ankle_r"):
                expected = direct[bone].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                self.assertTrue(np.array_equal(np.asarray(flipped[bone]),
                                               np.asarray(expected)), bone)

    def test_all_visible_pixels_have_an_original_part_owner(self):
        frame, layers = make_frame()
        owner = native_owner_map(layers, "se")
        mask = np.asarray(frame)[..., 3] > 0
        self.assertTrue(np.all(owner[mask] != ""))
        # No group can own more pixels than the final sprite.
        parts = split_body_pixels(frame, "se", layers)
        count = sum(np.count_nonzero(np.asarray(part)[..., 3])
                    for part in parts.values())
        self.assertEqual(count, int(np.count_nonzero(mask)))


if __name__ == "__main__":
    unittest.main()
