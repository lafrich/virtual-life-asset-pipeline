"""Publish Jakarta urban native 1x RGBA, exact depth, previews and Semesta catalog.
Run: python assets/street_buildings/_work/publish_jakarta_urban.py
"""
import json, math, os, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0,'assets/street_buildings/_work')
import jakarta_urban
from lib import REG, build, MI, M
from render_native_depth import render as render_depth

ROOT=Path('assets/street_buildings')
GROUP={'taman':'taman','prop':'props','lokal':'jalan_lokal'}
pack={'projection':'isometric-2:1','style':'v6b','pack':'jakarta-urban-v1',
      'revision':1,'aliases':jakarta_urban.ALIASES,'assets':[]}
preview=[]
for name in sorted(REG):
    if name not in jakarta_urban.__dict__:  # registrations are from decorators, not globals
        pass
# Limit to entries authored in the explicit new pack, not other imported families.
names=('lampu_taman_jakarta','tong_sampah_jakarta','hydrant_jakarta',
       'semak_kota_pagar','semak_kota_pendek','semak_kota_rimbun',
       'rumput_kota_rumpun','rumput_kota_hampar','aspal_patch_jakarta',
       'selokan_lurus','selokan_belok','selokan_simpang','selokan_grill',
       'sungai_lurus','sungai_tepi_kiri','sungai_tepi_kanan','sungai_belok')
for name in names:
    a=REG[name]
    d=ROOT/GROUP[a['group']];d.mkdir(parents=True,exist_ok=True)
    variants={}
    for ori in a['oris']:
        img,gl,pivot,anchor=build(name,ori)
        fn=f'{name}_{ori}.png'
        p=d/fn
        Image.fromarray(img,'RGBA').save(p,optimize=True)
        with Image.open(p) as im:
            assert im.mode=='RGBA' and im.getbbox(),str(p)
            assert set(im.getchannel('A').getdata()).issubset({0,56,255}),name
        render_depth(name,ori)
        gname=f'{name}_{ori}__glow.png'
        if gl[...,3].any():
            Image.fromarray(gl,'RGBA').save(d/gname,optimize=True)
        variants[ori]={'file':f'{GROUP[a["group"]]}/{fn}',
            'size':[img.shape[1],img.shape[0]],
            'pivot':[int(pivot[0]),int(pivot[1])]}
        if ori=='sw':preview.append((name,Image.fromarray(img,'RGBA').resize((img.shape[1]*2,img.shape[0]*2),Image.Resampling.NEAREST)))
    w,h=variants['sw']['size']
    pack['assets'].append({'id':name,'file':'pipeline:'+name,'label':name.replace('_',' ').title(),
        'group':a['group'],'source':'pipeline-street','published':True,'pack':'jakarta-urban-v1',
        'footprint':[a['W'],a['D']],'collision':name.startswith(('hydrant','tong_sampah','lampu','semak')),
        'note':a['note'],'size':[w,h],'pivot':variants['sw']['pivot'],
        'width':round(w*math.sqrt(2)/64,4),'height':round(h*math.sqrt(2)/64*2/math.sqrt(3),4),
        'variants':variants})
cat=ROOT/'jakarta_urban_catalog.json'
cat.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n')
# Contact sheet: 4×-nearest image gallery on dark neutral backdrop.
from PIL import ImageDraw
cols=4; cellw=260;cellh=300
sheet=Image.new('RGBA',(cols*cellw,math.ceil(len(preview)/cols)*cellh),(29,36,48,255))
dr=ImageDraw.Draw(sheet)
for i,(name,img) in enumerate(preview):
    x=(i%cols)*cellw;y=(i//cols)*cellh
    if img.width>cellw-10 or img.height>cellh-45:
        k=min((cellw-10)//(img.width//2),(cellh-45)//(img.height//2))
        k=max(1,k)
        img=img.resize((img.width//2*k,img.height//2*k),Image.Resampling.NEAREST)
    sheet.alpha_composite(img,(x+(cellw-img.width)//2,y+max(0,(cellh-37-img.height)//2)))
    dr.text((x+8,y+cellh-23),name,fill=(235,240,245,255))
previewdir=ROOT/'previews';previewdir.mkdir(parents=True,exist_ok=True)
sheet.save(previewdir/'jakarta_urban_contact.png',optimize=True)
assert len(pack['assets'])==17
print('Published',len(pack['assets']),'Jakarta native assets and',sum(len(e['variants']) for e in pack['assets']),'facing sprites')
