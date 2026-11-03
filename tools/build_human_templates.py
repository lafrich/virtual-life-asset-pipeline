"""Render distinct adult HUMAN Male/Female modular pixel anatomy.

Preserves 64×112 pivot, original four-way poses, face atlas and independent
outfit layers. Pixel anatomy is non-explicit: chest, waist, hip, and subtle
pelvis shading are purely a visual guide for creating clothing.
"""
from __future__ import annotations
import sys
from pathlib import Path
from PIL import Image
import numpy as np

DIRECTIONS=("se","sw","ne","nw")
MOTIONS={"walk":6,"idle":4,"sit":4,"sit_type":4,"sleep_seat":4,"nap_stand":4,"talk":4,"lie":4}
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
    # EXACT native head outline color: bald head uses pal["K7"] on its
    # outside pixels. The previous 0.56 multiplier made the body artificially
    # darker than the head and was the visible color-mismatch regression.
    tone=np.asarray(edge_tone,dtype=np.uint8)
    pixels[edge,:3]=tone
    return Image.fromarray(pixels,"RGBA")

def sculpt_human_layers(layers:dict,gender:str)->dict:
    """Distinct BODY silhouette on torso and pelvis, not a face recolor.

    Changes only the two skin-toned garment-derived base layers. That means
    independent arm swing, knee/walk movement, facial expressions and 4-way
    anchors remain exactly as authored in v6b. Outfit overlays use the
    resulting male/female guide sheets and therefore stay aligned.
    """
    if gender not in ("male","female"):
        raise ValueError("Unknown human template "+gender)

    def widen(key:str,row_offsets:dict[int,int]):
        if key not in layers:return
        arr=np.array(layers[key].convert("RGBA"),copy=True)
        solid=arr[...,3]>0
        occupied=np.flatnonzero(np.any(solid,axis=1))
        if len(occupied)<5:return
        first=int(occupied[0])
        for relative,amount in row_offsets.items():
            y=first+relative
            if y<0 or y>=FRAME[1]:continue
            xs=np.flatnonzero(solid[y])
            if len(xs)<5 or amount<1:continue
            left,right=int(xs[0]),int(xs[-1])
            # Don't create islands: extend only from an existing contiguous
            # torso/pelvis pixel. No modifications to already visible pixels.
            for n in range(1,amount+1):
                if left-n>=0 and arr[y,left-n,3]==0:
                    arr[y,left-n]=arr[y,left]
                if right+n<FRAME[0] and arr[y,right+n,3]==0:
                    arr[y,right+n]=arr[y,right]
        layers[key]=Image.fromarray(arr,"RGBA")

    if gender=="male":
        # Stronger shoulder/trapezius, straighter torso; pelvis remains
        # comparatively narrow. Smooth 1-2 px shoulder slope.
        widen("shirt",{0:1,1:2,2:3,3:3,4:4,5:4,6:3,7:2,8:2,9:1})
    else:
        # Soft chest volume, without broadening the shoulder line; widen
        # the hips below the tapered waist to make the 4-way difference
        # legible even at original 1x pixel resolution.
        widen("shirt",{7:1,8:2,9:2,10:2,11:2,12:1,13:1})
        widen("pants",{1:1,2:2,3:3,4:4,5:4,6:4,7:3,8:3,9:2,10:1})
    return layers


def shade_human_anatomy(sprite:Image.Image,gender:str,direction:str,
                        shirt_top:int,pants_top:int,
                        skin_shade:tuple[int,int,int],
                        skin_light:tuple[int,int,int])->Image.Image:
    """Very small non-explicit adult morphology cues, not graphic anatomy.

    Front: female paired chest-shadows and tiny V-shaped pelvic crease;
    male flatter upper chest and understated center-pelvis shading.
    Back: soft buttock shadow difference. Never draw over air, outline,
    hands, head, or transparent space.
    """
    if gender not in ("male","female") or direction not in DIRECTIONS:
        raise ValueError("Invalid anatomy guide")
    a=np.array(sprite.convert("RGBA"),copy=True)
    rear=direction in ("ne","nw")
    shade=np.asarray(skin_shade,dtype=np.uint8)
    light=np.asarray(skin_light,dtype=np.uint8)

    def at(x:int,y:int,color:np.ndarray):
        if not (0<=x<FRAME[0] and 54<=y<FRAME[1]):return
        # Only shade a genuine interior skin pixel, never change the alpha.
        if a[y,x,3]==0:return
        if any(a[y+dy,x+dx,3]==0 for dx,dy in ((-1,0),(1,0),(0,-1),(0,1))):
            return
        a[y,x,:3]=color

    # Find the live torso center, respecting idle bob and seated poses.
    top=min(max(int(shirt_top),54),73)
    mid_y=min(top+10,76)
    xs=np.flatnonzero(a[mid_y,:,3])
    cx=int(round((int(xs[0])+int(xs[-1]))/2)) if len(xs) else 32
    if not rear:
        if gender=="female":
            for offset in (-4,4):
                at(cx+offset,top+9,shade)
                at(cx+offset+1,top+10,light)
        else:
            for offset in (-5,5):
                at(cx+offset,top+7,light)

    # Pelvis treatment is intentionally abstract at 64x112 (2-3 px max).
    hip_y=min(max(int(pants_top)+5,77),88)
    hip_x=np.flatnonzero(a[hip_y,:,3])
    hc=int(round((int(hip_x[0])+int(hip_x[-1]))/2)) if len(hip_x) else cx
    if rear:
        if gender=="female":
            at(hc-2,hip_y+1,shade)
            at(hc+2,hip_y+1,shade)
        else:
            at(hc,hip_y+1,light)
    elif gender=="female":
        at(hc-1,hip_y,shade)
        at(hc+1,hip_y,shade)
        at(hc,hip_y+1,shade)
    else:
        at(hc,hip_y,shade)
        at(hc,hip_y+1,shade)
    return Image.fromarray(a,"RGBA")


