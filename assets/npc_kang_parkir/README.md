# NPC Kang Parkir (PREVIEW – belum diintegrasikan / belum di-deploy)

Gaya v6b (generator game: badan, kepala, ekspresi, topi; tanpa outline hitam, cahaya dari kiri, bayangan alpha 56, alpha 0/56/255).
Frame 64×112, pivot (32,100). 4 arah: se, ne (digambar), sw / nw = cermin horizontal.

Ciri: rompi parkir oranye dengan strip reflektif perak + huruf "P" (depan & punggung), kaos gelap, topi gelap, handuk di leher,
peluit bertali, celana jeans, sandal, kumis tipis.

| animasi | frame | isi |
|---|---|---|
| idle | 4 | napas |
| walk | 6 | jalan |
| whistle | 4 | tiup peluit (tangan ke mulut, tanda bunyi) |
| direct | 6 | mengarahkan motor (tangan dekat melambai "terus-terus", tangan jauh menunjuk mulai f3) |
| money | 4 | menerima uang (telapak terbuka, uang muncul, dibawa ke dada) |

File: `frames/kang_parkir_<arah>_<animasi>_f<i>.png`, `poses/`, `kang_parkir_sheet_4x.png`, `kang_parkir_work_4x_darkbg.png`,
`kang_parkir_<animasi>_4views_4x.gif`. Kode: `make_kang_parkir.py` (memakai `../npc_babeh_loak` + `../npc_pak_ogah/job_common.py`).
Hex baru: tidak ada (dicek terhadap palet game + aset; lihat `../npc_babeh_loak/_tools/known.json`).

Keterbatasan: dari belakang (ne/nw) peluit tidak terlihat (tangan di sisi kepala + tanda bunyi); huruf "P" hanya 3×5 px;
uang hanya beberapa px hijau-krem.
