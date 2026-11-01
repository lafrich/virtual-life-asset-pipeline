import sys
from car_defs import *
from PIL import Image
rows=[]
for nm,c in all_cars():
    if len(sys.argv)>1 and nm not in sys.argv[1:]: continue
    ims=[c.render(d)[0] for d in ['se','nw','sw','ne']]
    W=sum(i.width for i in ims)+40; H=max(i.height for i in ims)
    s=Image.new('RGBA',(W,H),(110,118,126,255)); x=0
    for i in ims: s.alpha_composite(i,(x,H-i.height)); x+=i.width+10
    rows.append(s)
W=max(r.width for r in rows); H=sum(r.height for r in rows)
o=Image.new('RGBA',(W,H),(110,118,126,255)); y=0
for r in rows: o.alpha_composite(r,(0,y)); y+=r.height
o.resize((W*3,H*3),Image.NEAREST).save('t2.png'); print(o.size)
