import json,math,base64
from PIL import Image
import ui,baymax
from ui import *
OUT='assets/ui_mockups'
meta=json.load(open('build/uimock/hots.json'))
names=[n for n,_ in meta['screens']]+['09_components','10_flow']+[n for n,_,_ in baymax.NEW]
labels=dict(meta['screens']); labels.update({'09_components':'Komponen','10_flow':'Flow'}); labels.update({n:l for n,l,_ in baymax.NEW})
cols=3; cw,chh=844,412
rows=math.ceil(len(names)/cols); sheet=Image.new('RGB',(cols*cw+(cols+1)*12,rows*(chh+12)+50),C['void']); sd=D(sheet)
text(sd,12,12,'Virtual Office · UI mockups Pixel XP · 844x390 (1x native) · angka = data contoh · kuning = Usulan Baymax (belum diputuskan)',C['paper'],14,True)
for i,n in enumerate(names):
    t=Image.open(f'{OUT}/1x_native/{n}.png').crop((0,0,844,390))
    x=12+(i%cols)*(cw+12); y=44+(i//cols)*(chh+12); sheet.paste(t,(x,y+22))
    text(sd,x,y+4,f'{n}  ·  {labels[n]}',C['glow'] if ('baymax' in n or n.startswith('11')) else C['paper'],12,True)
sheet.save(f'{OUT}/00_overview.png')
# prototype: append new screens
p=open(f'{OUT}/prototype.html').read()
i=p.index('const D=')+8; j=p.index(',H=',i)
D_=json.loads(p[i:j])
for n,_,_ in baymax.NEW: D_[n]=base64.b64encode(open(f'{OUT}/{n}.png','rb').read()).decode()
p=p[:i]+json.dumps(D_)+p[j:]
i=p.index(',L=')+3; j=p.index(';let cur',i); p=p[:i]+json.dumps(labels)+p[j:]
open(f'{OUT}/prototype.html','w').write(p); print('ok',len(names))
