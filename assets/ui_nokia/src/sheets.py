import json,glob,os
from PIL import Image,ImageDraw,ImageFont
O='assets/ui_nokia/'
G='/usr/share/fonts/truetype/dejavu/'
f=lambda s,b=False:ImageFont.truetype(G+('DejaVuSans-Bold.ttf' if b else 'DejaVuSans.ttf'),s)
# ---- contact sheet: phone crop (1x native -> 1x) of every screen
fs=[p for p in sorted(glob.glob(O+'1x_native/*.png'))]
cols=7; cw,chh=256,396
sh=Image.new('RGB',(cols*cw+20,((len(fs)+cols-1)//cols)*chh+60),'#0B0E13'); d=ImageDraw.Draw(sh)
d.text((12,12),'Virtual Life · HP Nokia-style · semua layar (crop 1x dari layar 844x390, data contoh)',font=f(16,True),fill='#FFD166')
for i,p in enumerate(fs):
    n=os.path.basename(p)[:-4]; im=Image.open(p)
    im=im.crop((422-128,6,422+128,384)) if 'tertutup' not in n else im.crop((560,0,844,378)).resize((256,341),Image.NEAREST)
    x=10+(i%cols)*cw; y=46+(i//cols)*chh; sh.paste(im,(x,y)); d.text((x+4,y+380),n,font=f(12),fill='#E7EBF2')
sh.save(O+'00_contact_sheet.png')
# ---- button map
k=json.load(open('/tmp/keys.json')); ph=Image.open('/tmp/phone_only.png'); S=3
ph=ph.resize((ph.width*S,ph.height*S),Image.NEAREST)
W,H=1500,ph.height+80; im=Image.new('RGB',(W,H),'#10141B'); d=ImageDraw.Draw(im)
px=(W-ph.width)//2; py=50; im.paste(ph,(px,py))
d.text((20,14),'Peta tombol HP (Nokia-style) · semua navigasi lewat tombol fisik, tanpa tombol X',font=f(18,True),fill='#FFD166')
def c(bb): return (px+(bb[0]+bb[2])/2*S+2*S, py+(bb[1]+bb[3])/2*S+2*S)
def note(pt,side,y,title,lines,col='#FFD166'):
    x=40 if side=='L' else W-350; ex=x+310 if side=='L' else x-10
    d.line([pt,(ex,y+10)],fill=col,width=2); d.ellipse([pt[0]-5,pt[1]-5,pt[0]+5,pt[1]+5],outline=col,width=2)
    d.text((x,y),title,font=f(15,True),fill=col)
    for i,l in enumerate(lines): d.text((x,y+22+i*18),l,font=f(13),fill='#E7EBF2')
K=k['K']
note(c(K['L']),'L',540,'Softkey kiri',['Aksi label kiri-bawah LCD:','Menu · Pilih · Mulai · Beli · Ya · OK','(sama dengan tombol tengah)'])
note(c(K['R']),'R',540,'Softkey kanan',['Kembali 1 layar (label kanan-bawah)','Hapus 1 digit saat mengetik harga','Tutup = tutup HP (hanya di Standby)','Tidak (di layar konfirmasi)'])
nav=K['NAV']; cx=px+(nav[0]+nav[2])/2*S+2*S
note((cx,py+(193+2)*S),'R',300,'Atas',['Gulir naik (melingkar)','Kontras: tambah'])
note((cx,py+(209+2)*S),'L',330,'Tombol tengah (lampu biru)',['OK = sama dengan softkey kiri'],'#56C3F0')
note((cx,py+(224+2)*S),'R',420,'Bawah',['Gulir turun (melingkar)','Kontras: kurangi'])
note(c(K['CALL']),'L',700,'Call (hijau)',['Di Standby: buka Kontak','(cadangan untuk fitur panggil)'],'#3DDC84')
note(c(K['END']),'R',700,'End (merah)',['Dari layar mana pun: ke Standby','Di Standby: tutup HP','= satu-satunya "tutup" selain Tutup'],'#E5484D')
note(c(K['4']),'L',840,'Angka 1–9',['Menu bernomor: langsung buka item','(Menu, Marketplace, Pengaturan, list lain)','Standby: angka = Menu + item itu','Peta: 1–6 pilih landmark','Harga jual: ketik 0–9'])
note(c(K['#']),'R',1000,'*  0  #',['0: input angka','* dan #: belum dipakai (cadangan)'])
d.text((20,H-26),'Joystick, Action & Tas terkunci selama HP terbuka (ikon gembok di HUD yang digelapkan). Hanya satu layar HP aktif.',font=f(13),fill='#8D97A8')
im.save(O+'00_button_map.png'); print('ok')
