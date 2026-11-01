# NPC "Pak Ogah" (persimpangan jalan) - gaya v6b, PREVIEW SAJA (belum diintegrasikan, tidak di-deploy)
Build: `python3 make_pak_ogah.py` (pakai `job_common.py` di folder ini -> generator game v6b: live_v6b / npc_v6b, panggilan sama
dengan npc_v6b.build, termasuk cap() dan mask_face() bawaan NPC). Badan, kepala, wajah, topi, masker, baris idle (4 f) dan walk (6 f)
= output generator. Ditambahkan di atasnya: rompi hi-vis (lime + strip oranye vertikal x2 + pita bawah, ritsleting depan di se),
saku kargo di paha, sandal jepit (kaki kulit + tali teal + sol teal gelap), bendera merah bertiang kayu, lengan pose kerja, peluit.
Frame 64x112, pivot (32,100), bayangan ellipse datar (0,0,0,56) rx 11 ry 2.4 seperti game. Alpha hanya 0/56/255. sw/nw = mirror.

## File
- frames/pak_ogah_<se|sw|ne|nw>_<anim>_f<i>.png : idle f0-3, walk f0-5, wave_flag f0-5 (loop), stop_car f0-2 (f1 = tiup peluit)
- poses/pak_ogah_<view>_idle.png, _wave_flag_key.png, _stop_car_key.png ; poses/prop_flag_pole.png (bendera bertiang terpisah)
- pak_ogah_sheet_4x.png (semua anim x 4 arah + prop, transparan) ; pak_ogah_work_se_4x_darkbg.png (pose kerja se, latar gelap)
- GIF 4x transparan (4 arah berdampingan): pak_ogah_idle_4views_4x.gif, _walk_, _wave_flag_, _stop_car_

## Palet
Generator v6b: kulit 'medium', kaus lengan panjang 'navy' #27386B, celana 'walnut' #6B4F3A, topi 'night', rambut navy-black.
Masker: #7FB2DE / #3E6FA8 / #27386B (pal6 sky, steel, navy). Strip oranye: #FFB36B #FF8A3D #E0662A #A9441F (ramp Gfunk).
Bendera: #F07A7E #E5484D #B8352E #8E1F24 #7A2E35. Tiang: #94704F #6B4F3A #5E4636 #3D2A1E. Sandal: #6FA9A9 #3D7A80 #2A5266.
Peluit: #E7EBF2 #B9C0CC #8D97A8 #5A6577.
**Hex BARU (terpaksa, tidak ada lime di palet v6b):** rompi #E9F98A #C8E63C #A6C82E #7A9A22 #556E1A.

## Keterbatasan
- Lengan pose kerja digambar sebagai tabung 3 px (shader kiri-terang), bukan lengan generator; sambungan bahu sedikit lebih kaku.
- Kaus di game biru navy; di foto lebih biru-ungu (dipilih navy agar tak menambah hex).
- stop_car: tangan yang menahan mobil = lengan jauh; di se/sw telapak terbuka kecil (3x4 px) di samping wajah, di ne/nw terlihat dari belakang.
- Peluit hanya terlihat di se/sw (wajah tidak tampak di ne/nw). Di frame walk, kain bendera hanya beriak sedikit, tiang tetap tegak.
- Kain bendera pada wave_flag f1/f4 sengaja tipis (sedang berbalik arah).
- GIF: alpha 56 bayangan diratakan jadi abu gelap (GIF hanya 1-bit alpha); PNG tetap alpha 56.
