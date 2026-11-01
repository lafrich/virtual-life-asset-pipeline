# NPC Pemuda Golda – "titik terendah" (PREVIEW – belum diintegrasikan / belum di-deploy)

Pemuda duduk di kursi plastik hitam depan Indomaret, minum kopi Golda, mood SEDIH. Gaya v6b (badan/kepala/ekspresi `sad` dari generator
game; tanpa outline hitam; cahaya dari kiri; bayangan alpha 56; alpha 0/56/255). Frame 64×112, pivot (32,100) = titik lantai di bawah kursi.
4 arah: se, ne digambar; sw / nw = cermin.

Ciri (dari foto): kaos lengan panjang hitam, topi navy, kacamata hitam (lensa gelap + kilau 1 px), botol Golda (tutup emas, label krem/kopi),
celana gelap, sepatu sneakers.

Mood sedih: alis turun & mulut melengkung turun (ekspresi `sad`, `sleepy` saat menghela napas), badan merosot 1–2 px sementara kepala tetap
naik dan condong ke belakang (mendongak, menatap kosong ke atas), bahu turun, hela napas panjang (f1 dada naik, f3 badan merosot + uap napas),
minum pelan (6 frame, ~450 ms). Tidak ada pose ceria.

| animasi | frame | isi |
|---|---|---|
| sit_sad | 4 (700 ms) | idle duduk sedih + hela napas, botol dipegang di pangkuan |
| drink | 6 (450 ms) | angkat botol pelan → seruput (kepala makin mendongak) → turun |

File: `frames/pemuda_golda_<arah>_<animasi>_f<i>.png` (kursi sudah terpanggang di frame), `poses/` (`*_sit_sad`, `*_drink_key`),
`poses/prop_kursi_hitam_<arah>.png` (kursi terpisah, 64×112, pivot 32,100), `pemuda_golda_sheet_4x.png`, `pemuda_golda_4x_darkbg.png`,
`pemuda_golda_<animasi>_4views_4x.gif`. Kode: `make_pemuda_golda.py`.
Hex baru: tidak ada.

Keterbatasan: mata tertutup kacamata hitam dan alis sebagian tertutup topi, jadi kesedihan terutama terbaca dari mulut, kepala mendongak,
dan badan merosot; dari belakang (ne/nw) ekspresi tidak terlihat, hanya postur, botol di samping kepala, dan uap napas. Tulisan "Golda"
tidak terbaca (botol 2–3 px). Jika kursi terpisah dipakai bersama frame, kursi dobel – pakai salah satu.
