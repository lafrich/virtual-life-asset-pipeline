# LGR — Panduan Brief Karakter (Current)
**Versi:** 2026-11-12 WIB · **Status:** panduan authoring karakter terbaru, disusun dari kontrak `main` repository. **LGR** = Lafrich Genesis Rig; **LFB** tetap khusus aset non-karakter. Panduan ini memperbarui brief Drive 10 November 2026 yang masih mengacu ke Genesis `official-2`. Dokumen ini tidak mengganti file Genesis yang sudah disetujui.

## 1. Source of truth / prioritas
1. **Base aktif**: `site/media/lgr1/base/index.json` (`official-9`), bukan nama file yang kebetulan paling baru atau browser draft.
2. **Format base + skin**: `docs/GENESIS_BASE_FORMAT.md`, `site/lgr-skin.js`, `site/genesis-base.js`.
3. **Rig, renderer, motion**: `docs/LGR_FORMAT_SPEC.md`, `site/lgr1-raster.js`, `site/lgr1-motion.js`, `site/media/lgr1/motions.json`.
4. **Pakaian**: `docs/PAKAIAN_V2_FORMAT.md`; approved v2 berbasis checksum rig. **Animasi dan adegan**: `docs/BERGERAK_FORMAT.md`, `docs/BERAKSI_FORMAT.md`, `docs/LGR_DB.md`.
5. Jika dokumen lama dan kode aktif berbeda, **kode dan index aktif menang**. Jangan menganggap update fitur yang hanya diminta tetapi belum dikomit sudah tersedia.

## 2. Genesis resmi (12 November 2026)
- **Registry aktif:** `lafrich-lgr1-official-base-index-v1`, `version: "official-9"`.
- **Male aktif:** `genesis-base-male-official-8.json`, `rigSha256: d4de1eb210ed07f7ec6135ff670377a97cecaf341c6eabeefa907863630d248d`. Sumber artis: `candidates/male-final-20261112-v4.json`.
- **Female aktif:** `genesis-base-female-official-9.json`, `rigSha256: 4560012af600983fee50c4454c34889e638298e99be0d883b592663c7c44d1af`. Sumber artis: `candidates/female-very-final-20261112-v5.json`.
- **Mengapa versinya berbeda?** `official-9` adalah perubahan *female-only*. Male tetap `official-8` persis tanpa diubah.
- Base resmi berasal dari karya artis yang telah disetujui: pertahankan siluet, anatomi, sprite, kepemilikan slice, pivot, mask, placement, urutan gambar, skin keys, serta identitas gender. Jangan "menyempurnakan" master diam-diam.
- Import draft lokal yang lama dapat tetap muncul; saat perlu melihat base resmi, pengguna harus melakukan **RESET TO OFFICIAL BASE** secara eksplisit. Jangan menghapus backup/versi lama.
- **Skin** menggunakan `v6p-key-ramp-v1`. Tone standar: `porcelain`, `light`, `tan`, `medium`, `brown`, `deep`. Warna magenta KEY khusus skin tidak dipakai untuk dekorasi baju. Konversi blocking skin pada base terbaru sudah melalui pemeriksaan reverse-pixel; warna aksen pink dipertahankan.

## 3. Geometri dan aturan visual permanen
- Canvas per arah **64×112 px** pada skala **1×**, transparan; empat view **SE, SW, NE, NW**. SE/SW adalah arah depan; NE/NW punggung. Jangan sekadar flip satu tampilan lalu menganggap empat view benar.
- **11 part rig visual (near/far relatif ke kamera):** `pelvis` (root), `torso`, `head`, `arm_near_upper`, `arm_near_lower`, `arm_far_upper`, `arm_far_lower`, `leg_near_upper`, `leg_near_lower`, `leg_far_upper`, `leg_far_lower`.
- Hierarki: pelvis → torso → head dan kedua lengan; pelvis → kedua paha → betis. Transform anak mewarisi parent, per-direction mask menentukan pemilik pixel; potongan yang tertutup boleh memiliki nol pixel tampak di satu view jika valid.
- **Anchor** referensi source sprite `(32,100)`; **feet anchor** bagi stage Beraksi/game `(32,101)`. Jangan menyamakan kedua kontrak ini.
- Anatomi, siluet, panjang anggota badan, layer kedalaman dan pivot **mengikuti paket resmi**, bukan pivot default dokumen lama `official-2`. Posisi pivot harus dibaca dari JSON base aktif untuk masing-masing gender dan masing-masing arah.
- Semua pixel dibuat manual atau secara deterministik memakai **Python/Pillow** pada 1×; **tidak memakai AI image generator** untuk aset final. No antialiasing, blur, interpolasi warna atau scaling non-nearest; cek pada 1× dan pratinjau 3× nearest-neighbor.
- Layer fisik umumnya mencakup `body`, `body_front`, `hair_back`, `hair_front`, `top_back`, `top`, `pants`, `shoes`, `accessory`. Hanya edit layer target. Rambut, top, celana, sepatu atau aksesori tidak boleh mengubah mask/pivot anatomi Genesis.
- Wajah badan **kosong**: mata, mulut, bibir, ekspresi dan lip-sync berasal dari **Emosi.exe**, mengikuti transform head; jangan bake facial details ke Genesis atau baju.

