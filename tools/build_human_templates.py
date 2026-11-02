"""Generate adult HUMAN male/female bald, neutral body bases using original
v6b pose/face geometry. Clothing slots are authored separately in the editor.
This deliberately omits explicit anatomy: a plain skin-toned mannequin base.
"""
from __future__ import annotations
import sys
from pathlib import Path
from PIL import Image
import numpy as np

DIRECTIONS=("se","sw","ne","nw")
MOTIONS={"walk":6,"idle":4,"sit":4,"sit_type":4,"sleep_seat":4,"nap_stand":4,"talk":4}
EXPRS=("neutral","happy","surprised","angry","sleepy")
FRAME=(64,112)
# Native v6b head begins at FY=31. y=53 is the start of the shoulders:
# keep the scalp/face untouched and give the BODY an actual 1px contour.
BODY_START_Y=53

def outline_human_body(sprite:Image.Image,edge_tone:tuple[int,int,int]) -> Image.Image:
    """Put a warm, one-native-pixel INNER silhouette on torso, arms, legs and
    feet. The alpha mask and 64x112 pivot never change; no horizontal line is
    painted below the head or across the neck.
    """
    pixels=np.asarray(sprite.convert("RGBA")).copy()
    visible=pixels[...,3]>0
    # An edge is a filled sprite pixel next to transparent space. Detect the
    # complete silhouette *after* skin and body layers have been composited,
    # so internal garment seams don't turn into arbitrary body stripes.
    surrounded=np.zeros_like(visible)
    surrounded[1:-1,1:-1]=(
        visible[:-2,1:-1]&visible[2:,1:-1]&
        visible[1:-1,:-2]&visible[1:-1,2:]
    )
    edge=visible & ~surrounded
    edge[:BODY_START_Y,:]=False
    # Use the darker native skin ramp rather than flat black: still clearly
    # outlined, but consistent with the rest of the pixel-character family.
    tone=np.clip(np.asarray(edge_tone,dtype=np.float32)*0.56,0,255).astype(np.uint8)
    pixels[edge,:3]=tone
    return Image.fromarray(pixels,"RGBA")

