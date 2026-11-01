"""rebuild only some assets and merge their manifest entries (indomaret v2, parkir motors). Same code path as produce.py."""
import json, os, sys
import roadside, gang, signals
try: import jalan_lokal, pendek, taman
except ImportError: pass
try: import parkir
except ImportError: parkir = None
from lib import *
OUT='assets/street_buildings'
GROUPDIR={'jalan':'jalan_besar','loak':'pasar_loak','kampung':'kampung','gang':'gang','prop':'props','sinyal':'sinyal','parkir':'parkir','lokal':'jalan_lokal','pendek':'jalan_besar/pendek','taman':'taman'}
man=json.load(open(os.path.join(OUT,'manifest.json')))
for name in sys.argv[1:]:
    A=REG[name]; d=os.path.join(OUT,GROUPDIR[A['group']]); os.makedirs(d,exist_ok=True)
    for ori in A['oris']:
        img,gl,piv,anc=build(name,ori)
        fn=f'{name}_{ori}.png'; Image.fromarray(img).save(os.path.join(d,fn))
        e={'file':f'{GROUPDIR[A["group"]]}/{fn}','group':A['group'],'size':[img.shape[1],img.shape[0]],'pivot':[int(piv[0]),int(piv[1])],'anchor_n':[int(anc[0]),int(anc[1])],
           'footprint':[A['W'],A['D']],'facing':ori,'note':A['note']}
        gfn=f'{name}_{ori}__glow.png'
        if gl[...,3].any(): Image.fromarray(gl).save(os.path.join(d,gfn)); e['glow']=f'{GROUPDIR[A["group"]]}/{gfn}'
        elif os.path.exists(os.path.join(d,gfn)): os.remove(os.path.join(d,gfn))
        man['sprites'][f'{name}_{ori}']=e; print(name,ori,e['size'],e['pivot'])
json.dump(man,open(os.path.join(OUT,'manifest.json'),'w'),indent=1)
