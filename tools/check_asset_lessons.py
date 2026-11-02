#!/usr/bin/env python3
"""Validate permanent learning records for approved changes to asset generators.

Every changed asset generator/manifest should point to a documented learning
decision. Owner approval is required outside this script; code cannot infer it.
Usage:
  python tools/check_asset_lessons.py
  python tools/check_asset_lessons.py --base origin/main
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS = ROOT / "docs" / "asset-lessons"
VALID_PROMOTIONS = {"shared", "documented"}
VALID_STATES = {"approved", "candidate"}


def load_records() -> dict[str, dict]:
    records = {}
    for file in sorted(LESSONS.glob("*.json")):
        data = json.loads(file.read_text(encoding="utf-8"))
        family = data.get("asset_family")
        if not isinstance(family, str) or not re.fullmatch(r"[a-z0-9_\-]+", family):
            raise ValueError(f"{file}: invalid asset_family")
        if file.stem != family or family in records:
            raise ValueError(f"{file}: filename and unique asset_family must match")
        folder = f"assets/{family}"
        if data.get("asset_path") != folder or not (ROOT / folder).is_dir():
            raise ValueError(f"{file}: invalid asset_path")
        if data.get("status") not in VALID_STATES:
            raise ValueError(f"{file}: status must be 'candidate' or 'approved'")
        insights = data.get("reusable_insights")
        if not isinstance(insights, list) or not insights or any(
            not isinstance(text, str) or len(text.strip()) < 25 for text in insights
        ):
            raise ValueError(f"{file}: at least one substantial reusable_insight required")
        if data.get("promotion") not in VALID_PROMOTIONS:
            raise ValueError(f"{file}: promotion must be shared/documented")
        if not isinstance(data.get("approval_context"), str) or not data["approval_context"].strip():
            raise ValueError(f"{file}: supply approval_context or pending-review context")
        sources = data.get("source")
        if not isinstance(sources, list) or not sources:
            raise ValueError(f"{file}: source must be a nonempty list")
        for p in sources:
            if not isinstance(p, str) or not p.startswith(folder + "/") or not (ROOT / p).is_file():
                raise ValueError(f"{file}: invalid source path: {p}")
        if data["promotion"] == "shared":
            libs = data.get("reusable_code")
            tests = data.get("regression_tests")
            if not isinstance(libs, list) or not libs or not isinstance(tests, list) or not tests:
                raise ValueError(f"{file}: shared promotion requires reusable_code and regression_tests")
            for p in libs + tests:
                if not isinstance(p, str) or not (ROOT / p).is_file() or ".." in Path(p).parts:
                    raise ValueError(f"{file}: missing reusable/test path: {p}")
        else:
            reason = data.get("promotion_rationale")
            if not isinstance(reason, str) or len(reason.strip()) < 25:
                raise ValueError(f"{file}: documented-only needs promotion_rationale")
        records[family] = data
    if not records:
        raise ValueError("No asset lessons found")
    return records


def changed_asset_families(base: str) -> set[str]:
    # Triple-dot diff captures the changes introduced by our branch.
    changed = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...HEAD"],
        cwd=ROOT, check=True, text=True, capture_output=True,
    ).stdout.splitlines()
    families = set()
    for name in changed:
        parts = Path(name).parts
        if len(parts) < 3 or parts[0] != "assets":
            continue
        family = parts[1]
        if (
            parts[2] in ("src", "_work", "tools")
            or name.endswith("/manifest.json")
            or name.endswith(".py")
        ):
            families.add(family)
    return families


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--base", help="Git base branch/ref for changed asset check")
    p.add_argument("--require-approved", action="store_true",
                   help="Require owner-reviewed records for changed generators")
    args = p.parse_args()
    records = load_records()
    print(f"PASS: {len(records)} valid asset lesson record(s)")
    if args.base:
        affected = changed_asset_families(args.base)
        for family in sorted(affected):
            if family not in records:
                raise ValueError(f"Asset generator/manifest modified but docs/asset-lessons/{family}.json missing")
            if args.require_approved and records[family]["status"] != "approved":
                raise ValueError(f"Owner approval required before release: {family}")
            print(f"LEARNING RECORDED: {family} [{records[family]['promotion']}]")
        if not affected:
            print("No asset generators changed on this branch")


if __name__ == "__main__":
    main()
