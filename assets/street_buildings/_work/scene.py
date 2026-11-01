import json
from lib import *
from PIL import ImageDraw
OUT='assets/street_buildings'; VA='assets'
MAN=json.load(open(f'{OUT}/manifest.json'))['sprites']
VMAN=json.load(open(f'{VA}/street_vehicles/manifest.json'))['sprites']
TMAN=json.load(open(f'{VA}/vegetation_kebonsirih/manifest.json'))['sprites']
def load(key):
    if key in MAN:
        e=MAN[key]; im=Image.open(f"{OUT}/{e['file']}"); gl=Image.open(f"{OUT}/{e['glow']}") if 'glow' in e else None; return im,gl,e['pivot']
    if key in VMAN:
        e=VMAN[key]; return Image.open(f"{VA}/street_vehicles/{e['file']}"),None,e['pivot_footprint_centre']
    e=TMAN[key]; return Image.open(f"{VA}/vegetation_kebonsirih/{e['file']}"),None,e['pivot']
class Scene:
    def __init__(s,c0,c1,r0,r1,hmax):
        ox=int((r1-c0)*32)+40; oy=int(hmax-(c0+r0)*16)+40
        W=int((c1-c0+r1-r0)*32)+80; H=int((c1+r1-c0-r0)*16+hmax)+80
        s.g=Spr(W,H,ox,oy); s.items=[]; s.ground_items=[]; s.cables=[]
    def put(s,key,c,r,ground=False,dk=0.0):
        (s.ground_items if ground else s.items).append((c+r+dk,key,c,r))
    def render(s,groundfn,c0,c1,r0,r1):
        s.g.top(c0,r0,c1,r1,0,groundfn,shift=0,ground=True)
        base,_=s.g.render(edges=False); img=Image.fromarray(base); glow=Image.new('RGBA',img.size,(0,0,0,0))
        for lst in (sorted(s.ground_items),sorted(s.items)):
            for dk,key,c,r in lst:
                im,gl,p=load(key); x=s.g.X(c,r)-p[0]; y=s.g.Y(c,r)-p[1]
                img.alpha_composite(im,(x,y))
                a=np.array(glow); m=np.zeros(a.shape[:2],bool); ia=np.array(im)[...,3]==255
                ys,xs=np.nonzero(ia); ys2=ys+y; xs2=xs+x; ok=(ys2>=0)&(ys2<a.shape[0])&(xs2>=0)&(xs2<a.shape[1]); a[ys2[ok],xs2[ok]]=0; glow=Image.fromarray(a)
                if gl is not None: glow.alpha_composite(gl,(x,y))
        dr=ImageDraw.Draw(img)
        for (ca,ra,cb,rb,z) in s.cables:
            pts=[]
            for k in range(41):
                t=k/40; c=ca+(cb-ca)*t; r=ra+(rb-ra)*t; pts.append((s.g.X(c,r),s.g.Y(c,r)-z+int(26*4*t*(1-t))))
            for dz,col in ((0,(42,50,66,255)),(6,(42,50,66,255)),(-5,(28,35,48,255))):
                dr.line([(x,y+dz) for x,y in pts],fill=col,width=1)
        return img,glow
def night(img,glow):
    a=np.array(img).astype(float); a[...,0]*=0.34; a[...,1]*=0.38; a[...,2]*=0.55
    g=np.array(glow).astype(float); al=g[...,3:4]/255.0
    a[...,:3]=np.minimum(255,a[...,:3]+g[...,:3]*al*0.95)
    return Image.fromarray(a.astype(np.uint8))
# ------------------------------------------------ ground (mock coords = game rotated 180: c_m=43-c, r_m=69.05-r)
def street_ground(gang_zone):
    def f(c,r):
        m=np.full(c.shape,MI['GRASS'],np.int16); t=np.where(H(c,r)<6,3,2).astype(np.int8)
        def setm(mask,mat,tone):
            nonlocal m,t; m=np.where(mask,MI[mat],m).astype(np.int16); t=np.where(mask,tone,t).astype(np.int8)
        gz=gang_zone(c,r); gm,gt=gangfloor_(c,r); m=np.where(gz,gm,m).astype(np.int16); t=np.where(gz,gt,t).astype(np.int8)
        pm,pt=pave(c,r); sw=(r>=31.35)&(r<32.5); m=np.where(sw,pm,m).astype(np.int16); t=np.where(sw,pt,t).astype(np.int8)
        setm((r>=32.05)&(r<32.5)&(c>=18.6)&(c<22.4)&(((c*8)%1)<0.7),'YEL',3)
        setm((r>=32.5)&(r<32.75),'SENG',3); setm((r>=32.5)&(r<32.75)&((np.floor(c*1.0)%2)==0),'DARK',2)
        asp=(r>=32.75)&(r<36.3); setm(asp,'ASPH',2); setm(asp&(H(c,r)<5),'ASPH',1); setm(asp&(H(c,r)>93),'ASPH',3)
        setm(((r>=32.9)&(r<32.97))|((r>=36.08)&(r<36.15)),'LITE',2)
        zeb=(c>=19.1)&(c<21.8)&(r>=32.98)&(r<36.07)
        setm((r>=34.47)&(r<34.58)&((c%2)<1)&~zeb,'YEL',3)
        setm(zeb&(((21.8-c)%0.6)<0.32),'LITE',3)
        setm((r>=36.3)&(r<36.55),'SENG',3); setm((r>=36.3)&(r<36.55)&((np.floor(c)%2)==0),'DARK',2)
        nsw=(r>=36.55); pm,pt=pave(c,r); m=np.where(nsw,pm,m).astype(np.int16); t=np.where(nsw,pt,t).astype(np.int8)
        setm((r>=36.55)&(r<37.0)&(c>=18.6)&(c<22.4)&(((c*8)%1)<0.7),'YEL',3)
        setm((r>=36.8)&(r<37.1)&~((c>=18.6)&(c<22.4)),'YEL',2)
        return m,t
    return f
