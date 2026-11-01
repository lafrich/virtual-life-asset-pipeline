from PIL import Image, ImageDraw, ImageFont
import os
B='assets'
names=[('Gfunk','npc_gfunk','gfunk'),('Yerbies','npc_yerbies','yerbies'),('Theodore','npc_theodore','theodore')]
exprs=['neutral','happy','surprised','angry','sleepy']
S=4; BG=(16,20,27,255)
try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',16)
except: font=ImageFont.load_default()
# crop box shared: sprites span roughly x4-60, y14-102
box=(4,14,60,104)
cw=(box[2]-box[0])*S; ch=(box[3]-box[1])*S
W=cw*3+40; H=ch+90
frames=[]
for e in exprs:
    im=Image.new('RGBA',(W,H),BG); d=ImageDraw.Draw(im)
    for i,(n,f,p) in enumerate(names):
        s=Image.open(f'{B}/{f}/expr/{p}_se_{e}.png').convert('RGBA').crop(box)
        s=s.resize((cw,ch),Image.NEAREST)
        x=10+i*(cw+10)
        im.alpha_composite(s,(x,50))
        tw=d.textlength(n,font=font); d.text((x+(cw-tw)/2,H-28),n,fill=(231,235,242,255),font=font)
    tw=d.textlength(e.upper(),font=font); d.text(((W-tw)/2,14),e.upper(),fill=(255,209,102,255),font=font)
    frames.append(im.convert('P',palette=Image.ADAPTIVE,colors=128))
frames[0].save(f'{B}/npc_all/npc_expressions_all_4x.gif',save_all=True,append_images=frames[1:],duration=900,loop=0,disposal=2)
print(W,H)
