"""Build 200 Indonesian placement-ready assets using the canonical Loc/Spr renderer.

Examples:
  python assets/street_buildings/_work/publish_indonesia_200.py --shard 0
  python assets/street_buildings/_work/publish_indonesia_200.py --merge

Four independent shards, each exactly 50 IDs; merges are published only if
all 200 PNG + depth output groups are present and valid.
"""
from __future__ import annotations
import argparse,json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
from lib import build
import indonesia_200_renderer as recipe
from indonesia_200_npc_slots import make as npc_transport
from render_native_depth import render as render_depth,GROUPDIR

ROOT=Path('assets/street_buildings')
WORK=ROOT/'_work'
PACK='indonesia-200-v1'
N_SHARDS=4
items=recipe.register()

def check(path):
 assert path.is_file() and path.stat().st_size>32,path
 with Image.open(path) as im:
  assert im.mode=='RGBA' and im.getbbox() and 0<im.width<=8192 and 0<im.height<=8192,path
  assert set(im.getchannel('A').getdata()).issubset({0,56,255}),path
  return list(im.size)

def one(s):
 name=s['id']
 group=s['group']
 entry=dict(id=name,file='pipeline:'+name,label=s['label'],
  group=group,source='pipeline-street',pack=PACK,country='ID',published=True,
  note=s['label']+' — Indonesian environment, native isometric 2:1',
  category=s['category'],assetKind=s['kind'],
  objectCategory=('plant' if s['category']=='tanaman' else
    'vehicle' if s['category']=='transport' else
    'building' if s['category'] in ('warung','bangunan') else
    'furniture' if s['category']=='pasar' and s['kind'] in ('kursi','meja','rak') else
    'street'),
  collision=s['category'] in ('transport','warung','bangunan','publik'),
  footprint=[s['W'],s['D']],variants={})
 slots=npc_transport(s)
 if slots:entry['npcTransport']=slots
 for direction in s['oris']:
  art,glow,pivot,_=build(name,direction)
  out=ROOT/GROUPDIR[group]/(name+'_'+direction+'.png')
  out.parent.mkdir(parents=True,exist_ok=True)
  Image.fromarray(art,'RGBA').save(out,optimize=True)
  size=check(out)
  assert len(pivot)==2 and 0<=pivot[0]<=size[0] and 0<pivot[1]<=size[1],(name,direction,pivot,size)
  if glow[...,3].max():
   Image.fromarray(glow,'RGBA').save(out.with_name(out.stem+'__glow.png'),optimize=True)
  render_depth(name,direction)
  depth=out.with_name(out.stem+'__depth.png')
  assert check(depth)==size,(out,depth)
  entry['variants'][direction]=dict(file=str(out.relative_to(ROOT)),size=size,
    pivot=[int(pivot[0]),int(pivot[1])])
 first=entry['variants'].get('sw') or entry['variants'].get('se')
 entry['size']=first['size'];entry['pivot']=first['pivot']
 entry['width']=round(first['size'][0]/50,3)
 entry['height']=round(first['size'][1]/50,3)
 return entry

def shard(n):
 assert 0<=n<N_SHARDS
 queue=[s for i,s in enumerate(items) if i%N_SHARDS==n]
 assert len(queue)==50
 entries=[]
 for i,s in enumerate(queue,1):
  e=one(s);entries.append(e)
  if i%5==0:print('SHARD',n,i,'/ 50 sprites:',sum(len(x['variants']) for x in entries),flush=True)
 path=WORK/f'indonesia_200_batch_{n}.json'
 path.write_text(json.dumps(entries,indent=2,ensure_ascii=False)+'\n')
 print('Shard',n,'OK:',len(entries),'native objects and',sum(len(x['variants']) for x in entries),'directions')

def merge():
 entries=[]
 for n in range(N_SHARDS):
  part=WORK/f'indonesia_200_batch_{n}.json'
  assert part.is_file(),('missing batch file',part)
  rows=json.loads(part.read_text())
  assert len(rows)==50,(n,len(rows))
  entries+=rows
 reference={s['id']:i for i,s in enumerate(items)}
 entries.sort(key=lambda e:reference[e['id']])
 assert len(entries)==200 and len({s['id'] for s in entries})==200
 assert all(s['published'] and s['pack']==PACK for s in entries)
 total=0
 for entry in entries:
  assert entry['id'] in reference
  assert entry['file']=='pipeline:'+entry['id']
  assert entry['variants']
  for direction,variant in entry['variants'].items():
   out=ROOT/variant['file']
   dep=out.with_name(out.stem+'__depth.png')
   assert check(out)==check(dep)==variant['size']
   x,y=variant['pivot'];w,h=variant['size']
   assert 0<=x<=w and 0<y<=h
   total+=1
 # A real named asset must have its own distinctive thumbnail art.
 # Repeated PNG bytes across different IDs mean the generator has silently
 # substituted the same generic model; fail the entire publish rather than
 # showing misleading thumbnails in Semesta.
 signatures={}
 duplicates=[]
 for entry in entries:
  first=entry['variants'].get('sw') or entry['variants'].get('se')
  p=ROOT/first['file']
  digest=hashlib.sha256(p.read_bytes()).hexdigest()
  if digest in signatures:
   duplicates.append((signatures[digest],entry['id']))
  signatures[digest]=entry['id']
 assert not duplicates,('Different Indonesia assets share identical artwork',duplicates)
 print('ART DIVERSITY OK:',len(signatures),'unique native sprite thumbnails')
 dest=ROOT/'indonesia_200_catalog.json'
 dest.write_text(json.dumps(dict(version=2,projection='isometric-2:1',
   tile=[64,32],palette='v6b-existing-only',count=200,pack=PACK,
   assets=entries),indent=2,ensure_ascii=False)+'\n')
 # 10 contact sheets of 20 objects, always real rendered PNG artwork.
 for page in range(10):
  sub=entries[page*20:(page+1)*20]
  cellw,cellh=226,214
  sheet=Image.new('RGB',(5*cellw,4*cellh),(28,38,52))
  draw=ImageDraw.Draw(sheet)
  for i,entry in enumerate(sub):
   im=Image.open(ROOT/(entry['variants'].get('sw') or entry['variants'].get('se'))['file']).convert('RGBA')
   im.thumbnail((206,171),Image.Resampling.NEAREST)
   xx=(i%5)*cellw+(cellw-im.width)//2
   yy=(i//5)*cellh+4+(171-im.height)//2
   sheet.paste(im,(xx,yy),im)
   label=entry['label']
   draw.text(((i%5)*cellw+8,(i//5)*cellh+181),label[:31],fill=(238,242,247))
  sheet.save(ROOT/f'indonesia_200_contact_{page+1:02}.png',optimize=True)
 print('PUBLISHED 200 NEW INDONESIAN SPRITES:',total,'real pixel-art views,',total,'native depth maps, 10 contact sheets')

if __name__=='__main__':
 parser=argparse.ArgumentParser()
 group=parser.add_mutually_exclusive_group(required=True)
 group.add_argument('--shard',type=int)
 group.add_argument('--merge',action='store_true')
 args=parser.parse_args()
 shard(args.shard) if args.shard is not None else merge()
