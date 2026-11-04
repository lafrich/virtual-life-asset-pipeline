"""Render distinct adult HUMAN Male/Female modular pixel anatomy.

Preserves 64×112 pivot, original four-way poses, face atlas and independent
outfit layers. Undressed front views use tiny, palette-matched genital pixel
details; no new silhouette or changes to clothed character layers.
"""
from __future__ import annotations
import sys
import json
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
# Both entry points are supported: python tools/build_character_catalog.py
# (tools/ on sys.path) and import tools.build_human_templates from repo root.
try:
    from tools.human_pose_extras import knee_chest_layers,bleh_face,cheeky_face,grimace_blush_face,PARTS as FACE_PARTS
except ModuleNotFoundError as exc:
    if exc.name!="tools":
        raise
    from human_pose_extras import knee_chest_layers,bleh_face,cheeky_face,grimace_blush_face,PARTS as FACE_PARTS

DIRECTIONS=("se","sw","ne","nw")
MOTIONS={"walk":6,"idle":4,"sit":4,"sit_type":4,"sleep_seat":4,"nap_stand":4,"talk":4,"lie":4,"bathe":4,"bathtub_bathe":6,"squat_idle":4,"squat_down":6,"squat_up":6,"knee_chest_idle":4,"bent_over_idle":4,"lie_idle":4}
EXPRESSION_CONTEXTS=json.loads((Path(__file__).resolve().parents[1]/
    "assets/animation_library/expression_contexts.json").read_text(encoding="utf-8"))
EXPRS=tuple(row["id"] for row in EXPRESSION_CONTEXTS["gallery"])

def contextual_expression(kind:str,index:int)->str:
    """Choose the frame-specific face from the canonical expression DB."""
    track=EXPRESSION_CONTEXTS["motions"].get(kind,["neutral"])
    return track[index%len(track)]

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
    """Keep the actual native V6B silhouette, rather than ballooning anatomy.

    Male/Female are *already* distinct in base6.render: body=m/f and the
    native female torso/hip taper happens before the posed arms are welded.
    The previous generic width extension added up to 4px on BOTH sides of
    the male shoulder and female hips, creating shoulders and buttocks that
    no other V6B character can have. No garment or native rig part should
    change its alpha footprint here.

    Preserve independent original body/arms/legs for all four directions,
    pose anchors, and clothing template fit.
    """
    if gender not in ("male","female"):
        raise ValueError("Unknown human template "+gender)
    return layers


def animate_rear_typing_hands(layers:dict,direction:str,index:int)->None:
    """Shift one pixel of each rear typing-hand gesture; shoulder stays fixed."""
    if direction not in ("ne","nw") or index%4 not in (1,3):
        return
    arm=layers.get("arm_near")
    if arm is None:return
    a=np.asarray(arm.convert("RGBA")).copy()
    yy,xx=np.nonzero(a[...,3]>0)
    if not len(xx):return
    hand_y=int(yy.max())
    cols=np.flatnonzero(a[hand_y,:,3]>0)
    if not len(cols):return
    dx=1 if index%4==1 else -1
    if int(cols.min())+dx<1 or int(cols.max())+dx>62:return
    original=a[hand_y,cols,:].copy()
    a[hand_y,cols,:]=0
    a[hand_y,cols+dx,:]=original
    layers["arm_near"]=Image.fromarray(a,"RGBA")


def animate_human_micro_motion(sprite:Image.Image,torso:Image.Image,
                               kind:str,index:int,
                               skin_shade:tuple[int,int,int],
                               skin_light:tuple[int,int,int])->Image.Image:
    """Pixel-native inhalation/exhalation on an original torso interior.

    Native sitting and sleepy animations were fully identical across frames.
    Shade a 2-4 px region on the moving shirt/torso mask, never translate
    feet or shoulder pivots, never touch the head or outside alpha.
    For lying, the torso mask is already transformed into the reclined pose.
    """
    if kind not in ("sit","sleep_seat","nap_stand","lie"):
        return sprite
    mask=np.asarray(torso.convert("RGBA"))[...,3]>0
    ys,xs=np.nonzero(mask)
    if len(xs)<15:return sprite
    # Select the middle, fully interior part of the posed torso.
    y=int(np.median(ys))
    candidates=np.flatnonzero(mask[y,:])
    if not len(candidates):return sprite
    cx=int(round(float(np.median(candidates))))
    img=np.asarray(sprite.convert("RGBA")).copy()
    phase=index%4
    # A complete breathing cycle: neutral, inhale, hold, exhale.
    detail=((0,0,1),(0,-1,0),(1,0,1),(-1,1,0))[phase]
    # Original shoulder, skin outline, and outside transparency are preserved.
    for k in range(3):
        px=cx+detail[0]+k-1
        py=y+detail[1]+(1 if k==2 and phase==2 else 0)
        if not (1<=px<63 and 54<=py<106):continue
        if not (mask[py,px] and mask[py-1,px] and mask[py+1,px]
                and mask[py,px-1] and mask[py,px+1]):continue
        if img[py,px,3]!=255:continue
        tint=skin_light if (phase in (1,2) and k!=2) else skin_shade
        img[py,px,:3]=tint
    return Image.fromarray(img,"RGBA")


