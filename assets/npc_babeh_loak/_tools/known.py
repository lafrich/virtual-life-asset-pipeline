import re,glob,json,numpy as np
from PIL import Image
s=open('game/index_extract.txt',errors='ignore').read()
K={'index':set(h.upper() for h in re.findall(r'#[0-9A-Fa-f]{6}\b',s))}
def pngs(pat):
    out=set()
    for f in glob.glob(pat,recursive=True):
        try:
            a=np.array(Image.open(f).convert('RGBA')).reshape(-1,4); a=a[a[:,3]==255][:,:3]
            if len(a)>2_000_000: a=a[::7]
            u=np.unique(a,axis=0); out|={'#%02X%02X%02X'%tuple(c) for c in u}
        except Exception as e: pass
    return out
K['game_assets']=pngs('game/assets/chars/**/*.png')|pngs('game/assets/env/**/*.png')|pngs('game/assets/pets/**/*.png')|pngs('game/assets/vehicles/**/*.png')
K['v6b_npc']=pngs('chars-iso/v6b/live/npc/*_sheet.png')|pngs('chars-iso/v6b/live/game/**/*.png')
K['preview_npcs']=pngs('assets/npc_pak_ogah/frames/*.png')|pngs('assets/npc_manusia_silver/frames/*.png')
K['street']=pngs('assets/street_buildings/pasar_loak/*.png')|pngs('assets/street_buildings/props/*.png')
json.dump({k:sorted(v) for k,v in K.items()},open('assets/npc_babeh_loak/_tools/known.json','w'))
for k,v in K.items(): print(k,len(v))
