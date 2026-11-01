# barista_famima: mini game Barista FamiCafe (USULAN, preview)

Status: hanya aset preview. index.html tidak diubah, tidak ada deploy.
Gaya v6b: tanpa outline hitam, cahaya dari kiri, 4–5 tone, bayangan alpha 56, glow 90 (lampu mesin / layar kasir), tanpa anti-aliasing.

## Sumber menu (WebSearch, 1 Nov 2026)
- Rumah123, *Daftar Menu Kopi Family Mart Terbaru 2026* (25 Feb 2026). Isinya harga Regular/Large Kopi Series dan add-on Espresso Rp3.000.
  https://artikel.rumah123.com/daftar-menu-kopi-family-mart-terbaru-2026-enak-dan-murah
- IDN Times, *Daftar Menu Kopi di Family Mart*. Isinya Premium Chocolate dan Green Tea Latte Rp16.000/19.000.
  https://www.idntimes.com/food/dining-guide/fina-wahibatun-nisa-1/daftar-menu-kopi-di-family-mart
- MenuKuliner.net, FamilyMart Grand Indonesia. Isinya bahan tiap minuman, level gula No/Less/Normal/Extra, dan extra Espresso +Rp3.000.
  https://menukuliner.net/menu/323382/familymart-grand-indonesia
- Kompas.com, 1 Apr 2026, promo FamiCafé. Isinya nama menu: Premium Chocolate, Matcha Latte, KSK, Caramel Macchiato, Dolce Latte, Coconut Latte, Americano.
  https://www.kompas.com/jawa-barat/read/2026/04/01/084401788/promo-familymart-hari-ini-bayar-suka-suka-untuk-famicaf-beverage

## Menu dalam game (10 menu, Hot / Es, Regular / Large)

| id | nama | Regular | Large |
|---|---|---|---|
| americano | Americano | 13.000 | 16.000 |
| kopi_susu_keluarga | Kopi Susu Keluarga (gula aren) | 16.000 | 19.000 |
| cafe_latte | Cafe Latte | 16.000 | 19.000 |
| cappuccino | Cappuccino | 16.000 | 19.000 |
| caramel_macchiato | Caramel Macchiato | 16.000 | 19.000 |
| dolce_latte | Dolce Latte | 16.000 | 19.000 |
| vanilla_latte | Vanilla Latte | 16.000 | 19.000 |
| hazelnut_latte | Creamy Hazelnut Latte | 16.000 | 19.000 |
| premium_chocolate | Premium Chocolate (tanpa kopi) | 16.000 | 19.000 |
| matcha_latte | Matcha Latte (tanpa kopi) | 16.000 | 19.000 |

Double Shot menambah harga Rp3.000 (add-on Espresso dari sumber).

## Isi folder
- `npc/`: barista NPC 64x112, pivot (32,100), 4 arah (se, sw, ne, nw).
  - `barista_famima_sheet.png` memakai format game: 6 kolom, baris = animasi × 4 arah. Urutan animasi: idle 4, walk 6, giling 4, steam_tuang 4, seduh 4, serah 4, ramah 4.
  - Juga ada `_sheet_4x.png`, GIF 4 arah 4x per animasi, `frames/` (120 PNG), dan `manifest_npc.json`.
  - Seragam bergaya FamilyMart: kemeja putih, kerah dan manset hijau, apron hijau dengan tali biru, saku putih, name tag, topi hijau. Bukan logo asli.
- `props/`: 84 sprite isometrik dan file `__glow`. Pivot ada di `src/_props.json` dan manifest.
  - Grup famicafe, 4 arah: gelas_hot_R/L, cup_tutup_R/L, gelas_es_R/L, mesin_espresso (lampu glow), grinder, pitcher_susu, counter_barista (3x1, teks FAMICAFE), counter_kasir (2x1, layar glow, EDC).
  - Grup famicafe_label, arah sw: `cup_tutup_{R|L}_{menu}` dan `gelas_es_{R|L}_{menu}`, dengan stiker warna menu dan lapisan es.