## 4. Perbedaan Genesis, karakter, wardrobe, animasi dan scene
| Entitas | Tugas | Apa yang boleh dibuat |
|---|---|---|
| **Genesis Base** `lafrich-genesis-base-v1` | Anatomi resmi Male/Female + rig, skin KEY | Hanya update dari file final artis dengan persetujuan; tidak untuk NPC biasa |
| **Karakter/NPC** | Identitas, gender, tampilan, tone kulit, role dan relasi gameplay | Konfigurasi yang mereferensikan base aktif; bukan salinan master yang diedit |
| **Pakaian v2** `lgr1-pakaian-v2` | Artwork wearable per gender dan part, terikat rig SHA | Master pakaian baru setelah 4 view + motion QA |
| **Bergerak** `lgr1-bergerak-v1` | Satu clip animasi berdasarkan pose-joint | JSON perubahan `x,y,a` per frame; bukan PNG atlas |
| **Beraksi** `lgr1-beraksi-v1` | Scene 1–8 karakter, motion track + Emosi + posisi/layer | Satu rekaman scene yang merujuk clip, bukan rig baru |
| **Emosi.exe** | Ekspresi wajah/mulut | Face overlay, tidak mengubah body source |

## 5. Pakaian v2: aturan desain dan database yang berlaku
- Editor: **Mahluk Hidup → Pakaian**. Pilih `gender`, `group`, `variant`, dan arah; edit KEY-colour artwork menggunakan pixel editor; simpan draft; uji animasi; **SAVE MASTER → GAME / DRIVE** untuk record approved.
- Schema `lgr1-pakaian-v2` (schema 2): `id`, `gender`, `group`, `variant`, `baseVersion`, `baseRigSha256`, `files`, `approved: true`, metadata `rev`, `created`, `updated`, `name`. Grup didukung: `top`, `pants`, `shoes`, `hair`, `glasses`, `facial`.
- Setiap file artwork disimpan sebagai **PNG strip transparan 256×112 px** berurutan **SE | SW | NE | NW** (empat cell 64×112), bukan image 64×112 tunggal untuk database master.
- Runtime hanya menggunakan **approved Pakaian v2** yang *kedua* metadata `baseVersion` dan `baseRigSha256` cocok dengan Genesis live. Ketika base berubah, **jangan memaksakan old outfit dengan auto-remap**.
- Stock lama untuk top/pants/shoes/glasses/facial hair boleh jadi **referensi dan seed edit**, tetapi **bukan fallback gameplay** bila belum ada Pakaian v2 yang cocok. **Pengecualian sementara: rambut lama** boleh dipakai karena proporsi kepala tetap, sampai digantikan approved v2.
- Pilihan outfit di Beraksi disaring jika seluruh komponen belum memenuhi kompatibilitas v2; karakter baru Beraksi mulai dari `outfit: "none"`.
- Periksa pose **idle, walk, sit, bow, crouch, arms_up, lie_sleep** pada kedua view depan dan belakang: jangan ada pakaian melayang, bocor skin, salah depth, deformasi ekstrem atau sprite bergeser.

