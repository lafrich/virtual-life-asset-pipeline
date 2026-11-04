"""Pixel-native extra adult human poses and face emotion layers.

These edit only supplied 64x112 RGBA V6B layers, retain the 32,100 pivot,
and never borrow skin or facial features from another character.
"""
from __future__ import annotations
import numpy as np
from PIL import Image, ImageDraw

FRAME=(64,112)
PARTS=("eyes","mouth","blush")


def knee_chest_layers(layers:dict,direction:str,frame:int,palette:dict)->dict:
    """Draw elevated knees and hands embracing them over an actual seated rig.

    Preserve the original V6B head, neck, hip and feet. The new folded thighs
    rise toward the chest (instead of merely aliasing sit_type) and two
    independent forearms meet around the shin. A 4-frame breathing cycle
    moves the knees and wrists by just one native pixel.
    """
    layers=dict(layers)
    shirt=layers.get("shirt")
    if shirt is None:
        return layers
    mask=np.asarray(shirt.convert("RGBA"))[...,3]>0
    ys,xs=np.nonzero(mask)
    if len(xs)<25:
        return layers
    center=int(round(float(np.median(xs))))
    waist=int(np.quantile(ys,.84))
    center=max(23,min(41,center))
    waist=max(79,min(95,waist))
    bob=(0,1,0,-1)[frame%4]
    # The knee caps are now at the LOWER CHEST, not beside the face.
    knee_y=max(79,min(85,waist-3))+bob
    knee_spread=7 if direction in ("se","sw") else 6
    edge=tuple(palette.get("K7",(119,80,65)))
    mid=tuple(palette.get("Ke",(174,122,96)))
    lit=tuple(palette.get("Ki",(238,191,151)))
    fill=tuple(palette.get("Kh",(206,154,118)))
    # Remove the source SIT-TYPE leg extending out into the air. Author
    # two genuinely bent shins/feet wrapped below two raised knees instead.
    knee_layer=Image.new("RGBA",FRAME)
    knees=ImageDraw.Draw(knee_layer)
    for key in ("shoes","shoes_over","rips"):
        if key in layers:layers[key]=Image.new("RGBA",FRAME)
    front_side=1 if direction in ("se","ne") else -1
    for sign in (-1,1):
        x=center+sign*knee_spread
        y=knee_y+(1 if sign*front_side<0 else -1)
        pelvis=(center+sign*3,min(94,waist+7))
        ankle=(center+sign*9,99+(1 if sign*front_side<0 else 0))
        knees.line((pelvis[0],pelvis[1],x,y+4),fill=edge,width=7)
        knees.line((pelvis[0],pelvis[1],x,y+4),fill=mid,width=5)
        knees.line((x,y+3,ankle[0],ankle[1]-2),fill=edge,width=6)
        knees.line((x,y+3,ankle[0],ankle[1]-2),fill=mid,width=4)
        knees.ellipse((x-4,y-4,x+4,y+5),fill=edge)
        knees.ellipse((x-3,y-3,x+3,y+4),fill=fill)
        knees.line((x-2,y-2,x+1,y-2),fill=lit,width=2)
        knees.ellipse((ankle[0]-3,ankle[1]-2,
                       ankle[0]+3,ankle[1]+2),fill=edge)
        knees.line((ankle[0]-2,ankle[1]-1,
                    ankle[0]+2,ankle[1]-1),fill=mid,width=2)
    layers["pants"]=knee_layer
    # Folded forearms rest AROUND the knees, with wrists crossing near shins.
    # Their roots start at actual torso height, never up at the cheeks.
    shoulder_y=max(70,min(78,knee_y-8))
    for key,side in (("arm_far",-1),("arm_near",1)):
        start_x=center+side*11
        arm=Image.new("RGBA",FRAME)
        draw=ImageDraw.Draw(arm)
        elbow=(start_x+side,knee_y+8)
        wrist=(center+side*3,knee_y+8+(1 if frame%4==2 else 0))
        draw.line([(start_x,shoulder_y),elbow,wrist],fill=edge,width=5,
                  joint="curve")
        draw.line([(start_x,shoulder_y),elbow,wrist],fill=mid,width=3,
                  joint="curve")
        draw.ellipse((wrist[0]-2,wrist[1]-2,wrist[0]+1,wrist[1]+1),
                     fill=lit)
        layers[key]=arm
    return layers


