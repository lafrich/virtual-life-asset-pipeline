from PIL import Image, ImageDraw
import os, subprocess, shutil
D='assets/npc_all'
fr=[Image.open(f'{D}/hangout_frames/hangout_f{i:02d}.png').convert('RGBA') for i in range(72)]
fw,fh=fr[0].size
S=2  # scale up to fill 1280x720 more
W,H=1280,720
out='/tmp/mp4frames'; shutil.rmtree(out,ignore_errors=True); os.makedirs(out)
ground_y=500
bg=Image.new('RGBA',(W,H))
d=ImageDraw.Draw(bg)
# sky gradient
top=(86,160,230); bot=(170,215,245)
for y in range(ground_y):
    t=y/ground_y
    d.line([(0,y),(W,y)],fill=tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(3))+(255,))
# pixel clouds
for cx,cy in [(160,90),(620,60),(1040,130),(420,180)]:
    for dx,dy,w,h in [(0,8,120,24),(20,0,72,16),(60,-8,48,16)]:
        d.rectangle([cx+dx,cy+dy,cx+dx+w,cy+dy+h],fill=(255,255,255,255))
# ground
d.rectangle([0,ground_y,W,H],fill=(150,112,72,255))
d.rectangle([0,ground_y,W,ground_y+10],fill=(98,160,78,255))
for x in range(0,W,32):
    for y in range(ground_y+24,H,32):
        d.rectangle([x+((y//32)%2)*16,y,x+((y//32)%2)*16+8,y+6],fill=(130,96,60,255))
scale=3
sw,sh=fw*scale,fh*scale
# frames are 4x; downscale 4x->3x nearest by resizing via 1x
# NN-resample: 464x436 -> 348x327
fps=24; total=10*fps
for n in range(total):
    t=n/fps
    f=fr[int(t*10)%72]
    f=f.resize((sw*1,sh*1) if False else (fw*3//4,fh*3//4),Image.NEAREST)
    im=bg.copy()
    x=(W-f.width)//2; y=ground_y+60-f.height
    im.alpha_composite(f,(x,y))
    im.convert('RGB').save(f'{out}/f{n:04d}.png')
subprocess.run(['ffmpeg','-y','-framerate',str(fps),'-i',f'{out}/f%04d.png','-c:v','libx264','-pix_fmt','yuv420p','-crf','16',f'{D}/npc_hangout_sky_10s.mp4'],check=True,capture_output=True)
