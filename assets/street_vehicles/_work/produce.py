import json, os, re, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0,'.')
from car_defs import all_cars
from riders import gojek, maxim, sma, LOOK
from grade import grade, INPAL
OUT='assets/street_vehicles'
os.makedirs(OUT+'/cars',exist_ok=True); os.makedirs(OUT+'/riders',exist_ok=True); os.makedirs(OUT+'/previews',exist_ok=True)
DIRS=['se','nw','sw','ne']
# footprint in the game frame (tiles): c in [0,L], r in [lane+a, lane+b]
FOOT={'sedan_red':(2.9,0.05,1.1,"vehicle('sedan',lane,dirn,['#FF5A5F','#E0434A','#B8323A'])"),
      'sedan_teal':(2.9,0.05,1.1,"vehicle('sedan',lane,dirn,['#2EC4B6','#22A094','#1B7F76'])"),
      'hatchback_orange':(2.6,0.05,1.1,"new kind (no game equivalent)"),
      'mpv_silver':(3.1,0.05,1.13,"new kind (no game equivalent)"),
      'taxi_bluebird':(3.1,0.05,1.1,"vehicle('taxi',lane,dirn,['#45B3E6','#2F97CF','#2479AD']) (data-ng brand colours)"),
      'van_cream':(3.4,0.05,1.15,"vehicle('van',...) (in code, not in the current traffic list)"),
      'bus_transjakarta':(6.6,-0.1,1.2,"vehicle('bus',lane,dirn,['#2C6BD8','#F4F1EA','#2457B8']) (data-ng brand colours)"),
      'gojek':(1.3,0.15,0.85,"replaces vehicle('moto',...) (in code, not in the current traffic list)"),
      'gojek_pax':(1.3,0.15,0.85,"new (moto + passenger)"),
      'maxim':(1.3,0.15,0.85,"new (moto variant)"),
      'maxim_pax':(1.3,0.15,0.85,"new (moto + passenger)"),
      'sma_triple':(1.55,0.15,0.85,"new (moto variant, 3 riders)")}
man={'projection':'iso 2:1, 1 tile = 64x32 px, 1 game height unit = 3.2 px (HS 1.6 x PPU 2)','sprites':{}}
sprites={}
def put(name,d,img,piv,folder):
    L,a,b,game=FOOT[name]
    fn=f'{folder}/{name}_{d}.png'; img.save(f'{OUT}/{fn}')
    e={'file':fn,'size':list(img.size),'pivot_footprint_centre':[int(piv[0]),int(piv[1])],'footprint_tiles':[L,round(b-a,3)],'game_equivalent':game}
    if d in ('se','nw'):
        dc=-L/2*32; dr=-(a+b)/2*32
        e['anchor_game_P0lane']=[int(round(piv[0]+dc-dr)),int(round(piv[1]+(dc+dr)/2))]
    man['sprites'][f'{name}_{d}']=e; sprites[(name,d)]=(img,piv)
for name,car in all_cars():
    for d in DIRS:
        img,piv=car.render(d); put(name,d,img,piv,'cars')
    print(name,flush=True)
RF={'gojek':lambda l:gojek(False,l),'gojek_pax':lambda l:gojek(True,l),'maxim':lambda l:maxim(False,l),'maxim_pax':lambda l:maxim(True,l),'sma_triple':lambda l:sma(l)}
for name,f in RF.items():
    for d in DIRS:
        img,piv=f(LOOK[d]).render(d); put(name,d,img,piv,'riders')
    print(name,flush=True)
man['notes']=['pivot_footprint_centre: px of the ground point under the footprint centre (local origin)',
 'anchor_game_P0lane (se/nw only): px of world point P(0,lane) at h=0, the origin the game vehicle() draws from; place the PNG at P(0,lane) - anchor/PPU in world units, width=size/PPU',
 'se = driving +c (game dirn=+1, class cA), nw = driving -c (dirn=-1, cB). sw/ne are extra (the street runs along c only)',
 'static sprites: the game moves vehicles with a CSS translate and has no per-vehicle frames']
json.dump(man,open(OUT+'/manifest.json','w'),indent=1)
import pickle; pickle.dump({k:(np.array(v[0]),v[1]) for k,v in sprites.items()},open('sprites.pkl','wb'))
print('done')
