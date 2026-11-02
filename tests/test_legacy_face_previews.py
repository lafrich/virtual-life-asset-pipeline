"""Original legacy NPC facial loops are bound to the correct actor only."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

from tools import build_legacy_face_previews as faces


class FaceSourceTests(unittest.TestCase):
    def test_archive_or_unbuilt_characters_have_no_faces(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.assertEqual(faces.build_faces(root, root, "cosmo", root, {}), [])
            self.assertEqual(faces.build_faces(root, root, "gfunk", root, {}), [])

    def test_four_view_source_render_and_nearest_pixel_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / "assets/npc_gfunk"
            (folder / "expr").mkdir(parents=True)
            media = root / "media"
            media.mkdir()
            colors = {name: i + 1 for i, name in enumerate(faces.EXPRS)}

            class FakeOriginalGenerator:
                def frames(self, view, kind="idle", expr="neutral"):
                    out = []
                    for i in range(4):
                        im = Image.new("RGBA", (64, 112))
                        im.putpixel((20 + i, 34), (colors[expr], 22, 33, 255))
                        out.append(im)
                    return out

            original = FakeOriginalGenerator()
            for name in faces.EXPRS:
                original.frames("se", expr=name)[0].save(
                    folder / "expr" / ("gfunk_se_" + name + ".png")
                )
            idle = {}
            for direction in faces.VIEWS:
                idle[direction] = {}
                for i in range(4):
                    path = folder / ("gfunk_" + direction + "_idle_f" + str(i) + ".png")
                    Image.new("RGBA", (64, 112), (12, 12, 12, 255)).save(path)
                    idle[direction][i] = path
            with mock.patch.object(faces, "load_renderer", return_value=original):
                records = faces.build_faces(root, folder, "gfunk", media, idle)
            self.assertEqual([r["id"] for r in records], list(faces.EXPRS))
            for record in records:
                self.assertEqual(record["frames"], 12)
                self.assertEqual(record["preview_mode"], "custom_sheet")
                with Image.open(root / record["sheet"]) as sheet:
                    self.assertEqual(sheet.size, (768, 448))
                    self.assertEqual(sheet.mode, "RGBA")
                    # Frame 9 temporarily uses the original closed/sleepy face.
                    if record["id"] != "sleepy":
                        self.assertEqual(sheet.getpixel((9 * 64 + 21, 34))[0],
                                         colors["sleepy"])
                    self.assertEqual(sheet.getpixel((64 * 8 + 20, 34))[0],
                                     colors[record["id"]])
                    self.assertEqual(sheet.getpixel((20, 2 * 112 + 34)),
                                     (12, 12, 12, 255))

    def test_theodore_uses_native_frame_function(self):
        class Actor:
            def frame(self, view, kind, i, expression):
                return Image.new("RGBA", (64, 112), (i, 2, 3, 255))
        frames = faces.render_four(Actor(), "theodore", "sw", "happy")
        self.assertEqual(len(frames), 4)
        self.assertEqual(frames[3].getpixel((0, 0)), (3, 2, 3, 255))


if __name__ == "__main__":
    unittest.main()
