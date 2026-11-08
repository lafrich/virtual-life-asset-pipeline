#!/usr/bin/env python3
"""Verify that retired non-native V6B activity art was physically removed."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
pilot=ROOT/"site"/"media"/"v6p-act"
assert not pilot.exists() or not list(pilot.rglob("*")), "Old non-native pilot atlas still exists"
compositor=(ROOT/"site"/"v6p-compositor.js").read_text()
assert "const W=384,H=4928,FW=64,FH=112" in compositor
assert "const ROWS={walk:0,idle:4,talk:8,sit:12,sit_type:16,sleep:20,tired:24,swim:28,float:32,lie:36,perch:40}" in compositor
assert not (ROOT/"site"/"motion-packs"/"clp_standing_punch.motion.json").exists()
print("PASS: 11 native actions retained, 20 abandoned activity atlas files gone")
