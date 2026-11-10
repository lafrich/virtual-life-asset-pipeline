#!/usr/bin/env python3
"""Publish pixel-exact owner-reviewed Semesta v6b buildings.

Decodes compact sprite data (all 12 directions are checksum protected)
without rasterizing, generating, resampling, mirroring or altering RGB art.
Produces approximate per-pixel depth (not an authored 3D mesh): meant for
Semesta editor placement; collision/pathfinding require in-game verification.
"""
from __future__ import annotations
import base64, hashlib, json, math, zlib
from pathlib import Path
from PIL import Image

ROOT=Path('assets/street_buildings')
SRC=ROOT/'custom_v6b/approved_sprites.json'
OUT=ROOT/'kampung'
CAT=ROOT/'indonesia_custom_catalog.json'
DETAILS={
 'id_gubuk_miskin': dict(label='Gubuk Miskin — rumah darurat pinggir gang',footprint=[3,2],note='Atap seng rusak, terpal biru dan dinding papan',material='wood and patched tin'),
 'id_warung_sembako': dict(label='Warung Sembako',footprint=[4,3],note='Etalase sembako, karung beras, LPG dan rentengan sachet',material='plaster and corrugated tin'),
 'id_rm_padang': dict(label='RM Padang — Trio Minang',footprint=[5,3],note='Etalase lauk bertingkat seperti referensi Trio Minang, panel biru Masakan Padang',material='wood, glass and corrugated metal'),
}
DIRECTIONS=('sw','se','ne','nw')
PACK='semesta-custom-v6b-20261110'
DEPTH_MIN,DEPTH_MAX=-24.0,80.0

def encoded_depth(src, sz, pivot, footprint):
    """Write RG 16-bit encoded depth using a coarse roof/wall model.

    This is not authored per-face 3D data. Geometry is approximated and
    correct occlusion near doors/adjacent buildings must be tested in-app.
    """
    import numpy as np
    h,w=sz[1],sz[0]
    arr=np.asarray(src,dtype=np.uint8)
    a=arr[:,:,3]
    yy,xx=np.indices((h,w),dtype=np.float32)
    # Ground-contact shadows don't form geometric surfaces.
    valid=(a==255)
    # Approximate roof at about 130px high; lower surfaces use a front-wall plane.
    roof_cut=float(pivot[1])-min(90.0,round(h*.27))
    is_roof=yy<roof_cut
    z=np.where(is_roof,130.0,np.clip(float(pivot[1])+15.0-yy,0.0,138.0))
    cr=np.where(is_roof,(yy-float(pivot[1])+z)/16.0,0.9375)
    # Align absolute depth with renderer's center-depth convention.
    cd=sum(footprint)/2.0
    d=np.clip(cd+cr+z/32.0,DEPTH_MIN+1e-4,DEPTH_MAX-1e-4)
    v=np.rint((d-DEPTH_MIN)/(DEPTH_MAX-DEPTH_MIN)*65535.0).astype(np.uint16)
    out=np.zeros((h,w,4),dtype=np.uint8)
    out[:,:,0]=np.where(valid,v>>8,0).astype(np.uint8)
    out[:,:,1]=np.where(valid,v&255,0).astype(np.uint8)
    out[:,:,2]=np.where(valid,255,0).astype(np.uint8)
    out[:,:,3]=255
    return Image.fromarray(out,'RGBA')

def main():
    import numpy as np
    doc=json.loads(SRC.read_text())
    assert doc['version']==1 and doc['encoding']=='palette-index-zlib-base85'
    colors=[tuple(int(x) for x in p) for p in doc['palette_rgba']]
    assert len(colors)<=256 and len(set(colors))==len(colors)
    raw=zlib.decompress(base64.b85decode(''.join(doc['payload_lines'])))
    assert len(doc['frames'])==12
    assert len({(f['id'],f['direction']) for f in doc['frames']})==12
    assert set(f['id'] for f in doc['frames'])==set(DETAILS)
    assert all(a in (0,56,255) for r,g,b,a in colors)
    assert all((r,g,b)==(0,0,0) for r,g,b,a in colors if a==56)
    offset=0
    variants={x:{} for x in DETAILS}
    OUT.mkdir(exist_ok=True,parents=True)
    for frame in doc['frames']:
        name=frame['id']; direction=frame['direction']
        assert direction in DIRECTIONS
        w,h=[int(x) for x in frame['size']]
        pivot=[int(x) for x in frame['pivot']]
        assert 0<=pivot[0]<w and 0<pivot[1]<=h
        idx=raw[offset:offset+w*h];offset+=w*h
        assert len(idx)==w*h and max(idx)<len(colors)
        pixels=b''.join(bytes(colors[i]) for i in idx)
        sha=hashlib.sha256(pixels).hexdigest()
        assert sha==frame['pixel_sha256'],(name,direction,'pixel hash changed')
        rgb=Image.frombytes('RGBA',(w,h),pixels)
        assert set(rgb.getchannel('A').getdata()).issubset({0,56,255})
        rel=f'kampung/{name}_{direction}.png'
        rgb.save(ROOT/rel,optimize=True)
        depth=encoded_depth(rgb,(w,h),pivot,DETAILS[name]['footprint'])
        depth.save(ROOT/f'kampung/{name}_{direction}__depth.png',optimize=True)
        assert (ROOT/rel).exists() and (ROOT/f'kampung/{name}_{direction}__depth.png').exists()
        variants[name][direction]={'file':rel,'size':[w,h],'pivot':pivot}
    assert len(raw)==offset
    assets=[]
    for name,det in DETAILS.items():
        views=variants[name]
        assert set(views)==set(DIRECTIONS)
        first=views['sw']
        assets.append({
          'id':name,'file':'pipeline:'+name,'label':det['label'],'group':'kampung',
          'source':'pipeline-street','country':'ID','pack':PACK,
          'note':det['note'],'category':'building','footprint':det['footprint'],
          'collision':True,'published':True,'variants':views,
          'size':first['size'],'pivot':first['pivot'],
          'width':round(first['size'][0]/50.0,2),
          'height':round(first['size'][1]/50.0,2),
        })
    cat={'version':1,'projection':'isometric-2:1','tile':[64,32],
         'palette':'v6b-known-colors','notes':'owner-approved art; generated depth is approximate, not physical 3D mesh',
         'assets':assets}
    CAT.write_text(json.dumps(cat,ensure_ascii=False,indent=2)+'\n')
    print(f'Published {len(assets)} buildings / {offset} source pixels / 12 RGB sprites / 12 approx-depth maps; checksums PASS')

if __name__=='__main__':
    main()
