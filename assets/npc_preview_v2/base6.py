"""render v6b idle frames with the SAME generator as the live NPCs (npc_v6b.py), returning layers + final frame"""
import sys, os
sys.path.insert(0,'chars-iso/v6b/tools')
import numpy as np
from PIL import Image
import npc_v6b as nv, live_v6b as lv, parts_v6b as pv
FW,FH=64,112
def render(n, f=0, d='se', expr='neutral', anim='idle'):
    fem=n['body']=='f'; C,O=nv.make_cfg(n)
    se,pal=lv.build_char_layers(C,O)
    if fem: pv.fem_jaw(se)
    for k,v in C['hair_map'].items(): pal['H'+k]=lv.hx(v)
    pal['B']=lv.hx(C['brow'])
    ne=lv.back_layers(se,C,O)
    for i,c in enumerate(('C2','C3','C4','C4','C5')): pal.setdefault(f'O{i+1}',pal[c])
    kind=lv.KIND[anim]; view='se' if d in('se','sw') else 'ne'; mir=d in('sw','nw')
    P=lv.pose_layers(se if view=='se' else ne,kind,f,view,C,O)
    for mk,mp in pal['_maps'].items(): P[mk]=lv.recolor(P[mk],mp)
    if fem: pv.fem_body(P,kind)
    P['shoes_over']=pv.shoe_style(P,n['shoes'])
    if n['shoes'] in('boots','hightops'): pal.setdefault('S3',lv.hx('#E8E6E0'))
    if n['shoes'] in('sneakers',): pal.setdefault('S3',lv.hx('#B4B0A8'))
    rg={k:lv.to_img(v,pal) for k,v in P.items() if k not in('face','brows','acc_head')}
    imgs=lv.frame_img(rg)
    bob=(-1 if f in(2,3) else 0) if kind in('idle','talk') else 0
    F,B,G=lv.face_layer(expr,C,view,0,bob,False,0)
    F=lv.recolor(F,pv.SKIN)
    for k,v in C['skin_map'].items(): pal.setdefault('K'+k,lv.hx(v))
    fi=lv.frame_img({'f':lv.to_img(F,pal),'b':lv.to_img(B,pal),'g':lv.to_img(G,pal)})
    fl=(lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)) if mir else (lambda im: im)
    L={}
    for k in ['hair_back','body','arm_far','shoes','pants','shoes_over','rips','shirt','shirt_graphic','outer','acc','arm_near','body_front','held']:
        if k in imgs: L[k]=fl(imgs[k])
    L['face']=fl(fi['f']); L['hair_front']=fl(imgs['hair_front']); L['glasses']=fl(fi['g']); L['brows']=fl(fi['b'])
    o=Image.new('RGBA',(FW,FH))
    for k,v in L.items(): o.alpha_composite(v)
    return o,L,pal
if __name__=='__main__':
    n=dict(nv.NPCS['grok_bot'])
    o,L,pal=render(n)
    live=Image.open('game/assets/chars/grok_bot_v6b_sheet.png').convert('RGBA').crop((0,4*112,64,5*112))
    a=np.array(o); b=np.array(live)
    m=b[...,3]==255
    print('diff px (opaque live):',int((np.any(a!=b,axis=2)&m).sum()), 'layers',list(L))
    Image.fromarray(np.hstack([a,b])).resize((512,448),Image.NEAREST).save('/tmp/st/t.png')
