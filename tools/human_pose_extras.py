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
    shadow=tuple(palette.get("Kh",(202,155,124)))
    dark=tuple(palette.get("K7",(113,76,66)))

    # The pre-rendered native facial marks are replaced in-place. Keep
    # the head/body/skin palette and their pivot completely untouched.
    layers["brows"]=Image.new("RGBA",FRAME)
    cheeks=ImageDraw.Draw(parts["blush"],"RGBA")
    for left,right in ((28,31),(39,42)):
        a,b=sorted((x(left),x(right)))
        cheeks.ellipse((a,y(47),b,y(49)),fill=(231,100,123,150))

    eyes=ImageDraw.Draw(parts["eyes"],"RGBA")
    # Match the actual native eyes: near eye spans x29..33, far x38..40.
    for eye_x,half in ((31,2),(39,1)):
        a,b=sorted((x(eye_x-half),x(eye_x+half)))
        eyes.line((a,y(44),b,y(44)),fill=(*dark,255),width=2)
        eyes.point((x(eye_x),y(46)),fill=(*shadow,255))

    mouth=ImageDraw.Draw(parts["mouth"],"RGBA")
    # Original V6B neutral mouth spans x34..36 at y50. Keep the
    # tongue attached, extending at most 4px below that landmark.
    wag=(-1,0,1,0)[frame%4]
    a,b=sorted((x(33),x(37)))
    mouth.rounded_rectangle((a,y(49),b,y(52)),radius=1,
                            fill=(*dark,255))
    a,b=sorted((x(34+wag),x(36+wag)))
    tip=54 if frame%4 in (1,2) else 53
    mouth.rounded_rectangle((a,y(51),b,y(tip)),radius=1,
                            fill=(232,105,139,255))
    mouth.line((x(35+wag),y(52),x(35+wag),y(tip)),
               fill=(181,68,104,255),width=1)
    # The base face was cleared above: restore its discreet nose marker.
    mouth.point((x(36),y(48)),fill=(*shadow,255))

    updated=Image.new("RGBA",FRAME)
    for part in ("blush","eyes","mouth"):
        updated.alpha_composite(parts[part])
    layers["face"]=updated
    return layers,parts
