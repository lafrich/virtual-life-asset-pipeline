# Item temuan: barang yang bisa ditemukan pemain lalu dijual ke Toko Loak (PREVIEW)

Status: **preview only**. Tidak ada yang dipasang ke game. `game/index_extract.txt` hanya dibaca, tidak diubah. Tidak ada agen lain yang dihubungi. Dibuat 1 Nov 2026 (WIB).
Gaya v6b: dibuat dengan engine `street_buildings/_work/engine.py` (palet sama), cahaya dari kiri, 5 tone per material, tanpa outline hitam (tepi kanan/bawah satu tone lebih gelap), tanpa anti-aliasing, tanpa bunga.

## Isi folder
| path | isi |
|---|---|
| `icons/*.png` (48) | ikon inventaris 32×32, tanpa bayangan, alpha 0/255. 37 jenis barang; sebagian punya varian warna (botol, kaleng, sandal, buku, payung, sepatu, HP, helm, tas, mobil-mobilan) |
| `ground/*.png` (48) | versi tergeletak, 2 px/unit, isometrik. Bayangan hitam **alpha 56**, alpha 0/56/255. Skala barang dilebihkan ×1.5 supaya terbaca di samping avatar 86 px. `ground_pivot` di katalog = titik tanah di bawah pusat barang (gambar di P(c,r) − pivot/2, urut kedalaman c+r) |
| `props_temuan/*_{sw,se}.png` (12) | 6 tempat "cari barang": tong sampah, tumpukan kardus, kantong kresek di sudut, got kecil, kolong bangku taman, karung rongsokan |
| `props_temuan/*__kilau_f0..f2.png` (36) | penanda berkilau, 3 frame per prop (ukuran & pivot sama dengan prop-nya). Lapisan glow: inti 255 + halo **alpha 90**. Tampilkan hanya saat prop siap dicari |
| `props_temuan/kilau_item_f0..f2.png` | kilau 16×16 untuk barang tergeletak (taruh di atas sprite ground) |
| `item_catalog.json` | id, nama, rarity, harga jual usulan (Rp), lokasi temuan, bobot spawn, varian + path sprite; tempat temuan + pool item tiap prop; **mekanik usulan** |
| `sheets/contact_sheet_4x.png` | semua ikon + versi tergeletak + label (nama, rarity, harga), prop temuan dengan kilau, frame kilau |
| `sheets/mock_taman_gang_4x.png` | vignette gang + taman (gaya street_buildings) berisi prop temuan berkilau dan 10 barang tergeletak |
| `_work/` | generator: `items.py` (model tiap barang), `render_items.py`, `props.py`, `catalog_sheets_mock.py` |

Bangun ulang: `cd _work && python3 render_items.py && python3 props.py && python3 catalog_sheets_mock.py` (±5 dtk; perlu `street_buildings/_work` untuk engine, taman, gang).

