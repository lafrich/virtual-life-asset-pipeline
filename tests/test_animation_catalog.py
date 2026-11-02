"""Animation catalog must be real where preview exists, explicit draft elsewhere."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from PIL import Image

import tools.new_animation_template as scaffold
import tools.pack_animation_preview as packer

from tools.build_animation_catalog import build_animation_catalog
from tools.new_animation_template import create


class AnimationLibraryTests(unittest.TestCase):
    REPO = "https://github.com/lafrich/virtual-life-asset-pipeline"

    def test_discovery_real_previews_and_unrendered_template_specs(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            records = build_animation_catalog(out, self.REPO)
            self.assertGreaterEqual(len(records), 10)
            ids = {r["id"] for r in records}
            self.assertEqual(len(ids), len(records))
            self.assertIn("ambil_barang", ids)
            self.assertIn("hobo_spawn", ids)
            self.assertIn("template_one_shot", ids)
            active = [r for r in records if r["status"] == "preview"]
            drafts = [r for r in records if r["status"] == "template"]
            self.assertGreaterEqual(len(active), 7)
            self.assertGreaterEqual(len(drafts), 3)
            for clip in active:
                self.assertTrue(clip["preview_only"])
                self.assertTrue(clip["gif"] and clip["poster"])
                self.assertTrue((out / clip["gif"]).is_file())
                self.assertTrue((out / clip["poster"]).is_file())
                self.assertGreater(clip["gif_frames"], 1)
            for draft in drafts:
                self.assertFalse(draft["gif"], "Unrendered templates must not invent animations")
                self.assertFalse(draft["poster"])
                self.assertTrue((out / draft["template_json"]).is_file())
            saved = json.loads((out / "animations.json").read_text(encoding="utf-8"))
            self.assertEqual(len(saved["animations"]), len(records))

    def test_scaffold_produces_editable_manifest_without_fake_animation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            presets = root / "assets" / "animation_library" / "templates"
            presets.mkdir(parents=True)
            source = scaffold.ROOT / "assets" / "animation_library" / "templates" / "emote_loop.json"
            (presets / "emote_loop.json").write_bytes(source.read_bytes())
            with mock.patch.object(scaffold, "ROOT", root):
                folder = scaffold.create("scratch_head", "emote_loop")
            manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["animation_catalog"]["status"], "template")
            self.assertEqual(manifest["frame_count"], 4)
            self.assertTrue((folder / "src" / "make_animation.py").is_file())
            self.assertFalse(list((folder / "preview").glob("*.gif")), "Never synthesize bogus GIF previews")

    def test_packer_refuses_missing_poses_and_packages_authored_frames(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / "assets" / "anim_sample"
            (folder / "frames").mkdir(parents=True)
            manifest = folder / "manifest.json"
            manifest.write_text(json.dumps({"frame_count": 2, "frame_ms": [120, 220]}))
            with mock.patch.object(packer, "ROOT", root):
                with self.assertRaises(FileNotFoundError):
                    packer.render(manifest)
                for direction in packer.DIRS:
                    for frame in range(2):
                        image = Image.new("RGBA", (64, 112))
                        image.putpixel((32 + frame, 65), (245, 245, 245, 255))
                        image.save(folder / "frames" / f"sample_{direction}_f{frame}.png")
                result = packer.render(manifest)
            self.assertTrue(result.is_file())
            with Image.open(result) as gif:
                self.assertEqual(gif.format, "GIF")
                self.assertEqual(gif.n_frames, 2)

    def test_scaffold_refuses_invalid_and_existing_names(self):
        with self.assertRaises(ValueError):
            create("../bad", "one_shot")
        with self.assertRaises(ValueError):
            create("UPPERCASE", "emote_loop")
        with self.assertRaises(FileExistsError):
            create("nyebrang", "one_shot")


if __name__ == "__main__":
    unittest.main()
