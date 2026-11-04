"""QA real published Male/Female motion sheets, all frames in four directions."""
import json
from pathlib import Path
import numpy as np
from PIL import Image

root=Path("_site")
cat=json.loads((root/"catalog.json").read_text())["characters"]
expected={"walk":6,"idle":4,"sit":4,"sit_type":4,"sleep_seat":4,
          "nap_stand":4,"talk":4,"lie":4,"bathe":4,"bathtub_bathe":6}
animated={"walk":4,"idle":2,"sit_type":2,"talk":2,
          "lie":2,"bathe":3,"bathtub_bathe":4}
bodies=[]
for gender in ("male","female"):
    c=next(x for x in cat if x["id"]==f"human_{gender}_base")
    actions={m["id"]:m for m in c["motions"] if m.get("available")}
    assert set(actions)==set(expected),(gender,sorted(actions))
    assert len(c["expressions"])==5
    for kind,frames in expected.items():
        action=actions[kind]
        assert action["frames"]==frames and len(action["frame_ms"])==frames
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
print("PASS: 2 gender rigs x 10 actions x 4 directions, all 80 directional clips valid")
