"""Verify both newly published Animations-tab clips have real 4-frame GIFs."""
from pathlib import Path
import json
from PIL import Image

OUT = Path("_site")
data = json.loads((OUT / "animations.json").read_text())
by_id = {a["id"]: a for a in data["animations"]}
catalog = json.loads((OUT / "catalog.json").read_text())
by_actor = {c["id"]: c for c in catalog["characters"]}
male = by_actor["human_male_base"]
lie = next(m for m in male["motions"] if m["id"] == "lie" and m["available"])
assert lie["frames"] == 4 and lie["sheet"] == "media/human-male-base-action-lie.png"
for action in ("sleep_bed_right", "sleep_bed_left"):
    clip = by_id[action]
    assert clip["status"] == "ready" and clip["universal"]
    assert not clip["preview_only"] and clip["actor"] == male["id"]
    assert clip["action_id"] == action
    assert clip["frame_count"] == 4 and clip["directions"] == ["se", "sw", "ne", "nw"]
    assert clip["duration_ms"] == 1710
    for name in ("gif", "poster"):
        assert clip[name] and (OUT / clip[name]).is_file()
    with Image.open(OUT / clip["gif"]) as gif:
        assert gif.format == "GIF" and gif.n_frames == 4
    print("PASS", action, "4 real native V6B animated frames visible in Animations")
