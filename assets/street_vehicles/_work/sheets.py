import json, pickle, numpy as np
from PIL import Image, ImageDraw, ImageFont
OUT='assets/street_vehicles'
S={k:(Image.fromarray(v[0],'RGBA'),v[1]) for k,v in pickle.load(open('sprites.pkl','rb')).items()}
B=lambda f: Image.open('before/'+f).convert('RGBA')
try: F=ImageFont.load_default(size=52); Fs=ImageFont.load_default(size=40)
except Exception: F=Fs=ImageFont.load_default()
BG=(96,106,118,255); BG2=(84,94,106,255)
def row(cells,label,gap=8,lab_w=300):
    H=max(c.height for c in cells)+gap*2
    W=sum(c.width for c in cells)+gap*(len(cells)+1)
    r=Image.new('RGBA',(W,H),(0,0,0,0)); x=gap
    for c in cells: r.alpha_composite(c,(x,H-gap-c.height)); x+=c.width+gap
    return r
def sheet(rows,title,fn,scale=4,cols_hdr=None):
    lab_w=520; pad=20
    rs=[(row(c,l),l) for l,c in rows]
    W=max(r.width for r,_ in rs)*scale+lab_w+pad*2; H=sum(r.height for r,_ in rs)*scale+90+(40 if cols_hdr else 0)
    o=Image.new('RGBA',(W,H),BG); d=ImageDraw.Draw(o)
    d.text((pad,24),title,fill=(231,235,242,255),font=F)
    y=80
    if cols_hdr:
        for x,t in cols_hdr: d.text((lab_w+x*scale,y),t,fill=(255,209,102,255),font=Fs)
        y+=40
    for i,(r,l) in enumerate(rs):
        h=r.height*scale
        if i%2: d.rectangle([0,y,W,y+h],fill=BG2)
        o.alpha_composite(r.resize((r.width*scale,h),Image.NEAREST),(lab_w,y))
        d.multiline_text((pad,y+h//2-24),l,fill=(231,235,242,255),font=Fs,spacing=6)
        y+=h
    o.save(OUT+'/previews/'+fn); print(fn,o.size)
# ---- before / after (game traffic directions se + nw) ----
ba=[('sedan red\n(game sedan)',[B('sedan_se_0.png'),B('sedan_nw_6.png'),S[('sedan_red','se')][0],S[('sedan_red','nw')][0]]),
    ('sedan teal\n(game sedan)',[B('sedan_se_7.png'),B('sedan_nw_1.png'),S[('sedan_teal','se')][0],S[('sedan_teal','nw')][0]]),
    ('taxi Bluebird\n(game taxi MPV ->\nVios-style sedan)',[B('taxi_se_2.png'),B('taxi_nw_3.png'),S[('taxi_bluebird','se')][0],S[('taxi_bluebird','nw')][0]]),
    ('van\n(game van, unused\nin traffic)',[B('van_se_8.png'),S[('van_cream','se')][0],S[('van_cream','nw')][0]]),
    ('moto -> Gojek ojol\n(game moto, unused\nin traffic)',[B('moto_se_9.png'),S[('gojek','se')][0],S[('gojek','nw')][0]]),
    ('bus Transjakarta\n(game bus)',[B('bus_se_4.png'),B('bus_nw_5.png'),S[('bus_transjakarta','se')][0],S[('bus_transjakarta','nw')][0]])]
sheet(ba,'BEFORE (current game, baked from index.html vehicle())  ->  AFTER (new), 4x, directions se + nw','before_after_4x.png')
# ---- all new / changed, 4 directions ----
names=['sedan_red','sedan_teal','hatchback_orange','mpv_silver','taxi_bluebird','van_cream','bus_transjakarta','gojek','gojek_pax','maxim','maxim_pax','sma_triple']
cars=[(n.replace('_','\n',1)+'\nse nw sw ne',[S[(n,d)][0] for d in ['se','nw','sw','ne']]) for n in names[:6]]
sheet(cars,'New car sprites, 4x (se, nw, sw, ne)','cars_all_4x.png')
sheet([('bus\ntransjakarta',[S[('bus_transjakarta',d)][0] for d in ['se','nw']]),('',[S[('bus_transjakarta',d)][0] for d in ['sw','ne']])],'Transjakarta bus, 4x (se, nw / sw, ne)','bus_4x.png')
rid=[(n.replace('_','\n')+'\nse nw sw ne',[S[(n,d)][0] for d in ['se','nw','sw','ne']]) for n in names[7:]]
sheet(rid,'Ojol + SMA riders, 4x (se, nw, sw, ne)','riders_all_4x.png')
