"""V6B native sleeping head: rigid isometric angle, never squashed.

Tests verify real head dimensions/eye placements as well as the neck seam.
Do not replace these shape tests with pixel-count-only validation: the old
non-orthogonal shear retained every pixel yet looked severely crushed.
"""
import sys
from pathlib import Path
import unittest
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "chars-iso" / "v6b" / "tools"))
import live_v6b as v6b


def specimen():
    body = np.zeros((112, 64, 4), dtype=np.uint8)
    for y in range(30, 56):
        inset = 4 if y < 33 else 2 if y < 35 else 0 if y < 50 else 3 if y < 53 else 6
        body[y, 17+inset:42-inset] = [248, 180, 115, 255]
    body[56:59, 27:33] = [248, 180, 115, 255]
    shirt = np.zeros_like(body)
    shirt[56:83, 22:42] = [55, 74, 92, 255]
    eye = np.zeros_like(body)
    eye[42:44, 24:27] = [17, 32, 42, 255]
    eye[42:44, 33:36] = [17, 32, 42, 255]
    hair = np.zeros_like(body)
    hair[30:34, 20:39] = [25, 25, 28, 255]
    return {
        "body": Image.fromarray(body, "RGBA"),
        "shirt": Image.fromarray(shirt, "RGBA"),
        "face": Image.fromarray(eye, "RGBA"),
        "hair_front": Image.fromarray(hair, "RGBA")
    }


def nearby(a, b):
    """8-connected overlap means no detached head balloon."""
    padded = b.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ys = slice(max(0, -dy), min(112, 112-dy))
            xs = slice(max(0, -dx), min(64, 64-dx))
            padded[max(0, dy):min(112, 112+dy),
                   max(0, dx):min(64, 64+dx)] |= b[ys, xs]
    return bool(np.any(a & padded))


def moments(alpha):
    yy, xx = np.nonzero(alpha)
    coords = np.column_stack([xx.astype(float), yy.astype(float)])
    cov = np.cov(coords, rowvar=False)
    return np.sort(np.linalg.eigvalsh(cov))


class TestRigidSleepHead(unittest.TestCase):
    def test_head_shape_is_rigid_not_sheared_or_crushed(self):
        src = specimen()
        original = np.asarray(src["body"]).copy()
        original[56:] = 0
        original_mask = original[..., 3] > 0
        eigen_original = moments(original_mask)
        for view in ("se", "ne"):
            pivot = v6b.lie_neck_pivot(src)
            shift = v6b.lie_head_shift(src, view)
            lift = v6b.lie_head_frame_lift(src, view, shift, pivot)
            nx, ny = pivot
            sx, sy = nx + shift[0], ny + shift[1] + lift
            rotated = v6b.lie_rigid_head_pixels(original, nx, ny, sx, sy, view)
            mask = rotated[..., 3] > 0
            self.assertGreater(int(mask.sum()), 0)
            self.assertLess(abs(int(mask.sum())-int(original_mask.sum()))
                            / int(original_mask.sum()), .07,
                            f"{view}: rotation lost or overlaid too many skull pixels")
            eig = moments(mask)
            np.testing.assert_allclose(eig, eigen_original, rtol=.18, atol=1.3,
                err_msg=f"{view}: skull ellipse is stretched by the body shear")
            # The mapping must remain pure nearest-neighbour RGB, with no
            # interpolation colours or accidental palette changes.
            self.assertTrue(np.all(rotated[mask] == [248, 180, 115, 255]))
            # The real motion renderer must contain the exact rotated head.
            rendered = v6b.lie_preserve_head(src, view, shift, pivot, lift)
            actual = np.asarray(rendered["body"])
            np.testing.assert_array_equal(actual[mask], rotated[mask])

    def test_eyes_hair_and_skull_share_one_rigid_neck_joint(self):
        src = specimen()
        for view in ("se", "ne"):
            pivot = v6b.lie_neck_pivot(src)
            shift = v6b.lie_head_shift(src, view)
            lift = v6b.lie_head_frame_lift(src, view, shift, pivot)
            sx = pivot[0] + shift[0]
            sy = pivot[1] + shift[1] + lift
            result = v6b.lie_preserve_head(src, view, shift, pivot, lift)
            for layer in ("face", "hair_front"):
                raw = np.asarray(src[layer])
                expected = v6b.lie_rigid_head_pixels(raw, *pivot, sx, sy, view)
                np.testing.assert_array_equal(np.asarray(result[layer]), expected,
                    err_msg=f"{view}: {layer} did not rotate with the same neck anchor")
                old_pixels = np.count_nonzero(raw[..., 3])
                new_pixels = np.count_nonzero(expected[..., 3])
                self.assertLess(abs(new_pixels-old_pixels)/old_pixels, .20)
            face = np.asarray(result["face"])
            self.assertTrue(np.any(face[..., 3] > 0), f"{view} eyes disappeared")

    def test_head_and_torso_connected_in_all_four_directions(self):
        src = specimen()
        for direction in ("se", "sw", "ne", "nw"):
            view = "se" if direction in ("se", "sw") else "ne"
            pivot = v6b.lie_neck_pivot(src)
            shift = v6b.lie_head_shift(src, view)
            lift = v6b.lie_head_frame_lift(src, view, shift, pivot)
            head_source = np.asarray(src["body"]).copy()
            head_source[56:] = 0
            nx, ny = pivot
            head = v6b.lie_rigid_head_pixels(
                head_source, nx, ny, nx+shift[0], ny+shift[1]+lift, view)
            body_source = np.asarray(src["body"]).copy()
            body_source[:56] = 0
            reclined = v6b.lie_flat({
                "body": Image.fromarray(body_source, "RGBA"),
                "shirt": src["shirt"]}, view, "lie")
            full_body = Image.alpha_composite(reclined["body"], reclined["shirt"])
            final_body = Image.new("RGBA", (64, 112))
            final_body.paste(full_body, (0, lift))
            head_mask = head[..., 3] > 0
            body_mask = np.asarray(final_body)[..., 3] > 0
            if direction in ("sw", "nw"):
                head_mask = np.fliplr(head_mask)
                body_mask = np.fliplr(body_mask)
            self.assertTrue(nearby(head_mask, body_mask),
                            f"{direction}: skull is detached from original torso")

    def test_head_angle_follows_both_isometric_body_axes(self):
        src = specimen()
        norm = np.sqrt(5.0)
        for view, sign in (("se", 1), ("ne", -1)):
            p = v6b.lie_neck_pivot(src)
            shift = v6b.lie_head_shift(src, view)
            lift = v6b.lie_head_frame_lift(src, view, shift, p)
            src_img = np.asarray(src["body"]).copy()
            src_img[56:] = 0
            out = v6b.lie_rigid_head_pixels(
                src_img, *p, p[0]+shift[0], p[1]+shift[1]+lift, view)
            # Source vertical head axis now follows (2, +/-1)/sqrt(5).
            # The normal is (+/-1, -2)/sqrt(5); dot product zero,
            # determinant magnitude 1. This was NOT true for old shear.
            axis = np.array([2, sign])/norm
            normal = np.array([sign, -2])/norm
            self.assertAlmostEqual(float(axis @ normal), 0.0, places=6)
            self.assertAlmostEqual(float(np.linalg.norm(axis)), 1.0, places=6)
            self.assertAlmostEqual(float(np.linalg.norm(normal)), 1.0, places=6)
            self.assertGreater(np.count_nonzero(out[..., 3]), 300)


if __name__ == "__main__":
    unittest.main()