def build_human_templates(root:Path,media:Path)->list[dict]:
    for folder in (root/"assets/npc_preview_v2",root/"assets/npc_gfunk",root/"chars-iso/v6b/tools"):
        if str(folder) not in sys.path:sys.path.insert(0,str(folder))
    import base6
    import make_npcs_v2 as M
    palettes={
        "male":{"body":"m","skin":"light","hair":"short","hc":"black","top":"tee_long","tc":"paper","pants":"trousers","pc":"paper","shoes":"shoes","sc":"paper"},
        "female":{"body":"f","skin":"light","hair":"short","hc":"black","top":"tee_long","tc":"paper","pants":"trousers","pc":"paper","shoes":"shoes","sc":"paper"},
    }
    results=[]
    for gender,cfg in palettes.items():
        name=f"human-{gender}-base"
        def frame(direction:str,kind:str,index:int,expression:str="neutral"):
            anim="sleep" if kind=="sleep_seat" else "tired" if kind=="nap_stand" else kind
            # Mirror directions are authored via native v6b, not generic canvas flip.
            canvas,layers,pal=base6.render(cfg,f=index,d=direction,expr=expression,anim=anim)
            M.bald(layers,pal)
            skin=[tuple(pal.get(k,pal["Ki"])) for k in ("K5","K7","Ke","Kh","Ki")]
            # Replace garment material with the native palette skin tones,
            # retaining original torso, limbs, feet, and motion silhouettes.
            for key in ("shirt","pants","shoes","shoes_over","rips","arm_far","arm_near"):
                if key not in layers:continue
                a=np.asarray(layers[key].convert("RGBA")).copy()
                mask=a[...,3]>0
                if not np.any(mask):continue
                light=(a[...,0].astype("float32")*.3+a[...,1]*.59+a[...,2]*.11)
                index_map=np.clip(np.floor(light/52),0,4).astype("uint8")
                for i,tone in enumerate(skin):
                    a[mask & (index_map==i),:3]=tone
                layers[key]=Image.fromarray(a,"RGBA")
            result=Image.new("RGBA",FRAME)
            for key in ("hair_back","body","arm_far","shoes","pants","shoes_over",
                        "rips","shirt","arm_near","body_front","face","hair_front","brows"):
                if key in layers:result.alpha_composite(layers[key].convert("RGBA"))
            # A bald, skin-toned body still needs a pixel-art silhouette
            # around its arms, torso, separated legs, and feet.
            result=outline_human_body(result,tuple(pal.get("K7",(105,75,63))))
            # The body is intentionally featureless rather than anatomical.
            assert result.size==FRAME
            return result
        def make_sheet(kind,count,expression="neutral"):
            img=Image.new("RGBA",(count*64,4*112))
            for y,d in enumerate(DIRECTIONS):
                for x in range(count):img.alpha_composite(frame(d,kind,x,expression),(x*64,y*112))
            return img
        sheet=Image.new("RGBA",(384,44*112))
        for kind,row in (("walk",0),("idle",4)):
            source=make_sheet(kind,MOTIONS[kind])
            for d in range(4):
                crop=source.crop((0,d*112,source.width,(d+1)*112))
                sheet.alpha_composite(crop,(0,(row+d)*112))
        sheet.save(media/f"{name}-sheet.png",optimize=True)
        guide=Image.new("RGBA",(256,112))
        for idx,d in enumerate(DIRECTIONS):guide.alpha_composite(frame(d,"idle",0),(idx*64,0))
        guide.save(media/f"{name}-guide.png",optimize=True)
        poster=frame("se","idle",0)
        poster.save(media/f"{name}-thumb.png",optimize=True)
        poster.save(media/f"{name}-poster.png",optimize=True)
        walk_frames=[frame("se","walk",i).resize((192,336),Image.Resampling.NEAREST) for i in range(6)]
        walk_frames[0].save(media/f"{name}-walk.gif",save_all=True,append_images=walk_frames[1:],
                            duration=150,loop=0,disposal=2)
        motions=[]
        for kind,count in MOTIONS.items():
            if kind in ("walk","idle"):
                motions.append({"id":kind,"name":kind.upper(),"category":"basic","source":"native",
                    "row":0 if kind=="walk" else 4,"available":True,"frames":count,
                    "frame_ms":[150 if kind=="walk" else 270]*count,"loop":True,"reason":""})
            else:
                fn=f"{name}-action-{kind}.png"
                make_sheet(kind,count).save(media/fn,optimize=True)
                motions.append({"id":kind,"name":kind.replace("_"," ").upper(),"category":"action",
                    "source":"custom","sheet":"media/"+fn,"row":0,"available":True,
                    "frames":count,"frame_ms":[210]*count,"loop":kind in ("talk","sit_type"),"reason":""})
        expressions=[]
        for expr in EXPRS:
            fn=f"{name}-expression-{expr}.png"
            make_sheet("idle",4,expr).save(media/fn,optimize=True)
            portrait=f"{name}-expression-{expr}-portrait.png"
            frame("se","idle",0,expr).crop((17,30,49,59)).resize((160,145),Image.Resampling.NEAREST).save(media/portrait)
            expressions.append({"id":expr,"label":expr.upper(),"sheet":"media/"+fn,
                "portrait":"media/"+portrait,"frames":4,"frame_ms":[270]*4,"loop":True})
        results.append({"id":f"human_{gender}_base","name":"Human / "+gender.title()+" Base",
            "type":"npc","template":True,"template_category":"human","gender":gender,
            "description":"Adult neutral bald human mannequin, unclothed base without explicit anatomy; modular shirt, pants and shoes.",
            "outfit":"unclothed / modular","hairstyle":"bald",
            "sheet":f"media/{name}-sheet.png","walk":f"media/{name}-walk.gif",
            "poster":f"media/{name}-poster.png","thumbnail":f"media/{name}-thumb.png",
            "folder_url":"https://github.com/lafrich/virtual-life-asset-pipeline/tree/main/chars-iso/v6b",
            "source_url":"https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/assets/npc_preview_v2/base6.py",
            "timestamp":0,"walk_frames":6,"idle_frames":4,"row_starts":{"walk":0,"idle":4},
            "frame_size":"64 × 112","motions":motions,"expressions":expressions})
    return results
