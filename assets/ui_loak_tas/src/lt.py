# UI Toko Loak (jual) + Tas berisi item. Gaya: HUD Vista di ../../ui_y2k (kaca semi-transparan, Tahoma 11, pixel 1x).
import sys, os, math, json
sys.path.insert(0,'assets/ui_y2k/src')
import y2k
from y2k import Image, ImageDraw, ui, icons, D, text, tw, wtext, orb, capsule, tooltip, dim, P as YP
A='assets/'
OUT=A+'ui_loak_tas'
CAT=json.load(open(A+'item_temuan/item_catalog.json'))
ITEM={i['id']:i for i in CAT['item']}
RAR={k:v['warna_label'] for k,v in CAT['rarity'].items()}        # #86E59A / #86CCFF / #FFD166 (dari katalog)
RNAME={'umum':'Umum','jarang':'Jarang','langka':'Langka'}
# ---- palette: semua hex sudah ada di ui_y2k / ui_mockups / katalog ----
G=dict(top=(86,110,142),bot=(20,32,52),edge=(6,10,18),line=(235,245,255),glow=(110,160,210),   # kapsul bar HUD
       dimt='#9AA6B6',white='#FFFFFF',sel='#316AC5',sel2='#A6CAF0',hov='#A8DCFF',green='#3DDC84',err='#E5484D',tip='#FFFFE1')
TINT={'green':('#8EE08A','#1E7A22','#B8F5B0'),'blue':('#8CC4F5','#0B3F86','#A8DCFF'),'grey':('#D0D0D0','#6A6A6A','#E6E6E6'),
      'red':('#F08A64','#B8361A','#E35A2F'),'brass':('#FFD166','#C99A2E','#E0A526')}
REC=[]   # (screen, name, x,y,w,h) dicatat untuk manifest
SCREEN=['']; SIZE=['']
def rec(name,x,y,w,h): REC.append(dict(screen=SCREEN[0],size=SIZE[0],name=name,x=int(x),y=int(y),w=int(w),h=int(h)))
def rp(n): return 'Rp '+f'{int(round(n)):,}'.replace(',','.')
def icon_item(sid): return Image.open(A+'item_temuan/icons/'+sid+'.png').convert('RGBA')
def depth(xx,yy,w,h,r):
    cx=min(max(xx,r),w-1-r); cy=min(max(yy,r),h-1-r)
    if (xx<r or xx>w-1-r) and (yy<r or yy>h-1-r): return r-math.hypot(xx-cx,yy-cy)
    return min(xx,yy,w-1-xx,h-1-yy)+0.0
def glass(im,x,y,w,h,r=6,head=0,alpha=212):
    """panel kaca Aero: kepala (head px) lebih terang, badan gelap semi-transparan, garis putih atas, garis glow bawah, tepi gelap"""
    lay=Image.new('RGBA',(w,h)); px=lay.load()
    for yy in range(h):
        for xx in range(w):
            dp=depth(xx,yy,w,h,r)
            if dp<-.3: continue
            if dp<.7: px[xx,yy]=G['edge']+(225,); continue
            if dp<1.7: px[xx,yy]=(G['line']+(150,)) if yy<h//2 else (G['glow']+(120,)); continue
            if yy<head:
                c=G['top']; a=alpha-10
                if yy<head//2: c=tuple(int(v+(255-v)*.12) for v in c)
            else: c=G['bot']; a=alpha
            px[xx,yy]=c+(a,)
    im.alpha_composite(lay,(x,y))
    if head: d=D(im); d.line([x+2,y+head,x+w-3,y+head],fill=G['edge']); d.line([x+2,y+head+1,x+w-3,y+head+1],fill=(110,160,210))
def well(im,x,y,w,h,alpha=130):
    """area cekung (sunken) di dalam panel kaca"""
    lay=Image.new('RGBA',(w,h)); px=lay.load()
    for yy in range(h):
        for xx in range(w):
            if xx==0 or yy==0: px[xx,yy]=G['edge']+(230,)
            elif xx==w-1 or yy==h-1: px[xx,yy]=G['glow']+(110,)
            else: px[xx,yy]=G['edge']+(alpha,)
    im.alpha_composite(lay,(x,y))