POSTURE_KINDS=("squat_idle","squat_down","squat_up","knee_chest_idle","bent_over_idle")
POSTURE_FRAME_MS={
    "squat_idle":[280,320,300,320],
    "squat_down":[115,135,145,145,155,165],
    "squat_up":[165,155,145,145,135,115],
    "knee_chest_idle":[360,390,360,390],
    "bent_over_idle":[300,330,300,330],
    "lie_idle":[360,390,360,390],
}


def warp_posture_layers(layers:dict,kind:str,direction:str,frame:int)->dict:
    """Art-direct native poses through the same isometric 64x112 projection.

    Squatting keeps the authentic seated knees/feet and drops the whole upper
    body towards them. Bending shifts the skull and shoulders towards the
    facing direction, with feet and pelvis pinned to the original floor.
    Transform *all* original layers with a single inverse integer mapping;
    face, brows, arms, and torso cannot drift apart during an animation.
    """
    if kind not in POSTURE_KINDS:
        return layers
    phase=frame%4
    sway=((0,1,2,1)[phase] if kind in ("squat_idle","knee_chest_idle") else
          (0,1,0,-1)[phase] if kind=="bent_over_idle" else 0)
    source_knots=np.array([0,28,52,67,82,91,102,111],dtype=np.float32)
    if kind in ("squat_idle","squat_down","squat_up"):
        # Six authored transition heights between standing and a full squat.
        full=np.array([0,44+sway,65+sway,79+sway//2,89,96,102,111],
                      dtype=np.float32)
        progress=(frame/5 if kind=="squat_down" else
                  (5-frame)/5 if kind=="squat_up" else 1.0)
        target_knots=source_knots+(full-source_knots)*progress
    elif kind=="knee_chest_idle":
        # Original isometric seated rig, compacted to keep knees at the chest.
        target_knots=np.array([0,43+sway,66+sway,78+sway,89,95,102,111],
                              dtype=np.float32)
    else:
        # Forward hinge at waist; hip and feet remain planted.
        target_knots=np.array([0,52+sway,71+sway,82+sway,88,94,102,111],
                              dtype=np.float32)
    yy,xx=np.indices((FRAME[1],FRAME[0]))
    src_y=np.rint(np.interp(np.arange(FRAME[1]),
        target_knots,source_knots)).astype(np.int32)
    if kind=="bent_over_idle":
        forward=1 if direction in ("se","ne") else -1
        # Full bend on the skull, easing to zero displacement at the hip.
        lean=np.rint(12*np.clip((84-src_y)/34,0,1)).astype(np.int32)
        src_x=np.clip(xx-forward*lean[:,None],0,FRAME[0]-1)
    else:
        # Knees spread by 1px in a neutral squat; the pelvis stays centered.
        knee=np.rint(np.clip((yy-86)/12,0,1)).astype(np.int32)
        sideways=np.where(xx<32,-1,np.where(xx>32,1,0))
        src_x=np.clip(xx-sideways*knee,0,FRAME[0]-1)
    transformed={}
    for key,source in layers.items():
        source_array=np.asarray(source.convert("RGBA"))
        transformed[key]=Image.fromarray(
            source_array[src_y[:,None],src_x].copy(),"RGBA")
    return transformed


def shade_human_anatomy(sprite:Image.Image,gender:str,direction:str,
                        shirt_top:int,pants_top:int,
                        skin_shade:tuple[int,int,int],
                        skin_light:tuple[int,int,int],
                        pelvis_layer:Image.Image|None=None,
                        edge_tone:tuple[int,int,int]|None=None)->Image.Image:
    """Add restrained adult genital detail to the UNDRESSED Male/Female base.

    Only front-facing native SE/SW views receive anatomically distinct 1px
    marks (male shaft/scrotum; female labia/slit). Rear views stay clean.
    Derive their position from the *posed* trousers/pelvis layer so idle,
    walk, sit and wash do not use a fixed floating screen coordinate.

    No extra silhouette pixels, new palette colors, head edits, outfit edits
    or changes to the 64x112 pivot. A missing pelvis layer intentionally
    keeps this a no-op for callers without a known naked-body template.
    """
    if gender not in ("male","female") or direction not in DIRECTIONS:
        raise ValueError("Invalid anatomy guide")
    result=sprite.copy()
    if pelvis_layer is None or direction in ("ne","nw"):
        return result
    pixels=np.asarray(result.convert("RGBA")).copy()
    pelvis=np.asarray(pelvis_layer.convert("RGBA"))[...,3]>0
    # In native V6B, trousers begin at the waist; y+7 is the upper crotch,
    # still part of the shared pelvis before walking legs diverge.
    y=int(np.clip(int(pants_top)+7,0,FRAME[1]-1))
    y1=max(0,y-3)
    y2=min(FRAME[1],y+1)
    ys,xs=np.nonzero(pelvis[y1:y2])
    if len(xs)==0:
        return result
    cx=int(round(float(np.median(xs))))
    dark=tuple(edge_tone) if edge_tone is not None else tuple(skin_shade)
    mid=tuple(skin_shade)
    light=tuple(skin_light)
    # Tiny anatomical guide, intentionally subtle at 1x; not a costume,
    # freestanding object, tattoo, or paired artificial buttock shading.
    if gender=="male":
        marks=(
            (-1,-2,mid),(0,-2,light),        # shaft
            (-1,-1,dark),(0,-1,mid),
            (-1,0,dark),(0,0,light),
            (-2,1,dark),(-1,1,mid),(0,1,mid),(1,1,dark), # scrotum
            (-1,2,dark),(0,2,dark),
        )
    else:
        marks=(
            (-1,-2,light),(0,-2,mid),(1,-2,light),
            (-1,-1,mid),(0,-1,dark),(1,-1,mid),
            (-1,0,mid),(0,0,dark),(1,0,mid), # labial folds
            (0,1,mid),
        )
    for dx,dy,tone in marks:
        px,py=cx+dx,y+dy
        # Recolor only the actual posed upper pelvis. Never bridge a leg
        # gap, introduce floating marks or paint over transparent space.
        if 0<=px<FRAME[0] and 0<=py<FRAME[1] and pelvis[py,px] and pixels[py,px,3]==255:
            pixels[py,px,:3]=tone
    return Image.fromarray(pixels,"RGBA")

def build_human_templates(root:Path,media:Path)->list[dict]:
    for folder in (root/"assets/npc_preview_v2",root/"assets/npc_gfunk",root/"chars-iso/v6b/tools"):
        if str(folder) not in sys.path:sys.path.insert(0,str(folder))
    import base6
    import make_npcs_v2 as M
    # base6.render() already welds both arm sockets in the NATIVE V6B rig,
    # after female-specific body shaping. Do not bridge these pixels again:
    # a second weld creates shoulder stubs that no regular NPC has.
    palettes={
        "male":{"body":"m","skin":"light","hair":"short","hc":"black","top":"tee_long","tc":"paper","pants":"trousers","pc":"paper","shoes":"shoes","sc":"paper"},
        "female":{"body":"f","skin":"light","hair":"short","hc":"black","top":"tee_long","tc":"paper","pants":"trousers","pc":"paper","shoes":"shoes","sc":"paper"},
    }
    results=[]
    for gender,cfg in palettes.items():
        name=f"human-{gender}-base"
        def frame(direction:str,kind:str,index:int,expression:str|None=None,material_sink:dict|None=None,emotion_sink:dict|None=None):
            anim=("sleep" if kind=="sleep_seat" else
                  "tired" if kind=="nap_stand" else
                  "idle" if kind in ("bent_over_idle","bathe") or
                    (kind=="squat_down" and index==0) or
                    (kind=="squat_up" and index==5) else
                  "sit_type" if kind=="knee_chest_idle" else
                  "sit" if kind in ("squat_idle","squat_down","squat_up") else
                  "lie" if kind in ("lie_idle","bathtub_bathe") else kind)
            # Mirror directions are authored via native v6b, not generic canvas flip.
            # The modular base6 wrapper returns UPRIGHT layers even when its
            # anim=lie parameter is selected. Apply the SAME pixel-exact
            # native lie_flat transform used by the original V6B game.
            lying=kind in ("lie","lie_idle","bathtub_bathe")
            source_dir=("se" if direction in ("se","sw") else "ne") if lying else direction
            selected_expression=(expression if expression is not None
                                 else contextual_expression(kind,index))
            face_expression=("blink" if kind in ("lie","sleep_seat")
                             else "neutral" if selected_expression in ("bleh","cheeky","grimace_blush") else selected_expression)
            canvas,layers,pal=base6.render(cfg,f=index if kind=="walk" else index%4,d=source_dir,
                                           expr=face_expression,anim=anim)
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
            # The native m/f rig already supplies the shared silhouette;
            # do NOT widen shoulders or hips after posing.
            sculpt_human_layers(layers,gender)
            if selected_expression in ("bleh","cheeky","grimace_blush"):
                draw_face=(grimace_blush_face if selected_expression=="grimace_blush" else
                           cheeky_face if selected_expression=="cheeky" else bleh_face)
                layers,parts=draw_face(layers,source_dir,index,pal)
                if emotion_sink is not None:
                    emotion_sink.update(parts)
            # Adjust every authored skin/body/eye/arm layer around one
            # 4-way posture, before shading the dynamically located pelvis.
            layers=warp_posture_layers(layers,kind,direction,index)
            if kind=="knee_chest_idle":
                layers=knee_chest_layers(layers,direction,index,pal)
            shirt_mask=np.asarray(layers["shirt"].convert("RGBA"))[...,3]>0
            pant_mask=np.asarray(layers["pants"].convert("RGBA"))[...,3]>0
            shirt_rows=np.flatnonzero(np.any(shirt_mask,axis=1))
            pant_rows=np.flatnonzero(np.any(pant_mask,axis=1))
            shirt_top=int(shirt_rows[0]) if len(shirt_rows) else 55
            pants_top=int(pant_rows[0]) if len(pant_rows) else 76
            # No second arm weld: both shoulders already use the same
            # v6b socket and walking/sitting pivots as ordinary characters.
            # Skin conversion only changed RGB values; it did not change alpha.
            if lying:
                flattened=base6.lv.lie_preserve_head(
                    {k:v.convert("RGBA") for k,v in layers.items()},source_dir)
                mirror=direction in ("sw","nw")
                layers={k:(v.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if mirror else v)
                        for k,v in flattened.items()}
            if material_sink is not None:
                # Rig-accurate shirt/trouser stencils travel with the FULL
                # posed silhouette. No standing garment pasted on a squat/lie.
                for slot in ("shirt","pants"):
                    material_sink[slot]=layers.get(slot,Image.new("RGBA",FRAME)).copy()
            result=Image.new("RGBA",FRAME)
            if lying and "shadow" in layers:result.alpha_composite(layers["shadow"])
            for key in ("hair_back","body","arm_far","shoes","pants","shoes_over",
                        "rips","shirt","arm_near","body_front","face","hair_front","brows"):
                if key in layers:result.alpha_composite(layers[key].convert("RGBA"))
            if kind=="bathe":
                # Native four-frame shower/wash motion. The *near arm* is
                # redrawn around its own shoulder joint in four distinct
                # positions. All other layers retain the original identity,
                # skin palette and 64x112 anchors (no body rotation).
                arm=layers.get("arm_near")
                if arm is not None:
                    alpha=np.asarray(arm.convert("RGBA"))[...,3]
                    yy,xx=np.nonzero(alpha>0)
                    if len(xx):
                        shoulder_y=int(yy.min())
                        near=xx[yy<=shoulder_y+4]
                        shoulder_x=int(np.median(near)) if len(near) else int(np.median(xx))
                        # Remove only original straight arm layer from the
                        # composite and rebuild it at the same shoulder.
                        # Prefer regenerating composite from original layers
                        # to clearing arbitrary pixels from body artwork.
                        layers["arm_near"]=Image.new("RGBA",FRAME)
                        bend=(-1,-6,-12,-5)[index%4]
                        raise_up=(21,15,5,11)[index%4]
                        hand_x=shoulder_x+bend
                        hand_y=shoulder_y+raise_up
                        arm_layer=layers["arm_near"]
                        draw=ImageDraw.Draw(arm_layer)
                        outline=tuple(pal.get("K7",(113,74,61)))
                        skin_middle=tuple(pal.get("Ke",(170,115,87)))
                        skin_light=tuple(pal.get("Ki",(223,181,147)))
                        draw.line([(shoulder_x,shoulder_y),
                           (shoulder_x+(bend//2),shoulder_y+8),
                           (hand_x,hand_y)],fill=outline,width=5,joint="curve")
                        draw.line([(shoulder_x,shoulder_y),
                           (shoulder_x+(bend//2),shoulder_y+8),
                           (hand_x,hand_y)],fill=skin_middle,width=3,joint="curve")
                        draw.point((hand_x,hand_y),fill=skin_light)
                        result=Image.new("RGBA",FRAME)
                        for key in ("hair_back","body","arm_far","shoes","pants",
                           "shoes_over","rips","shirt","arm_near","body_front",
                           "face","hair_front","brows"):
                            if key in layers:result.alpha_composite(layers[key].convert("RGBA"))
            if kind in ("sit","sit_type") and direction in ("ne","nw"):
                # Original native rear view had four identical typing frames.
                animate_rear_typing_hands(layers,direction,index)
                result=Image.new("RGBA",FRAME)
                for key in ("hair_back","body","arm_far","shoes","pants",
                            "shoes_over","rips","shirt","arm_near",
                            "body_front","face","hair_front","brows"):
                    if key in layers:result.alpha_composite(layers[key].convert("RGBA"))
            # Native body geometry stays intact; outline only the exterior
            # pixels of the assembled native skin-toned mannequin.
            result=outline_human_body(result,tuple(pal.get("K7",(105,75,63))))
            if not lying:
                result=shade_human_anatomy(result,gender,direction,shirt_top,pants_top,
                    tuple(pal.get("Ke",(170,115,87))),tuple(pal.get("Ki",(223,181,147))),
                    pelvis_layer=layers.get("pants"),
                    edge_tone=tuple(pal.get("K7",(105,75,63))))
            elif kind=="lie":
                from PIL import Image as _Image
                zzz=_Image.fromarray(base6.lv.zzz_img(
                    "lie",index,source_dir,direction in ("sw","nw")),"RGBA")
                result.alpha_composite(zzz)
            if kind=="bathe":
                # Four original phase offsets; keep effect away from face.
                water=ImageDraw.Draw(result)
                phase=index%4
                for sx,sy in ((16+phase%2,45+phase*4),
                              (46-phase%2,34+phase*5),
                              (26+phase*3,69-phase*2)):
                    water.rectangle((sx,sy,sx+1,sy+3),fill=(155,218,234,180))
                for sx,sy in ((31+phase,64-phase*3),
                              (34-phase,70+phase)):
                    water.rectangle((sx,sy,sx+2,sy+1),fill=(229,249,252,200))
            if kind=="bathtub_bathe":
                # An AWAKE version of the genuine 4-way, horizontal native
                # LIE posture. No sleepy eyelids, no ZZZ, no upright limbs.
                # Render six actual distinct foam/ripple phases on the
                # unclothed gender-specific body, never over face/hair.
                foam=Image.new("RGBA",FRAME)
                paint=ImageDraw.Draw(foam)
                torso=np.asarray(layers["shirt"].convert("RGBA"))[...,3]>0
                legs=np.asarray(layers["pants"].convert("RGBA"))[...,3]>0
                body_mask=torso|legs
                ys,xs=np.nonzero(body_mask)
                if len(xs):
                    min_x,max_x=int(xs.min()),int(xs.max())
                    min_y,max_y=int(ys.min()),int(ys.max())
                    phase=index%6
                    # Opaque off-white foam covers lower torso, pelvis and
                    # legs for a non-explicit bathing sprite, with subtle
                    # independent 1px variations in each frame.
                    for j in range(11):
                        u=(j+.5)/11
                        px=min_x+int((max_x-min_x)*u)
                        py=min_y+int((max_y-min_y)*(.48+.10*((j+phase)%3)))
                        rad=2+(j+phase)%3
                        paint.ellipse((px-rad,py-rad//2,
                                       px+rad,py+rad//2+1),
                                      fill=(236,250,252,235),
                                      outline=(147,213,227,255))
                        paint.point((px-1,py-1),fill=(255,255,255,255))
                    for j in range(5):
                        px=min_x+int((max_x-min_x)*(j+.5)/5)
                        py=max_y-3-(j+phase)%3
                        paint.ellipse((px-2,py-1,px+2,py+2),
                                      fill=(218,244,250,215))
                    # The water line stays at/inside the tub's front rim;
                    # pixel-art foam is an overlay only, never a new rig.
                    if phase%2:
                        paint.point((max(0,min_x-2),min_y+7),
                                    fill=(172,222,236,210))
                result.alpha_composite(foam)
            result=animate_human_micro_motion(result,layers["shirt"],
                "lie" if kind=="lie_idle" else kind,index,
                tuple(pal.get("Ke",(170,115,87))),
                tuple(pal.get("Ki",(223,181,147))))
            assert result.size==FRAME
            return result
        def make_sheet(kind,count,expression=None,blink=False,sequence=None,
                       save_outfit_masks=False,save_face_parts=False):
            img=Image.new("RGBA",(count*64,4*112))
            stencils={slot:Image.new("RGBA",img.size) for slot in ("shirt","pants")} if save_outfit_masks else None
            emotion_parts={part:Image.new("RGBA",img.size) for part in FACE_PARTS} if save_face_parts else None
            for y,d in enumerate(DIRECTIONS):
                for x in range(count):
                    current_materials={} if save_outfit_masks else None
                    current_parts={} if save_face_parts else None
                    pose=frame(d,kind,x,
                        sequence[x%len(sequence)] if sequence else expression,
                        material_sink=current_materials,emotion_sink=current_parts)
                    if emotion_parts is not None:
                        for part,atlas in emotion_parts.items():
                            atlas.alpha_composite(current_parts.get(part,
                                Image.new("RGBA",FRAME)),(x*64,y*112))
                    if stencils is not None:
                        for slot in stencils:
                            stencils[slot].alpha_composite(
                                current_materials[slot],(x*64,y*112))
                    if blink and d in ("se","sw") and expression not in ("sleepy","blink","grimace_blush") and x==(3 if kind=="walk" else 2):
                        # Same-pose sleepy eyelids, so the blink follows the
                        # breathing/walking head without replacing the mouth.
                        eyes=(22,35,44,49)
                        closed=frame(d,kind,x,"blink")
                        pose.paste(closed.crop(eyes),eyes[:2])
                    img.alpha_composite(pose,(x*64,y*112))
            if stencils is not None:
                for slot,material in stencils.items():
                    material.save(media/f"{name}-outfit-{kind}-{slot}.png",
                                  optimize=True)
            if emotion_parts is not None:
                for part,atlas in emotion_parts.items():
                    atlas.save(media/f"{name}-face-bleh-{part}-{kind}.png",
                               optimize=True)
            return img
        sheet=Image.new("RGBA",(384,44*112))
        for kind,row in (("walk",0),("idle",4)):
            source=make_sheet(kind,MOTIONS[kind],save_outfit_masks=True)
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
        # Context-specific facial track for WC, separate from the 10 core motions.
        make_sheet("sit",4,sequence=EXPRESSION_CONTEXTS["gameplay"]["use_toilet"]).save(
            media/f"{name}-action-toilet.png",optimize=True)
        motions=[]
        for kind,count in MOTIONS.items():
            if kind in ("walk","idle"):
                motions.append({"id":kind,"name":kind.upper(),"category":"basic","source":"native",
                    "row":0 if kind=="walk" else 4,"available":True,"frames":count,
                    "frame_ms":[150 if kind=="walk" else 270]*count,"loop":True,
                    "outfit_masks":{slot:f"media/{name}-outfit-{kind}-{slot}.png"
                                    for slot in ("shirt","pants")},
                    "reason":""})
            else:
                fn=f"{name}-action-{kind}.png"
                make_sheet(kind,count,save_outfit_masks=True).save(media/fn,optimize=True)
                motions.append({"id":kind,"name":kind.replace("_"," ").upper(),
                    "category":"posture" if kind in POSTURE_FRAME_MS else "action",
                    "source":"custom","sheet":"media/"+fn,"row":0,"available":True,
                    "frames":count,"frame_ms":(POSTURE_FRAME_MS[kind] if kind in POSTURE_FRAME_MS else
                                [330,360,380,360] if kind=="bathe" else
                                [320,340,360,350,340,330] if kind=="bathtub_bathe" else [210]*count),
                    "loop":kind in ("sit","sleep_seat","nap_stand","talk","sit_type","lie",
                                    "bathe","bathtub_bathe","squat_idle","knee_chest_idle",
                                    "bent_over_idle","lie_idle"),
                    "posture":kind if kind in POSTURE_FRAME_MS else None,
                    "outfit_masks":{slot:f"media/{name}-outfit-{kind}-{slot}.png"
                                    for slot in ("shirt","pants")},
                    "reason":""})
        expressions=[]
        for expr in EXPRS:
            fn=f"{name}-expression-{expr}.png"
            make_sheet("idle",4,expr,blink=True,save_face_parts=expr=="bleh").save(media/fn,optimize=True)
            portrait=f"{name}-expression-{expr}-portrait.png"
            frame("se","idle",0,expr).crop((17,30,49,59)).resize((160,145),Image.Resampling.NEAREST).save(media/portrait)
            # Full 4-direction facial sprites are regenerated for each
            # walking frame, so eyes, brows and mouth follow the moving head.
            # Matching idle/walk source poses also keep male/female body shapes.
            walk_face=f"{name}-expression-{expr}-walk.png"
            make_sheet("walk",MOTIONS["walk"],expr,blink=True,save_face_parts=expr=="bleh").save(media/walk_face,optimize=True)
            entry={"id":expr,
                "label":next(r["label"] for r in EXPRESSION_CONTEXTS["gallery"] if r["id"]==expr),
                "sheet":"media/"+fn,
                "portrait":"media/"+portrait,"frames":4,"frame_ms":([240,180,180,320] if expr=="grimace_blush" else [190,200,260,220] if expr=="cheeky" else [270]*4),"loop":True,
                "motion_sheets":{"idle":"media/"+fn,"walk":"media/"+walk_face}}
            if expr=="bleh":
                entry["parts"]={part:{kind:f"media/{name}-face-bleh-{part}-{kind}.png"
                    for kind in ("idle","walk")} for part in FACE_PARTS}
            expressions.append(entry)
        results.append({"id":f"human_{gender}_base","name":"Human / "+gender.title()+" Base",
            "type":"npc","template":True,"template_category":"human","gender":gender,
            "bodyType":gender,"skinTone":"base",
            # This base is the immutable ORIGINAL SKIN + HEAD underneath the
            # same modular equipment stack used by every Mahluk Hidup human.
            # No shirt/pants/shoes/hair are baked into saved custom outfits.
            "modular":{"version":2,"rig":"native_v6b_humanoid","frame":[64,112],
                       "pivot":[32,100],"directions":list(DIRECTIONS),
                       "body_base":f"media/{name}-sheet.png",
                       "layers":["body","face","hair","shirt","pants","shoes"],
                       "equipment":["hair","shirt","pants","shoes"],
                       "skin_tones":["base","light","medium","tan","deep","dark"]},
            "description":"V6B 64×112 adult "+gender.title()+" base with native 4-way animations, distinct body shape and detachable hair, shirt, pants and shoes.",
            "outfit":"unclothed / modular","hairstyle":"bald",
            "sheet":f"media/{name}-sheet.png","walk":f"media/{name}-walk.gif",
            "poster":f"media/{name}-poster.png","thumbnail":f"media/{name}-thumb.png",
            "folder_url":"https://github.com/lafrich/virtual-life-asset-pipeline/tree/main/chars-iso/v6b",
            "source_url":"https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/assets/npc_preview_v2/base6.py",
            "timestamp":0,"walk_frames":6,"idle_frames":4,"row_starts":{"walk":0,"idle":4},
            "frame_size":"64 × 112",
             "expression_database":"expression-contexts.json",
             "motions":[{**m,
                 "expression_sequence":EXPRESSION_CONTEXTS["motions"][m["id"]],
                 "default_expression":EXPRESSION_CONTEXTS["motions"][m["id"]][0]}
                  for m in motions],
             "expressions":expressions})
    return results
