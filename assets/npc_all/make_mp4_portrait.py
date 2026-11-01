from PIL import Image, ImageDraw
import os, subprocess, shutil
D='assets/npc_all'
fr=[Image.open(f'{D}/hangout_frames/hangout_f{i:02d}.png').convert('RGBA') for i in range(72)]
W,H=720,1280
out='/tmp/mp4p'; shutil.rmtree(out,ignore_errors=True); os.makedirs(out)
gy=800
bg=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(bg)
top=(86,160,230); bot=(170,215,245)
for y in range(gy):
    t=y/gy
    d.line([(0,y),(W,y)],fill=tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(3))+(255,))
d.rectangle([0,gy,W,H],fill=(128,128,128,255))
fps=24
for n in range(10*fps):
    f=fr[int(n/fps*10)%72]
    f=f.resize((f.width*5//4,f.height*5//4),Image.NEAREST)  # 6x of 1x
    im=bg.copy()
    im.alpha_composite(f,((W-f.width)//2,gy+75-f.height))
    im.convert('RGB').save(f'{out}/f{n:04d}.png')
subprocess.run(['ffmpeg','-y','-framerate',str(fps),'-i',f'{out}/f%04d.png','-c:v','libx264','-pix_fmt','yuv420p','-crf','16',f'{D}/npc_hangout_portrait_10s.mp4'],check=True,capture_output=True)
