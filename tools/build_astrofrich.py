"""Render full 4-direction ASTROFRICH modular base from Theodore's original
generator. Original Theodore remains unchanged; every pose and facial expression
uses his true authored animation frames with the helmet/backpack disabled.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image
import sys

DIRECTIONS=("se","sw","ne","nw")
MOTIONS={"walk":6,"idle":4,"sit":4,"sit_type":4,"sleep_seat":4,"nap_stand":4,"talk":4}
EXPRESSIONS=("neutral","happy","surprised","angry","sleepy")
FRAME=(64,112)

def build_astrofrich(root:Path,media:Path)->dict:
    src=str(root/"assets"/"npc_theodore")
    gen=str(root/"assets"/"npc_gfunk")
    for directory in (gen,src):
        if directory not in sys.path:sys.path.insert(0,directory)
    import make_theodore as theta
    def frame(direction:str,kind:str,index:int,expression:str="neutral"):
        result=theta.frame(direction,kind,index,expr=expression,modular=True).convert("RGBA")
        assert result.size==FRAME
        return result
    def sprite_sheet(kind:str,count:int,expression:str="neutral",blink:bool=False):
        canvas=Image.new("RGBA",(count*64,4*112))
        for row,direction in enumerate(DIRECTIONS):
            for col in range(count):
                pose=frame(direction,kind,col,expression)
                if blink and direction in ("se","sw") and expression!="sleepy" and col==(3 if kind=="walk" else 2):
                    eyes=(22,35,44,49)
                    closed=frame(direction,kind,col,"sleepy")
                    pose.paste(closed.crop(eyes),eyes[:2])
                canvas.alpha_composite(pose,(col*64,row*112))
        return canvas
    # V6B native layout: 6 columns by 44 rows, real walk rows 0..3 and
    # real idle rows 4..7. All other poses use their own genuine four-way sheets.
    master=Image.new("RGBA",(384,44*112))
    for kind,start in (("walk",0),("idle",4)):
        sheet=sprite_sheet(kind,MOTIONS[kind])
        for row in range(4):
            src=sheet.crop((0,row*112,MOTIONS[kind]*64,(row+1)*112))
            master.alpha_composite(src,(0,(start+row)*112))
    base_name="astrofrich-base"
    master.save(media/f"{base_name}-sheet.png",optimize=True)
    idle=frame("se","idle",0)
    idle.save(media/f"{base_name}-thumb.png",optimize=True)
    gif_frames=[frame("se","walk",i).resize((192,336),Image.Resampling.NEAREST).convert("RGBA") for i in range(6)]
    gif_frames[0].save(media/f"{base_name}-walk.gif",save_all=True,append_images=gif_frames[1:],duration=150,loop=0,disposal=2)
    idle.save(media/f"{base_name}-poster.png",optimize=True)
    motions=[]
    for kind,n in MOTIONS.items():
        if kind in ("walk","idle"):
            motions.append({"id":kind,"name":kind.replace("_"," ").upper(),"category":"basic",
                "source":"native","row":0 if kind=="walk" else 4,
                "available":True,"frames":n,"frame_ms":[150 if kind=="walk" else 270]*n,
                "loop":True,"reason":""})
        else:
            path=f"{base_name}-action-{kind}.png"
            sprite_sheet(kind,n).save(media/path,optimize=True)
            motions.append({"id":kind,"name":kind.replace("_"," ").upper(),"category":"action",
                "source":"custom","sheet":"media/"+path,"row":0,
                "available":True,"frames":n,"frame_ms":[210]*n,
                "loop":kind in ("talk","sit_type"),"reason":""})
    expressions=[]
    for expression in EXPRESSIONS:
        name=f"{base_name}-expression-{expression}.png"
        sprite_sheet("idle",4,expression,blink=True).save(media/name,optimize=True)
        portrait=f"{base_name}-expression-{expression}-portrait.png"
        frame("se","idle",0,expression).crop((17,30,49,59)).resize((160,145),Image.Resampling.NEAREST).save(media/portrait)
        # Re-render facial poses using the SAME Theodore-derived rig at every
        # walk frame. Never stamp a stationary idle face onto a moving head.
        walk_face=f"{base_name}-expression-{expression}-walk.png"
        sprite_sheet("walk",MOTIONS["walk"],expression,blink=True).save(media/walk_face,optimize=True)
        expressions.append({"id":expression,"label":expression.upper(),"sheet":"media/"+name,
            "portrait":"media/"+portrait,"frames":4,"frame_ms":[270]*4,"loop":True,
            "motion_sheets":{"idle":"media/"+name,"walk":"media/"+walk_face}})
    return {"id":"astrofrich_base","name":"Astrofrich / Bald Base",
        "template_category":"astrofrich","template":True,"type":"npc",
        "description":"Modular Theodore silhouette. Bald head, goggles, belt, chest emblem and marble porthole. No fixed helmet or backpack. All original authored poses and expressions.",
        "outfit":"astrofrich base","hairstyle":"bald / goggles",
        "sheet":f"media/{base_name}-sheet.png","walk":f"media/{base_name}-walk.gif",
        "poster":f"media/{base_name}-poster.png","thumbnail":f"media/{base_name}-thumb.png",
        "folder_url":"https://github.com/lafrich/virtual-life-asset-pipeline/tree/main/assets/npc_theodore",
        "source_url":"https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/assets/npc_theodore/make_theodore.py",
        "timestamp":0,"walk_frames":6,"idle_frames":4,"row_starts":{"walk":0,"idle":4},
        "frame_size":"64 × 112","motions":motions,"expressions":expressions}