def gbutton(im,x,y,w,h,label,tint='blue',state='normal',icon=None,dark_text=None,name=None):
    """tombol kaca Vista persegi-bulat. state: normal|hover|pressed|disabled"""
    if name: rec(name,x,y,w,h)
    t=TINT['grey' if state=='disabled' else tint]; top,bot,glow=[icons.hx(c) for c in t]
    if state=='hover': top,bot=icons.mix(top,'#FFFFFF',.22),icons.mix(bot,'#FFFFFF',.15)
    if state=='pressed': top,bot=icons.mix(top,'#000000',.3),icons.mix(bot,'#000000',.3)
    al=150 if state=='disabled' else 235
    lay=Image.new('RGBA',(w,h)); px=lay.load(); r=4
    for yy in range(h):
        for xx in range(w):
            dp=depth(xx,yy,w,h,r)
            if dp<-.3: continue
            if dp<.7: px[xx,yy]=G['edge']+(235,); continue
            tt=yy/(h-1); lv=tt*3+(.25 if (xx+yy)%2 else -.25); b=max(0,min(3,int(lv+.5)))
            c=icons.mix(top,bot,b/3)
            if yy<h//2 and state!='pressed': c=icons.mix(c,'#FFFFFF',.32 if yy<h//4 else .2)
            elif tt>.7 and state!='pressed': c=icons.mix(c,glow,.35)
            if dp<1.7: c=icons.mix(c,'#FFFFFF',.5 if yy<h//2 else .2)
            px[xx,yy]=c+(al,)
    im.alpha_composite(lay,(x,y)); d=D(im)
    if state=='hover': d.rounded_rectangle([x-1,y-1,x+w,y+h],radius=5,outline=G['hov'])
    o=1 if state=='pressed' else 0
    tws=tw(label,11,True)+(20 if icon else 0); tx=x+(w-tws)//2+o; ty=y+(h-11)//2-1+o
    if icon:
        i=icons.get(icon,16); i=icons.grey(i) if state=='disabled' else i; im.alpha_composite(i,(tx,y+(h-16)//2+o)); tx+=20
    if state=='disabled': text(d,tx,ty,label,'#E6E6E6',11,True,sh='#6A6A6A')
    elif dark_text or tint=='brass': text(d,tx,ty,label,'#10141B',11,True,sh='#FFD166')
    else: wtext(d,tx,ty,label)
def closeb(im,x,y,state='normal',name='tutup'):
    w=tw('Tutup',11,True)+30; gbutton(im,x-w,y,w,20,'Tutup','red',state,icon='cancel',name=name); return w
def slot(im,x,y,s=40,sid=None,rar=None,count=None,state='filled',sel=False,name=None):
    """slot kaca: kosong / terisi (border rarity 2 px) / terkunci (dither + gembok)"""
    if name: rec(name,x,y,s,s)
    d=D(im); well(im,x,y,s,s,alpha=170 if state!='locked' else 210)
    if state=='locked':
        for yy in range(y+2,y+s-2):
            for xx in range(x+2,x+s-2):
                if (xx+yy)%4==0: d.point((xx,yy),fill=(20,32,52))
        im.alpha_composite(icons.grey(icons.get('lock',16)),(x+s//2-8,y+s//2-8)); return
    if state=='empty':
        for k in range(x+3,x+s-3,2): d.point((k,y+2),fill=(86,110,142)); d.point((k,y+s-3),fill=(86,110,142))
        for k in range(y+3,y+s-3,2): d.point((x+2,k),fill=(86,110,142)); d.point((x+s-3,k),fill=(86,110,142))
    if rar: d.rectangle([x+1,y+1,x+s-2,y+s-2],outline=RAR[rar]); d.rectangle([x+2,y+2,x+s-3,y+s-3],outline=icons.mix(RAR[rar],'#000000',.35))
    if sel: d.rectangle([x-1,y-1,x+s,y+s],outline='#FFFFFF'); d.rectangle([x-2,y-2,x+s+1,y+s+1],outline=G['sel2'])
    if sid:
        ic=icon_item(sid); im.alpha_composite(ic,(x+(s-ic.width)//2,y+(s-ic.height)//2))
    if count: badge(im,x+s-2,y+s-2,count)
def badge(im,xr,yb,count,mx=5):
    d=D(im); t=f'x{count}'; w=tw(t,11,True)+5; x=xr-w; y=yb-13
    d.rounded_rectangle([x,y,xr,yb],radius=3,fill=G['edge'],outline=(110,160,210))
    text(d,x+3,y,t,'#FFD166' if count>=mx else '#FFFFFF',11,True)
def rlabel(d,x,y,r,anchor='la'):
    text(d,x+1,y+1,RNAME[r],'#05080E',11,True,anchor=anchor); text(d,x,y,RNAME[r],RAR[r],11,True,anchor=anchor)
def price_meter(im,x,y,mult,name='indikator_harga'):
    """indikator harga hari ini x0,8–1,2 (5 kotak)"""
    d=D(im); rec(name,x,y,150,20)
    wtext(d,x,y+3,'Harga hari ini','#9AA6B6',False)
    bx=x+78; vals=[.8,.9,1.0,1.1,1.2]
    for i,v in enumerate(vals):
        on=abs(v-mult)<.051; c='#E5484D' if v<1 else ('#FFFFFF' if v==1 else '#3DDC84')
        d.rectangle([bx+i*8,y+5,bx+i*8+6,y+14],fill=c if on else (20,32,52),outline=(110,160,210) if not on else '#FFFFFF')
    t=('x'+f'{mult:.2f}'.replace('.',','))
    col='#3DDC84' if mult>1 else ('#E5484D' if mult<1 else '#FFFFFF'); wtext(d,bx+44,y+3,t,col)
    if mult!=1: (d.polygon([(bx+44+tw(t,11,True)+3,y+12),(bx+44+tw(t,11,True)+9,y+12),(bx+44+tw(t,11,True)+6,y+6)],fill=col) if mult>1 else
                 d.polygon([(bx+44+tw(t,11,True)+3,y+7),(bx+44+tw(t,11,True)+9,y+7),(bx+44+tw(t,11,True)+6,y+13)],fill=col))
def portrait(im,cx,cy,pose='offer',r=15):
    """potret babeh kecil di orb kaca abu (crop kepala dari pose 1x, tanpa scaling)"""
    orb(im,cx,cy,r,'grey',alpha=235)
    f={'offer':'babeh_pemilik_se_offer_key','haggle':'babeh_pemilik_se_haggle_key','count':'babeh_pemilik_se_count_key','idle':'babeh_pemilik_se_idle'}[pose]
    p=Image.open(A+'npc_babeh_loak/poses/'+f+'.png').convert('RGBA')
    hx0=18; c=p.crop((hx0,27,hx0+28,27+2*r-3))
    m=Image.new('L',c.size,0); ImageDraw.Draw(m).ellipse([0-1,0-1,c.width,c.height+6],fill=255)
    lay=Image.new('RGBA',c.size); lay.paste(c,(0,0),m); im.alpha_composite(lay,(cx-14,cy-r+2))
    y2k.gloss(im,cx,cy,r,a=40)
def balloon(im,x,y,w,txt,tail_x=None):
    """balon ucapan babeh (kuning tooltip, sama seperti label dunia ui_y2k)"""
    d=D(im); lines=[]; line=''
    for wd in txt.split(' '):
        t=(line+' '+wd).strip()
        if tw(t)>w-10 and line: lines.append(line); line=wd
        else: line=t
    lines.append(line); h=6+13*len(lines)
    d.rectangle([x,y,x+w-1,y+h-1],fill=G['tip'],outline='#000000')
    for i,l in enumerate(lines): text(d,x+5,y+3+i*13,l,'#000',11)
    if tail_x is not None:
        d.polygon([(x,y+5),(x-5,y+8),(x,y+11)],fill=G['tip']); d.line([x,y+5,x-5,y+8],fill='#000'); d.line([x-5,y+8,x,y+11],fill='#000')
    return h
def sparkle(im,x,y,f):
    """kilau: frame kilau_item dari item_temuan (16x16) + bintang 4 titik putih/emas"""
    k=Image.open(A+f'item_temuan/props_temuan/kilau_item_f{f%3}.png').convert('RGBA'); im.alpha_composite(k,(x,y))
def star(d,cx,cy,s,col='#FFFFFF'):
    d.line([cx-s,cy,cx+s,cy],fill=col); d.line([cx,cy-s,cx,cy+s],fill=col); d.point((cx,cy),fill='#FFD166')
# ---- background scenes (1x dari mock 4x, diperkecil 1/4 nearest = piksel asli) ----
_BG={}
def scene(name,W,H):
    if name not in _BG:
        f={'loak':'npc_babeh_loak/mock_lorong_babeh_4x.png','taman':'item_temuan/sheets/mock_taman_gang_4x.png'}[name]
        s=Image.open(A+f).convert('RGBA'); _BG[name]=s.resize((s.width//4,s.height//4),Image.NEAREST)
    s=_BG[name]; cx,cy={'loak':(470,210),'taman':(330,250)}[name]
    out=Image.new('RGBA',(W,H),s.getpixel((2,s.height//2))); out.alpha_composite(s,(W//2-cx,H//2-cy)); return out
def hud(im,W,H,**kw):
    kw.setdefault('action_label',None); kw.setdefault('action_target',None); return y2k.hud(im,W,H,**kw)
def save(name,im,W):
    im=im.convert('RGB')
    if W==844:
        im.save(f'{OUT}/1x_native/{name}.png'); im.resize((im.width*2,im.height*2),Image.NEAREST).save(f'{OUT}/{name}.png')
    else:
        im.save(f'{OUT}/1x_native/{name}_667x375.png'); im.resize((im.width*2,im.height*2),Image.NEAREST).save(f'{OUT}/667x375/{name}_667x375@2x.png')
