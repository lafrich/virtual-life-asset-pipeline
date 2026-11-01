import json, os, sys
sys.path.insert(0,os.path.dirname(__file__))
from species import TREES,SHRUBS,GROUND
from veg import render, R, ground_overlap
import tiles
OUT='assets/vegetation_kebonsirih'
man={'projection':'iso 2:1, 1 tile = 64x32 px, PPU 2 (1 game unit = 2 px), light from the left',
     'anchor_rule':'pivot = ground point under the trunk/plant centre. Game draw: <image x=P(c,r).x - pivot[0]/2, y=P(c,r).y - pivot[1]/2, width=w/2, height=h/2> (PPU 2), same rule as street_vehicles. Depth sort key = c+r of the pivot.',
     'tile_anchor_rule':'floor tiles 64x32, anchor (32,0) = top (north) corner of the diamond at P(c,r), same as environment/tiles/grass_a.png',
     'shadow':'v2: 2-level flat black shadow baked into the PNG: alpha 56 = canopy/body projection (union of per-clump ellipses, shifted right/away from the left light), alpha 90 = small ground-contact patch under the trunk/stem. Alpha values used: 0/56/90/255. Where the shadow falls on the opaque grass skirt it is painted as darker grass tones instead of alpha.',
     'sprites':{},'tiles':{}}
for group,lst,sub in (('tree',TREES,'trees'),('shrub',SHRUBS,'shrubs_ditahan'),('ground',GROUND,'ground')):
    os.makedirs(f'{OUT}/{sub}',exist_ok=True)
    for name,fn,ind,lat in lst:
        s=fn()
        if group!='ground': ground_overlap(s)
        im,piv=render(s); f=f'{sub}/{name}.png'; im.save(f'{OUT}/{f}')
        man['sprites'][name]={'file':f,'group':group,'size':list(im.size),'pivot':list(piv),'name_id':ind,'latin':lat,
            'status':'on hold (v3: tidak dipakai dulu, keputusan user 1 Nov 2026)' if group=='shrub' else 'active','shadow_rx':round(s.shadow[0],1) if s.shadow else 0,'game_size_units':[im.size[0]/2,im.size[1]/2]}
        print(name,im.size,piv)
os.makedirs(f'{OUT}/tiles',exist_ok=True)
for i,(name,label) in enumerate(tiles.TILES):
    im=tiles.make(name,i); f=f'tiles/{name}.png'; im.save(f'{OUT}/{f}')
    man['tiles'][name]={'file':f,'kind':'floor','size':[64,32],'anchor':[32,0],'footprint':[1,1],'label':label}
man['notes_v3']='v3: no flowers in tiles/ground; shrubs moved to shrubs_ditahan/ (status on hold); trees unchanged from v2'
json.dump(man,open(f'{OUT}/manifest.json','w'),indent=1)
