"""Verify native male/female bathroom animation ships as real 4-frame pixels."""
from pathlib import Path
import json
from PIL import Image

out=Path("_site")
cat=json.loads((out/"catalog.json").read_text())
by_id={item["id"]:item for item in cat["characters"]}
animations={item["id"]:item for item in json.loads((out/"animations.json").read_text())["animations"]}
for sex in ("male","female"):
    item=by_id[f"human_{sex}_base"]
    assert item.get("gender")==sex
    motions={m["id"]:m for m in item["motions"] if m.get("available")}
    assert "sit" in motions and "bathe" in motions
    assert motions["bathe"]["frames"]==4
    assert motions["bathe"]["loop"] is True
    assert motions["bathe"]["sheet"]==f"media/human-{sex}-base-action-bathe.png"
    with Image.open(out/motions["bathe"]["sheet"]) as image:
        assert image.size==(256,448) and image.mode=="RGBA"
        frame0=image.crop((0,0,64,112))
        frame1=image.crop((64,0,128,112))
        assert frame0.tobytes()!=frame1.tobytes(), (
            f"{sex}: bath animation doesn't actually move")
        for row in range(4):
            for col in range(4):
                assert image.crop((64*col,112*row,64*(col+1),112*(row+1))).getchannel("A").getbbox()
    clip=animations[f"bathe_{sex}_v1"]
    assert clip["status"]=="ready" and not clip["preview_only"]
    assert clip["actor"]==item["id"] and clip["action_id"]=="bathe"
    assert clip["frame_count"]==4 and clip["directions"]==["se","sw","ne","nw"]
    for name in ("gif","poster"):
        assert (out/clip[name]).is_file()
    with Image.open(out/clip["gif"]) as image:
        assert image.format=="GIF" and image.n_frames==4
print("PASS real male/female shower animation: four directions, four frames, four timed previews")
