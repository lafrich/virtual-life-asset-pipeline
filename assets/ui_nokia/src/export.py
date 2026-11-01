import base64,io,json,sys
from playwright.sync_api import sync_playwright
from PIL import Image
OUT='assets/ui_nokia/'
T0=1793000000000
SHOTS=[ # name, key sequence, extra JS after keys
 ('01_standby',[],''),
 ('02_menu',['OK'],''),
 ('02b_menu_scroll',['OK','D','D','D','D','D','D'],''),
 ('03_dompet',['OK','1'],''),
 ('03b_dompet_detail',['OK','1','OK'],''),
 ('04_skill',['OK','2'],''),
 ('04b_skill_detail',['OK','2','OK'],''),
 ('05_kursus',['OK','3'],''),
 ('05b_kursus_detail',['OK','3','OK'],''),
 ('05c_kursus_bayar',['OK','3','OK','L'],''),
 ('05d_kursus_progress',['OK','3','OK','L','L'],'VL.ST.fakeNow+=18000'),
 ('05e_kursus_selesai',['OK','3','OK','L','L'],'VL.ST.fakeNow+=95000'),
 ('06_marketplace',['OK','4'],''),
 ('06b_market_beli',['OK','4','1'],''),
 ('06c_market_item',['OK','4','1','OK'],''),
 ('06d_market_jual',['OK','4','2'],''),
 ('06e_market_harga',['OK','4','2','OK','1','5','0','0','0','0'],''),
 ('06f_market_listing',['OK','4','3'],''),
 ('07_furnitur',['OK','5'],''),
 ('07b_furnitur_detail',['OK','5','OK'],''),
 ('07c_furnitur_dibeli',['OK','5','OK','L','L'],''),
 ('08_peta',['OK','6'],''),
 ('09_kontak',['OK','7'],''),
 ('09b_kontak_detail',['OK','7','OK'],''),
 ('10_profil',['OK','8'],''),
 ('11_pengaturan',['OK','9'],''),
 ('11b_kontras',['OK','9','4'],''),
 ('12_hp_tertutup',['END'],''),
]
def run(page,dev,keys,extra,pressed=None):
    return page.evaluate("""([dev,keys,extra,T0,pressed])=>{VL.reset();VL.ST.clock='10:24';VL.ST.fakeNow=T0;
      for(const k of keys)VL.press(k); if(extra)eval(extra); VL.setPressed(pressed);
      const c=document.createElement('canvas');const D=VL.DEV[dev];c.width=D.W;c.height=D.H;
      const img=new Image();img.src=BG[dev];return new Promise(r=>{img.onload=()=>{VL.compose(c.getContext('2d'),dev,img);r(c.toDataURL())}})}""",[dev,keys,extra,T0,pressed])
def toimg(d): return Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).convert('RGB')
if __name__=='__main__':
    import os
    for d in ['1x_native','667x375']: os.makedirs(OUT+d,exist_ok=True)
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path='/usr/bin/google-chrome'); page=b.new_page()
        page.goto('file://'+OUT+'prototype.html'); page.wait_for_timeout(300)
        only=sys.argv[1:]
        for n,k,e in SHOTS:
            if only and n not in only: continue
            im=toimg(run(page,'844',k,e)); im.save(OUT+'1x_native/'+n+'.png'); im.resize((im.width*2,im.height*2),Image.NEAREST).save(OUT+n+'.png')
            im=toimg(run(page,'667',k,e)); im.resize((im.width*2,im.height*2),Image.NEAREST).save(OUT+'667x375/'+n+'_667x375@2x.png')
        if not only:
            # GIF: menu scrolling with pressed key feedback
            seq=[([],None,900),(['OK'],'OK',500),(['OK'],None,600)]
            ks=['OK']
            for i in range(8): seq.append((ks+['D'],'D',220)); ks=ks+['D']; seq.append((ks,None,380))
            for i in range(3): seq.append((ks+['U'],'U',220)); ks=ks+['U']; seq.append((ks,None,380))
            seq.append((ks+['OK'],'OK',300)); ks=ks+['OK']; seq.append((ks,None,1100))
            seq.append((ks+['R'],'R',220)); ks=ks+['R']; seq.append((ks,None,600))
            seq.append((ks,'END',220)); seq.append((ks+['END'],None,1200))
            frames=[];durs=[]
            for keys,pr,dur in seq:
                im=toimg(run(page,'844',keys,'',pr))
                frames.append(im.crop((250,0,594,390)).resize((688,780),Image.NEAREST)); durs.append(dur)
            pal=[f.convert('P',palette=Image.ADAPTIVE,colors=128) for f in frames]
            pal[0].save(OUT+'13_menu_scroll.gif',save_all=True,append_images=pal[1:],duration=durs,loop=0,optimize=True)
            # phone-only render for button map (3x)
            im=toimg(run(page,'844',['OK'],'')); ox=(844-244)//2; oy=(390-366)//2
            im.crop((ox-2,oy-2,ox+246,oy+368)).save('/tmp/phone_only.png')
            json.dump(page.evaluate("({K:Object.fromEntries(Object.entries(VL.KEYS).map(([k,v])=>[k,v.bb])),ox:%d,oy:%d})"%(ox,oy)),open('/tmp/keys.json','w'))
        b.close()
