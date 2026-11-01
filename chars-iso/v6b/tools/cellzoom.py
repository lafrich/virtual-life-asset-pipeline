import sys
from PIL import Image
sh=Image.open(sys.argv[1]).convert('RGBA'); out=sys.argv[2]; cells=[tuple(map(int,c.split(':'))) for c in sys.argv[3:]]
Z=4; o=Image.new('RGBA',(64*len(cells),112),(236,232,224,255))
for i,(r,c) in enumerate(cells): o.alpha_composite(sh.crop((c*64,r*112,c*64+64,r*112+112)),(i*64,0))
d=o.load()
for i in range(len(cells)):
    for y in range(0,112,2): d[i*64,y]=(180,180,180,255)
o.resize((o.width*Z,o.height*Z),Image.NEAREST).save(out)
