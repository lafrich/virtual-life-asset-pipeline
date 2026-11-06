"""Four-view hand identity: rear source mirrors arms, not their bone names."""
from __future__ import annotations

import unittest

import numpy as np
from PIL import Image

from tools.build_original_rig_layers import (
    DIRS,
    mask,
    split_source,
    native_owner_map,
    classify_native_layer,
    _limb_split,
    v6b,
)


class HandDirectionMapping(unittest.TestCase):
    def test_rear_sides_swap_source_identity_but_do_not_swap_world_bones(self):
        for direction in DIRS:
            with self.subTest(direction=direction):
                back = direction in ("ne", "nw")
                near = "r" if back else "l"
                far = "l" if back else "r"
                for y, prefix_near, prefix_far in (
                    (64, "shoulder", "shoulder"),
                    (75, "elbow", "elbow"),
                    (89, "wrist", "wrist"),
                ):
                    self.assertEqual(
                        mask("arm_near", 20, y, direction),
                        prefix_near + "_" + near,
                    )
                    self.assertEqual(
                        mask("arm_far", 45, y, direction),
                        prefix_far + "_" + far,
                    )
                self.assertEqual(
                    mask("body_front", 20, 89, direction), "wrist_" + near
                )
                self.assertEqual(mask("head", 33, 30, direction), "torso")

    def test_real_v6b_back_arm_is_mirrored_before_sprite_partition(self):
        # Prove this mapping follows actual generator behavior, not an
        # arbitrary left/right swap guessed from a screenshot.
        front = v6b.draw_arms("idle", 0, "se")
        back = v6b.draw_arms("idle", 0, "ne")
        self.assertEqual(len(front), 2)
        for one, other in zip(front, back):
            self.assertTrue(np.array_equal(other, np.fliplr(one)))

    def test_split_source_preserves_every_original_rgba_pixel(self):
        for direction in DIRS:
            with self.subTest(direction=direction):
                pixels = np.zeros((112, 64, 4), dtype=np.uint8)
                for y, x, color in (
                    (64, 21, (240, 20, 15, 255)),
                    (75, 24, (80, 210, 55, 255)),
                    (89, 28, (20, 40, 230, 180)),
                ):
                    pixels[y, x] = color
                image = Image.fromarray(pixels, "RGBA")
                pieces = split_source(image, "arm_near", direction)
                side = "r" if direction in ("ne", "nw") else "l"
                for prefix in ("shoulder", "elbow", "wrist"):
                    self.assertIn(prefix + "_" + side, pieces)
                reconstructed = np.zeros_like(pixels)
                for tile in pieces.values():
                    arr = np.asarray(tile)
                    covered = arr[..., 3] > 0
                    reconstructed[covered] = arr[covered]
                self.assertTrue(np.array_equal(reconstructed, pixels))

    def test_native_gender_arm_layer_uses_same_direction_convention(self):
        for direction in DIRS:
            with self.subTest(direction=direction):
                rear = direction in ("ne", "nw")
                near, far = ("r", "l") if rear else ("l", "r")
                splits = {"arm_near": (65, 78), "arm_far": (65, 78)}
                for layer, side in (("arm_near", near), ("arm_far", far)):
                    for y, prefix in ((59, "shoulder"), (72, "elbow"), (84, "wrist")):
                        self.assertEqual(
                            classify_native_layer(
                                layer, 20, y, 32, direction, splits
                            ),
                            prefix + "_" + side,
                        )
                self.assertEqual(
                    classify_native_layer(
                        "body_front", 20, 84, 32, direction, splits
                    ),
                    "wrist_" + near,
                )

    def test_front_and_rear_gender_source_arm_pixels_are_not_recolored_or_deleted(self):
        # Use actual source-sized native mattes with disjoint arms.
        for direction in DIRS:
            with self.subTest(direction=direction):
                near = np.zeros((112, 64, 4), dtype=np.uint8)
                far = np.zeros_like(near)
                near[57:87, 15:19] = (212, 110, 84, 255)
                far[57:87, 45:49] = (80, 120, 210, 255)
                layers = {
                    "arm_near": Image.fromarray(near, "RGBA"),
                    "arm_far": Image.fromarray(far, "RGBA"),
                }
                owner = native_owner_map(layers, direction)
                for y in (59, 72, 84):
                    self.assertNotEqual(owner[y, 16], owner[y, 46])
                    self.assertTrue(owner[y, 16].endswith("r" if direction in ("ne", "nw") else "l"))
                    self.assertTrue(owner[y, 46].endswith("l" if direction in ("ne", "nw") else "r"))


if __name__ == "__main__":
    unittest.main()
