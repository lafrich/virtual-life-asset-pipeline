"""Turn legacy NPC frames and authored animations into browseable Paint catalog entries.

No character identities are invented. 64x112 RGBA frames come from original
Virtual Life generators. A source-only entry remains discoverable if its
generator did not produce usable frames.
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from PIL import Image
from build_legacy_face_previews import build_faces

DIRS = ("se","sw","ne","nw")
FRAME = (64,112)
ROWS = 44
COLS = 6

def find_frames(folder: Path, name: str) -> dict:
    """Collect both legacy filename orders, requiring all four directions."""
    grouped = {}
    for root in (folder/"frames",folder/"poses"):
        if not root.is_dir(): continue
        for file in root.glob("*.png"):
            stem = file.stem
            prefix = name+"_"
            if not stem.startswith(prefix): continue
            suffix = stem[len(prefix):]
            for direction in DIRS:
                # Supports family_{dir}_{anim}_fN and family_{anim}_{dir}_fN.
                m = (re.fullmatch(direction+r"_([a-z0-9_]+)_f([0-9]+)",suffix) or
                     re.fullmatch(r"([a-z0-9_]+)_"+direction+r"_f([0-9]+)",suffix))
                if not m: continue
                anim, index = m.group(1),int(m.group(2))
                if anim.endswith("_item") or anim.endswith("_kosong"): continue
                with Image.open(file) as im:
                    if im.size != FRAME or im.mode != "RGBA": continue
                grouped.setdefault(anim,{}).setdefault(direction,{})[index]=file
                break
    return {name:bydir for name,bydir in grouped.items()
            if all(d in bydir for d in DIRS) and
            all(sorted(bydir[d]) == list(range(len(bydir[d]))) for d in DIRS) and
            len({len(bydir[d]) for d in DIRS})==1 and
            1 < len(bydir["se"]) <= 40}


def sheet_from_frames(bydir: dict, frames: int) -> Image.Image:
    sheet=Image.new("RGBA",(64*frames,112*4))
    for di,direction in enumerate(DIRS):
        for f in range(frames):
            with Image.open(bydir[direction][f]) as src:
                sheet.paste(src,(f*64,di*112))
    return sheet


def blank_sheet() -> Image.Image:
    return Image.new("RGBA",(64*COLS,112*ROWS))


def name_motion(name: str) -> str:
    return name.replace("_"," ").upper()


def prepare_legacy_catalog(root: Path, media: Path, repo_url: str,
                           save_walk_preview, timestamp) -> list[dict]:
    roster = json.loads((root/"assets/character_stock/archive_roster.json").read_text())
    results=[]
    for entry in roster["characters"]:
        name=entry["id"]
        folder=root/entry["folder"]
        id_="legacy_"+name
        source=entry["source"]
        source_link=repo_url+"/blob/main/"+source
        preview_status="source_only"
        actions=[]
        expressions=[]
        sheet_url=""
        poster_url=""
        walk_url=""
        thumbnail=""
        row_starts={"walk":0,"idle":4}
        walk_count=0
        idle_count=0
        groups=find_frames(folder,name)
        source_sheet = folder/"npc"/"barista_famima_sheet.png" if name=="barista_famima" else None

        if source_sheet is not None and source_sheet.exists():
            data=json.loads((folder/"npc/manifest_npc.json").read_text())
            with Image.open(source_sheet) as source_image:
                if source_image.mode!="RGBA" or source_image.width!=384: raise ValueError("Invalid barista sheet")
                for animation,row in data["rows"].items():
                    spec=data["anims"].get(animation,{})
                    frame_count=int(spec.get("frames",4))
                    if frame_count<2 or frame_count>6:continue
                    if (row+4)*112>source_image.height: continue
                    bydir={}
                    for di,direction in enumerate(DIRS):
                        bydir[direction]={}
                        for f in range(frame_count):
                            extracted=media/f"{id_}_{direction}_{animation}_f{f}.png"
                            source_image.crop((64*f,112*(row+di),64*(f+1),112*(row+di+1))).save(extracted)
                            bydir[direction][f]=extracted
                    groups[animation]=bydir

        if groups:
            base=blank_sheet()
            for animation,row,slots in (("walk",0,6),("idle",4,4)):
                frames=groups.get(animation)
                if not frames: continue
                n=len(frames["se"])
                if n>slots: continue
                region=sheet_from_frames(frames,n)
                for di in range(4):
                    sliced_row=region.crop((0,di*112,n*64,(di+1)*112))
                    base.paste(sliced_row,(0,(row+di)*112))
                if animation=="walk":walk_count=n
                if animation=="idle":idle_count=n
            if walk_count==0:
                # Preview-only fallback: real selected action poses, never
                # label them as 'walk' or enable the WALK motion.
                default=groups.get("sit_sad") or groups.get("move") or next(iter(groups.values()))
                n=len(default["se"])
                for di,d in enumerate(DIRS):
                    for f in range(6):
                        with Image.open(default[d][f%n]) as im:
                            base.paste(im,(f*64,di*112))
            if idle_count==0:
                default=groups.get("sit_sad") or groups.get("idle") or next(iter(groups.values()))
                for di,d in enumerate(DIRS):
                    for f in range(4):
                        with Image.open(default[d][f%len(default[d])]) as im:
                            base.paste(im,(f*64,(4+di)*112))
            sheet_file=id_+"-sheet.png"
            base.save(media/sheet_file,optimize=True)
            sheet_url="media/"+sheet_file
            first=base.crop((0,4*112,64,5*112))
            thumbnail="media/"+id_+"-thumb.png"
            first.save(media/(id_+"-thumb.png"),optimize=True)
            preview_frames=walk_count or 6
            gif_file=media/(id_+"-walk.gif")
            poster_file=media/(id_+"-poster.png")
            save_walk_preview(media/sheet_file,gif_file,poster_file,0,preview_frames)
            walk_url="media/"+gif_file.name
            poster_url="media/"+poster_file.name
            preview_status="generated_preview"

            for anim,bydir in sorted(groups.items()):
                n=len(bydir["se"])
                if anim in ("walk","idle") and n<=6:
                    row=0 if anim=="walk" else 4
                    actions.append({
                        "id":anim,"name":name_motion(anim),"category":"basic","source":"native",
                        "row":row,"available":True,"frames":n,"frame_ms":[150 if anim=="walk" else 270]*n,
                        "loop":True,"reason":""
                    })
                else:
                    # Keep every authored action in its own genuine 4-way
                    # sheet. This is NOT a guessed Mixamo retarget.
                    motion_sheet=id_+"-action-"+anim+".png"
                    sheet_from_frames(bydir,n).save(media/motion_sheet,optimize=True)
                    actions.append({
                        "id":anim,"name":name_motion(anim),"category":"action",
                        "source":"custom","sheet":"media/"+motion_sheet,"row":0,
                        "available":True,"frames":n,"frame_ms":[210]*n,
                        "loop":anim in ("talk","move","offer","idle","sit","sit_type","wave_flag"),
                        "reason":""
                    })
        else:
            # Unavailable generators: visible source, no bogus
            # native/44-row sprites or motion buttons.
            m = re.search(r"npc_(\d+)",name)
            proto={"cosmo":1,"rocketta":2,"sol":3,"zib":4,"klank":5,"nebi":6}.get(name)
            maybe=folder/f"npc_{proto}_{name}.png" if proto else None
            if maybe and maybe.exists():
                with Image.open(maybe) as im:
                    if im.size==FRAME:
                        dest=media/(id_+"-still.png")
                        im.save(dest)
                        poster_url="media/"+dest.name
                        thumbnail=poster_url
                        preview_status="archive_still"

        if groups.get("idle") and name in ("gfunk", "theodore", "yerbies", "otis"):
            # These three already author five genuine expression variants.
            # Export same-actor 4-view idle loops, not overlays from another rig.
            expressions = build_faces(root, folder, name, media, groups["idle"])

        results.append({
            "id":id_,"name":entry["name"],"type":"npc",
            "origin":entry["folder"],"asset_status":preview_status,
            "description":entry["note"],"outfit":"","hairstyle":"",
            "sheet":sheet_url,"walk":walk_url,"poster":poster_url,
            "thumbnail":thumbnail,"folder_url":repo_url+"/tree/main/"+entry["folder"],
            "source_url":source_link,"timestamp":timestamp(root/source),
            "walk_frames":walk_count,"idle_frames":idle_count,
            "row_starts":row_starts,"frame_size":"64 × 112",
            "expressions":expressions,"motions":actions,
        })
        print("IMPORTED",name,preview_status,len(actions),"actions",len(expressions),"faces")
    return results