## 6. Mekanik animasi LGR-1 / Bergerak
- **Shared built-in motions** pada `media/lgr1/motions.json`: `idle`, `walk`, `wave`, `crouch`, `arms_up`, `bow`, `sit`, `lie_sleep`, `talk`.
- **Bergerak database:** satu `lgr1-bergerak-v1` menyimpan satu clip 1–60 frame. Tiap frame memiliki `ms` integer 40–2000 dan `parts: {joint:{a,x,y}}`. Data per joint ialah *delta* relatif ke source pose; joint yang tidak ada berarti 0.
- **Motion joint names anatomis:** `head`, `torso`, `pelvis`, `arm_r_upper`, `arm_r_lower`, `arm_l_upper`, `arm_l_lower`, `leg_r_upper`, `leg_r_lower`, `leg_l_upper`, `leg_l_lower`. Jangan pakai nama `near/far` untuk JSON motion; itu milik sprite mask.
- `a` derajat **-360…360** (positif clockwise di layar), `x,y` pixel **-32…32**; `angleSnap` salah satu 1,5,10,15,30,45,90. Timing **stepped**, tidak tween antar keyframe. `loop: false` menahan frame terakhir.
- Biasanya authoring dari SE; renderer memetakan near/far berdasarkan arah dan mirror aturan motion. `frames[i].dirs` adalah override spesifik arah (nilai layar untuk view tersebut, **bukan** delta yang harus di-mirror lagi); `behindTorso` bisa mengatur ordering anggota badan pada pose tertentu.
- Root perpindahan lebih tepat melalui `pelvis`; `torso` dapat menekuk pinggang, `head` ikut torso. Setiap motion baru wajib dicek di semua arah dan pada male/female; tidak boleh hanya berhasil di SE.
- Nama id motion `[a-z0-9_]{1,40}`. Game memakai `bergerak:<id>` atau `builtin:<id>`. Daftar kebutuhan aksi gameplay ada di `media/lgr1/needed-motions.json`; keberadaan di checklist **bukan** bukti clip sudah tersedia.
- Database `Membangun/Mahluk Hidup/Database/Bergerak`; sinkronisasi mengikuti `LGRDB` (local cache ketika offline, verifikasi checksum, backup jika overwrite/sync conflict).

## 7. Beraksi: tata letak dan gabungan gerak/emosi
- `lgr1-beraksi-v1` menyimpan **1–8 actor** dengan gender, skin, outfit/wear kompatibel, `x,y`, `dir`, `flip`, `layer`, `track`, `emosi`; tiap actor dapat memiliki urutan 1–24 motion dan 0–24 segmen Emosi.
- Scene memakai **feet anchor (32,101)** relatif terhadap ground line. `layer` lebih besar digambar di depan. `durationMs: null` mengikuti track terpanjang; `loop` mengulang scene. Penempatan properti kursi/ranjang butuh integrasi anchor gameplay yang sesuai—preview frame animasi saja bukan jaminan collision/attachment sudah tersambung.
- Animasi `track` mereferensikan `builtin:<id>` atau `bergerak:<id>`, bisa berulang dalam durasi track. Emosi `emosi_<id>` dibaurkan di bawah front hair dan **tidak tampak di NE/NW**.
- Props seperti HP, tas, cangkir, alat kerja, atau bendera harus digambarkan sebagai layer/prop/attachment yang diuji mengikuti hand atau karakter, **jangan mengasumsikan generic hand slot sudah tersedia** tanpa mengecek runtime.
- Beraksi disimpan di `Membangun/Mahluk Hidup/Database/Beraksi`; backup, konflik, invalid imports dan checksum mengikuti `LGRDB`.

## 8. Gameplay: yang terpasang vs yang masih perlu dicek
- Kontrak repo mencatat `site/lgr-game.js` sebagai adapter ke `LGRActor + LGRWear + LGRDB` bagi aplikasi gameplay, mengambil motion berdasarkan prioritas: database `bergerak:<id>` → built-in `builtin:<id>` → stand-in tertera. Ini bukan klaim semua action dalam `needed-motions.json` sudah punya clip khusus.
- **Stand-in** harus ditandai dan tidak disebut animasi final. Perlu visual QA di Mainkan, Semesta dan Bangun Ruang setelah migrasi base atau baju.
- Source wardrobe/rig/master tidak ditimpa oleh suatu karakter baru. Motion bersama, face Emosi, appearance, dan profile NPC tetap lapisan data terpisah.
- Penyesuaian **shadow di editor Bergerak** masih diperlakukan sebagai **permintaan fitur** sampai ada implementasi terverifikasi; jangan masukkan field shadow JSON yang belum didukung. Begitu terpasang, tentukan apakah shadow mengikuti root/pelvis dan stage/ground, bukan dimasukkan ke PNG body.
- Beri label **DRAFT** untuk mekanik yang belum terbukti pada repo saat brief dibuat; jangan menjanjikan otomatisasi load/attachment, wardrobe universal atau sinkron real-time tanpa verifikasi.

