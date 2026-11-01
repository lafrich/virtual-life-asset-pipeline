# NPC "Manusia Silver" (patung hidup di persimpangan) - gaya v6b, PREVIEW SAJA (belum diintegrasikan, tidak di-deploy)
Build: `python3 make_manusia_silver.py` (mengimpor ../npc_pak_ogah/job_common.py -> generator game v6b, panggilan sama dengan
npc_v6b.build). Badan, wajah, baris idle (4 f) dan walk (6 f) = output generator, dengan ramp kulit diganti ramp perak dingin;
kepala botak dicat perak (bald() dome yang sama seperti alien/Theodore). Kaus -> dada telanjang perak (garis dada, pusar, tulang
belikat di belakang), celana -> celana pendek khaki (di bawah lutut = kaki perak), sabuk gelap + gesper, kaki perak.
Highlight kiri 1 px + kilau rim biru-dingin sesekali. Frame 64x112, pivot (32,100), bayangan ellipse 0,0,0,56. Alpha 0/56/255. sw/nw = mirror.

## File
- frames/manusia_silver_<se|sw|ne|nw>_<anim>_f<i>.png : idle f0-3, walk f0-5 (di tanah), bow f0-5 (di atas peti: membungkuk,
  tangan terulur, f3-f4 koin kuningan di telapak, f5 tangan di dada), statue_hands_face / statue_point_sky / statue_salute /
  statue_thinker (f0, beku, di atas peti; hands_face = pose foto, tangan di depan wajah)
- poses/manusia_silver_<view>_statue_<pose>.png, _idle.png, _bow_key.png ; poses/prop_crate.png, poses/prop_money_tin.png
- manusia_silver_work_ne_nw_4x_darkbg.png (v2, tambahan: pose patung + bow ne/nw)
- manusia_silver_sheet_4x.png (semua, transparan) ; manusia_silver_work_se_4x_darkbg.png (pose patung + bow se, latar gelap)
- GIF 4x transparan: manusia_silver_idle_4views_4x.gif, _walk_, _bow_, _statue_poses_ (ganti pose tiap 0,9 s)
Badan di atas peti dinaikkan 11 px; peti (24x16) + kaleng uang menyatu di frame dan juga tersedia sebagai prop terpisah.

## Palet (tidak ada hex baru)
Perak: #E7EBF2 #B9C0CC #A9B1BF #8D97A8 #5A6577 #3A4458 + kilau #FFFFFF, rim dingin #7FB2DE (pal6 sky).
Celana pendek: ramp generator 'walnutlt' (#94704F). Sabuk #2A3242 / #1C2330. Peti: #94704F #6B4F3A #5E4636 #3D2A1E.
Kaleng: ramp krom di atas; koin #FFD166 #E0A526 #C99A2E #8A6A24.

## v2 (1 Nov 2026) - revisi "tangan aneh, kepala gepeng" (v1 disimpan di _prev_v1/)
- Lengan pose patung + bow digambar ulang (`limb()`): bahu/deltoid menyambung ke badan, lengan atas r1.7 + lengan bawah r1.4
  diarsir melintang seperti lengan v6b (sisi kiri terang, tengah, sisi kanan gelap, tepi perak lebih gelap), titik siku, tangan
  sederhana (kepalan / telapak + jari / telunjuk).
- ne/nw: pose disesuaikan agar tangan tidak hilang di balik kepala: hands_face = kedua telapak di sisi kepala (siku keluar),
  salute = telapak di sisi dahi, thinker (belakang) = satu tangan di belakang kepala + satu di pinggang; point_sky sama dengan se.
  bow ne/nw: tangan yang terulur ke depan digambar di belakang badan (tak terlihat dari belakang, sesuai).
- Kepala belakang (ne/nw): tengkorak bulat (ellipse dari kotak kepala generator, bagian bawah meruncing ke leher, diarsir bola
  kiri-terang + titik kilau + telinga kecil), menggantikan dome bald() yang kotak.
- bow: kepala+leher digeser KAKU (turun 0/2/4/5/3/0 px, maju 0/1/3/3/2/0 px), tidak dikompres; hanya torso antara leher dan
  pinggul mengikuti geser linear (foreshortening). Di ne/nw bahu digambar menutup bagian bawah kepala (menunduk menjauh).
- Tidak ada hex baru; nama file dan struktur sama (ditimpa).

## Keterbatasan
- Lengan masih custom (bukan lengan generator); di ukuran 1x jari hanya 1-3 px, telunjuk point_sky berupa garis 3 px.
- Di se hands_face, telapak menutup sebagian mata (sesuai foto).
- Dari belakang, kepala bulat tampak sedikit lebih terang/bersih daripada sisi depan (kepala depan tetap dome generator).
- nw/sw = mirror, jadi arah cahaya ikut terbalik (sama seperti game).
- Torso di bow f2-f4 sedikit memendek (dimaksudkan sebagai condong), kepala tetap ukuran penuh.
- Siluet torso masih bentuk kaus generator (ada undakan kecil lengan pendek), jadi dada telanjang terbaca sebagian sebagai "kaus perak".
- Celana pendek dibuat khaki-cokelat seperti foto (brief menyebut perak-abu; khaki dipilih supaya kontras dengan kulit perak).
- Pose patung masing-masing 1 frame (diam); idle GIF tampak 2 frame karena PIL menggabung frame identik (PNG tetap 4).
