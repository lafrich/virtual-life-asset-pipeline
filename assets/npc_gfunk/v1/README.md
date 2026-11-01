# NPC "Gfunk" (ex-Zib) - v6b style preview (PREVIEW ONLY, not integrated)
Build: `python3 make_gfunk.py` (reuses ../npc_preview_v2/make_npcs_v2.py + base6.py -> live v6b generator).
- gfunk_se_A.png / gfunk_se_B.png: 1x, 64x112, pivot (32,100), se, float frames A (lift 4px) / B (lift 6px)
- gfunk_sw_A.png / gfunk_sw_B.png: horizontal mirror
- gfunk_float_2f.png: A|B strip; gfunk_float_4x.gif: 2-frame bob, 333 ms/frame, on #10141B
- gfunk_preview_sheet_4x.png: se A, se B, sw A at 4x + 3 reference crops at the same height
Head silhouette + skin ramp (base #6DB88A via pal6.skin) come from the v6b generator; helmet bubble, neck ring,
shadow (flat 0,0,0,56 ellipse) and float offsets are the v2 ones; cone, suit, tank, claws, legs, pads are new here.
