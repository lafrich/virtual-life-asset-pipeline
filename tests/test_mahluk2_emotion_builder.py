#!/usr/bin/env python3
"""Exercise the emotion-only extractor without generating the entire catalog."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from build_mahluk2_emotion_planes import build_emotion_plane_library


class EmotionPlaneExtractionTests(unittest.TestCase):
    def test_only_authored_front_head_pixels_are_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp)
            media = out / "media"
            src = media / "original-rig"
            src.mkdir(parents=True)
            entries = []

            for gender in ("male", "female"):
                head = np.zeros((448, 64, 4), dtype=np.uint8)
                for di in (0, 1):
                    head[di * 112 + 29:di * 112 + 55, 20:46, :] = (215, 171, 137, 255)
                Image.fromarray(head, "RGBA").save(src / f"{gender}-body-head.png")

                full = np.zeros((448, 256, 4), dtype=np.uint8)
                for di in range(4):
                    for fi in range(4):
                        x0, y0 = fi * 64, di * 112
                        full[y0 + 25:y0 + 105, x0 + 20:x0 + 46] = (213, 162, 138, 255)
                        if di < 2:
                            full[y0 + 40:y0 + 43, x0 + 27:x0 + 37] = (15, 12, 18, 255)
                path = media / f"human-{gender}-base-expression-bleh.png"
                Image.fromarray(full, "RGBA").save(path)
                entries.append({
                    "id": f"human_{gender}_base",
                    "expressions": [{
                        "id": "bleh", "label": "Bleh",
                        "sheet": "media/" + path.name, "frames": 4,
                        "frame_ms": [220, 270, 230, 290]
                    }]
                })

            result = build_emotion_plane_library(out, entries)
            self.assertEqual(len(result["entries"]), 2)
            self.assertEqual({x["base"] for x in result["entries"]}, {"male", "female"})
            for asset in result["entries"]:
                with Image.open(out / asset["src"]) as image:
                    data = np.asarray(image.convert("RGBA"))
                self.assertEqual(data.shape, (448, 256, 4))
                self.assertGreater(data[:224, :, 3].sum(), 0)
                self.assertEqual(data[224:, :, 3].sum(), 0)
                self.assertEqual(data[64:112, :, 3].sum(), 0)  # no torso
                self.assertEqual(asset["frame_ms"], [220, 270, 230, 290])


if __name__ == "__main__":
    unittest.main()
