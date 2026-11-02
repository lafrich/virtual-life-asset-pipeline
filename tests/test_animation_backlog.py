"""Life-sim roadmap is a validated, non-playable specification, not fake GIFs."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.animation_backlog import read_backlog, planned_records, assert_backlog_synced

ROOT = Path(__file__).resolve().parents[1]
BACKLOG = ROOT / "assets" / "animation_library" / "backlog.json"


class LifeSimBacklogTests(unittest.TestCase):
    def test_valid_196_actions_with_gameplay_coverage(self):
        actions = read_backlog(BACKLOG)
        self.assertEqual(len(actions), 196)
        self.assertEqual(len({a["id"] for a in actions}), len(actions))
        counts = {priority: sum(a["priority"] == priority for a in actions)
                  for priority in ("P0", "P1", "P2")}
        self.assertEqual(counts, {"P0": 55, "P1": 112, "P2": 29})
        self.assertEqual(len({a["category"] for a in actions}), 13)
        self.assertTrue(all(a["status"] == "planned" for a in actions))
        by_id = {a["id"]: a for a in actions}
        self.assertEqual(by_id["pee_wall"]["requirements"],
                         ["wall", "facing_wall", "wall_in_reach"])
        self.assertEqual(by_id["pee_wall"]["event"]["name"], "bladder_relief")
        self.assertEqual(by_id["clock_in"]["event"]["name"], "attendance_check")
        self.assertEqual(by_id["accept_payment"]["event"]["name"], "transfer_money")
        self.assertEqual(by_id["give_item"]["sync"], "paired")
        self.assertEqual(by_id["sleep"]["phases"], ["enter", "loop", "exit"])
        self.assertEqual(by_id["face_blink"]["type"], "facial")

    def test_all_plans_registered_in_canonical_motion_database(self):
        registry_path = BACKLOG.parent / "actions.json"
        source = json.loads(registry_path.read_text(encoding="utf-8"))
        self.assertEqual(source["version"], 2)
        actions = source["actions"]
        self.assertEqual(len(actions), 203)
        self.assertEqual(len({a["id"] for a in actions}), len(actions))
        assert_backlog_synced(BACKLOG, actions)
        self.assertEqual(sum(a.get("status") == "planned" for a in actions), 196)
        self.assertEqual(sum(a.get("status") != "planned" for a in actions), 7)
        corrupt = json.loads(json.dumps(actions))
        next(a for a in corrupt if a.get("status") == "planned")["priority"] = "P2"
        with self.assertRaisesRegex(ValueError, "differs"):
            assert_backlog_synced(BACKLOG, corrupt)

    def test_planned_catalog_has_no_sprite_or_approvals(self):
        records = planned_records(BACKLOG, set())
        self.assertEqual(len(records), 196)
        for item in records:
            self.assertEqual(item["status"], "planned")
            self.assertFalse(item["rig_ready"])
            self.assertFalse(item["gif"])
            self.assertFalse(item["poster"])
            self.assertFalse(item["template_json"])
            self.assertEqual(item["frame_count"], 0)
            self.assertFalse(item["actor"])
            self.assertEqual(item["action_id"], item["id"])
            self.assertEqual(item["directions"], ["se", "sw", "ne", "nw"])

    def test_reserved_ids_fail_instead_of_shadowing_real_actions(self):
        with self.assertRaisesRegex(ValueError, "reserved"):
            planned_records(BACKLOG, {"run"})

    def test_invalid_event_or_status_rejected(self):
        src = json.loads(BACKLOG.read_text(encoding="utf-8"))
        for key, value in (("status", "preview"), ("priority", "X0"),
                           ("phases", ["instant"])):
            data = json.loads(json.dumps(src))
            data["actions"][0][key] = value
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "backlog.json"
                path.write_text(json.dumps(data))
                with self.assertRaises(ValueError):
                    read_backlog(path)

    def test_all_16_design_only_choreographies_reference_real_or_planned_ids(self):
        flows = json.loads((BACKLOG.parent / "workflows.json").read_text(encoding="utf-8"))
        self.assertEqual(flows["status"], "design_only")
        self.assertEqual(len(flows["workflows"]), 16)
        registry = json.loads((BACKLOG.parent / "actions.json").read_text(encoding="utf-8"))
        ids = {a["id"] for a in read_backlog(BACKLOG)}
        ids.update(a["id"] for a in registry["actions"])
        seen = set()
        for flow in flows["workflows"]:
            self.assertEqual(flow["status"], "design_only")
            self.assertNotIn(flow["id"], seen)
            seen.add(flow["id"])
            self.assertGreaterEqual(len(flow["steps"]), 3)
            for index, step in enumerate(flow["steps"], 1):
                self.assertEqual(step["order"], index)
                self.assertIn(step["action_id"], ids)
            self.assertTrue(flow["rules"]["commit_gameplay_at_event_marker"])
            self.assertTrue(flow["rules"]["release_reserved_prop_on_cancel"])
        restricted = next(f for f in flows["workflows"] if f["id"] == "pee_wall_restricted")
        self.assertIn("facing_wall", restricted["requirements"])

    def test_planned_catalog_is_visible_but_never_a_fake_preview(self):
        # Production preview/legacy items are still loaded, and the expanded
        # catalog contains distinct, reviewable planned entries.
        from tools.build_animation_catalog import build_animation_catalog
        with tempfile.TemporaryDirectory() as directory:
            items = build_animation_catalog(Path(directory), "https://github.com/lafrich/virtual-life-asset-pipeline")
            plans = [a for a in items if a["status"] == "planned"]
            self.assertEqual(len(plans), 196)
            self.assertTrue(all(not a["gif"] and not a["poster"] for a in plans))
            self.assertTrue(any(a["gif"] for a in items if a["status"] == "preview"))
            self.assertEqual(len({a["id"] for a in items}), len(items))


if __name__ == "__main__":
    unittest.main()
