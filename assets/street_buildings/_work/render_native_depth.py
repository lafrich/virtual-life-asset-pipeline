"""Render pixel-accurate native depth maps for published Kebon Sirih street assets.

Every sprite in the source pipeline is a raster projection of real (c,r,z)
surfaces. Spr.d retains the *winning surface depth* at each opaque pixel.
This tool exports that value as two lossless 8-bit channels so Semesta can
restore correct occlusion without pretending the whole PNG is a vertical wall.

The sprite PNGs and their visual appearance are NOT changed.
Encoding is RG(16): D = (R * 256 + G)/65535 * 104 - 24.
D is the absolute pipeline d = c+r+z/32, BEFORE pivot subtraction.
"""
from __future__ import annotations
import os
from pathlib import Path
import numpy as np
from PIL import Image
import roadside,gang,signals,parkir,jalan_lokal,pendek,taman
from lib import REG,mk,Loc
D_MIN,D_MAX=-24.,80.
ROOT=Path('assets/street_buildings')
GROUPDIR={
 'jalan':'jalan_besar','loak':'pasar_loak','kampung':'kampung',
 'gang':'gang','prop':'props','sinyal':'sinyal','parkir':'parkir',
 'lokal':'jalan_lokal','pendek':'jalan_besar/pendek','taman':'taman'
}
# Must match the published catalog; non-public sprites remain untouched.
ASSETS=(
 'kantor_a','kantor_b','indomaret','ruko_a','ruko_b','ruko_c',
 'bank_bca','hotel','mall','masjid','kafe_blue_doors',
 'warung_madura','rumah_kampung_a','rumah_kampung_b',
 'rumah_kampung_c','rumah_kampung_d','rumah_kampung_e',
 'pos_ronda','gapura_gang','tiang_listrik','tiang_listrik_polos',
 'tiang_trafo','lampu_taman','lampu_pejalan_merah',
 'lampu_lalin_merah','bangku_taman','tong_sampah','meja_taman',
 'gazebo','toko_loak','lapak_tas','lapak_aksesori',
 'lapak_barang_bekas','pot_tanaman'
)
def render(name,orientation):
 a=REG[name]
 base={'sw':'sw','se':'se','ne':'sw','nw':'se'}[orientation]
 back=orientation in ('ne','nw')
 spr=mk(a['W'],a['D'],a['Hmax'])
 loc=Loc(spr,base,a['W'],a['D'])
 if back and a['group']=='sinyal':
  a['fn'](loc,back=True)
 elif back:
  loc.flip=True
  a['fn'](loc)
 else:
  a['fn'](loc)
 raw,glow=spr.render()
 alpha=np.maximum(raw[...,3],glow[...,3])
 ys,xs=np.nonzero(alpha)
 if not len(xs):raise RuntimeError('No opaque pixel: '+name+'_'+orientation)
 x0,x1=int(xs.min()),int(xs.max())+1
 y0,y1=int(ys.min()),int(ys.max())+1
 if (x1-x0)%2:x1+=1
 if (y1-y0)%2:y1+=1
 depth=spr.d[y0:y1,x0:x1]
 valid=(spr.m[y0:y1,x0:x1]>=0)
 body=depth[valid]
 if not len(body):raise RuntimeError('No body pixels: '+name+'_'+orientation)
 dmin,dmax=float(body.min()),float(body.max())
 if dmin < D_MIN+1 or dmax > D_MAX-1:
  raise RuntimeError(f'Depth range insufficient for {name}_{orientation}: {dmin:.2f} .. {dmax:.2f}')
 norm=np.rint((np.where(valid,depth,0.)-D_MIN)/(D_MAX-D_MIN)*65535).clip(0,65535).astype(np.uint16)
 out=np.zeros((*depth.shape,4),dtype=np.uint8)
 out[...,0]=(norm>>8).astype(np.uint8)
 out[...,1]=(norm&255).astype(np.uint8)
 out[...,2]=np.where(valid,255,0).astype(np.uint8)
 out[...,3]=255
 path=ROOT/GROUPDIR[a['group']]/(name+'_'+orientation+'__depth.png')
 path.parent.mkdir(parents=True,exist_ok=True)
 Image.fromarray(out,'RGBA').save(path,optimize=True)
 base_path=ROOT/GROUPDIR[a['group']]/(name+'_'+orientation+'.png')
 if not base_path.is_file():
  raise RuntimeError('Missing published RGB sprite '+str(base_path))
 with Image.open(base_path) as src:
  if src.size != (depth.shape[1],depth.shape[0]):
   raise RuntimeError(f'Mismatched depth size for {name}_{orientation}: {src.size} vs {depth.shape[::-1]}')
 print(name+'_'+orientation,'size=',depth.shape[::-1],'d=',round(dmin,2),round(dmax,2),'depth=',path)

def main():
 count=0
 for name in ASSETS:
  if name not in REG:raise RuntimeError('Asset not found in canonical pipeline: '+name)
  for orientation in REG[name]['oris']:
   render(name,orientation)
   count+=1
 print('Validated',count,'native pixel-depth textures. No original sprite art changed.')
if __name__=='__main__':main()
