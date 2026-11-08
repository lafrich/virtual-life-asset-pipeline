#!/usr/bin/env python3
"""Guard that Genesis V6B animation preview really rasterizes ORIGINAL Python layers."""
import importlib.util
import io
import base64
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"chars-iso"/"v6b"/"tools"))
spec=importlib.util.spec_from_file_location("genesis_native_render",ROOT/"site"/"genesis-native-render.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
from PIL import Image
BASE_JOINTS={k:{"x":x,"y":y} for k,(x,y) in mod.ANCHORS.items()}
ANGLES={k:0 for k in mod.ANGLES}
def pose():
    return {"joints":{k:dict(v) for k,v in BASE_JOINTS.items()},"angles":dict(ANGLES)}
def pack():
    import copy
    return {"format":"genesis-v6b-native-animation-v1",
            "id":"anim_preview_test_001","name":"Native Test","template":"idle",
            "frames":[{"key":"f0","ms":140},{"key":"f1","ms":140}],
            "poses":{d:[pose(),pose()] for d in mod.DIRS}}
if __name__=="__main__":
    data=pack()
    frames={}
    for gender in ("male","female"):
        for d in mod.DIRS:
            result=mod.frame_png(data,gender,d,0)
            im=Image.open(io.BytesIO(base64.b64decode(result))).convert("RGBA")
            assert im.size==(64,112),(gender,d,im.size)
            assert im.getbbox(),(gender,d,"empty")
            frames[(gender,d)]=im
    data["poses"]["se"][1]["joints"]["hand_near"]={"x":32,"y":60}
    data["poses"]["se"][1]["joints"]["elbow_near"]={"x":28,"y":62}
    img=Image.open(io.BytesIO(base64.b64decode(mod.frame_png(data,"male","se",1)))).convert("RGBA")
    assert img.tobytes()!=frames["male","se"].tobytes(),"Editor pose did not change native Python pixels"
    print("PASS native Python renderer: 2 genders × 4 directions nonempty, joint movement changes real PNG pixels")