def bleh_face(layers:dict,direction:str,frame:int,palette:dict)->tuple[dict,dict]:
    """Draw Bleh on the selected actor's REAL mouth/eye anchor.

    Native V6B face pixels are already posed and mirrored by base6.render.
    Locate their authored mouth before replacing the face layer; static
    coordinates drift on mirrored views and breathing/bobbing frames.
    """
    layers=dict(layers)
    parts={part:Image.new("RGBA",FRAME) for part in PARTS}
    if direction not in ("se","sw"):
        return layers,parts
    face=layers.get("face")
    if face is None:
        return layers,parts

    original_face=np.asarray(face.convert("RGBA"))
    yy,xx=np.nonzero(original_face[:62,:,3]>0)
    # Neutral V6B's lowest facial pixels are the mouth (row 50; row 49
    # on the bobbing idle frames). Read the source instead of guessing
    # from the head/torso silhouette, whose bounds change with animation.
    if len(yy):
        mouth_y=int(yy.max())
        mouth_band=xx[yy>=mouth_y-1]
        mouth_x=int(round(float(np.median(mouth_band))))
    else:
        mouth_x=28 if direction=="sw" else 35
        mouth_y=50
    sign=-1 if direction=="sw" else 1
    x=lambda u:max(0,min(63,mouth_x+sign*(u-35)))
    y=lambda v:max(0,min(111,mouth_y+(v-50)))
    lid=tuple(palette.get("K7",(168,112,78)))
    pupil=tuple(palette.get("0",(48,35,27)))
    nose=tuple(palette.get("Ke",(174,122,96)))

    # Restore only the native eye / nose / mouth marks. Oversized blush
    # previously reached the outer ear, and a 5x6 dark mouth read as a
    # goatee under the chin in 1x pixel art.
    layers["brows"]=Image.new("RGBA",FRAME)
    cheeks=ImageDraw.Draw(parts["blush"],"RGBA")
    for left,right in ((29,30),(39,40)):
        a,b=sorted((x(left),x(right)))
        cheeks.ellipse((a,y(47),b,y(48)),fill=(213,118,122,105))

    eyes=ImageDraw.Draw(parts["eyes"],"RGBA")
    # Retain visible dark pupils beneath the native half-lidded eyes;
    # solid 2px brown bars looked like missing eyes at native scale.
    for eye_x,half in ((31,2),(39,1)):
        a,b=sorted((x(eye_x-half),x(eye_x+half)))
        eyes.line((a,y(44),b,y(44)),fill=(*lid,255),width=1)
        a,b=sorted((x(eye_x-1),x(eye_x)))
        eyes.line((a,y(45),b,y(45)),fill=(*pupil,255),width=1)

    mouth=ImageDraw.Draw(parts["mouth"],"RGBA")
    # Centre on the actual neutral mouth x34..36/y50. The dark opening
    # is 3x3, with a short attached tongue; NEVER wag sideways off lip.
    a,b=sorted((x(34),x(36)))
    mouth.rounded_rectangle((a,y(49),b,y(51)),radius=1,
                            fill=(*pupil,255))
    tip=53 if frame%4 in (1,2) else 52
    a,b=sorted((x(34),x(36)))
    mouth.rounded_rectangle((a,y(51),b,y(tip)),radius=1,
                            fill=(224,119,142,255))
    mouth.point((x(35),y(tip)),fill=(179,79,109,255))
    # Original face layer was replaced, so restore its subtle nose.
    mouth.point((x(36),y(48)),fill=(*nose,255))

    updated=Image.new("RGBA",FRAME)
    for part in ("blush","eyes","mouth"):
        updated.alpha_composite(parts[part])
    layers["face"]=updated
    return layers,parts