def build_human_templates(root:Path,media:Path)->list[dict]:
    for folder in (root/"assets/npc_preview_v2",root/"assets/npc_gfunk",root/"chars-iso/v6b/tools"):
        if str(folder) not in sys.path:sys.path.insert(0,str(folder))
    import base6
    import make_npcs_v2 as M
    # Human templates get a final repair AFTER skin-clothing recolor, rather
    # than relying only on the earlier rig weld before female body reshaping.
    npc_helpers=str(root/"assets"/"npc_pak_ogah")
    if npc_helpers not in sys.path:sys.path.insert(0,npc_helpers)
    from job_common import weld_arm_rgba_layers
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
            # Sculpt each gender's anatomical silhouette on skin torso and
            # pelvis BEFORE the final shoulder weld, not by resizing the sheet.
            sculpt_human_layers(layers,gender)
            shirt_mask=np.asarray(layers["shirt"].convert("RGBA"))[...,3]>0
            pant_mask=np.asarray(layers["pants"].convert("RGBA"))[...,3]>0
            shirt_rows=np.flatnonzero(np.any(shirt_mask,axis=1))
            pant_rows=np.flatnonzero(np.any(pant_mask,axis=1))
            shirt_top=int(shirt_rows[0]) if len(shirt_rows) else 55
            pants_top=int(pant_rows[0]) if len(pant_rows) else 76
            # Weld final colored arm layers to the torso, for BOTH male
            # and female, after bald/head and every source outfit conversion.
            # The guide/character silhouette remains 64x112 pixel aligned.
            rendered={k:np.array(v.convert("RGBA"),copy=True)
                      for k,v in layers.items() if k in ("shirt","outer","arm_near","arm_far")}
            weld_arm_rgba_layers(rendered)
            for k in ("arm_near","arm_far"):
                if k in rendered:layers[k]=Image.fromarray(rendered[k],"RGBA")
            result=Image.new("RGBA",FRAME)
            for key in ("hair_back","body","arm_far","shoes","pants","shoes_over",
                        "rips","shirt","arm_near","body_front","face","hair_front","brows"):
                if key in layers:result.alpha_composite(layers[key].convert("RGBA"))
            # A bald, skin-toned body still needs a pixel-art silhouette
            # around its arms, torso, separated legs, and feet.
            result=outline_human_body(result,tuple(pal.get("K7",(105,75,63))))
            result=shade_human_anatomy(result,gender,direction,shirt_top,pants_top,
                tuple(pal.get("Ke",(170,115,87))),tuple(pal.get("Ki",(223,181,147))))
            # Body remains a non-explicit adult mannequin for outfit fitting.
            assert result.size==FRAME
            return result
        def make_sheet(kind,count,expression="neutral",blink=False):
            img=Image.new("RGBA",(count*64,4*112))
            for y,d in enumerate(DIRECTIONS):
                for x in range(count):
                    pose=frame(d,kind,x,expression)
                    if blink and d in ("se","sw") and expression!="sleepy" and x==(3 if kind=="walk" else 2):
                        # Same-pose sleepy eyelids, so the blink follows the
                        # breathing/walking head without replacing the mouth.
                        eyes=(22,35,44,49)
                        closed=frame(d,kind,x,"sleepy")
                        pose.paste(closed.crop(eyes),eyes[:2])
                    img.alpha_composite(pose,(x*64,y*112))
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
            make_sheet("idle",4,expr,blink=True).save(media/fn,optimize=True)
            portrait=f"{name}-expression-{expr}-portrait.png"
            frame("se","idle",0,expr).crop((17,30,49,59)).resize((160,145),Image.Resampling.NEAREST).save(media/portrait)
            # Full 4-direction facial sprites are regenerated for each
            # walking frame, so eyes, brows and mouth follow the moving head.
            # Matching idle/walk source poses also keep male/female body shapes.
            walk_face=f"{name}-expression-{expr}-walk.png"
            make_sheet("walk",MOTIONS["walk"],expr,blink=True).save(media/walk_face,optimize=True)
            expressions.append({"id":expr,"label":expr.upper(),"sheet":"media/"+fn,
                "portrait":"media/"+portrait,"frames":4,"frame_ms":[270]*4,"loop":True,
                "motion_sheets":{"idle":"media/"+fn,"walk":"media/"+walk_face}})
        results.append({"id":f"human_{gender}_base","name":"Human / "+gender.title()+" Base",
            "type":"npc","template":True,"template_category":"human","gender":gender,
            "description":"Distinct adult bald "+gender.title()+" skin-toned mannequin with non-explicit morphology guides; modular shirt, pants and shoes.",
            "outfit":"unclothed / modular","hairstyle":"bald",
            "sheet":f"media/{name}-sheet.png","walk":f"media/{name}-walk.gif",
            "poster":f"media/{name}-poster.png","thumbnail":f"media/{name}-thumb.png",
            "folder_url":"https://github.com/lafrich/virtual-life-asset-pipeline/tree/main/chars-iso/v6b",
            "source_url":"https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/assets/npc_preview_v2/base6.py",
            "timestamp":0,"walk_frames":6,"idle_frames":4,"row_starts":{"walk":0,"idle":4},
            "frame_size":"64 × 112","motions":motions,"expressions":expressions})
    return results
