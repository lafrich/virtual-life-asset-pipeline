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
    """Make half-lidded eyes, a teasing open mouth, tongue and subtle blush.

    The face is drawn at 1 native pixel, on top of the *same actor* head.
    Modular part images are also returned for saving as selectable assets.
    Only front-facing SE/SW show expression; rear views do not get false eyes.
    """
    layers=dict(layers)
    parts={part:Image.new("RGBA",FRAME) for part in PARTS}
    if direction not in ("se","sw"):
        return layers,parts
    face=layers.get("face")
    if face is None:
        return layers,parts
    body=np.asarray(layers.get("body",Image.new("RGBA",FRAME)).convert("RGBA"))
    yy,xx=np.nonzero(body[:56,:,3]>0)
    # Native V6B eye position is around y=44 and head center x=32.
    top=int(yy.min()) if len(yy) else 32
    hx=int(round(float(np.median(xx[yy<min(top+25,55)])))) if len(yy) else 32
    dx=max(-5,min(5,hx-32))
    dy=max(-4,min(4,top-32))
    mirror=direction=="sw"
    x=lambda u: max(0,min(63,(63-u if mirror else u)+(-dx if mirror else dx)))
    y=lambda v: max(0,min(111,v+dy))
    skin=tuple(palette.get("Ki",(238,193,151)))
    shadow=tuple(palette.get("Kh",(202,155,124)))
    dark=tuple(palette.get("K7",(113,76,66)))
    # Wipe only the original expression pixels; retain head shape/outline.
    original=face.copy()
    mask=ImageDraw.Draw(original)
    for rect in ((24,42,42,48),(26,49,39,54)):
        x1,x2=sorted((x(rect[0]),x(rect[2])))
        mask.rectangle((x1,y(rect[1]),x2,y(rect[3])),fill=(*skin,255))
    # Previous brow art must not cover drooped eyelids.
    if "brows" in layers:
        brows=layers["brows"].convert("RGBA").copy()
        for xa in (25,35):
            xa1,xa2=sorted((x(xa),x(xa+7)))
            ImageDraw.Draw(brows).rectangle((xa1,y(41),xa2,y(48)),
                                              fill=(0,0,0,0))
        layers["brows"]=brows
    # Blush cheeks are translucent, so skin material still shows through.
    cheeks=ImageDraw.Draw(parts["blush"],"RGBA")
    for px in (24,40):
        xa1,xa2=sorted((x(px),x(px+3)))
        cheeks.ellipse((xa1,y(48),xa2,y(51)),fill=(231,100,123,150))
    # Both eyes half-lidded; one narrowed just a little for a mischievous grin.
    eyes=ImageDraw.Draw(parts["eyes"],"RGBA")
    for eye_x in (28,38):
        xa1,xa2=sorted((x(eye_x-2),x(eye_x+2)))
        eyes.line((xa1,y(44),xa2,y(44)),fill=(*dark,255),width=2)
        # Lower lid peeks from under upper drooping lid.
        eyes.point((x(eye_x),y(46)),fill=(*shadow,255))
    # A 4-frame tongue wag keeps tongue *inside* the mouth then extending.
    mouth=ImageDraw.Draw(parts["mouth"],"RGBA")
    wag=(-1,0,1,0)[frame%4]
    xa1,xa2=sorted((x(31),x(37)))
    mouth.rounded_rectangle((xa1,y(49),xa2,y(53)),radius=2,
                            fill=(*dark,255))
    tx1,tx2=sorted((x(32+wag),x(36+wag)))
    mouth.rounded_rectangle((tx1,y(52),tx2,y(57 if frame%4 in (1,2) else 55)),
                            radius=1,fill=(232,105,139,255))
    mouth.line((x(34+wag),y(53),x(34+wag),
                y(56 if frame%4 in (1,2) else 54)),
               fill=(181,68,104,255),width=1)
    for part in ("blush","eyes","mouth"):
        original.alpha_composite(parts[part])
    layers["face"]=original
    return layers,parts