def cheeky_face(layers:dict,direction:str,frame:int,palette:dict)->tuple[dict,dict]:
    """4-frame mischievous grin, animated eyes and tongue; NO HORNS.

    Renders the selected male/female rig's own face anchored to its real
    native mouth, including mirrored SW and bobbing frames. The skull,
    skin, outfit, hairstyle and 64x112 body pivot remain untouched.
    Face accent tones already used by V6B: ivory (248,246,240), pink
    (224,119,142), dark rose (179,79,109) and blush (213,118,122).
    """
    layers=dict(layers)
    parts={part:Image.new("RGBA",FRAME) for part in PARTS}
    if direction not in ("se","sw") or layers.get("face") is None:
        return layers,parts
    rgba=np.asarray(layers["face"].convert("RGBA"))
    yy,xx=np.nonzero(rgba[:62,:,3]>0)
    if len(yy):
        mouth_y=int(yy.max())
        mouth_x=int(round(float(np.median(xx[yy>=mouth_y-1]))))
    else:
        mouth_x,mouth_y=(28 if direction=="sw" else 35),50
    sign=-1 if direction=="sw" else 1
    def pos(u,v):
        return (max(0,min(63,mouth_x+sign*(u-35))),
                max(0,min(111,mouth_y+v-50)))
    def box(draw,x1,y1,x2,y2,fill):
        a,b=pos(x1,y1),pos(x2,y2)
        draw.rectangle((min(a[0],b[0]),min(a[1],b[1]),
                        max(a[0],b[0]),max(a[1],b[1])),fill=fill)
    phase=frame%4
    dark=(*tuple(palette.get("0",(48,35,27))),255)
    edge=(*tuple(palette.get("K7",(113,76,66))),255)
    ivory=(248,246,240,255)
    tongue=(224,119,142,255)
    shade=(179,79,109,255)
    # Eyes glance right, left, then squint as the tongue retracts.
    eyes=ImageDraw.Draw(parts["eyes"],"RGBA")
    gaze=(0,1,-1,0)[phase]
    for eye,tilt in ((30,0),(40,1)):
        eyes.line((pos(eye-2,42-tilt-(phase==2)),
                   pos(eye+1,43-tilt)),fill=edge,width=1)
        if phase==3:
            eyes.line((pos(eye-1,45),pos(eye+2,45)),fill=edge,width=1)
            eyes.point(pos(eye+1,46),fill=dark)
        else:
            box(eyes,eye-1,45,eye+1,47,ivory)
            eyes.point(pos(eye+gaze,46),fill=dark)
    blush=ImageDraw.Draw(parts["blush"],"RGBA")
    for cheek in (28,42):
        blush.point(pos(cheek,49),fill=(213,118,122,255))
    mouth=ImageDraw.Draw(parts["mouth"],"RGBA")
    # 12px-wide laughing mouth belongs INSIDE the native head.
    box(mouth,30,49,41,52,dark)
    mouth.line((pos(30,49),pos(32,48)),fill=edge,width=1)
    mouth.line((pos(39,48),pos(41,49)),fill=edge,width=1)
    box(mouth,32,49,39,49,ivory)
    length=(0,2,5,3)[phase]
    if length:
        box(mouth,34,51,37,51+length,tongue)
        mouth.point(pos(35,51+length),fill=shade)
        if length>=3:mouth.point(pos(35,52+length//2),fill=shade)
    else:
        box(mouth,33,51,38,51,edge)
    layers["brows"]=Image.new("RGBA",FRAME)
    face=Image.new("RGBA",FRAME)
    for name in ("blush","eyes","mouth"):
        face.alpha_composite(parts[name])
    layers["face"]=face
    return layers,parts

def grimace_blush_face(layers:dict,direction:str,frame:int,palette:dict)->tuple[dict,dict]:
    """Animated weary/awkward grimace with rosy cheeks, no horns or props.

    Four 64x112 frames for male and female V6B heads. The source mouth is
    located from the actor's native posed face so SW mirroring and idle
    bobbing remain attached. Two distressed brows, squeezed eyes, crooked
    visible teeth, asymmetrical mouth and conspicuous pink cheek blush.
    All color values reuse existing V6B blush/eye/skin colors.
    """
    layers=dict(layers)
    parts={part:Image.new("RGBA",FRAME) for part in PARTS}
    if direction not in ("se","sw") or layers.get("face") is None:
        return layers,parts
    source=np.asarray(layers["face"].convert("RGBA"))
    yy,xx=np.nonzero(source[:62,:,3]>0)
    if len(yy):
        y0=int(yy.max())
        x0=int(round(float(np.median(xx[yy>=y0-1]))))
    else:
        x0,y0=(28 if direction=="sw" else 35),50
    sign=-1 if direction=="sw" else 1
    def pos(u,v):
        return max(0,min(63,x0+sign*(u-35))),max(0,min(111,y0+v-50))
    def rect(paint,x1,y1,x2,y2,fill):
        a,b=pos(x1,y1),pos(x2,y2)
        paint.rectangle((min(a[0],b[0]),min(a[1],b[1]),
                         max(a[0],b[0]),max(a[1],b[1])),fill=fill)
    phase=frame%4
    dark=(*tuple(palette.get("0",(48,35,27))),255)
    line=(*tuple(palette.get("K7",(113,76,66))),255)
    ivory=(248,246,240,255)
    rose=(224,119,142,255)
    rose_shadow=(213,118,122,255)

    # Raised, worried inner brows and downward closed eyelids.
    # Quiver by one native pixel between phases rather than translating
    # any part of the head or altering hair/rig.
    eyes=ImageDraw.Draw(parts["eyes"],"RGBA")
    tremor=(0,-1,1,0)[phase]
    for coords in (
        ((26,40+tremor),(29,37+tremor),(32,40+tremor)),
        ((38,40+tremor),(41,37+tremor),(44,40+tremor)),
    ):
        eyes.line([pos(*p) for p in coords],fill=line,width=1)
    drop=(0,0,1,0)[phase]
    eyes.line([pos(27,44),pos(30,46+drop),pos(33,46+drop)],fill=dark,width=2)
    eyes.line([pos(37,46+drop),pos(40,46+drop),pos(43,44)],fill=dark,width=2)
    # Small under-eye crease, not a second open eye.
    eyes.point(pos(31,48+drop),fill=line)
    eyes.point(pos(39,48+drop),fill=line)

    # Strong blush on BOTH cheeks, brighter in the middle of the loop.
    cheeks=ImageDraw.Draw(parts["blush"],"RGBA")
    for x in (25,44):
        rect(cheeks,x,49,x+2,50,rose_shadow)
        rect(cheeks,x+1,49,x+2,50,rose)
        if phase in (1,2):
            cheeks.point(pos(x,51),fill=rose_shadow)
            cheeks.point(pos(x+1,51),fill=rose)

    # Lopsided, teeth-clenched mouth matching the reference.
    # A tiny right-hand gap plus two short tension creases and no tongue.
    mouth=ImageDraw.Draw(parts["mouth"],"RGBA")
    wobble=(0,1,0,-1)[phase]
    rect(mouth,29,50+wobble,43,52+wobble,dark)
    rect(mouth,31,50+wobble,39,51+wobble,ivory)
    rect(mouth,40,52+wobble,42,54+wobble,dark)
    mouth.line([pos(29,50+wobble),pos(33,49+wobble),
                pos(39,49+wobble),pos(43,51+wobble)],fill=line,width=1)
    # Fine clenched teeth divisions and asymmetric lip stress.
    for tooth in (34,37):
        mouth.point(pos(tooth,51+wobble),fill=line)
    mouth.line([pos(32,53+wobble),pos(31,55+wobble)],fill=line,width=1)
    mouth.point(pos(36,54+wobble),fill=line)
    if phase==2:
        mouth.point(pos(43,53+wobble),fill=rose_shadow)
    if phase==3:
        mouth.point(pos(30,52+wobble),fill=line)

    # Replace only the independently composed face marks: body, skin,
    # outfit, scalp, and 32,100 pivot remain the actor's own source.
    layers["brows"]=Image.new("RGBA",FRAME)
    combined=Image.new("RGBA",FRAME)
    for part in ("blush","eyes","mouth"):
        combined.alpha_composite(parts[part])
    layers["face"]=combined
    return layers,parts

