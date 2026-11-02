"""Animation catalog must be real where preview exists, explicit draft elsewhere."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

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

    def test_scaffold_refuses_invalid_and_existing_names(self):
        with self.assertRaises(ValueError):
            create("../bad", "one_shot")
        with self.assertRaises(ValueError):
            create("UPPERCASE", "emote_loop")
        with self.assertRaises(FileExistsError):
            create("nyebrang", "one_shot")


if __name__ == "__main__":
    unittest.main()
