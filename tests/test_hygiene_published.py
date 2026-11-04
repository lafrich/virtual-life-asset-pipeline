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
    soak=animations[f"bathtub_bathe_{sex}_v1"]
    assert soak["status"]=="ready" and not soak["preview_only"]
    assert soak["action_id"]=="bathtub_bathe"
    assert soak["actor"]==item["id"]
    assert soak["frame_count"]==6
    assert soak["directions"]==["se","sw","ne","nw"]
    for label in ("gif","poster"):
        assert (out/soak[label]).is_file()
    with Image.open(out/soak["gif"]) as image:
        assert image.format=="GIF" and image.n_frames==6
    clip=animations[f"bathe_{sex}_v1"]
    assert clip["status"]=="ready" and not clip["preview_only"]
    assert clip["actor"]==item["id"] and clip["action_id"]=="bathe"
    assert clip["frame_count"]==4 and clip["directions"]==["se","sw","ne","nw"]
    for name in ("gif","poster"):
        assert (out/clip[name]).is_file()
    with Image.open(out/clip["gif"]) as image:
        assert image.format=="GIF" and image.n_frames==4
# Bathtub: actually reclined six-frame sprite, awake eyes and foam.
# Do not claim the standing 4-frame shower is a horizontal bathtub pose.
for sex in ("male","female"):
    item=by_id[f"human_{sex}_base"]
    motions={m["id"]:m for m in item["motions"] if m.get("available")}
    assert "bathtub_bathe" in motions, f"{sex}: missing authored bathtub"
    tub=motions["bathtub_bathe"]
    assert tub["source"]=="custom" and tub["frames"]==6 and tub["loop"]
    assert tub["sheet"]==f"media/human-{sex}-base-action-bathtub_bathe.png"
    assert len(tub["frame_ms"])==6
    with Image.open(out/tub["sheet"]) as im:
        assert im.size==(384,448) and im.mode=="RGBA"
        for row in range(4):
            frames=[im.crop((col*64,row*112,(col+1)*64,(row+1)*112))
                    for col in range(6)]
            assert all(frame.getchannel("A").getbbox() for frame in frames)
            assert len({frame.tobytes() for frame in frames})>=4, (
                f"{sex}: bathtub foam loop is not animated for direction {row}")
        # A lying mannequin is not the same silhouette as the upright bath.
        upright=Image.open(out/motions["bathe"]["sheet"]).convert("RGBA")
        assert im.crop((0,0,64,112)).tobytes()!=upright.crop(
            (0,0,64,112)).tobytes()
# The authoring code forces neutral/open eyes rather than native blink or zzz.
source=Path("tools/build_human_templates.py").read_text()
assert "selected_expression=(" in source
assert "contextual_expression(kind,index)" in source
assert 'face_expression=("blink" if kind in ("lie","sleep_seat")' in source
assert 'elif kind=="lie":' in source
print("PASS six-frame open-eyed reclined foamy bathtub for Male/Female in four directions")
print("PASS real male/female shower animation: four directions, four frames, four timed previews")
