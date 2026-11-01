import sys
import roadside, gang, signals
from lib import *
names=sys.argv[1:] or [n for n in REG]
ims=[]
for n in names:
    for o in REG[n]['oris']:
        img,gl,p,a=build(n,o); ims.append(Image.fromarray(img))
W=1600; x=y=rowh=0; pos=[]
for i in ims:
    if x+i.width>W: x=0; y+=rowh+8; rowh=0
    pos.append((x,y)); x+=i.width+8; rowh=max(rowh,i.height)
c=Image.new('RGBA',(W,y+rowh),(60,140,80,255))
for i,p in zip(ims,pos): c.alpha_composite(i,p)
c.save('ov2.png'); print(c.size)
