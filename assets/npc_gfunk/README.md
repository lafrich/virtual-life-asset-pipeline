# NPC "Gfunk" (ex-Zib) - v6b style preview v3 (PREVIEW ONLY, not integrated)
Build: `python3 make_gfunk.py` (reuses ../npc_preview_v2/make_npcs_v2.py + base6.py -> live v6b generator). 64x112, pivot (32,100).
Older versions: v1/ (first pass, stride legs), v2_prev/ (v6b proportions, se/sw only).

v3 changes (user feedback 31 Oct 2026): no ears; orange tank on the back with 2 silver shoulder straps; 4 views; 5 expressions;
float idle (4 f) + float move (4 f, 2 px lean toward facing).
- gfunk_se.png / gfunk_sw.png / gfunk_ne.png / gfunk_nw.png : 1x, idle f0 per view (sw, nw = mirrors of se, ne)
- frames/gfunk_<view>_<idle|move>_f<0-3>.png : 1x, all views x both cycles (f0 up 6px, f1 mid 5, f2 down 4, f3 mid 5)
- expr/gfunk_se_<neutral|happy|surprised|angry|sleepy>.png : 1x, se, idle f0
- gfunk_views_4x.png, gfunk_expressions_4x.png, gfunk_animation_4x.png : labelled 4x sheets on #10141B
- gfunk_idle_se_4x.gif (300 ms/f), gfunk_move_se_4x.gif (200 ms/f), gfunk_idle_4views_4x.gif
- gfunk_preview_sheet_4x.png : 4 views + 3 reference crops
Not available: s (front) and pure side views - the v6b generator only has se/ne bodies (+ mirrors).

## v4 poses (31 Oct 2026, "duduk tidur dll") - v3 saved in v3_prev/
Legs, boots and arms come from the game's own v6b pose rows (live_v6b ROWMAP: sit, sit_type, sleep, talk); the approved Gfunk
upper body / helmet / tank / head is kept at standing height, as the game does for seated rows (SIT_D = 0, hips y80).
- poses/gfunk_<pose>_<se|sw|ne|nw>_f<i>.png : 1x. pose = sit (4 f), sit_type (4 f, typing), sleep_seat (4 f, game chair nap
  with the game's z-z), sleep_float (2 f, floating nap, 600 ms), talk (4 f, floating, idle lift + ring pulse)
- gfunk_poses_4x.png : labelled sheet (row per pose: se/sw/ne/nw f0, then se frames)
- gfunk_<pose>_4views_4x.gif : 4 views side by side on #10141B
Seated poses sit directly on the seat (no hover, no rings, game seated shadow rx 11 at x33). Not in the game, so skipped:
wave/greet, think/look-around. In the game but skipped: tired, perch, lie (bed), swim, float(pool).
z marks use the generator's zzz_img colours #ECF0F6 / #282E3C (already in the live sheets, new to Gfunk).
