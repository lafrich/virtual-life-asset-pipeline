#!/usr/bin/env python3
"""Mahluk Hidup / V6B activity preview sprites.
All movement is baked pixel-by-pixel into static RGBA 64x112 frames.
No skeletal rig or runtime limb transforms. No existing assets overwritten.

These are *review-only previews*. The in-app v6p-act editor uses its own layered
body/face/top/pants/shoes sheets; the bundled composited frames do not assert
part-level compatibility with those native sheets.
"""
from PIL import Image,ImageDraw,ImageFont
import os, json, math, zipfile
from pathlib import Path
OUT=Path(__file__).resolve().parent
FW,FH=64,112
DIRS=['se','sw','ne','nw']
ACTIONS={
 'pushup':dict(n=4,ms=160,emo=False,label='PUSH UP',summary='high > lower > bottom > rise'),
 'yoga_sphinx_idle':dict(n=4,ms=500,emo=True,label='YOGA SPHINX',summary='subtle chest breathing'),
 'yoga_puppy_idle':dict(n=4,ms=500,emo=False,label='YOGA PUPPY',summary='hip raised; gentle breath'),
 'hip_shake':dict(n=6,ms=120,emo=True,label='HIP SHAKE',summary='hip sway; feet planted'),
 'yoga_happy_baby_idle':dict(n=4,ms=450,emo=False,label='HAPPY BABY',summary='supine; tiny rocking motion'),
}
# All the source hexes are drawn from existing v6b game palettes (STYLE.md).
SKIN=['#8A5A3C','#D19C81','#D9A47E','#F1D3B5','#FFDDBE']
TOP=['#8D97A8','#B9C0CC','#C7CFDC','#E7EBF2','#FFFFFF']
PANTS=['#15151F','#1C2330','#2A3242','#3A4458','#5A6577']
ACC=['#3D2A1E','#6B4F3A','#94704F','#B48455','#D49A5E']
BORDER='#8A5A3C'
BLACK='#1C2330'
SHADOW=(0,0,0,56)