- `icons/`: 60 ikon 32x32.
  - `menu_{id}_{hot|es}_{R|L}`: hot = cup kertas dengan latte art (heart / tulip / rosetta), crema, atau drizzle. Es = gelas bening berlapis dengan es dan sedotan. Ikon L lebih tinggi dan lebar.
  - `bahan_*` (13): biji kopi, espresso, susu, gula, gula aren, es batu, cokelat, air, matcha, sirup vanila, sirup hazelnut, saus karamel, saus dolce.
  - `mod_ukuran_R/L`, `mod_gula_normal/less/no`, `mod_shot_1/2`.
- `ui/`: UI mini game bergaya HUD Vista ui_y2k.
  - File utama adalah pratinjau 2x. Resolusi asli ada di `1x_native/` (844x390 dan `_667x375`). `667x375/` berisi pratinjau @2x.
  - 01_pesanan: tiket order (menu, HOT/ICED, a.n., harga, chip Ukuran / Gula / Double Shot), antrean (tiket #13, #14), resep langkah, bar sabar, dan tombol Mulai / Tolak / Lihat menu.
  - 02_giling: bar takaran 18 g dan tombol tahan.
  - 03_tamper: bar tekanan dan bar kemiringan.
  - 04_seduh: bar timing 25–30 dtk dan penghitung Shot 2/2.
  - 05_steam: bar suhu 60–65 °C dan bar busa.
  - 06_tuang_latteart: permukaan rosetta, bar kecepatan tuang, dan isi gelas Large.
  - 07_tutup_serahkan: pilihan akhir Ukuran R/L, Gula, Double Shot, dan Tutup, dengan centang cocok. 07b adalah varian salah ukuran (peringatan -1 bintang).
  - 08_hasil_sukses: bintang, rincian akurasi, upah, +Large, +Double, tip, dan total.
  - 09_hasil_gagal: 0 bintang, Rp 0, dan tombol Coba lagi.
  - Juga ada `30_komponen_4x.png` dan `slices/` (tiket, chip, bintang 0–5, bar zona, penanda).
- `manifest.json` berisi NPC, prop (pivot / anchor / footprint), ikon, bahan, menu dan resep, modifier, ekonomi, rect UI per layar per resolusi, slice, dan mock.
- `mock_counter_famima_1x.png` / `_4x.png` adalah mock counter FamilyMart: barista, kasir fm_kasir, Ichsan dan Raka antre, counter barista, dan kasir.
- `contact_sheet_barista_famima_4x.png` berisi NPC (f0 dan frame tengah, 7 animasi × 4 arah), semua prop 4 arah, dan semua ikon.
- `src/`: generator.
  - `common.py`: data menu, resep, ekonomi, palet, dan audit.
  - `icons.py`, `props.py` (engine street_buildings), `barista.py` (npc_v6b / job_common lewat babeh_base), `mock.py`, `ui.py` (lt.py dari ui_loak_tas dan y2k), `contact.py`, `make_manifest.py`.
  - Urutan jalan: icons, props, barista, mock, ui, contact, make_manifest.

## Resep USULAN (untuk Baymax)
`common.recipe(menu, suhu, ukuran, gula, double)` menghasilkan urutan langkah. Hasil per menu × hot/es ada di `manifest.json → menu[].resep`.
- Menu berkopi: giling → tamper → seduh (→ seduh_2 bila Double Shot) → [es] → steam (hot) / susu_dingin (es) / air (Americano) → gula atau sirup → tuang (latte art untuk hot) → tutup → serah.
- Cokelat / matcha: larut → [es] → steam / susu_dingin → gula → tuang → tutup → serah.
- Contoh: Hot Cafe Latte, Large, Less Sugar, Double Shot = giling, tamper, seduh, seduh_2, steam, gula (1/2), tuang, tutup, serah.

## Modifier (sesuai permintaan user)

| modifier | pilihan | efek |
|---|---|---|
| Ukuran | Regular / Large | Gelas R 240 ml hot / 360 ml es, L 360 / 480 ml. Susu L lebih banyak (bar isi). Harga dari tabel. Upah +Rp500 untuk Large. Waktu tunggu R 45 dtk, L 50 dtk. |
| Gula | Normal / Less Sugar / No Sugar | Takaran 1 / 0,5 / 0. Pada No Sugar, langkah gula dilewati untuk menu tanpa sirup. |
| Double Shot | Ya / Tidak | Langkah seduh_2 (layar 04, Shot 2/2). Harga +Rp3.000, upah +Rp500, waktu tunggu +8 dtk. Hanya untuk menu berkopi. |

Ketiga modifier tampil di tiket order (chip) dan dipilih ulang di langkah 07.

## Ekonomi USULAN
- Upah per gelas: Rp2.500 dasar, ditambah Rp500 untuk Large dan Rp500 untuk Double Shot.
- Tip per bintang (0–5): 0 / 0 / 500 / 1.000 / 2.000 / 3.000. Bonus combo Rp500.
- Bintang dihitung dari rata-rata akurasi: ≥0,9 = 5, ≥0,75 = 4, ≥0,6 = 3, ≥0,4 = 2, selain itu 1. Nilai zona: hijau 1,0, kuning 0,6, merah 0,15.
- Setiap modifier yang salah mengurangi 1 bintang.
- Gagal (0 upah, 0 tip) bila menu salah, waktu habis, atau shot gosong lebih dari 33 dtk.
- Contoh di layar 08: Large + Double, 4 bintang = upah Rp3.500 + tip Rp2.000 = Rp5.500.

## Palet / hex
- Semua ramp di `common.R` memakai hex yang sudah ada di index.html atau `npc_babeh_loak/_tools/known.json`. Hijau FamilyMart: #105824 #16702D #1F8F3A #1FA34A #7FD99A. Biru: #2C6BD8.
- Hasil audit:
  - Ikon, prop, frame dan sheet NPC, dan slice UI: **tidak ada hex baru**. Alpha ikon dan slice 0/255. Prop 0/56/90/255. NPC 0/56/255.
  - Mock counter: ada 6 warna di luar daftar (#161B25 #232936 #2D3545 #9B9B9B #B4B7BD #C7C7C7). Semuanya hasil komposit bayangan alpha 56 di atas lantai atau counter (mis. #C7C7C7 = bayangan di atas putih). Warna ini bukan warna palet dan tidak perlu dipakai di game.
  - Layar UI penuh (01–09): kaca, gradasi tombol, dan teks Tahoma memakai komponen ui_y2k / ui_loak_tas apa adanya, jadi ada warna gradasi/semi-transparan dari sistem UI tersebut (sama seperti UI loak). Elemen datar baru (tiket, chip, bar zona, bintang) hanya memakai hex yang sudah ada: #FAF3E5 #C8BC9F #2A3242 #1FA34A #2C6BD8 #E0434A #F5D547 #3DDC84 #FFD166 #C99A2E #3A4458.

## Keterbatasan
- Gelas dibuat ±1,6× ukuran asli agar terbaca (sama seperti item_temuan).
- Pose kerja arah ne adalah cermin dari se. sw/nw adalah flip horizontal, jadi tangan kerja berpindah sisi.
- Teks "FAMICAFE" / "KASIR" memakai font piksel engine, bukan logo FamilyMart. Seragam hanya terinspirasi warna FamilyMart.
- Font Wine Tahoma 11 kadang memberi spasi ganjil ("Norm al", "Fam iCafe"), sama seperti ui_y2k.
- Mesin espresso, grinder, dan pitcher di layar UI adalah sprite prop yang diperbesar 2×–4× nearest, bukan ilustrasi 1x khusus.
- Glyph "R" di ikon mod_ukuran_R agak kasar.
- Mock dirakit dari sprite (bukan render game). Karakter diambil dari sheet game (ichsan, raka, fm_kasir). Posisi barista di index.html (c −4.6, r 22.6) belum dipetakan ke tata letak mock.
- Latar UI memakai ruangan mock yang diperluas, bukan render FMI asli.
- Harga Premium Chocolate dan Matcha Latte diambil dari IDN Times (artikel lama, nama Green Tea Latte). Nama Matcha Latte diambil dari Kompas 2026. Harga bisa berbeda per outlet atau promo.
- Belum ada varian layar khusus menu es / non-kopi (langkah es, larut, susu_dingin dipetakan ke layar yang mirip di `manifest.langkah_ui`).
- Ekonomi, zona timing, dan resep adalah usulan. Belum diuji keseimbangannya di game.
