import json, os
import roadside, gang, signals, parkir, jalan_lokal, pendek, taman
from lib import *
OUT='assets/street_buildings'
GROUPDIR={'jalan':'jalan_besar','loak':'pasar_loak','kampung':'kampung','gang':'gang','prop':'props','sinyal':'sinyal','parkir':'parkir','lokal':'jalan_lokal','pendek':'jalan_besar/pendek','taman':'taman'}
man={'projection':'iso 2:1, tile 64x32 px, PPU 2 (1 game unit = 2 px), height in px (1 game h-unit*HS = 3.2 px), light from the left',
 'scale':'upper floor 90 px, ground floor 104 px, avatar 86 px; same as street_vehicles / vegetation',
 'anchor_rule':'pivot = ground pixel under the footprint centre. Game: <image x=P(c,r).x - pivot.x/2, y=P(c,r).y - pivot.y/2, width=w/2, height=h/2> with (c,r)=footprint centre. anchor_n = pixel of the footprint north corner (min c, min r) at ground, for tile-snapped placement: x=P(c0,r0).x-anchor_n.x/2 ...',
 'footprint_rule':'footprint [W,D] cells: W along the facade, D depth (front edge = facade side incl. apron). sw: W along +c, D along r (facade at max r, faces +r). se: W along r, D along c (facade at max c, faces +c). ne/nw (signals only): same footprint as sw/se, lamp face turned away from the camera (camera sees the back).',
 'shadow':'flat black alpha 56 baked (ground projection pushed right, away from the left light). Shadow on own ground apron = 1 tone darker. Alpha in base PNGs: 0/56/255 only.',
 'glow':'<name>_<ori>__glow.png = emissive pixels only (sign panels, letters, lit windows, lamps) at alpha 255 + 2 px halo at alpha 90; draw above the base with mix-blend-mode screen/plus-lighter at night. Same size + pivot as the base.',
 'sprites':{}}
os.makedirs(OUT,exist_ok=True)
for name,A in REG.items():
    d=os.path.join(OUT,GROUPDIR[A['group']]); os.makedirs(d,exist_ok=True)
    for ori in A['oris']:
        img,gl,piv,anc=build(name,ori)
        fn=f'{name}_{ori}.png'; Image.fromarray(img).save(os.path.join(d,fn))
        e={'file':f'{GROUPDIR[A["group"]]}/{fn}','group':A['group'],'size':[img.shape[1],img.shape[0]],'pivot':[int(piv[0]),int(piv[1])],'anchor_n':[int(anc[0]),int(anc[1])],
           'footprint':[A['W'],A['D']],'facing':ori,'note':A['note']}
        if gl[...,3].any():
            gfn=f'{name}_{ori}__glow.png'; Image.fromarray(gl).save(os.path.join(d,gfn)); e['glow']=f'{GROUPDIR[A["group"]]}/{gfn}'
        if A['interact']:
            # local (a,b) -> cell offset from footprint north corner
            W,D=A['W'],A['D']; base={'sw':'sw','se':'se'}[ori]
            L=Loc(None,base,W,D); c0,r0,_,_=L.rect(0,0,W,D)
            it={}
            for k,v in A['interact'].items():
                if len(v)==2: c,r=L.cr(*v); it[k]=[round(c-c0,2),round(r-r0,2)]
                else: a=L.cr(v[0],v[1]); b=L.cr(v[2],v[3]); it[k]=[round(min(a[0],b[0])-c0,2),round(min(a[1],b[1])-r0,2),round(max(a[0],b[0])-c0,2),round(max(a[1],b[1])-r0,2)]
            e['interact_cells_from_north_corner']=it
        man['sprites'][f'{name}_{ori}']=e
man['crossing']={
 'zebra_in_game':'SUDAH ADA di index.html extBuild(): stripes c 21.2..23.9 (every 0.6, 0.32 wide) from r 32.98 to 36.07; yellow warning strips c 20.6..24.4 at r 31.95..32.5 (near side) and r 36.55..37.0 (far side). No new zebra sprite needed.',
 'waiting_cells':{'near_sidewalk':[22.55,32.15],'far_sidewalk':[22.55,36.85]},
 'ped_signal_poles':{'near_left':{'cell':[20.45,32.25],'sprite':'lampu_pejalan_<state>_sw','why':'head faces +r (across the road) for people waiting on the far side; button box faces the near waiting area'},
                     'near_right':{'cell':[24.55,32.25],'sprite':'lampu_pejalan_<state>_sw'},
                     'far_left':{'cell':[20.45,36.8],'sprite':'lampu_pejalan_<state>_ne','why':'head faces -r toward the near side: camera sees the housing back + button'},
                     'far_right':{'cell':[24.55,36.8],'sprite':'lampu_pejalan_<state>_ne'}},
 'vehicle_signal_poles':{'for_lane_se_r33.05 (moves +c, stops at c 20.4)':{'cell':[20.0,32.3],'sprite':'lampu_lalin_<state>_nw','why':'faces -c toward oncoming +c traffic: back visible to camera'},
                         'for_lane_nw_r34.85 (moves -c, stops at c 24.6)':{'cell':[25.0,36.75],'sprite':'lampu_lalin_<state>_se','why':'faces +c toward oncoming -c traffic: lamps visible'}},
 'phase_order_suggested_not_final':['1 kendaraan HIJAU / pejalan MERAH (default; tombol ditekan -> LED tombol menyala, mulai hitung)','2 kendaraan KUNING (~3 dtk)','3 semua MERAH (~1-2 dtk, jeda aman)','4 pejalan HIJAU (orang berjalan) - avatar boleh masuk zebra','5 pejalan HIJAU KEDIP (selang-seling lampu_pejalan_hijau / lampu_pejalan_hijau_kedip_off ~400 ms) - jangan mulai menyeberang','6 pejalan MERAH + semua merah (~1-2 dtk) -> kembali ke 1'],
 'states':{'lampu_pejalan':['merah','hijau','hijau_kedip_off','padam'],'lampu_lalin':['merah','kuning','hijau']}}
json.dump(man,open(os.path.join(OUT,'manifest.json'),'w'),indent=1)
print(len(man['sprites']),'sprites')
