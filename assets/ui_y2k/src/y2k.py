# Y2K Windows HUD restyle for Virtual Life. 1x authoring, integer nearest-neighbour upscale.
import sys, os, math
sys.path.insert(0,'assets/ui_mockups/src'); sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw, ImageFont
import ui
TAH='/usr/share/fonts/truetype/wine/'   # Wine project's Tahoma clone (LGPL), metric-compatible with MS Tahoma
_F={}
def font(sz=11,b=False):
    k=(sz,b)
    if k not in _F: _F[k]=ImageFont.truetype(TAH+('tahomabd.ttf' if b else 'tahoma.ttf'),sz)
    return _F[k]
ui.font=font                      # every reused XP component (window, button, tabs, slot...) now renders in Tahoma
import build, scenes, icons
from ui import D, text, tw, rbox, dim, C
OUT='assets/ui_y2k'
# register new icons so ui.window/ui.button/ui.slot can use them
for n in icons.DEFS:
    ui.ICONS['y16_'+n]=icons.get(n,16); ui.ICONS['y32_'+n]=icons.get(n,32)
def ic(im,name,x,y,n=16,grey=False):
    i=icons.get(name,n); i=icons.grey(i) if grey else i; im.alpha_composite(i,(int(x),int(y)))
# ---------------- palette ----------------
P=dict(face='#ECE9D8',hi='#FFFFFF',lt='#F1EFE2',sh='#ACA899',dk='#716F64',blk='#404040',
       cap1='#0A246A',cap2='#A6CAF0',icap1='#808080',icap2='#C0C0C0',sel='#316AC5',tip='#FFFFE1',
       g1='#3C9A3C',g2='#6CC56C',gdk='#1D4F1D',glt='#A9E3A9',dis='#ACA899',
       hunger='#F5B941',hygiene='#5CB8FF',bladder='#F5D547',energy='#3DDC84',err='#E5484D',blue='#2A7BF6')
def frame(d,x,y,w,h,kind='raised',face=None):
    """classic Win9x/2000 two-pixel bevel. kind: raised | pressed | sunken | etched | flat"""
    x1,y1=x+w-1,y+h-1
    if face: d.rectangle([x,y,x1,y1],fill=face)
    cols={'raised':(P['hi'],P['lt'],P['blk'],P['sh']),'pressed':(P['blk'],P['sh'],P['hi'],P['lt']),
          'sunken':(P['sh'],P['dk'],P['hi'],P['lt']),'etched':(P['sh'],P['hi'],P['hi'],P['sh'])}.get(kind)
    if not cols: d.rectangle([x,y,x1,y1],outline=P['sh']); return
    o_tl,i_tl,o_br,i_br=cols
    d.line([x,y,x1-1,y],fill=o_tl); d.line([x,y,x,y1-1],fill=o_tl)
    d.line([x1,y,x1,y1],fill=o_br); d.line([x,y1,x1,y1],fill=o_br)
    d.line([x+1,y+1,x1-2,y+1],fill=i_tl); d.line([x+1,y+1,x+1,y1-2],fill=i_tl)
    d.line([x1-1,y+1,x1-1,y1-1],fill=i_br); d.line([x+1,y1-1,x1-1,y1-1],fill=i_br)
def hgrad(im,x,y,w,h,c1,c2,steps=8):
    """Win2000-style horizontal caption gradient, stepped + checker-dithered seams"""
    px=im.load(); cols=[icons.mix(c1,c2,i/(steps-1)) for i in range(steps)]
    for xx in range(w):
        lv=xx/max(1,w-1)*(steps-1); i=int(lv); fr=lv-i
        for yy in range(h):
            j=min(steps-1,i+1) if (fr>0.5 and (xx+yy)%2==0) else i
            px[x+xx,y+yy]=cols[j]+(255,)
