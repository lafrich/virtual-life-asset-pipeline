"""QA real published Male/Female motion sheets, all frames in four directions."""
import json
from pathlib import Path
import numpy as np
from PIL import Image

root=Path("_site")
cat=json.loads((root/"catalog.json").read_text())["characters"]
expected={"walk":6,"idle":4,"sit":4,"sit_type":4,"sleep_seat":4,
          "nap_stand":4,"talk":4,"lie":4,"bathe":4,"bathtub_bathe":6,
          "squat_idle":4,"squat_down":6,"squat_up":6,"knee_chest_idle":4,"bent_over_idle":4,"lie_idle":4}
animated={"walk":4,"idle":2,"sit":2,"sleep_seat":2,"nap_stand":2,"sit_type":2,"talk":2,
          "lie":2,"bathe":3,"bathtub_bathe":4,
          "squat_idle":3,"squat_down":4,"squat_up":4,"knee_chest_idle":3,"bent_over_idle":3,"lie_idle":2}
bodies=[]
for gender in ("male","female"):
    c=next(x for x in cat if x["id"]==f"human_{gender}_base")
    actions={m["id"]:m for m in c["motions"] if m.get("available")}
    assert set(actions)==set(expected),(gender,sorted(actions))
    assert len(c["expressions"])==12
    assert (root/f"media/human-{gender}-base-action-toilet.png").is_file()
    assert {x["id"] for x in c["expressions"]}=={
        "neutral","smile","happy","sad","angry","surprised","sleepy","blink","embarrassed","bleh","cheeky","grimace_blush"}
    for kind,frames in expected.items():
        action=actions[kind]
        assert action["frames"]==frames and len(action["frame_ms"])==frames
        if kind in ("squat_idle","knee_chest_idle","bent_over_idle","lie_idle"):
            assert action["category"]=="posture" and action["loop"] is True
            assert action["posture"]==kind
        if kind in ("squat_down","squat_up"):
            assert action["category"]=="posture" and action["loop"] is False
            assert action["posture"]==kind
        assert len(action["expression_sequence"])==frames
        assert action["default_expression"]==action["expression_sequence"][0]
        assert all(isinstance(t,int) and t>0 for t in action["frame_ms"])
        path=root/(action.get("sheet") or c["sheet"])
        assert path.is_file(),(gender,kind,path)
        with Image.open(path) as src:
            assert src.mode=="RGBA"
            assert src.width>=frames*64 and src.height>=(action.get("row",0)+4)*112
            atlas=np.asarray(src)
        counts=[]
        for direction in range(4):
            row=direction+action.get("row",0)
            tiles=[atlas[row*112:(row+1)*112,f*64:(f+1)*64].copy()
                   for f in range(frames)]
            for idx,rgba in enumerate(tiles):
                a=rgba[...,3]
                assert (a>0).sum()>250,(gender,kind,direction,idx,"missing body")
                assert not a[0,:].any() and not a[-1,:].any()
                assert not a[:,0].any() and not a[:,-1].any(),(
                    gender,kind,direction,idx,"clipped sprite")
            unique=len({tile.tobytes() for tile in tiles})
            counts.append(unique)
            if kind in animated:
                assert unique>=animated[kind],(gender,kind,direction,unique)
        print(gender,kind,counts,"held" if kind not in animated else "moving")
    bodies.append(c)
assert (root/bodies[0]["sheet"]).read_bytes()!=(root/bodies[1]["sheet"]).read_bytes()
# Speech requires an actual mouth-open/mouth-closed sequence, not static faces.
for c in bodies:
    action=next(m for m in c["motions"] if m["id"]=="talk")
    assert action["expression_sequence"]==["talk_closed","talk_open","talk_open","talk_closed"]
    with Image.open(root/action["sheet"]) as sheet:
        closed=np.asarray(sheet.crop((0,31,64,58)))
        opened=np.asarray(sheet.crop((64,31,128,58)))
        assert (closed!=opened).any(),(c["id"],"Talk mouth never changes")
# Pose-specific shape: squat lowers the body, a bend hinges forward, and
# lie_idle is genuinely horizontal. These must not be renamed standing idle.
for actor in bodies:
    def tile(kind,view="se"):
        m=next(m for m in actor["motions"] if m["id"]==kind)
        with Image.open(root/(m.get("sheet") or actor["sheet"])) as im:
            index={"se":0,"sw":1,"ne":2,"nw":3}[view]
            row=int(m.get("row",0))+index
            return np.asarray(im.crop((0,row*112,64,(row+1)*112)))
    for view in ("se","sw","ne","nw"):
        idle=tile("idle",view)
        x0,y0=np.nonzero(idle[:,:,3])[1],np.nonzero(idle[:,:,3])[0]
        for kind in ("squat_idle","bent_over_idle","knee_chest_idle"):
            pose=tile(kind,view)
            x,y=np.nonzero(pose[:,:,3])[1],np.nonzero(pose[:,:,3])[0]
            assert y.min()>=y0.min()+7,(actor["id"],kind,view,"head did not lower")
            assert len(x)>200,(actor["id"],kind,view,"empty pose")
        reclined=tile("lie_idle",view)
        y,x=np.nonzero(reclined[:,:,3])
        assert x.max()-x.min()>40 and y.max()-y.min()<70,(
            actor["id"],view,"lie_idle is not horizontal")
for actor in bodies:
    grimace=next(e for e in actor["expressions"] if e["id"]=="grimace_blush")
    preview=root/grimace["preview_gif"]
    assert preview.is_file(),(actor["id"],"grimace GIF missing")
    with Image.open(preview) as animation:
        assert animation.size==(512,448) and getattr(animation,"n_frames",0)==4
    expr=next(e for e in actor["expressions"] if e["id"]=="bleh")
    for part in ("eyes","mouth","blush"):
        for pose in ("idle","walk"):
            path=root/expr["parts"][part][pose]
            assert path.is_file(),(actor["id"],part,pose)
            with Image.open(path) as im:
                assert im.mode=="RGBA"
                assert np.any(np.asarray(im)[:,:,3]>0),(path,"empty modular emotion")
    with Image.open(root/expr["sheet"]) as im:
        assert im.size==(256,448)
print("PASS: 2 adult human rigs x 16 actions x 4 directions, 128 clips; knee-chest, squat and bleh face parts validated")
