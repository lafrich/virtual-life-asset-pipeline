import json
from PIL import Image, ImageDraw, ImageFont
OUT='assets/vegetation_kebonsirih'
man=json.load(open(OUT+'/manifest.json')); S=4
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20)
FI=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',18)
FS=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
FH=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',34)
BG=(214,222,206); MAXW=3600
def cell_list(group): return [(k,v) for k,v in man['sprites'].items() if v['group']==group]
rows=[]
def flow(items,title,minw=230):
    rows.append(('title',title)); cur=[];w=0
    for k,v in items:
        cw=max(v['size'][0]*S+40,minw,int(max(F.getlength(v['name_id']),FI.getlength(v['latin'])))+30)
        if w+cw>MAXW and cur: rows.append(('row',cur)); cur=[];w=0
        cur.append((k,v,cw)); w+=cw
    if cur: rows.append(('row',cur))
flow(cell_list('tree'),'POHON (trees) - Kebon Sirih / Menteng street trees, 1x sprites shown at 4x')
flow(cell_list('ground'),'RUMPUT & PROP KECIL - tanpa bunga (ground tufts, overlays, small props)')
tl=[(k,{'size':[64,32],'label':v['label'],'file':v['file']}) for k,v in man['tiles'].items()]
rows.append(('title','UBIN RUMPUT 64x32 tanpa bunga (grass tiles, anchor 32,0)')); 
for i in range(0,len(tl),8): rows.append(('tiles',tl[i:i+8]))
H=90
for kind,x in rows:
    if kind=='title': H+=70
    elif kind=='row': H+=max(v['size'][1] for _,v,_ in x)*S+90
    else: H+=32*S+90
sheet=Image.new('RGB',(MAXW+80,H),BG); d=ImageDraw.Draw(sheet); y=30
for kind,x in rows:
    if kind=='title': d.text((40,y+20),x,font=FH,fill=(42,50,66)); d.line([(40,y+64),(MAXW+40,y+64)],fill=(141,151,168),width=2); y+=70; continue
    if kind=='row':
        rh=max(v['size'][1] for _,v,_ in x)*S; xx=40
        for k,v,cw in x:
            im=Image.open(f"{OUT}/{v['file']}").convert('RGBA'); im=im.resize((im.width*S,im.height*S),Image.NEAREST)
            sheet.paste(im,(xx+(cw-im.width)//2,y+10+rh-im.height),im)
            px=xx+(cw-im.width)//2+v['pivot'][0]*S; py=y+10+rh-im.height+v['pivot'][1]*S
            d.line([(px-6,py),(px+6,py)],fill=(229,72,77),width=2); d.line([(px,py-6),(px,py+6)],fill=(229,72,77),width=2)
            for j,(t,f,c) in enumerate([(v['name_id'],F,(27,34,48)),(v['latin'],FI,(80,90,105)),(f"{v['size'][0]}x{v['size'][1]} px",FI,(120,128,140))]):
                tw=d.textlength(t,font=f); d.text((xx+cw/2-tw/2,y+rh+18+j*24),t,font=f,fill=c)
            xx+=cw
        y+=rh+90; continue
    xx=40; cw=MAXW//8
    for k,v in x:
        im=Image.open(f"{OUT}/{v['file']}").convert('RGBA'); im=im.resize((256,128),Image.NEAREST)
        sheet.paste(im,(int(xx+(cw-256)/2),y+10),im)
        for j,t in enumerate([k.replace('grass_',''),v['label']]):
            f=F if j==0 else FS; tw=d.textlength(t,font=f); d.text((xx+cw/2-tw/2,y+148+j*24),t,font=f,fill=(27,34,48) if j==0 else (80,90,105))
        xx+=cw
    y+=32*S+90
d.text((40,H-34),'Preview only (v3: tanpa bunga di rumput, semak ditahan). Red cross = pivot. Shadow: alpha 56 canopy projection (pushed right) + alpha 90 contact patch. Light from the left, no black outline.',font=FI,fill=(80,90,105))
sheet.save(OUT+'/contact_sheet_4x.png',optimize=True); print(sheet.size)
sheet.resize((sheet.width//4,sheet.height//4),Image.LANCZOS).save('/tmp/sheet_small.png')