def H(c,r): return ((np.floor(c*16).astype(np.int64)*73856093)^(np.floor(r*16).astype(np.int64)*19349663))%97
from gang import gangfloor as gangfloor_
def mock():
    S=Scene(-2,74,13,38.6,980)
    B=[('kantor_b',-0.5,6,6),('masjid',5.5,9,7),('ruko_a',14.5,3,6),('ruko_b',22.5,3,6),('ruko_c',25.5,3,6),('kantor_a',28.5,7,6),('bank_bca',35.5,6,6),
       ('kafe_blue_doors',41.5,5,5),('indomaret',46.5,6,6),('hotel',52.5,8,6),('mall',60.5,12,7)]
    for n,c0,W,D in B: S.put(f'{n}_sw',c0+W/2,31.35-D/2)
    gang_items(S)
    # back of the row: kampung roofs visible between towers
    for i,(n,c,r) in enumerate([('rumah_kampung_c_sw',8.0,21.0),('rumah_kampung_a_sw',11.5,21.5),('rumah_kampung_e_sw',36.5,23.0),('rumah_kampung_b_sw',44,24.0),('rumah_kampung_d_sw',58,23.5)]): S.put(n,c,r)
    # street furniture
    for c in (3.5,12.5,26.8,40.8,54.8,66.0): S.put('tiang_listrik_sw',c,32.2)
    poles=[3.5,12.5,26.8,40.8,54.8,66.0]
    for a,b in zip(poles,poles[1:]): S.cables.append((a,32.2,b,32.2,222))
    for i,(c,t) in enumerate([(1.2,'pohon_angsana_M'),(14.0,'pohon_mahoni_M'),(28.3,'pohon_ketapang_kencana'),(35.3,'pohon_angsana_M'),(46.2,'pohon_kiara_payung'),(52.2,'pohon_mahoni_M'),(60.6,'pohon_angsana_M'),(72.0,'pohon_ketapang_kencana')]): S.put(t,c,31.95)
    for c,t in [(4,'pohon_asam_M'),(15,'pohon_trembesi_M'),(33,'pohon_asam_S'),(48,'pohon_angsana_M'),(63,'pohon_asam_M')]: S.put(t,c,38.2)
    # crossing signals (rotated: game se<->mock nw, game sw<->mock ne)
    S.put('lampu_pejalan_hijau_sw',18.4,32.15); S.put('lampu_pejalan_hijau_sw',22.6,32.15)
    S.put('lampu_pejalan_hijau_ne',18.45,36.85); S.put('lampu_pejalan_hijau_ne',22.55,36.85)
    S.put('lampu_lalin_merah_nw',17.9,32.3); S.put('lampu_lalin_merah_se',23.1,36.75)
    # traffic (cars stopped before the zebra on red)
    for k,c,r in [('sedan_red_nw',25.5,36.0),('bus_transjakarta_nw',46,36.0),('taxi_bluebird_nw',62,36.0),('mpv_silver_se',15.6,34.2),('hatchback_orange_se',6,34.2),('sedan_teal_se',36,34.2),('van_cream_se',57,34.2)]: S.put(k,c,r)
    img,glow=S.render(street_ground(lambda c,r:(c>=14)&(c<31)&(r<25.35)|((c>=17.5)&(c<22.5)&(r<31.35))),-2,74,13,38.6)
    return S,img,glow
def gang_items(S,full=False):
    S.put('gapura_gang_sw',20.0,31.05)
    for r in (29.35,25.35,21.35): S.put('lorong_lurus_sw',20.0,r,ground=True)
    S.put('lorong_ujung_sw',20.0,18.35,ground=False,dk=-1.0)
    for n,r in [('lapak_tas_se',29.6),('lapak_jam_dinding_se',27.6),('lapak_tas_b_se',25.6),('lapak_aksesori_se',23.6)]: S.put(n,18.25,r)
    S.put('toko_loak_se',17.25,20.6)
    for n,c,r in [('lapak_jam_tangan_nw',21.75,29.6),('lapak_mainan_nw',21.75,27.6),('motor_parkir_hitam_nw',21.5,25.6),('lapak_barang_bekas_nw',21.75,23.6)]: S.put(n,c,r)
    S.put('kardus_tumpuk_se',22.1,25.4); S.put('bangku_plastik_merah_se',20.85,26.5)
    S.put('warung_madura_se',22.5,21.1)
    S.put('tembok_gang_a_se',17.35,30.0) if False else None
if __name__=='__main__':
    S,img,glow=mock()
    a=np.array(img); ys,xs=np.nonzero(a[...,3]); img=img.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1)); glow=glow.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
    bg=Image.new('RGBA',img.size,(42,158,82,255)); bg.alpha_composite(img); img=bg
    img.resize((img.width*2,img.height*2),Image.NEAREST).save(f'{OUT}/previews/mock_jalan_seberang_2x.png'); img.save(f'{OUT}/previews/mock_jalan_seberang_1x.png')
    glow.save(f'{OUT}/_work/mock_glow.png'); print(img.size)
