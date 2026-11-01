import time
from cars import *
from PIL import Image
t=time.time()
sed=Car('sedan',2.9,1.05,
  body=[(-46,4),(46,4),(46.4,13),(45.6,20),(42.5,26),(32,29.5),(15,32),(-25,32.5),(-37,31),(-44.5,28),(-46.4,20),(-46.4,10)],
  cabin=[(16,30),(2,53),(-11,55),(-23,52.5),(-36,31)],cab_hw=14.8,wheel_x=[28,-28],R=10.5,
  paint=['#FF5A5F','#E0434A','#B8323A'],side_win=(-27,11),bpill=(-7.5,-5))
ims=[]
for d in ['se','nw','sw','ne']:
    im,p=sed.render(d); ims.append(im); print(d,im.size,p,time.time()-t)
W=sum(i.width for i in ims)+30; H=max(i.height for i in ims)
s=Image.new('RGBA',(W,H),(110,118,126,255)); x=0
for i in ims: s.alpha_composite(i,(x,0)); x+=i.width+10
s.resize((W*4,H*4),Image.NEAREST).save('t1.png')