def caption(im,x,y,w,title,icon=None,active=True,h=16):
    hgrad(im,x,y,w,h,P['cap1'] if active else P['icap1'],P['cap2'] if active else P['icap2'])
    d=D(im); tx=x+3
    if icon: ic(im,icon,x+1,y+(h-16)//2); tx=x+19
    text(d,tx,y+(h-11)//2-1,title,'#FFFFFF' if active else '#D4D0C8',11,True)
def emboss(d,x,y,s,sz=11,b=False,anchor='la'):
    text(d,x+1,y+1,s,'#FFFFFF',sz,b,anchor=anchor); text(d,x,y,s,P['dis'],sz,b,anchor=anchor)
def bar(im,x,y,w,h,frac,col,seg=5,gap=1,track='#FFFFFF'):
    """sunken progress bar with XP-style blocks"""
    d=D(im); frame(d,x,y,w,h,'sunken',track); n=int((w-6)*frac+.5); xx=x+3
    hi=icons.mix(col,'#FFFFFF',.55); lo=icons.mix(col,'#000000',.25)
    while xx<x+3+n:
        e=min(xx+seg-1,x+2+n); d.rectangle([xx,y+3,e,y+h-4],fill=col)
        d.line([xx,y+3,e,y+3],fill=hi); d.line([xx,y+h-4,e,y+h-4],fill=lo); xx+=seg+gap
# ---------------- HUD components ----------------
CARD_W=156
def profile_card(im,x,y,name='Ichsan',lvl='Lv. 4',frac=.55,active=True):
    d=D(im); w,h=CARD_W,58; frame(d,x,y,w,h,'raised',P['face'])
    caption(im,x+3,y+3,w-6,name,'user',active)
    frame(d,x+4,y+21,34,34,'sunken','#A6CAF0'); im.alpha_composite(build.PORT,(x+6,y+23))
    text(d,x+44,y+22,lvl,'#000',11,True); text(d,x+w-6,y+23,'XP 55%','#4D4D4D',11,anchor='ra')
    bar(im,x+43,y+38,w-49,13,frac,P['blue'])
    return (x,y,w,h)
NEEDS=[('hunger','Lapar'),('hygiene','Bersih'),('bladder','Pipis'),('energy','Energi')]
def needs_panel(im,x,y,vals,blink=None,frame_i=0,disabled=False):
    d=D(im); w=CARD_W; rh=18; h=4*rh+6; frame(d,x,y,w,h,'raised',P['face'])
    for i,(k,lab) in enumerate(NEEDS):
        ry=y+3+i*rh; v=vals[i]; low=v<=.25
        on=(blink==k and frame_i==0)
        if on: d.rectangle([x+3,ry,x+w-4,ry+rh-1],fill=P['sel'])
        ic(im,k,x+5,ry+1,grey=disabled)
        col=P['err'] if low else P[k]
        if disabled: col=P['dis']
        bar(im,x+24,ry+2,w-30,rh-4,v,col,track='#FFFFE1' if on else '#FFFFFF')
        if low and not disabled and blink==k: ic(im,'warn',x+w-24,ry+1)
    return (x,y,w,h)
def money_badge(im,xr,y,amount='Rp 1.250.000',state='normal'):
    d=D(im); w=tw(amount,11,True)+34; x=xr-w; h=24
    frame(d,x,y,w,h,'pressed' if state=='pressed' else 'raised',P['face'] if state!='pressed' else '#E3E0D0')
    frame(d,x+3,y+3,w-6,h-6,'sunken','#FFFFFF' if state!='pending' else P['face'])
    ic(im,'hourglass' if state=='pending' else 'coin',x+5,y+4)
    if state=='pending': emboss(d,x+23,y+6,amount,11,True)
    else: text(d,x+23+(1 if state=='pressed' else 0),y+6+(1 if state=='pressed' else 0),amount,'#000',11,True)
    return (x,y,w,h)
def minimap(im,x,y,w=84,h=90,active=True):
    d=D(im); frame(d,x,y,w,h,'raised',P['face']); caption(im,x+3,y+3,w-6,'Peta','map',active)
    mx,my,mw,mh=x+4,y+21,w-8,h-25; frame(d,mx,my,mw,mh,'sunken','#7DC75A')
    ix,iy,iw,ih=mx+2,my+2,mw-4,mh-4
    d.rectangle([ix,iy+ih//2-4,ix+iw-1,iy+ih//2+4],fill='#B9BDC4'); d.rectangle([ix+iw//2-4,iy,ix+iw//2+4,iy+ih-1],fill='#B9BDC4')
    q=(iw-14)//2
    for bx,by,c in [(3,3,'#F4F4F4'),(iw-q-3,3,'#E5484D'),(3,ih-q+3-6,'#F5B941'),(iw-q-3,ih-q+3-6,'#5CB8FF')]:
        d.rectangle([ix+bx,iy+by,ix+bx+q-4,iy+by+q-8],fill=c,outline=icons.mix(c,'#000000',.4))
    cx,cy=ix+iw//2,iy+ih//2
    d.polygon([(cx,cy-5),(cx-4,cy+4),(cx+4,cy+4)],fill='#FFFFFF',outline='#000000')
    return (x,y,w,h)
def tool_button(im,x,y,w,h,icon,label,state='normal',kind='grey',badge=None):
    """Explorer-toolbar style button: 32px icon over a Tahoma label"""
    d=D(im); pr=state=='pressed'; dis=state=='disabled'
    if kind=='green' and not dis:
        face=icons.mix(P['g1'],P['gdk'],.35) if pr else P['g1']
        d.rectangle([x,y,x+w-1,y+h-1],fill=face)
        if not pr: d.rectangle([x+2,y+2,x+w-3,y+h//2],fill=P['g2'])
        for yy in range(y+h//2+1,y+h//2+3):
            for xx in range(x+2,x+w-2):
                if (xx+yy)%2==0: d.point((xx,yy),fill=P['g2'])
        tl,itl,br,ibr=((P['gdk'],'#2B6F2B',P['glt'],P['g2']) if pr else (P['glt'],'#8FD48F',P['gdk'],'#2B6F2B'))
        x1,y1=x+w-1,y+h-1
        d.line([x,y,x1-1,y],fill=tl); d.line([x,y,x,y1-1],fill=tl); d.line([x1,y,x1,y1],fill=br); d.line([x,y1,x1,y1],fill=br)
        d.line([x+1,y+1,x1-2,y+1],fill=itl); d.line([x+1,y+1,x+1,y1-2],fill=itl); d.line([x1-1,y+1,x1-1,y1-1],fill=ibr); d.line([x+1,y1-1,x1-1,y1-1],fill=ibr)
        lc,shc='#FFFFFF',P['gdk']
    else:
        frame(d,x,y,w,h,'pressed' if pr else 'raised',P['face'] if not pr else '#E3E0D0'); lc,shc='#000000',None
    o=1 if pr else 0
    ic(im,icon,x+(w-32)//2+o,y+3+o,32,grey=dis)
    if dis: emboss(d,x+w//2,y+h-15,label,11,True,anchor='ma')
    else: text(d,x+w//2+o,y+h-15+o,label,lc,11,True,anchor='ma',sh=shc)
    if badge:
        bt,bk=badge
        if bk=='count':
            bw=tw(bt,11,True)+8; bx=x+w-bw+4; frame(d,bx,y-6,bw,16,'raised',P['err']); text(d,bx+4,y-5,bt,'#FFFFFF',11,True)
        else:
            frame(d,x+w-16,y-8,22,22,'raised',P['face']); ic(im,bt,x+w-13,y-5)
    return (x,y,w,h)
def disc_bevel(im,cx,cy,r,face,tl,br,width=2,alpha=255):
    lay=Image.new('RGBA',(2*r+3,2*r+3)); px=lay.load(); f=icons.hx(face); a=icons.hx(tl); b=icons.hx(br)
    for yy in range(2*r+3):
        for xx in range(2*r+3):
            dx,dy=xx-r-1,yy-r-1; dd=math.hypot(dx,dy)
            if dd<=r+.3:
                if dd>=r-width+.3: px[xx,yy]=(a if (dx+dy)<0 else b)+(alpha,)
                else: px[xx,yy]=f+(alpha,)
    im.alpha_composite(lay,(cx-r-1,cy-r-1))
def arrow_btn(im,x,y,dirn,dis=False,s=15):
    d=D(im); frame(d,x,y,s,s,'raised',P['face']); c=P['dis'] if dis else '#000000'; m=s//2
    pts={'n':[(x+m,y+4),(x+m-4,y+8),(x+m+4,y+8)],'s':[(x+m,y+s-5),(x+m-4,y+s-9),(x+m+4,y+s-9)],
         'w':[(x+4,y+m),(x+8,y+m-4),(x+8,y+m+4)],'e':[(x+s-5,y+m),(x+s-9,y+m-4),(x+s-9,y+m+4)]}[dirn]
    if dis: d.polygon([(p[0]+1,p[1]+1) for p in pts],fill='#FFFFFF')
    d.polygon(pts,fill=c)
def joystick(im,cx,cy,r=38,disabled=False):
    disc_bevel(im,cx,cy,r,'#D4D0C8',P['dk'],P['hi'],2,235)
    disc_bevel(im,cx,cy,r-2,'#D4D0C8',P['sh'],P['lt'],1,235)
    for dn,(ox,oy) in {'n':(0,-(r-11)),'s':(0,r-11),'w':(-(r-11),0),'e':(r-11,0)}.items(): arrow_btn(im,cx+ox-7,cy+oy-7,dn,disabled)
    if disabled: disc_bevel(im,cx,cy,13,'#C8C4B8',P['sh'],P['hi'],1)
    else:
        disc_bevel(im,cx+3,cy-2,14,P['face'],P['hi'],P['blk'],1); disc_bevel(im,cx+3,cy-2,13,P['face'],P['lt'],P['sh'],1)
def tooltip(im,x,y,label,icon=None,b=False,tail=None,sub=None,anchor='l'):
    d=D(im); w=tw(label,11,b)+(22 if icon else 8); w=max(w,tw(sub,11)+8 if sub else 0); h=18+(13 if sub else 0)
    if anchor=='c': x=x-w//2
    d.rectangle([x,y,x+w-1,y+h-1],fill=P['tip'],outline='#000000')
    tx=x+4
    if icon: ic(im,icon,x+2,y+1); tx=x+20
    text(d,tx,y+3,label,'#000',11,b)
    if sub: text(d,x+4,y+16,sub,'#4D4D4D',11)
    if tail is not None:
        t=x+tail if tail>=0 else x+w//2
        d.polygon([(t-4,y+h-1),(t+4,y+h-1),(t,y+h+4)],fill=P['tip']); d.line([t-4,y+h-1,t,y+h+3],fill='#000'); d.line([t+4,y+h-1,t,y+h+3],fill='#000')
        d.line([t-3,y+h-1,t+3,y+h-1],fill=P['tip'])
    return (x,y,w,h)
def context_menu(im,x,y,items,w=150,rh=28):
    d=D(im); h=sum(8 if it is None else rh for it in items)+6; frame(d,x,y,w,h,'raised',P['face']); yy=y+3; rows={}
    for it in items:
        if it is None: frame(d,x+4,yy+3,w-8,2,'etched'); yy+=8; continue
        lab,icn,st=it[:3]; sub=len(it)>3 and it[3]
        if st=='sel': d.rectangle([x+3,yy,x+w-4,yy+rh-1],fill=P['sel'])
        ic(im,icn,x+7,yy+(rh-16)//2,grey=st=='dis')
        if st=='dis': emboss(d,x+30,yy+(rh-11)//2-1,lab)
        else: text(d,x+30,yy+(rh-11)//2-1,lab,'#FFFFFF' if st=='sel' else '#000',11,st=='sel')
        if st=='dis': ic(im,'lock',x+w-24,yy+(rh-16)//2)
        if sub: c='#FFFFFF' if st=='sel' else '#000'; m=yy+rh//2; d.polygon([(x+w-12,m-4),(x+w-12,m+4),(x+w-8,m)],fill=c)
        rows[lab]=(x,yy,w,rh); yy+=rh
    return (x,y,w,h),rows
def phone_mask_sprite():
    """lift the Nokia handset (ui_nokia, unchanged) off its 1x standby render"""
    a=Image.open('assets/ui_nokia/1x_native/01_standby.png').convert('RGB')
    b=Image.open('assets/ui_nokia/src/bg_844.png').convert('RGB')
    out=Image.new('RGBA',a.size); A=a.load(); B=b.load(); O=out.load()
    for y in range(a.height):
        for x in range(280,565):
            e=tuple(int(B[x,y][i]*0.38+(6,8,12)[i]*0.62) for i in range(3))
            if max(abs(A[x,y][i]-e[i]) for i in range(3))>5: O[x,y]=A[x,y]+(255,)
    bb=out.getbbox(); return out.crop(bb),bb
# ---------------- HUD layout ----------------
SAFE_L=16; SAFE_R=12; TOP=8; BOT=10
def layout(W,H):
    L={}
    L['card']=(SAFE_L,TOP); L['needs']=(SAFE_L,TOP+62)
    L['money_r']=W-SAFE_R; L['map']=(W-SAFE_R-84,TOP+30); L['hp']=(W-SAFE_R-84-8-46,TOP+30)
    L['joy']=(SAFE_L+40,H-BOT-40)
    L['act']=(W-SAFE_R-70,H-BOT-64); L['tas']=(W-SAFE_R-70-20-58,H-BOT-58)
    return L
def hud(im,W,H,vals=(.7,.45,.6,.8),blink=None,frame_i=0,action_label='Bicara',action_target='talk',action_state='normal',
        tas_state='normal',tas_badge=None,money_state='normal',locked=False,npc=None,hp_state='normal',work=False):
    L=layout(W,H)
    profile_card(im,*L['card'],active=not locked)
    needs_panel(im,*L['needs'],vals,blink,frame_i,disabled=locked)
    money_badge(im,L['money_r'],TOP,state='pending' if money_state=='pending' else ('pressed' if money_state=='pressed' else 'normal'))
    minimap(im,*L['map'],active=not locked)
    tool_button(im,*L['hp'],46,54,'phone','HP','disabled' if work else hp_state)
    joystick(im,*L['joy'],disabled=locked or work)
    ax,ay=L['act']; tx,ty=L['tas']
    tool_button(im,tx,ty,58,58,'bag','Tas','disabled' if locked else tas_state,badge=(tas_badge,'count') if tas_badge else None)
    st='disabled' if (locked or work) else action_state
    tool_button(im,ax,ay,70,64,'hand','Action',st,kind='green',badge=(action_target,'icon') if (action_target and st=='normal') else None)
    if action_label and st=='normal': tooltip(im,ax+26,ay-27,action_label,None,True,tail=-1,anchor='c')
    if npc:
        x,y=npc; tooltip(im,x,y-34,'Barista',None,True,tail=-1,sub='NPC profesi',anchor='c')
        tooltip(im,x+48,y+8,'Bicara','talk',True)
    return L
def save(name,im,sub=''):
    im=im.convert('RGB')
    if sub=='667':
        im.resize((im.width*2,im.height*2),Image.NEAREST).save(f'{OUT}/667x375/{name}_667x375@2x.png'); return
    im.save(f'{OUT}/1x_native/{name}.png'); im.resize((im.width*2,im.height*2),Image.NEAREST).save(f'{OUT}/{name}.png')

# =====================================================================
# Vista revision (pre-Vista version kept in ../_prev_pre_vista/)
# - joystick: back to the original ui_mockups joystick (ui.joystick)
# - Action + Tas + HP: round Aero glass orbs
# - HP + Tas + money: one semi-transparent glass capsule bar (bottom right, docked to the Action orb)
# =====================================================================
old_joystick=ui.joystick
ORB={'green':('#8EE08A','#1E7A22','#B8F5B0'),'blue':('#8CC4F5','#0B3F86','#A8DCFF'),'grey':('#D0D0D0','#6A6A6A','#E6E6E6')}
def orb(im,cx,cy,r,tint='blue',state='normal',alpha=205):
    """Aero glass orb in pixel art: 5 stepped bands (checker-dithered seams), top gloss, bottom glow, bright inner rim, dark outer rim.
    Semi-transparent body (alpha ~205) so the scene shows through a little; hard edges, no anti-aliasing."""
    top,bot,glow=ORB['grey' if state=='disabled' else tint]
    if state=='pressed': top,bot=icons.mix(top,'#000000',.28),icons.mix(bot,'#000000',.3)
    if state=='disabled': alpha=150
    s=2*r+3; lay=Image.new('RGBA',(s,s)); px=lay.load()
    for yy in range(s):
        for xx in range(s):
            dx,dy=xx-r-1,yy-r-1; dd=math.hypot(dx,dy)
            if dd>r+.3: continue
            if dd>r-.7: px[xx,yy]=(8,16,28,230); continue
            t=(dy+r)/(2*r); lv=t*4+(0.25 if (xx+yy)%2 else -0.25); b=max(0,min(4,int(lv+.5)))
            col=icons.mix(top,bot,b/4); a=alpha
            if t>.68 and abs(dx)<r*.62 and state!='pressed': col=icons.mix(col,glow,.38)
            ex,ey=dx/(r*.78),(dy+r*.42)/(r*.46)
            if ex*ex+ey*ey<=1 and dy<0:
                k=(.62 if dy<-r*.62 else .42) if state!='pressed' else .18
                col=icons.mix(col,'#FFFFFF',k); a=max(a,215)
            if dd>r-1.8: col=icons.mix(col,'#FFFFFF',.55 if dy<0 else .3); a=235
            px[xx,yy]=col+(a,)
    im.alpha_composite(lay,(cx-r-1,cy-r-1))
def capsule(im,x,y,w,h,alpha=150,dark=False):
    """Aero 'smoky glass' capsule: translucent body, lighter top half, 1 px white top line, glow bottom line, dark outer edge."""
    lay=Image.new('RGBA',(w,h)); px=lay.load(); rr=h/2-.5
    for yy in range(h):
        for xx in range(w):
            cxp=min(max(xx,rr),w-1-rr); dd=math.hypot(xx-cxp,yy-rr)
            if dd>rr+.3: continue
            if dd>rr-.7: px[xx,yy]=(6,10,18,215); continue
            if yy<h//2: col=(86,110,142); a=alpha-25
            else: col=(20,32,52); a=alpha
            if dark: col=tuple(int(c*.6) for c in col)
            if dd>rr-1.7 and yy<h//2: col=(235,245,255); a=150
            elif dd>rr-1.7: col=(110,160,210); a=120
            px[xx,yy]=col+(a,)
    im.alpha_composite(lay,(x,y))
def gloss(im,cx,cy,r,a=58):
    """glass reflection drawn OVER the icon (upper ellipse, one flat alpha step)"""
    lay=Image.new('RGBA',(2*r+3,2*r+3)); px=lay.load()
    for yy in range(2*r+3):
        for xx in range(2*r+3):
            dx,dy=xx-r-1,yy-r-1
            if dy>=-1 or math.hypot(dx,dy)>r-2: continue
            ex,ey=dx/(r*.74),(dy+r*.45)/(r*.42)
            if ex*ex+ey*ey<=1: px[xx,yy]=(255,255,255,a)
    im.alpha_composite(lay,(cx-r-1,cy-r-1))
def wtext(d,x,y,s,col='#FFFFFF',b=True,anchor='la'):
    text(d,x+1,y+1,s,'#05080E',11,b,anchor=anchor); text(d,x,y,s,col,11,b,anchor=anchor)
def orb_button(im,cx,cy,r,icon,tint='blue',state='normal',label=None,badge=None):
    orb(im,cx,cy,r,tint,state); o=1 if state=='pressed' else 0
    n=32 if r>=19 else 16; iy=cy-n//2-(6 if label else 0)
    ic(im,icon,cx-n//2+o,iy+o,n,grey=state=='disabled')
    if state!='pressed': gloss(im,cx,cy,r)
    if label:
        d=D(im); wtext(d,cx+o,cy+11+o,label,'#FFFFFF' if state!='disabled' else '#C8C8C8',True,anchor='ma')
    if badge:
        bt,bk=badge; d=D(im)
        if bk=='count':
            bw=tw(bt,11,True)+8; bx=cx+r-bw+6; by=cy-r-4
            capsule_red=Image.new('RGBA',(bw,15)); im.alpha_composite(capsule_red,(bx,by))
            d.rounded_rectangle([bx,by,bx+bw-1,by+14],radius=6,fill='#D8343A',outline='#5A0E10'); d.line([bx+3,by+1,bx+bw-4,by+1],fill='#F48A8D')
            text(d,bx+4,by+1,bt,'#FFFFFF',11,True)
        else:
            bx,by=cx+int(r*.72),cy-int(r*.72); orb(im,bx,by,11,'grey',alpha=235); ic(im,bt,bx-8,by-8)
ACT_R=34; SML_R=19; BAR_H=28
def vlayout(W,H,amount='Rp 1.250.000'):
    L={}; L['card']=(SAFE_L,TOP); L['needs']=(SAFE_L,TOP+62); L['map']=(W-SAFE_R-84,TOP)
    L['joy']=(SAFE_L+34,H-BOT-36)
    cx,cy=W-SAFE_R-ACT_R,H-BOT-ACT_R-2; L['act']=(cx,cy)
    mw=8+16+4+tw(amount,11,True)+10; hpw=2*SML_R+4+tw('HP',11,True)+8; tasw=2*SML_R+4+tw('Tas',11,True)+8
    bx=cx-ACT_R-6-tasw-2-hpw-2-mw-4; by=cy-BAR_H//2
    L['bar']=(bx,by,cx-bx,BAR_H); L['money']=(bx,by,mw+4,BAR_H)
    L['hp']=(bx+mw+4+2+SML_R,cy); L['tas']=(bx+mw+4+2+hpw+2+SML_R,cy); L['seps']=[bx+mw+4,bx+mw+4+2+hpw]
    return L
def bar_cluster(im,L,money_state='normal',hp_state='normal',tas_state='normal',tas_badge=None,amount='Rp 1.250.000',locked=False):
    bx,by,bw,bh=L['bar']; capsule(im,bx,by,bw,bh); d=D(im)
    mx,my,mw,mh=L['money']
    if money_state=='pressed': capsule(im,bx+2,by+2,mw-2,bh-4,alpha=120,dark=True)
    o=1 if money_state=='pressed' else 0
    ic(im,'hourglass' if money_state=='pending' else 'coin',bx+9+o,by+6+o)
    wtext(d,bx+29+o,by+8+o,amount,'#9AA6B6' if money_state in('pending','disabled') or locked else '#FFFFFF')
    for sx in L['seps']: d.line([sx,by+5,sx,by+bh-6],fill='#05080E'); d.line([sx+1,by+5,sx+1,by+bh-6],fill='#8FA8C8')
    for key,icn,lab,st,bd in (('hp','phone','HP',hp_state,None),('tas','bag','Tas',tas_state,tas_badge)):
        cx,cy=L[key]; orb_button(im,cx,cy,SML_R,icn,'blue',st,badge=(bd,'count') if bd else None)
        wtext(d,cx+SML_R+4,by+8,lab,'#C8C8C8' if st=='disabled' else '#FFFFFF')
def hud(im,W,H,vals=(.7,.45,.6,.8),blink=None,frame_i=0,action_label='Bicara',action_target='talk',action_state='normal',
        tas_state='normal',tas_badge=None,money_state='normal',locked=False,npc=None,hp_state='normal',work=False):
    L=vlayout(W,H)
    profile_card(im,*L['card'],active=not locked)
    needs_panel(im,*L['needs'],vals,blink,frame_i,disabled=locked)
    minimap(im,*L['map'],active=not locked)
    old_joystick(im,*L['joy'],34,disabled=locked or work)
    bar_cluster(im,L,money_state,'disabled' if work else hp_state,'disabled' if locked else tas_state,tas_badge,locked=locked)
    cx,cy=L['act']; st='disabled' if (locked or work) else action_state
    orb_button(im,cx,cy,ACT_R,'hand','green',st,label='Action',badge=(action_target,'icon') if (action_target and st=='normal') else None)
    if action_label and st=='normal': tooltip(im,cx-6,cy-ACT_R-26,action_label,None,True,tail=-1,anchor='c')
    if npc:
        x,y=npc; tooltip(im,x,y-34,'Barista',None,True,tail=-1,sub='NPC profesi',anchor='c')
        tooltip(im,x+48,y+8,'Bicara','talk',True)
    return L
layout=vlayout