## Barang (37 jenis: 14 umum, 15 jarang, 8 langka)
| id | nama | rarity | harga jual usulan (Rp) | bobot spawn | varian | lokasi temuan |
|---|---|---|---|---|---|---|
| `botol_plastik` | Botol plastik bekas | umum | 300 | 14 | bening, hijau | jalan, trotoar, taman, tong_sampah, belakang_indomaret |
| `kaleng_minuman` | Kaleng minuman bekas | umum | 400 | 12 | merah, hijau | jalan, trotoar, taman, tong_sampah, sekitar_warung |
| `kardus_lipat` | Kardus bekas dilipat | umum | 800 | 12 | - | belakang_indomaret, sekitar_warung, tumpukan_kardus, gang |
| `koran_bekas` | Koran bekas | umum | 500 | 12 | - | trotoar, taman, sekitar_warung, kolong_bangku |
| `sandal_jepit` | Sandal jepit putus | umum | 300 | 10 | biru, merah | jalan, trotoar, taman, got, gang |
| `kabel_bekas` | Gulungan kabel bekas | umum | 1.500 | 9 | - | gang, tong_sampah, got, sekitar_warung |
| `charger_rusak` | Charger HP rusak | umum | 1.500 | 8 | - | sekitar_warung, tong_sampah, trotoar, gang |
| `kaset_pita` | Kaset pita lama | umum | 2.500 | 7 | - | gang, tong_sampah, tumpukan_kardus, sekitar_warung |
| `buku_bekas` | Buku bekas | umum | 2.000 | 9 | merah, biru | taman, kolong_bangku, tumpukan_kardus, gang |
| `payung_rusak` | Payung rusak | umum | 2.000 | 6 | ungu, hitam | trotoar, taman, tong_sampah, jalan |
| `sepatu_bekas` | Sepatu bekas | umum | 3.000 | 7 | putih, hitam | trotoar, taman, tong_sampah, gang |
| `dompet_kosong` | Dompet kosong | umum | 3.000 | 6 | - | trotoar, taman, kolong_bangku, got |
| `gelas_plastik` | Gelas plastik es teh | umum | 200 | 14 | - | jalan, trotoar, sekitar_warung, tong_sampah |
| `ember_bocor` | Ember bocor | umum | 2.500 | 6 | - | gang, sekitar_warung, tumpukan_kardus |
| `hp_jadul` | HP jadul rusak | jarang | 15.000 | 5 | biru, abu | trotoar, taman, kolong_bangku, got, sekitar_warung |
| `jam_tangan_rusak` | Jam tangan rusak | jarang | 12.000 | 5 | - | trotoar, taman, kolong_bangku, got |
| `kacamata` | Kacamata bekas | jarang | 8.000 | 6 | - | taman, kolong_bangku, trotoar |
| `kunci_lama` | Kunci lama | jarang | 5.000 | 7 | - | gang, got, trotoar, kolong_bangku |
| `besi_tua` | Besi tua | jarang | 6.000 | 8 | - | gang, tumpukan_kardus, belakang_indomaret, got |
| `helm_bekas` | Helm bekas | jarang | 20.000 | 5 | merah, putih, hitam | trotoar, belakang_indomaret, sekitar_warung, tong_sampah |
| `tas_bekas` | Tas bekas | jarang | 15.000 | 5 | coklat, hitam | taman, kolong_bangku, tong_sampah, gang |
| `boneka_kain` | Boneka beruang kumal | jarang | 7.000 | 6 | - | taman, kolong_bangku, tong_sampah, tumpukan_kardus |
| `mainan_mobil` | Mobil-mobilan rusak | jarang | 6.000 | 6 | merah, kuning | taman, gang, kolong_bangku, tumpukan_kardus |
| `kipas_angin` | Kipas angin meja rusak | jarang | 25.000 | 4 | - | gang, tumpukan_kardus, sekitar_warung |
| `setrika_lama` | Setrika lama | jarang | 12.000 | 4 | - | gang, tumpukan_kardus, sekitar_warung |
| `radio_tua` | Radio tua | jarang | 30.000 | 3 | - | gang, tumpukan_kardus, sekitar_warung |
| `jam_dinding` | Jam dinding mati | jarang | 15.000 | 4 | - | gang, tumpukan_kardus, sekitar_warung |
| `gembok_tua` | Gembok tua | jarang | 8.000 | 6 | - | gang, got, tumpukan_kardus |
| `senter_rusak` | Senter rusak | jarang | 5.000 | 6 | - | gang, trotoar, kolong_bangku |
| `koin_kuno` | Koin kuno | langka | 50.000 | 2 | - | taman, got, kolong_bangku, gang |
| `tembaga_gulungan` | Gulungan kawat tembaga | langka | 40.000 | 3 | - | gang, tumpukan_kardus, belakang_indomaret |
| `aki_bekas` | Aki bekas | langka | 35.000 | 3 | - | gang, belakang_indomaret, sekitar_warung |
| `kamera_analog` | Kamera analog | langka | 80.000 | 2 | - | taman, kolong_bangku, tumpukan_kardus |
| `walkman` | Walkman kaset | langka | 60.000 | 2 | - | taman, kolong_bangku, tumpukan_kardus |
| `piringan_hitam` | Piringan hitam | langka | 70.000 | 2 | - | gang, tumpukan_kardus |
| `arloji_saku` | Arloji saku antik | langka | 120.000 | 1 | - | taman, got, kolong_bangku |
| `lampu_petromaks` | Lampu petromaks | langka | 90.000 | 1 | - | gang, tumpukan_kardus |

