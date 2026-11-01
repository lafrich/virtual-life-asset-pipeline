# NPC "Yerbies" - v6b style preview (PREVIEW ONLY, not integrated)
Build: `python3 make_yerbies.py`. It is a copy of ../npc_gfunk/make_gfunk.py (v4) with suit parts re-shaded orange and a
YERBIES overrides block (head ball, face/expressions, collar, no cone, cream backpack, orange-suit torso/legs, silver belt,
orange hover rings, straps). npc_gfunk is not modified. Same v6b masks / proportions / 64x112 frame / pivot (32,100).
- yerbies_<se|sw|ne|nw>.png : 1x idle f0 per view (sw / nw are mirrors)
- frames/yerbies_<view>_<idle|move>_f<0-3>.png, expr/yerbies_se_<expr>.png, poses/yerbies_<pose>_<view>_f<i>.png
- sheets 4x: yerbies_views_4x.png, yerbies_expressions_4x.png, yerbies_animation_4x.png, yerbies_poses_4x.png,
  yerbies_vs_gfunk_vs_ref_4x.png
- GIFs 4x on #10141B: yerbies_idle_se_4x.gif, yerbies_move_se_4x.gif, yerbies_idle_4views_4x.gif, yerbies_<pose>_4views_4x.gif
New hexes: pack cream ramp #D8C7A8, #BFA683 (with existing #EDE6D8 gallery white, #94704F walnut light).
v2 (31 Oct 2026): se/sw backpack moved to the centre of the back (x17-45 instead of x14-27), canisters either side of the
head, nozzle bottom-left. Everything else unchanged. Previous version in v1_prev/.
v3 (31 Oct 2026): se/sw pack redrawn at the ne/nw dimensions (box 20x27 + side canisters + nozzle), offset 4 px up-left
behind the torso. Previous version in v2_prev/.
