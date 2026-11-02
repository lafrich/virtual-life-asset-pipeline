"""Tests that Motion Studio applies real character-specific animation sheets."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT / "tools"))
from build_character_catalog import available_actions, motion_actions


class MotionStudioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.actions = motion_actions()

    def choices(self, name: str):
        folder = ROOT / "assets" / name
        manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as tmp:
            return available_actions(folder, manifest, name.removeprefix("npc_"),
                                     Path(tmp), self.actions)

    def test_bowie_native_actions_are_character_specific(self):
        actions = {action["id"]:action for action in self.choices("npc_aladdin_sane")}
        for name in ("walk", "idle", "talk", "sit", "sit_type"):
            self.assertTrue(actions[name]["available"], name)
            self.assertEqual(actions[name]["source"], "native")
        for name in ("press_button", "pick_up"):
            self.assertFalse(actions[name]["available"])
            self.assertEqual(actions[name]["reason"], "NEEDS CHARACTER RIG")

    def test_mascot_cannot_fake_seated_or_crosswalk_actions(self):
        actions = {action["id"]:action for action in self.choices("npc_milk_mascot")}
        self.assertTrue(all(actions[k]["available"] for k in ("idle","walk","talk")))
        self.assertFalse(actions["sit"]["available"])
        self.assertFalse(actions["press_button"]["available"])

    def test_no_wrong_actor_fallback_for_custom_actions(self):
        expected = {a["id"] for a in self.actions}
        self.assertEqual(len(expected),len(self.actions))
        for family in ("npc_aladdin_sane","npc_milk_mascot"):
            actions = self.choices(family)
            self.assertEqual(len(actions),len(self.actions))
            for action in actions:
                if action["available"]:
                    self.assertIn(action["source"],("native","custom"))
                else:
                    self.assertFalse(action.get("sheet"))
                    self.assertEqual(action["reason"],"NEEDS CHARACTER RIG")

    def test_central_registry_exposes_all_plans_without_claiming_playability(self):
        all_actions = motion_actions(include_planned=True)
        self.assertEqual(len(all_actions), 203)
        self.assertEqual(len(self.actions), 7)
        plans = [a for a in all_actions if a.get("status") == "planned"]
        self.assertEqual(len(plans), 196)
        for a in plans:
            self.assertEqual(a["type"], "planned")
            self.assertEqual(a["frames"], 0)
            self.assertEqual(a["frame_ms"], [])
            self.assertTrue(a["needs_rig"])
        self.assertNotIn("pee_wall", {a["id"] for a in self.choices("npc_aladdin_sane")})
        self.assertNotIn("clock_in", {a["id"] for a in self.choices("npc_milk_mascot")})

    def test_invalid_native_action_row_is_rejected(self):
        src = ROOT / "assets" / "npc_aladdin_sane"
        data = json.loads((src / "manifest.json").read_text(encoding="utf-8"))
        data["row_starts"] = {}
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                available_actions(src,data,"aladdin_sane",Path(tmp),self.actions)


if __name__ == "__main__":
    unittest.main()