## Tempat temuan
| prop | nama | ditaruh di | jumlah item di pool |
|---|---|---|---|
| `tong_sampah_besi` | Tong sampah | trotoar, taman, belakang_indomaret, sekitar_warung | 0 |
| `tumpukan_kardus` | Tumpukan kardus | belakang_indomaret, sekitar_warung, gang | 17 |
| `kantong_kresek` | Kantong kresek di sudut | gang, sekitar_warung, trotoar, belakang_indomaret | 0 |
| `got_kecil` | Got kecil (selokan) | gang, trotoar, jalan | 0 |
| `kolong_bangku` | Kolong bangku taman | taman | 15 |
| `karung_rongsok` | Karung rongsokan | gang, sekitar_warung, belakang_indomaret | 16 |
Semak tidak dipakai (semak masih ditahan, tanpa bunga). `kolong_bangku` memakai bangku `street_buildings/taman/bangku_taman` dengan koran + botol di kolongnya.
Titik temu yang disarankan pada layout mock_gabungan_v4:
- **taman:** kolong bangku dan tong sampah di promenade/plaza
- **gang loak:** kantong kresek di sudut lorong, karung rongsok dekat toko loak, got di mulut gang
- **belakang Indomaret** (halaman paving/sisi lot): tumpukan kardus, tong sampah
- **dekat warung madura:** tumpukan kardus, kantong kresek
- **trotoar:** tong sampah, got

## Mekanik (USULAN saja, lihat `mekanik_usulan` di katalog)
- **Cari:** berdiri di prop berkilau → tekan Cari (±1.2 dtk). Peluang dapat 70%. Rarity umum 80% / jarang 17% / langka 3%, lalu acak berbobot `bobot_spawn` dari pool prop.
- **Cooldown & batas:** cooldown 10 menit per prop (kilau hilang selama cooldown). Batas 30 kali cari per hari game.
- **Barang tergeletak:** maks 6 sekaligus di peta luar, respawn tiap 3–5 menit, ditandai `kilau_item`.
- **Tas:** kapasitas awal 8 slot (upgrade 12/16). Barang sejenis menumpuk sampai 5.
- **Jual:** ke babeh pemilik di etalase Toko Loak (`player_sell_cell`). Harga = harga usulan × 0.8–1.2 (acak harian), dengan bonus +20% untuk 3 barang langka pertama per hari.
- **Harga:** disederhanakan untuk game. Patokan kasar dari harga pengepul/loak Jakarta, bukan harga pasar yang terverifikasi.

## Audit
- **Hex:** 0 hex baru. Semua warna ada di `npc_babeh_loak/_tools/known.json` (palet engine street_buildings).
- **Alpha:**
  - icons: 0/255
  - ground: 0/56/255
  - props_temuan: 0/56/90/255 (90 hanya halo kilau)

## Keterbatasan
- Barang sangat kecil di ukuran asli. Versi ground sudah dibesarkan ×1.5, tetapi detail kecil (layar HP, angka jam, label kaset) hanya terbaca di ikon.
- Koordinat kotak engine dibulatkan ke 1/16 sel (2 px), jadi beberapa barang kecil agak kotak.
- Ikon diskalakan per barang agar memenuhi ±28 px, jadi ukuran relatif antar ikon tidak sama dengan ukuran nyata.
- Prop temuan hanya punya arah sw/se (cukup untuk kamera standar). Belum ada animasi jongkok/cari untuk pemain.
- Mock adalah vignette terpisah, bukan render game.
- Harga belum diverifikasi ke sumber.
