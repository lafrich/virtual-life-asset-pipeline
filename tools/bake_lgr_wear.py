"""One-time bake: V6P garment/hair/face-accessory atlases -> LGR-1 wear strips
(no runtime V6P). Each output is 256x112 = SE|SW|NE|NW idle frame 0, colours
still KEY colours (lgr-wear.js maps them to the chosen palette).

Tops, pants and shoes were drawn for the old V6B Genesis body, so they get the
approved outfit-refit warp (per-row edge retarget onto the official LGR-1 base
silhouette; geometric only, key colours survive). Hair, facial hair and glasses
are head-bound and copied unchanged. Old body silhouette: tools/data/v6b-silhouette.json.
Run from the repo root after the base or a garment changes:
    python3 tools/bake_lgr_wear.py
"""
import base64, hashlib, io, json, pathlib
from PIL import Image
SRC=pathlib.Path("site/media/v6p"); OUT=pathlib.Path("site/media/lgr1/mh-wear")
IDLE_ROW=4; FW,FH=64,112; N=FW*FH
DIRS=["se","sw","ne","nw"]
WARPED=("top","pants","shoes")

def dec(url):
    return bytearray(Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1]))).convert("RGBA").tobytes())


def union(rig, d):
    a = bytearray(N)
    for dd in rig["layers"].values():
        if dd.get(d):
            r = dec(dd[d])
            for k in range(N):
                if r[k * 4 + 3]:
                    a[k] = 1
    return a


def runs(a,y):
    out=[];x=0
    while x<64:
        if a[y*64+x]:
            s=x
            while x<64 and a[y*64+x]:x+=1
            out.append((s,x-1))
        else:x+=1
    return out
def match(old,new):
    m=[]
    for o in old:
        best=None;bo=0
        for n in new:
            ov=min(o[1],n[1])-max(o[0],n[0])+1
            if ov>bo:bo=ov;best=n
        if best:m.append((o,best))
    return m
def warp(raw,aold,anew):
    """Per-row edge retarget: garment pixels hugging a body run edge follow
    that edge to the new silhouette; widened edges are filled by repeating
    the garment's edge column; interior unchanged."""
    out=bytearray(raw);moved=0
    for y in range(112):
        pairs=[(o,n) for o,n in match(runs(aold,y),runs(anew,y)) if o!=n]
        if not pairs:continue
        row=[bytes(raw[(y*64+x)*4:(y*64+x)*4+4]) for x in range(64)]
        gx=[x for x in range(64) if row[x][3]]
        if not gx:continue
        allold=runs(aold,y)
        new=list(row)
        for (oL,oR),(nL,nR) in pairs:
            dl,dr=nL-oL,nR-oR
            mine=[x for x in gx if min(allold,key=lambda r:0 if r[0]<=x<=r[1] else min(abs(x-r[0]),abs(x-r[1])))==(oL,oR) and oL-3<=x<=oR+3]
            if not mine:continue
            for x in mine:new[x]=b'\0\0\0\0'
            place={}
            for x in mine:
                nx=x+dl if x<=oL+1 else x+dr if x>=oR-1 else x
                if 0<=nx<64:place[nx]=row[x]
            # fill widened gaps between edge band and interior
            if dl<0:
                for nx in range(oL+2+dl,oL+2):
                    if nx not in place and (oL+2) in place:place[nx]=place.get(nx+1,row[oL+2]) if row[oL+2][3] else None
            if dr>0:
                for nx in range(oR-1,oR-1+dr):
                    if nx not in place and row[oR-2][3]:place[nx]=row[oR-2]
            for nx,v in place.items():
                if v:new[nx]=v
            moved+=len(mine) if (dl or dr) else 0
        for x in range(64):out[(y*64+x)*4:(y*64+x)*4+4]=new[x]
    return out,moved



def main():
    sil=json.loads(pathlib.Path("tools/data/v6b-silhouette.json").read_text())["silhouette"]
    index_base=json.loads(pathlib.Path("site/media/lgr1/base/index.json").read_text())
    base={g:json.loads(pathlib.Path("site/media/lgr1/base/genesis-base-%s.json"%g).read_text())["rig"] for g in ("male","female")}
    AO={g:{d:bytearray(base64.b64decode(sil[g][d])) for d in DIRS} for g in base}
    AN={g:{d:union(base[g],d) for d in DIRS} for g in base}
    items=[];meta={}
    for cat in ("top","pants","shoes","hair","facial","glasses"):
        for p in sorted((SRC/cat).glob("*.png")):
            n=p.stem
            if n.startswith(("nude","custom")) or "_over" in n: continue
            im=Image.open(p).convert("RGBA")
            strip=Image.new("RGBA",(FW*4,FH));moved=0
            g="female" if n.endswith("_f") else "male"
            for di,d in enumerate(DIRS):
                cell=im.crop((0,(IDLE_ROW+di)*FH,FW,(IDLE_ROW+di+1)*FH))
                if cat in WARPED:
                    raw,m=warp(bytearray(cell.tobytes()),AO[g][d],AN[g][d]);moved+=m
                    cell=Image.frombytes("RGBA",(FW,FH),bytes(raw))
                strip.paste(cell,(di*FW,0))
            (OUT/cat).mkdir(parents=True,exist_ok=True)
            dst=OUT/cat/(n+".png");strip.save(dst,optimize=True)
            items.append(cat+"/"+n)
            meta[cat+"/"+n]={"sha256":hashlib.sha256(dst.read_bytes()).hexdigest(),"refit":cat in WARPED,"movedPx":moved}
    json.dump({"format":"lgr1-wear-index-v1","cell":[FW,FH],"dirs":DIRS,"frame":"idle 0","base":index_base["version"],
               "note":"Baked from the retired V6P atlases by tools/bake_lgr_wear.py; tops/pants/shoes refit to the official LGR-1 base; key colours, mapped by site/lgr-wear.js.",
               "items":items,"meta":meta},open(OUT/"index.json","w"),indent=1)
    print(len(items),"strips")


if __name__=="__main__":
    main()
