import json, os
from engine import text_mask
from PIL import Image
OUT='assets/street_buildings'
man=json.load(open(f'{OUT}/manifest.json'))
BG=(58,68,88,255); LAB=(231,235,242,255); SUB=(141,151,168,255)
def label(img,x,y,t,col):
    pts,w=text_mask(t)
    for i,j in pts: img.putpixel((x+i,y+j),col)
def sheet(keys,maxw,fn,scale=4,title=''):
    ims=[(k,Image.open(f"{OUT}/{man['sprites'][k]['file']}")) for k in keys]
    x=8; y=16; rowh=0; pos=[]
    for k,im in ims:
        w=max(im.width,len(k)*4+4)
        if x+w>maxw and x>8: x=8; y+=rowh+20; rowh=0
        pos.append((x,y)); x+=w+10; rowh=max(rowh,im.height)
    H=y+rowh+20; c=Image.new('RGBA',(maxw,H),BG)
    label(c,8,4,title,LAB)
    for (k,im),(px,py) in zip(ims,pos):
        e=man['sprites'][k]; c.alpha_composite(im,(px,py))
        p=e['pivot']; 
        for d in (-1,0,1): c.putpixel((px+p[0]+d,py+p[1]),(229,72,77,255)); c.putpixel((px+p[0],py+p[1]+d),(229,72,77,255))
        label(c,px,py+im.height+3,k,LAB); label(c,px,py+im.height+10,f"{e['size'][0]}X{e['size'][1]} FP {e['footprint'][0]}X{e['footprint'][1]}",SUB)
    c=c.resize((c.width*scale,c.height*scale),Image.NEAREST); c.save(f'{OUT}/previews/{fn}'); print(fn,c.size)
os.makedirs(f'{OUT}/previews',exist_ok=True)
K=list(man['sprites'])
g=lambda grp:[k for k in K if man['sprites'][k]['group']==grp]
J=g('jalan')
sheet(J[:6],1200,'contact_jalan_besar_1_4x.png',title='JALAN BESAR 1/4: INDOMARET, KANTOR A, KANTOR B')
sheet(J[6:10],1300,'contact_jalan_besar_2_4x.png',title='JALAN BESAR 2/4: BANK BCA, MASJID')
sheet(J[10:14],1300,'contact_jalan_besar_3_4x.png',title='JALAN BESAR 3/4: KAFE BLUE DOORS, HOTEL')
sheet(J[14:],1500,'contact_jalan_besar_4_4x.png',title='JALAN BESAR 4/4: MAL, RUKO A B C')
sheet(g('loak'),1100,'contact_pasar_loak_4x.png',title='PASAR LOAK: LAPAK + TOKO LOAK')
sheet(g('kampung'),1100,'contact_kampung_4x.png',title='KAMPUNG: WARUNG MADURA, RUMAH, POS RONDA')
sheet(g('gang')+g('prop'),1100,'contact_gang_props_4x.png',title='GANG + PROPS')
sheet(g('sinyal'),900,'contact_sinyal_4x.png',title='LAMPU PENYEBERANGAN + LAMPU LALU LINTAS (4 ARAH X STATE)')
sheet(K,2400,'contact_all_1x.png',scale=1,title='SEMUA ASET 1X (RINGKASAN)')
