from scene import *
def closeup():
    S=Scene(11,28,12,34,300)
    for r in (29.35,25.35,21.35): S.put('lorong_lurus_sw',20.0,r,ground=True)
    S.put('lorong_tikungan_sw',20.0,18.35,ground=True)
    S.put('gapura_gang_sw',20.0,31.05)
    for n,r in [('lapak_tas_se',29.6),('lapak_jam_dinding_se',27.6),('lapak_aksesori_se',25.6),('lapak_tas_b_se',23.6)]: S.put(n,18.25,r)
    S.put('toko_loak_se',17.25,20.6)
    for n,c,r in [('lapak_jam_tangan_nw',21.75,29.6),('lapak_mainan_nw',21.75,27.6),('motor_parkir_merah_nw',21.5,25.6),('lapak_barang_bekas_nw',21.75,23.6)]: S.put(n,c,r)
    S.put('kardus_tumpuk_se',22.15,25.2); S.put('bangku_plastik_biru_se',22.25,26.3); S.put('pedagang_duduk_b_nw',22.35,28.3)
    S.put('warung_madura_se',22.6,20.6)
    for n,c,r in [('rumah_kampung_b_se',14.4,29.8),('rumah_kampung_c_se',14.4,26.6),('rumah_kampung_e_se',14.4,23.4),('rumah_kampung_a_sw',16.0,16.2),('rumah_kampung_d_sw',23.5,16.6),('rumah_kampung_c_sw',26.0,20.0)]: S.put(n,c,r)
    S.put('pos_ronda_se',25.5,23.5); S.put('jemuran_se',24.6,27.5); S.put('pot_tanaman_se',16.7,31.0); S.put('pot_tanaman_se',23.0,31.0)
    S.put('motor_parkir_hitam_se',16.5,32.0); S.put('tiang_listrik_se',22.75,30.9); S.put('tiang_listrik_se',23.0,22.6)
    S.cables.append((22.75,30.9,23.0,22.6,222)); S.cables.append((23.0,22.6,23.2,15.0,222))
    S.put('pohon_kiara_payung',25.8,30.6); S.put('pohon_mahoni_M',13.0,32.0)
    S.put('tembok_gang_b_se',24.7,25.2)
    def gz(c,r): return (r<31.35)
    img,glow=S.render(street_ground(gz),11,28,12,34)
    return img,glow
img,glow=closeup()
a=np.array(img); ys,xs=np.nonzero(a[...,3]); box=(xs.min(),ys.min(),xs.max()+1,ys.max()+1); img=img.crop(box); glow=glow.crop(box)
bg=Image.new('RGBA',img.size,(42,158,82,255)); bg.alpha_composite(img); img=bg
# tighten to the lane area
W,Hh=img.size; print(W,Hh)
img.save(f'{OUT}/_work/closeup_full_1x.png'); glow.save(f'{OUT}/_work/closeup_glow.png')