def xy(p):return (int(round(p[0])),int(round(p[1])))
def ellipse(d,box,c):d.ellipse(tuple(map(lambda z:int(round(z)),box)),fill=c)
def dot(d,p,r,c):ellipse(d,(p[0]-r,p[1]-r,p[0]+r,p[1]+r),c)
def line(d,pts,c,w):d.line([xy(x) for x in pts],fill=c,width=int(w),joint='curve')
def arm(d,p,q,width,base=SKIN,short=False):
    """Paint a frame's authored limb pixels directly, no runtime bones."""
    # dark material edge, medium body, upper-left highlight, terminal hand/foot
    line(d,[p,q],base[0],width+2)
    line(d,[(p[0]-0.5,p[1]-0.5),(q[0]-0.5,q[1]-0.5)],base[2],width)
    line(d,[(p[0]-1,p[1]-1),(q[0]-1,q[1]-1)],base[3],max(1,width-4))
    dot(d,q,max(2,width//2),base[2])
    dot(d,(q[0]-1,q[1]-1),1,base[3])
def torso(d,shoulder,hip,female=False,back=False,rot=0,breath=0):
    (sx,sy),(hx,hy)=shoulder,hip
    wtop=8.0 if female else 9.5
    wbottom=8.0 if female else 7.0
    # iso torso, near side slightly shifted in y
    pts=[(sx-wtop,sy),(sx+wtop-1,sy-1),(sx+wtop-2,sy+12+breath),
         (hx+wbottom,hy-2),(hx+wbottom-1,hy+3),(hx-wbottom,hy+4),
         (hx-wbottom-2,hy-2),(sx-wtop-1,sy+10)]
    d.polygon([xy(p) for p in pts],fill=TOP[1])
    d.polygon([xy(p) for p in pts[1:5]]+ [xy((sx+2,sy+3))],fill=TOP[0])
    d.polygon([xy((sx-wtop+2,sy+2)),xy((sx+1,sy+2)),xy((hx+1,hy)),xy((hx-wbottom+2,hy))],fill=TOP[3])
    line(d,[(sx-wtop+2,sy+2),(sx-wtop+3,sy+11)],TOP[4],2)
    line(d,[(hx-wbottom+1,hy+1),(hx+wbottom-1,hy+1)],TOP[0],2)
    # collar/shirt neck and fabric fold
    line(d,[(sx-3,sy),(sx,sy+3),(sx+3,sy-1)],TOP[0],2)
    line(d,[(hx+1,hy-4),(hx+2,hy-8)],TOP[2],1)
    if back:line(d,[(sx-2,sy+3),(hx-1,hy-4)],TOP[2],1)

def head(d,c,dir='se',female=False,breath=0,side=False):
    x,y=c
    if side:
      # head extended over the ground, asymmetric snout/neck
      ellipse(d,(x-7,y-8,x+9,y+5),SKIN[0]);ellipse(d,(x-6,y-8,x+8,y+3),SKIN[2]);
      ellipse(d,(x-5,y-7,x+5,y-1),SKIN[3]);dot(d,(x+7,y+0.5),2,SKIN[3]);
    else:
      ellipse(d,(x-9,y-11,x+9,y+11),SKIN[0]);
      ellipse(d,(x-8,y-11,x+8,y+9),SKIN[2]);
      ellipse(d,(x-7,y-9,x+4,y+3),SKIN[3]);
      ellipse(d,(x-4,y-11,x+2,y-9),SKIN[4]);
      # ear edges, shaved scalp, intentionally faceless for emosi.exe
      dot(d,(x-8,y-1),2,SKIN[2]);dot(d,(x+8,y-1),2,SKIN[1]);
      line(d,[(x-2,y+8),(x+2,y+8)],SKIN[1],1)
    if dir in ('ne','nw'):
      # faceless back-of-head, narrow scalp tonal strips
      line(d,[(x-7,y-5),(x-4,y-8)],SKIN[1],2)

def shadow_layer(pose):
   im=Image.new('RGBA',(FW,FH));d=ImageDraw.Draw(im)
   if pose=='hip_shake':ellipse(d,(20,96,44,103),SHADOW)
   else: ellipse(d,(6,88,59,103),SHADOW)
   return im

def transform(x,y,dir,action):
    # 2:1 floor projection: different anatomical front/back redraw position
    if dir in ('sw','nw'): x=64-x
    if dir in ('ne','nw') and action!='hip_shake':
      # Away from camera: foreshorten the floor trajectory, keep contact at ~100.
      y=89-(y-85)*0.38
    return x,y

def limb_path(d,pts,w,col=SKIN):
    for a,b in zip(pts[:-1],pts[1:]):arm(d,a,b,w,col)

def _coord(p,dir,action,delta=(0,0)):
   x,y=transform(p[0],p[1],dir,action)
   return (x+delta[0],y+delta[1])

def foot(d,p,dir,flip=False):
    x,y=p;ellipse(d,(x-4,y-2,x+4,y+3),PANTS[0]);
    ellipse(d,(x-3,y-2,x+3,y+1),PANTS[2]);
    line(d,[(x-2,y+2),(x+3,y+2)],PANTS[3],1)

def draw_standing(d,frame,dir,female):
    # Authored six-frame sway: center -> left -> extreme left -> center -> right -> extreme right
    offsets=[0,-2,-4,0,2,4]
    hipsx=32+offsets[frame]; counter=-offsets[frame]*.32
    upper=(32+counter,49); hips=(hipsx,74)
    if dir in ('ne','nw'):upper=(upper[0],upper[1]-1)
    # rear legs first
    left_knee=(hipsx-5,86);right_knee=(hipsx+6,86)
    left_foot=(27,99);right_foot=(39,99)
    if abs(offsets[frame])>2:
        left_knee=(hipsx-7,87);right_knee=(hipsx+7,85)
    for idx,(hip,knee,ankle) in enumerate((( (hipsx-5,73),left_knee,left_foot ),((hipsx+5,73),right_knee,right_foot))):
        limb_path(d,[hip,knee,ankle],6,PANTS)
    torso(d,upper,hips,female,dir in ('ne','nw'))
    # shorts seam / waist pivot
    d.polygon([xy(p) for p in [(hipsx-8,70),(hipsx+8,70),(hipsx+8,78),(hipsx+1,79),(hipsx,76),(hipsx-1,79),(hipsx-9,78)]],fill=PANTS[2]);
    line(d,[(hipsx-8,72),(hipsx+8,72)],PANTS[0],2)
    # arms rest around the waist; far then near
    for side in (-1,1):
        sx=upper[0]+side*(8 if female else 10); el=(sx+side*2,62); hand=(hipsx+side*7,70)
        limb_path(d,[(sx,49),el,hand],4,SKIN)
        dot(d,hand,2,SKIN[3])
        # cuff on tee
        line(d,[(sx-side*1,53),(sx+side*2,54)],TOP[0],3)
    head(d,(upper[0],31),dir,female)
    foot(d,left_foot,dir);foot(d,right_foot,dir)

def draw_prone(d,action,frame,dir,female):
    breath=[0,-1,0,1][frame]
    away=dir in ('ne','nw')
    coord=lambda p: _coord(p,dir,action)
    # Locally authored anatomical key poses, pixel curves projected in the game's iso diagonal.
    if action=='pushup':
      raiseAmt=[0,3,7,3][frame];
      ankle=coord((12,91)); knee=coord((21,86+raiseAmt*.3)); hip=coord((28,75+raiseAmt*.5));
      shoulder=coord((41,72+raiseAmt));hd=coord((49,68+raiseAmt));
      far_elbow=coord((43,87));near_elbow=coord((47,87));
      hand_f=coord((47,96));hand_n=coord((51,98));
    elif action=='yoga_sphinx_idle':
      ankle=coord((11,96));knee=coord((21,91));hip=coord((28,83));
      shoulder=coord((41,72+breath));hd=coord((47,60+breath));
      far_elbow=coord((38,88));near_elbow=coord((43,90));
      hand_f=coord((48,95));hand_n=coord((52,96));
    else: # yoga puppy dog: hips high, head and forearms planted
      ankle=coord((12,100));knee=coord((17,97));hip=coord((26,63));
      shoulder=coord((41,85+breath));hd=coord((48,88+breath));
      far_elbow=coord((48,95));near_elbow=coord((51,95));
      hand_f=coord((54,99));hand_n=coord((58,99));
    # Feet and planted shins always drawn first
    for delta in ((0,-2),(0,3)):
      p0=(ankle[0]+delta[0],ankle[1]+delta[1]);p1=(knee[0]+delta[0],knee[1]+delta[1])
      limb_path(d,[p0,p1],5,PANTS)
    # rear body in two planes, upper-body fabric and leg contours
    limb_path(d,[knee,hip],8,PANTS)
    # trunk shaped specifically for each floor pose
    line(d,[hip,shoulder],16,TOP[0]) if False else None
    arm(d,hip,shoulder,15,TOP)
    # torso patch/waist; neckline visible with offset on shoulder
    dot(d,(hip[0],hip[1]),7,PANTS[2]);dot(d,((hip[0]-1),(hip[1]-2)),4,PANTS[3]);
    line(d,[(hip[0]-3,hip[1]-5),(shoulder[0]-3,shoulder[1]-5)],TOP[3],4)
    line(d,[(hip[0]-3,hip[1]+4),(shoulder[0]-3,shoulder[1]+4)],TOP[2],2)
    # forearms rest on floor and are visibly separate
    limb_path(d,[shoulder,far_elbow,hand_f],4,SKIN)
    limb_path(d,[(shoulder[0]+2,shoulder[1]+2),near_elbow,hand_n],4,SKIN)
    # collar/top neck edge
    dot(d,shoulder,6,TOP[2]);dot(d,(shoulder[0]-2,shoulder[1]-2),4,TOP[3]);
    head(d,hd,dir,female,side=True)
    # hairless scalp details only; no facial features baked (Emosi compatible later)
    if action=='yoga_sphinx_idle':
       # elbows visibly under shoulders, forearms extend toward front
       line(d,[far_elbow,hand_f],SKIN[3],2)
    if action=='yoga_puppy_idle':
       # distinct high-hip triangular pose with chest/forehead lowered
       dot(d,hip,5,PANTS[2]);line(d,[hip,shoulder],TOP[3],3)

def draw_happy_baby(d,frame,dir,female):
    # Human supine: upper back and neck on the ground, shins raised,
    # knees open beside torso and hands hold the soles of the feet.
    rock=[0,-1,0,1][frame]
    breathe=[0,-1,0,1][frame]
    coord=lambda p:_coord(p,dir,'yoga_happy_baby_idle',(rock,0))
    head_p=coord((46,88+breathe))
    shoulder=coord((40,88+breathe));hips=coord((27,88));
    left_knee=coord((22,70));right_knee=coord((35,67));
    left_foot=coord((15,62));right_foot=coord((35,61));
    # torso horizontal on floor
    arm(d,hips,shoulder,18,TOP)
    dot(d,hips,8,PANTS[2]);dot(d,(hips[0]-2,hips[1]-2),5,PANTS[3]);
    # thighs, bent knees, raised calves
    for idx,(knee,ft) in enumerate(((left_knee,left_foot),(right_knee,right_foot))):
       delta=(-3,0) if idx==0 else (3,0)
       t=(hips[0]+delta[0],hips[1])
       arm(d,t,knee,9,PANTS)
       arm(d,knee,ft,6,SKIN)
       # feet up and open outward; soles visible
       ellipse(d,(ft[0]-5,ft[1]-3,ft[0]+5,ft[1]+4),PANTS[0]);
       ellipse(d,(ft[0]-4,ft[1]-3,ft[0]+4,ft[1]+2),SKIN[2]);
       line(d,[(ft[0]-3,ft[1]+1),(ft[0]+3,ft[1]+1)],SKIN[0],1)
    # arms reaching outward to feet from shoulders
    arm(d,(shoulder[0]-5,shoulder[1]-3),left_foot,4,SKIN)
    arm(d,(shoulder[0]+4,shoulder[1]-2),right_foot,4,SKIN)
    dot(d,left_foot,2,SKIN[4]);dot(d,right_foot,2,SKIN[4]);
    head(d,head_p,dir,female,side=True)

def render(action,frame,dir,gender):
    female=gender=='female'
    image=Image.new('RGBA',(FW,FH));d=ImageDraw.Draw(image)
    if action=='hip_shake':draw_standing(d,frame,dir,female)
    elif action=='yoga_happy_baby_idle':draw_happy_baby(d,frame,dir,female)
    else:draw_prone(d,action,frame,dir,female)
    return image

def save():
  src=OUT/'frames';src.mkdir(exist_ok=True)
  sheets=OUT/'sheets';sheets.mkdir(exist_ok=True)
  previews=OUT/'previews';previews.mkdir(exist_ok=True)
  manifest={'format':'mahluk-hidup-stock-motion-preview-v1','review_only':True,'native_v6p_act_integration':False,
       'original_pushup_stock_preserved':True,'cell':[FW,FH],'pivot':[32,100],
       'directions':DIRS,'genders':['male','female'],'clips':{},'base':'faceless mannequin; neutral exercise outfit',
       'sprite_format':'64x112 native 1x, nearest-only, RGBA, every pose baked; no rig',
       'note':'Composited previews; not per-part v6p-act keyed layer sheets. User visual review required.'}
  # Preview-only activity layout sheets use the exact V6P contract grid.
  # Each cell contains a fully composited sprite, NOT keyed editable part layers.
  # These are REVIEW MATERIAL and must never overwrite site/media/v6p-act/*.
  band_start={'pushup':4,'yoga_sphinx_idle':8,'yoga_puppy_idle':12,
              'hip_shake':16,'yoga_happy_baby_idle':20}
  for gender in ('male','female'):
      packed=Image.new('RGBA',(384,2688))
      for name,info in ACTIONS.items():
          for di,direction in enumerate(DIRS):
              row=band_start[name]+di
              for f in range(info['n']):
                  packed.alpha_composite(render(name,f,direction,gender),(f*FW,row*FH))
      packed.save(sheets/f'v6p_act_preview_{gender}_384x2688.png')
  manifest['native_layout_preview_sheets']='sheets/v6p_act_preview_{male|female}_384x2688.png'
  # cross-clip showcase is a single 5x2 animated image sheet with movement
  max_t=24
  overview=[]
  for name,info in ACTIONS.items():
    frames_by_gender={}
    for gender in ('male','female'):
      arr=[]; sheet=Image.new('RGBA',(FW*info['n'],FH*4))
      for direction in DIRS:
        row=[]
        for f in range(info['n']):
          im=render(name,f,direction,gender)
          fname=f'{name}_{gender}_{direction}_f{f:02}.png'
          im.save(src/fname)
          sheet.alpha_composite(im,(f*FW,DIRS.index(direction)*FH));row.append(im)
        arr.append(row)
      sheet.save(sheets/f'{name}_{gender}_sheet.png');frames_by_gender[gender]=arr
      gif=[]
      for f in range(info['n']):
        frameimg=Image.new('RGB',(560,392),(29,37,50));dr=ImageDraw.Draw(frameimg)
        dr.text((16,13),f'{info["label"]} / {gender.upper()} / {f+1:02}',fill=(231,235,242))
        for j,direction in enumerate(DIRS):
          tile=arr[j][f].resize((128,224),Image.Resampling.NEAREST)
          # checker-ish muted tiles in 4 quadrants
          x=13+j*137;y=53
          dr.rectangle([x,y,x+127,y+223],fill=(45,57,74))
          frameimg.paste(tile,(x,y),tile)
          dr.text((x+53,290),direction.upper(),fill=(188,198,216))
        gif.append(frameimg)
      gif[0].save(previews/f'{name}_{gender}_4dir.gif',save_all=True,append_images=gif[1:],duration=info['ms'],loop=0,optimize=False,disposal=2)
    manifest['clips'][name]={'frames':info['n'],'ms':info['ms'],'loop':True,'emosi':info['emo'],
      'source':'preview sprite redraw' if name!='pushup' else 'preview redraw (existing native authored pushup unchanged)',
      'orientation':['se','sw','ne','nw'],'sheet_pattern':f'sheets/{name}_{{male|female}}_sheet.png',
      'requires_review':True}
    # 2x2 snapshots for contact sheet
    card=Image.new('RGB',(500,280),(31,41,55)); dd=ImageDraw.Draw(card)
    dd.text((12,12),f'{info["label"]} | {info["n"]} frames',fill=(230,235,243))
    for j,d in enumerate(('se','sw','ne','nw')):
       im=render(name,0,d,'male').resize((96,168),Image.Resampling.NEAREST)
       x=4+j*124;y=42; dd.rectangle((x,y,x+117,y+175),fill=(48,60,78))
       card.paste(im,(x+12,y+4),im);dd.text((x+45,236),d.upper(),fill=(210,220,234))
    overview.append(card)
  allcard=Image.new('RGB',(1000,840),(22,29,40))
  for i,card in enumerate(overview):allcard.paste(card,((i%2)*500,(i//2)*280))
  allcard.save(previews/'stock_overview.png')
  allgif=[]
  for tick in range(24):
     # fixed-size 3-col x 2-row, each one direction/gender for immediate UX review
     canv=Image.new('RGB',(1152,600),(21,30,43));d=ImageDraw.Draw(canv)
     for k,(name,info) in enumerate(ACTIONS.items()):
        x=(k%3)*384;y=(k//3)*300
        d.rounded_rectangle((x+10,y+10,x+375,y+286),radius=8,fill=(42,53,69))
        d.text((x+22,y+19),info['label'],fill=(238,243,247))
        f=int(tick*(160/info['ms']))%info['n'] if name!='hip_shake' else tick%6
        # male and female SE, plus a small NE inset in each card
        m=render(name,f,'se','male').resize((144,252),Image.Resampling.NEAREST)
        w=render(name,f,'sw','female').resize((144,252),Image.Resampling.NEAREST)
        canv.paste(m,(x+32,y+37),m)
        canv.paste(w,(x+204,y+37),w)
        d.text((x+66,y+273),'MALE',fill=(165,186,208));d.text((x+230,y+273),'FEMALE',fill=(165,186,208))
     allgif.append(canv)
  allgif[0].save(previews/'stock_five_actions.gif',save_all=True,append_images=allgif[1:],duration=160,loop=0,optimize=False,disposal=2)
  (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
  files=[p for sub in (src,sheets,previews) for p in sub.glob('*')]
  with zipfile.ZipFile(OUT/'mahluk_stock_animation_review.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
    for f in files:z.write(f,f.relative_to(OUT))
    z.write(OUT/'manifest.json','manifest.json')
    z.write(OUT/'build_stock.py','build_stock.py')
  print('DONE',len(list(src.glob('*.png'))),'PNG frames',len(list(sheets.glob('*.png'))),'sheets',len(list(previews.glob('*.gif'))),'GIF')
if __name__=='__main__':save()