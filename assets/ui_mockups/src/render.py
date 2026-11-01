import os,sys,base64,io,json
from PIL import Image
sys.path.insert(0,'.')
import ui,build
from ui import *
OUT=build.OUT; os.makedirs(OUT+'/2x',exist_ok=True); os.makedirs(OUT+'/3x',exist_ok=True); os.makedirs(OUT+'/1x_native',exist_ok=True); os.makedirs(OUT+'/667x375',exist_ok=True)
HOTS={}
def save(name,im,both=True):
    im=im.convert('RGB'); im.save(f'{OUT}/1x_native/{name}.png')
    im.resize((im.width*2,im.height*2),Image.NEAREST).save(f'{OUT}/{name}.png')
    im.resize((im.width*3,im.height*3),Image.NEAREST).save(f'{OUT}/3x/{name}.png')
order=['01b_hud_usulan_baymax']
S=[x for x in build.SCREENS]
S=[s for s in S if s[0]!='01b_hud_usulan_baymax']; S.insert(1,[x for x in build.SCREENS if x[0]=='01b_hud_usulan_baymax'][0])
imgs={}
for n,l,f in S:
    im=f(844,390); HOTS[n]=list(ui.HOT); imgs[n]=im; save(n,im)
    im2=f(667,375).convert('RGB'); im2.resize((667*2,375*2),Image.NEAREST).save(f'{OUT}/667x375/{n}_667x375@2x.png')
os.rmdir(OUT+'/2x')
json.dump({'screens':[(n,l) for n,l,_ in S],'hot':HOTS},open('build/uimock/hots.json','w'))
import pickle; pickle.dump({n:imgs[n].convert('RGB') for n in imgs},open('build/uimock/imgs.pkl','wb'))
print('done',len(S))
