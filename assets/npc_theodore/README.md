# NPC "Theodore" (replaces v2 NPC 2 Rocketta) - v6b style preview (PREVIEW ONLY, not integrated)
Build: `python3 make_theodore.py` (imports ../npc_gfunk/make_gfunk.py for float / shadow / hover rings / z / seat shadow helpers).
Body, head, face, expressions and all poses are the game's own v6b generator output (base6.render: male, skin 'medium',
Rocketta's 'oxbred' red suit, hair removed with the alien bald() dome, brows kept). Added on top: dome cap helmet (shell + teal
brim + red knob), round goggles (teal rims, pale lenses, strap), red collar, emblem on the character's LEFT chest (= viewer's
right in se), orange-ring marble porthole on the belly, teal belt, silver boots, red gloves, boxy shell pack (same 20x27 box
as Yerbies, se offset 4 px up-left) with a cannon barrel, green cone nozzle and red rings (back view).
- theodore_<se|sw|ne|nw>.png ; frames/theodore_<view>_<idle|move>_f<0-3>.png ; expr/theodore_se_<expr>.png ;
  poses/theodore_<sit|sit_type|sleep_seat|sleep_float|talk>_<view>_f<i>.png
- 4x sheets: theodore_views_4x.png, theodore_expressions_4x.png, theodore_animation_4x.png, theodore_poses_4x.png,
  theodore_vs_npc1_gfunk_ref_4x.png ; GIFs: theodore_idle_se_4x.gif, theodore_move_se_4x.gif, theodore_*_4views_4x.gif
sleep_float uses the game's standing 'tired' row (head drop 2) with closed eyes; sleep_seat = the game's 'sleep' row.
No new hexes: palette (teal ramp, baize, shell greys) + colours already used by v6b / Gfunk.

## v2 (31 Oct 2026) - v1 saved in v1_prev/
- boots: plain v6b white boots (no silver recolour) like NPC 1 / old Rocketta
- emblem on the VIEWER'S LEFT chest in se (x26.5); in sw it is drawn at the mirrored x before the flip, so it stays on the
  viewer's left in sw too (logo pre-mirrored)
- pack barrel removed in se/sw; back view keeps a short barrel mounted inside the box silhouette (nothing sticks out)
- skin 'light' (#F1D3B5 ramp, the lightest skin the live v6b characters use; pal6 'porcelain' is paler but unused in game)
- angry expression strengthened (slanted lids inside the lenses + frown corners); new theodore_expressions_face_8x.png

## v3 (31 Oct 2026) - GROUNDED (v2 saved in v2_prev/)
Theodore does not fly: hover rings, float lift and separated shadow removed everywhere. Shadow = the game's own flat ellipse
(0,0,0,56, rx 11, ry 2.4, x32; x33 for seated rows). Animations = the game's v6b rows: idle (4 f, 1 px breathing bob) and
walk (6 f) for se/sw/ne/nw -> frames/theodore_<view>_<idle|walk>_f<i>.png, theodore_idle_se_4x.gif, theodore_walk_se_4x.gif,
theodore_idle_4views_4x.gif, theodore_walk_4views_4x.gif. Overlays (chest, belt, collar, pack, dome, goggles) follow the
row's head / torso bob. Poses: sit, sit_type, sleep_seat (unchanged), talk (now standing, game talk row), nap_stand
(replaces sleep_float: the game's standing 'tired' row, head drop 2, z-z). Old float/move/sleep_float files are only in v2_prev/.
Expressions strengthened (mouth + lids only): happy wide open smile, surprised round 'O', angry V lids + hard frown,
sleepy small slack mouth. theodore_expressions_4x.png + theodore_expressions_face_8x.png.
