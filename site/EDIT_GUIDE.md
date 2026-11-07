# Panduan edit karakter v6p

Sistem sudah tersambung: kamu hanya perlu mengedit gambar part, lalu compose + Save. Tidak perlu mengubah kode animasi atau rig.

## Alur kerja

1. Edit file PNG di `site/media/v6p/` (pixel editor). Jangan menimpa file asli yang bukan milikmu; untuk tubuh telanjang pakai file `nude` yang sudah disiapkan.
2. Buka studio: `v6p-studio.html`.
3. Klik **Muat ulang aset** supaya preview membaca PNG terbaru (bukan cache lama).
4. Periksa idle / walk / sit / sleep / lie di 4 arah, plus wajah kosong atau wajah Emosi.
5. Klik **Save to characters**. Ini menyusun ulang sheet dari file terbaru, lalu menulis klip `idle`, `walk`, `talk`, `sit`, `lie`, dan `sleep` ke topik VLHub `characters` (`mahluk-2-library-v1`).
6. Buka Semesta Play (origin yang sama). Karakter tersimpan dipakai langsung, termasuk animasi tidur di kasur. Kalau tab Play sudah terbuka, ia membaca ulang setelah Save.

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

Wajah Emosi tidak diedit di folder ini. Itu database Emosi (6 wajah authored). Di studio pilih **No face (blank)** atau salah satu Emosi; Emosi digambar di atas wajah kosong, di belakang rambut depan.

Warna rambut, kulit, baju, celana, sepatu dipilih di studio (palette magenta v6p). File `nude` memakai kunci warna kulit supaya ikut pilihan kulit.

## Yang tidak perlu diubah

- Jangan redesign urutan layer atau ukuran frame.
- Jangan menimpa `tee.png` / `trousers.png` / `shoes.png` asli kalau kamu hanya ingin versi nude; edit `nude*`.
- Jangan mengubah Ichsan asli (`ichsan.json` / `ichsan_v6b_sheet.png`).
- Tidak ada opsi botak; rambut tetap aset yang ada.

## Semesta Play

Setelah Save, klip `sleep` (baris 20, 4 arah, 4 frame) dipakai saat karakter tidur di kasur / aksi Tidur di Jiwa. Kalau suatu karakter lama belum punya klip `sleep`, Play memakai `lie` sebagai cadangan.