## 9. Prosedur kerja saat membuat karakter baru
1. **Brief**: tentukan karakter (nama/ID), role NPC/player, gender-base, pilihan tone skin, siluet/umur visual, rambut, outfit/aksesori dan kebutuhan aksi/emosi.
2. **Kunci base**: baca `base/index.json`, dan `baseRigSha256` sesuai gender. Jangan pindahkan mask, pivot, atau mengubah bone karena desain satu NPC.
3. **Buat visual**: kerjakan pixel art 1× untuk keempat view; wajah lewat Emosi; desain wearable lewat Pakaian v2 (bukan body master). Jaga layer, depth, background transparan, tone KEY benar.
4. **Binding pakaian**: jika aset termasuk wearable, simpan sebagai `lgr1-pakaian-v2` dengan `approved: true` hanya setelah pengujian. Strip 256×112 dan metadata cocok base live.
5. **Motion**: gunakan built-in jika cocok; jika perlu aksi unik, buat `lgr1-bergerak-v1`, validasi durasi, part, arah dan joint limits. Tidak menggambar ulang setiap pose.
6. **Emosi & scene**: referensi face ID Emosi.exe; jika ada interaksi banyak karakter/prop, author `lgr1-beraksi-v1` terpisah.
7. **Visual QA**: cek 1×, 3× nearest dan setiap arah + gerak ekstrem; cek head/neck, siku, lutut, pinggang, sela lengan dan leg, pakaian, occlusion, pivot kaki dan ground alignment.
8. **Game QA**: buka karakter di target app; pastikan loader memilih base official-9, wearable v2 sesuai gender dan SHA, animasi dan Emosi sinkron; cek ulang saat zoom/pan dan skala game.
9. **Deliverable**: lampirkan contact sheet 4 arah, appearance source/strip, record Pakaian v2 bila ada, motion JSON bila baru, scene JSON bila baru, hasil QA, version+SHA base yang dipakai. Jangan ubah file Genesis resmi hanya untuk menyelesaikan NPC.

## 10. Template brief karakter berikutnya (isi sesuai konsep)
- **Character ID & nama tampilan**:
- **Tipe**: player / NPC / pedagang / pekerja / pengunjung / lainnya.
- **Gender-base**: male official-8 / female official-9.
- **Kepribadian / peran sosial**: (narasi gameplay, tidak mengubah rig).
- **Siluet & ciri visual**: bentuk rambut, pakaian, palette, alas kaki, aksesori.
- **Skin tone**: porcelain / light / tan / medium / brown / deep.
- **Pakaian**: top / pants / shoes / hair / glasses / facial (sebut variant), apakah perlu dibuat master v2 baru.
- **Aksi wajib**: daftar `builtin:` / `bergerak:`, kebutuhan prop, pose duduk/berbaring/bergerak.
- **Ekspresi**: face ID / daftar Emosi dan timing jika dalam scene.
- **Interaksi lingkungan**: object, posisi kaki, arah, attachment, collision/occlusion bila diperlukan.
- **Output**: PNG preview 4 arah, Pakaian v2 JSON/strip, Bergerak JSON, Beraksi JSON, QA report.
- **Acceptance criteria**: 4 view konsisten; tidak ada joint hole/seam; skin dan outfit benar; lulus pose wajib di male/female bila relevan; tidak memodifikasi base resmi.

## 11. Contoh singkat: pedagang lapak
**Karakter:** `npc_penjual_sate`, gender `male`, tone `tan`. Rambut yang relevan, baju pedagang (Pakaian v2 male terikat SHA aktif), apron/aksesori sebagai wearable; ekspresi dari Emosi.exe. **Aksi:** `builtin:idle`, `bergerak:cook_stir` hanya jika clip tersebut sungguh ada; jika belum, buat/approve animasi baru. Properti wajan/spatula dan warung adalah LFB/game object yang perlu diuji koordinat tangan serta occlusion secara terpisah. Jangan menggambar ulang master Male.

## 12. Referensi source yang harus dirujuk ulang sebelum approve
- Base aktif: https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/site/media/lgr1/base/index.json
- Genesis format: https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/docs/GENESIS_BASE_FORMAT.md
- Pakaian v2: https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/docs/PAKAIAN_V2_FORMAT.md
- Rig: https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/docs/LGR_FORMAT_SPEC.md
- Bergerak: https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/docs/BERGERAK_FORMAT.md
- Beraksi: https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/docs/BERAKSI_FORMAT.md
- Database/runtime: https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/docs/LGR_DB.md
- Built-in motion: https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/site/media/lgr1/motions.json

**Pemeliharaan:** Semua perubahan resmi pada `base/index.json`, schema Pakaian v2 atau animasi/scene memerlukan pengecekan guide ini lagi. Guide 10 Nov 2026 yang berlabel `official-2` adalah arsip sejarah dan **tidak** boleh dijadikan sumber untuk brief baru.
