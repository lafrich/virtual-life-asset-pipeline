# Panduan edit karakter v6p

Sistem sudah tersambung: kamu hanya perlu mengedit gambar part, lalu compose + Save. Tidak perlu mengubah kode animasi atau rig.

## Alur kerja (pixel editor di browser)

Untuk mengedit outfit nude (atau part v6p lain) dengan editor milikmu:

1. Buka `pixel-editor.html`, atau dari `v6p-studio.html` klik **Edit di Pixel Editor** di samping Top / Pants / Shoes / Glasses / wajah kosong.
2. Di editor, pilih sumber **V6P PART SHEET (media/v6p)**. Daftar part mencakup `top/nude`, `top/nude_back`, `pants/nude`, `shoes/nude` plus varian `_f`, `face/m_blank`, `face/f_blank`, dan semua sheet lain yang sudah ada di `site/media/v6p/`.
3. Navigasi **ANIMATION** (baris aksi: idle, walk, talk, sit, sleep, lie, …), **DIRECTION** (SE/SW/NE/NW), dan frame. Kanvas tetap 64×112; alat yang ada (pensil, penghapus, fill, wand, seleksi, …) tetap dipakai. Mode MASTER Otis (proyeksi antar aksi lewat kotak kepala/torso/lengan) tidak dipakai untuk sheet v6p — tidak ada salin-otomatis ke semua frame baris yang sama, karena mekanisme itu milik Otis, bukan salinan sel v6p.
4. Tiap goresan tersimpan sebagai **override lokal** (localStorage, origin yang sama dengan studio / Semesta). Ini belum menimpa file di repo.
5. Kembali ke studio → **Muat ulang aset**. Compose memakai override itu segera.
6. Periksa idle / walk / sit / sleep / lie di 4 arah, plus wajah kosong atau wajah Emosi.
7. Klik **Save to characters**. Studio menyusun ulang sheet (termasuk override) lalu menulis klip `idle`, `walk`, `talk`, `sit`, `lie`, dan `sleep` ke topik VLHub `characters` (`mahluk-2-library-v1`). Semesta Play di origin yang sama menampilkan klip itu setelah Save.
8. **Save ke Drive** (di editor atau di studio) mengunggah sheet penuh 384×4928 ke `My Drive/Membangun/Mahluk Hidup/Pixel Edits/` dengan nama `v6p--top__nude.png` (garis miring diganti `__`) dan `appProperties` `{app:'mahluk', kind:'v6pPart', part:'top/nude', width:'384', height:'4928', sha256}`. File yang sama ditimpa kalau disimpan lagi. Status sukses: **Tersimpan ke Drive, akan masuk game otomatis**. Job terjadwal menarik folder itu (lihat `DRIVE_SYNC_CONTRACT.md`).
9. Unduhan manual tetap ada: sheet PNG 384×4928 plus **PIXEL EDITS.JSON**, kalau mau di-commit sendiri.
10. **DELETE LOCAL DRAFT** di editor menghapus override part itu; studio setelah Muat ulang aset kembali ke PNG media asli.

Alur lama (mengedit file PNG langsung di `site/media/v6p/` lalu Muat ulang aset + Save) masih berlaku untuk perubahan yang sudah masuk repo.

## File mana yang diedit

Folder: `site/media/v6p/`

Semua sheet berukuran **384×4928**, tiap frame **64×112**, titik tumpu **32,100**. Baris: walk 0, idle 4, talk 8, sit 12, sleep 20, lie 36 (tiap aksi 4 arah: se, sw, ne, nw).

| Yang mau diubah | File laki-laki | File perempuan (`_f`) |
| --- | --- | --- |
| Tubuh / kulit leher | `base/body.png`, `base/body_front.png` | `base/body_f.png`, `base/body_front_f.png` |
| Wajah kosong (di belakang rambut) | `face/m_blank.png` | `face/f_blank.png` |
| Atasan biasa | `top/tee.png`, `top/tee_back.png` (atau `tee_long`, `tee_graphic`, `shirt`, `shirt_tie`, `cardigan`, `cardigan_dots`) | tambahkan `_f`, plus `*_back_f.png` |
| **Nude (kulit)** — atasan | `top/nude.png`, `top/nude_back.png` | `top/nude_f.png`, `top/nude_back_f.png` |
| Celana biasa | `pants/trousers.png` (atau `trousers_ripped`, `baggy`, `baggy_ripped`) | `pants/trousers_f.png` dst. |
| **Nude (kulit)** — celana | `pants/nude.png` | `pants/nude_f.png` |
| Sepatu biasa | `shoes/shoes.png` (atau `sneakers`, `boots`, `hightops`; boots/hightops punya `*_over`) | tambahkan `_f` |
| **Nude (kulit)** — sepatu | `shoes/nude.png` | `shoes/nude_f.png` |
| Rambut | `hair/<gaya>_front.png` dan `hair/<gaya>_back.png` (`short`, `swept`, `mid_curtain`, `mid`, `wavy`, `wavy_curtain`, `long`, `long_curtain`) | file yang sama (tidak ada versi botak) |
| Jenggot / kumis | `facial/mustache.png`, `stubble.png`, `both.png` | — |
| Kacamata | `glasses/round.png`, `glasses/square.png` | — |
| Bayangan / efek | `base/shadow.png`, `base/fx.png` | sama |

Wajah Emosi tidak diedit di folder ini. Itu database Emosi (6 wajah authored). Di studio pilih **No face (blank)** atau salah satu Emosi; Emosi digambar paling depan (di atas rambut depan dan kacamata). Tampilan belakang (NE/NW) tidak menggambar wajah Emosi.

Warna rambut, kulit, baju, celana, sepatu dipilih di studio (palette magenta v6p). File `nude` memakai kunci warna kulit supaya ikut pilihan kulit.

## Yang tidak perlu diubah

- Jangan redesign urutan layer atau ukuran frame.
- Jangan menimpa `tee.png` / `trousers.png` / `shoes.png` asli kalau kamu hanya ingin versi nude; edit `nude*`.
- Jangan mengubah Ichsan asli (`ichsan.json` / `ichsan_v6b_sheet.png`).
- Tidak ada opsi botak; rambut tetap aset yang ada.

## Semesta Play

Setelah Save, klip `sleep` (baris 20, 4 arah, 4 frame) dipakai saat karakter tidur di kasur / aksi Tidur di Jiwa. Kalau suatu karakter lama belum punya klip `sleep`, Play memakai `lie` sebagai cadangan.
