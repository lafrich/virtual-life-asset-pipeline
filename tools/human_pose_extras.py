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
    """Animated Mischievous / Tongue-Out facial sprite, on original V6B head.

    Reference signature: high curved brows, two BIG open white eyes with
    wandering brown pupils, wide laughing smile with visible upper teeth,
    and ONE attached pink tongue protruding below the smile. No horns.
    Precisely mirror on SW and shift with the character's own mouth.
    No borrowed body pose, new head shape, face swap or clothing changes.
    Native 64x112 / pivot (32,100).
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
    mirror=-1 if direction=="sw" else 1
    def xy(u,v):
        return (max(0,min(63,x0+mirror*(u-35))),
                max(0,min(111,y0+v-50)))
    def poly(paint,points,color):
        paint.polygon([xy(*p) for p in points],fill=color)
    phase=frame%4
    dark=(*tuple(palette.get("0",(48,35,27))),255)
    edge=(*tuple(palette.get("K7",(113,76,66))),255)
    white=(248,246,240,255)
    tongue_pink=(224,119,142,255)
    tongue_dark=(179,79,109,255)

    # Both brows curve high above the eye whites, not crossing the eyelids.
    eyes=ImageDraw.Draw(parts["eyes"],"RGBA")
    bob=(0,0,-1,0)[phase]
    eyes.line([xy(27,40+bob),xy(29,38+bob),xy(31,38+bob),xy(33,39+bob)],
              fill=edge,width=2)
    eyes.line([xy(37,39+bob),xy(39,38+bob),xy(41,38+bob),xy(43,40+bob)],
              fill=edge,width=2)

    # Enlarged pixel-round eyeballs and pupils move together, never shut.
    # Distinct se/sw data is mirrored about the ACTUAL base mouth location.
    gaze=(-1,-1,1,0)[phase]
    poly(eyes,[(28,44),(29,42),(32,42),(34,44),(34,46),
               (32,48),(29,47),(28,46)],white)
    poly(eyes,[(37,44),(38,42),(41,42),(43,44),(43,46),
               (41,48),(38,47),(37,46)],white)
    for center in (31,40):
        px=center+gaze
        eyes.rectangle((xy(px,44)[0],xy(px,44)[1],
                        xy(px,46)[0],xy(px,46)[1]),fill=dark)
        # A single highlight differentiates bright eyes from hollow sockets.
        eyes.point(xy(px-1,44),fill=white)

    # The laugh is one continuous open cavity, upper teeth remain WHITE.
    # Keep it below the eyes and attached to the actual actor's jaw.
    mouth=ImageDraw.Draw(parts["mouth"],"RGBA")
    poly(mouth,[(27,49),(29,49),(33,50),(37,50),(41,49),
                (44,48),(43,52),(41,54),(38,55),(32,55),
                (29,53),(28,51)],dark)
    poly(mouth,[(29,49),(33,50),(38,50),(42,49),
                (40,51),(33,51),(30,50)],white)
    # Four motion phases ALL keep a tongue attached to the mouth.
    # Tip projects BELOW the jaw like the reference, not floating on cheek.
    length=(2,4,6,3)[phase]
    poly(mouth,[(34,52),(38,52),(38,52+length),
                (37,53+length),(35,53+length),(34,52+length)],tongue_pink)
    mouth.line([xy(36,53),xy(36,52+length)],fill=tongue_dark,width=1)
    mouth.point(xy(36,53+length),fill=tongue_dark)

    layers["brows"]=Image.new("RGBA",FRAME)
    overlay=Image.new("RGBA",FRAME)
    for kind in ("eyes","mouth"):
        overlay.alpha_composite(parts[kind])
    layers["face"]=overlay
    return layers,parts


def grimace_blush_face(layers:dict,direction:str,frame:int,palette:dict)->tuple[dict,dict]:
    """Blushing overwhelmed emoji, fitted to the ORIGINAL 64x112 V6B face.

    Near eye x29..33, far eye x38..40. Native eyebrows and eyelids stay
    within the skull; same-actor mouth anchoring tracks SE/SW + head bob.
    Two curved shut eyes, inner-raised sad brows, asymmetrical white clenched
    teeth and pink cheeks. No horns, fake beard or added body elements.
    """
    layers=dict(layers)
    parts={part:Image.new("RGBA",FRAME) for part in PARTS}
    if direction not in ("se","sw") or layers.get("face") is None:
        return layers,parts
    source=np.asarray(layers["face"].convert("RGBA"))
    yy,xx=np.nonzero(source[:62,:,3]>0)
    if len(yy):
        mouth_y=int(yy.max())
        mouth_x=int(round(float(np.median(xx[yy>=mouth_y-1]))))
    else:
        mouth_x,mouth_y=(28 if direction=="sw" else 35),50
    sign=-1 if direction=="sw" else 1
    def point(u,v):
        return max(0,min(63,mouth_x+sign*(u-35))),max(0,min(111,mouth_y+v-50))
    def polygon(paint,coordinates,color):
        paint.polygon([point(x,y) for x,y in coordinates],fill=color)
    phase=frame%4
    edge=(*tuple(palette.get("K7",(113,76,66))),255)
    dark=(*tuple(palette.get("0",(48,35,27))),255)
    ivory=(248,246,240,255)
    pink=(224,119,142,255)
    pink_shadow=(213,118,122,255)

    eyes=ImageDraw.Draw(parts["eyes"],"RGBA")
    quiver=(0,-1,0,1)[phase]
    eyes.line([point(x,y+quiver) for x,y in ((28,41),(29,39),(31,37),(33,37))],
              fill=edge,width=1)
    eyes.line([point(x,y+quiver) for x,y in ((37,37),(39,37),(41,39),(42,41))],
              fill=edge,width=1)
    blink=(0,0,0,1)[phase]
    polygon(eyes,[(27,44+blink),(29,44+blink),(31,43+blink),
                  (33,42+blink),(33,44+blink),(31,46+blink),
                  (28,46+blink),(27,45+blink)],dark)
    polygon(eyes,[(37,42+blink),(39,43+blink),(41,44+blink),
                  (43,44+blink),(43,45+blink),(41,46+blink),
                  (39,46+blink),(37,44+blink)],dark)

    blush=ImageDraw.Draw(parts["blush"],"RGBA")
    for x in (26,41):
        blush.point(point(x+1,47),fill=pink_shadow)
        blush.point(point(x,48),fill=pink_shadow)
        blush.point(point(x+1,48),fill=pink)
        blush.point(point(x+2,48),fill=pink_shadow)
        if phase in (1,2):
            blush.point(point(x+1,49),fill=pink)

    # One prominent white teeth band to the left; tiny dark open corner on
    # the right, just like the reference. Lower jaw stays INSIDE the head.
    mouth=ImageDraw.Draw(parts["mouth"],"RGBA")
    wobble=(0,0,1,0)[phase]
    polygon(mouth,[(29,51+wobble),(31,49+wobble),
                   (35,48+wobble),(39,48+wobble),
                   (43,50+wobble),(43,52+wobble),
                   (41,54+wobble),(39,53+wobble),
                   (37,52+wobble),(32,52+wobble)],edge)
    polygon(mouth,[(38,50+wobble),(42,50+wobble),
                   (42,52+wobble),(41,53+wobble),
                   (39,52+wobble)],dark)
    polygon(mouth,[(31,50+wobble),(34,49+wobble),
                   (38,49+wobble),(41,50+wobble),
                   (41,51+wobble),(38,51+wobble),
                   (32,51+wobble)],ivory)
    mouth.line([point(33,52+wobble),point(32,54+wobble)],fill=edge,width=1)
    mouth.point(point(36,53+wobble),fill=edge)

    layers["brows"]=Image.new("RGBA",FRAME)
    combined=Image.new("RGBA",FRAME)
    for part in ("blush","eyes","mouth"):
        combined.alpha_composite(parts[part])
    layers["face"]=combined
    return layers,parts
