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

def _face_anchor(layers:dict,direction:str):
    """Return facial coordinates on THIS rendered actor's posed head."""
    face=layers.get("face")
    if face is None or direction not in ("se","sw"):
        return None
    source=np.asarray(face.convert("RGBA"))
    ys,xs=np.nonzero(source[:62,:,3]>0)
    if len(ys):
        mouth_y=int(ys.max())
        mouth_x=int(round(float(np.median(xs[ys>=mouth_y-1]))))
    else:
        mouth_x,mouth_y=(28 if direction=="sw" else 35),50
    sign=-1 if direction=="sw" else 1
    return lambda x,y:(
        max(0,min(63,mouth_x+sign*(x-35))),
        max(0,min(111,mouth_y+y-50))
    )


def cheeky_face(layers:dict,direction:str,frame:int,palette:dict)->tuple[dict,dict]:
    """Compact playful wink, open eye, toothy grin and attached pink tongue.

    Only 1x facial pixels change. All features align to this actor's native
    mouth on SE/SW; skull, neck, beard, hair and body are strictly untouched.
    No horns or oversized fake mouth extending into the chin.
    """
    layers=dict(layers)
    parts={part:Image.new("RGBA",FRAME) for part in PARTS}
    xy=_face_anchor(layers,direction)
    if xy is None:return layers,parts
    phase=frame%4
    dark=(*tuple(palette.get("0",(48,35,27))),255)
    edge=(*tuple(palette.get("K7",(113,76,66))),255)
    nose=(*tuple(palette.get("Ke",(174,122,96))),255)
    white=(248,246,240,255)
    blush=(225,128,140,178)
    tongue=(224,119,142,255)
    tongue_shadow=(176,71,104,255)

    eyes=ImageDraw.Draw(parts["eyes"],"RGBA")
    # Playful asymmetric brows, BOTH eyes open but compact inside the skull.
    brows_bob=(0,-1,-1,0)[phase]
    eyes.line([xy(28,41+brows_bob),xy(30,40+brows_bob),
               xy(32,40+brows_bob)],fill=edge,width=1)
    eyes.line([xy(38,40+brows_bob),xy(40,39+brows_bob),
               xy(42,41+brows_bob)],fill=edge,width=1)
    eyes.polygon([xy(29,44),xy(30,43),xy(32,43),xy(33,45),
                  xy(32,47),xy(30,47),xy(29,46)],fill=white)
    eyes.polygon([xy(38,44),xy(39,43),xy(41,43),xy(42,45),
                  xy(41,47),xy(39,47),xy(38,46)],fill=white)
    gaze=(0,1,0,-1)[phase]
    eyes.line([xy(31+gaze,45),xy(31+gaze,46)],fill=dark,width=1)
    eyes.line([xy(40+gaze,45),xy(40+gaze,46)],fill=dark,width=1)

    cheeks=ImageDraw.Draw(parts["blush"],"RGBA")
    for x in (28,42):
        cheeks.point(xy(x,47),fill=blush)
        cheeks.point(xy(x+(-1 if x==42 else 1),48),fill=blush)

    mouth=ImageDraw.Draw(parts["mouth"],"RGBA")
    # Face-width grin. All four animation phases retain attached tongue.
    mouth.polygon([xy(31,50),xy(33,49),xy(37,49),xy(40,50),
                   xy(39,52),xy(37,53),xy(34,53),xy(32,52)],fill=dark)
    mouth.line([xy(32,50),xy(39,50)],fill=white,width=1)
    tongue_end=(55,57,58,56)[phase]
    p0,p1=xy(35,52),xy(37,tongue_end)
    mouth.rectangle((min(p0[0],p1[0]),min(p0[1],p1[1]),
                     max(p0[0],p1[0]),max(p0[1],p1[1])),fill=tongue)
    mouth.line([xy(36,53),xy(36,tongue_end)],fill=tongue_shadow,width=1)
    mouth.point(xy(36,48),fill=nose)
    layers["brows"]=Image.new("RGBA",FRAME)
    combined=Image.new("RGBA",FRAME)
    for part in ("blush","eyes","mouth"):combined.alpha_composite(parts[part])
    layers["face"]=combined
    return layers,parts


def grimace_blush_face(layers:dict,direction:str,frame:int,palette:dict)->tuple[dict,dict]:
    """Small asymmetric clenched teeth, squinted eyes and visible pink cheeks.

    Neutral face features are replaced ONLY on the native facial anchor;
    never redraw the jaw, neck, nape or silhouette.
    """
    layers=dict(layers)
    parts={part:Image.new("RGBA",FRAME) for part in PARTS}
    xy=_face_anchor(layers,direction)
    if xy is None:return layers,parts
    phase=frame%4
    edge=(*tuple(palette.get("K7",(113,76,66))),255)
    dark=(*tuple(palette.get("0",(48,35,27))),255)
    white=(248,246,240,255)
    pink=(224,119,142,255)
    shade=(202,101,128,230)
    nose=(*tuple(palette.get("Ke",(174,122,96))),255)

    eyes=ImageDraw.Draw(parts["eyes"],"RGBA")
    tremble=(0,-1,0,1)[phase]
    eyes.line([xy(28,40+tremble),xy(30,39+tremble),
               xy(32,41+tremble)],fill=edge,width=1)
    eyes.line([xy(38,41+tremble),xy(40,39+tremble),
               xy(42,40+tremble)],fill=edge,width=1)
    eyes.line([xy(29,44),xy(31,45),xy(33,44)],fill=dark,width=1)
    eyes.line([xy(38,44),xy(40,45),xy(42,44)],fill=dark,width=1)

    blush=ImageDraw.Draw(parts["blush"],"RGBA")
    for center in (28,42):
        blush.point(xy(center,47),fill=shade)
        blush.line([xy(center-1,48),xy(center+1,48)],fill=pink,width=1)
        if phase in (1,2):blush.point(xy(center,49),fill=shade)

    mouth=ImageDraw.Draw(parts["mouth"],"RGBA")
    wobble=(0,0,1,0)[phase]
    p0,p1=xy(31,49+wobble),xy(40,53+wobble)
    mouth.rounded_rectangle((min(p0[0],p1[0]),min(p0[1],p1[1]),
                             max(p0[0],p1[0]),max(p0[1],p1[1])),
                            radius=1,fill=dark)
    p0,p1=xy(32,50+wobble),xy(39,51+wobble)
    mouth.rectangle((min(p0[0],p1[0]),min(p0[1],p1[1]),
                     max(p0[0],p1[0]),max(p0[1],p1[1])),fill=white)
    for tx in (35,38):
        mouth.point(xy(tx,51+wobble),fill=edge)
    mouth.point(xy(36,48),fill=nose)
    layers["brows"]=Image.new("RGBA",FRAME)
    combined=Image.new("RGBA",FRAME)
    for part in ("blush","eyes","mouth"):combined.alpha_composite(parts[part])
    layers["face"]=combined
    return layers,parts

