# v6b: pixel-faithful rebuild of the reference style (NOT deployed)

## Reference study (study/)
- Recovered the reference's native pixel grid: one block is 11.57 px wide (x offset 9.2) and 11.84 px tall (y offset 0). The figure is 24×69 blocks. See ref_native.png and ref_native_x12.png.
- k-means quantised the colours to 21 (ref_quant*.png), then labelled each block by meaning (ref_sem.npy).
- Proportions: 69 rows tall. The head (hair top to chin) is rows 1–21, so the figure is about 3.3 heads tall. The head is about 20 blocks wide, 21 with the ear.
- Hair: rows 1–12. It has a highlight band in rows 5–7 (#45443C) on a base of #39312F, with deep tone #30231B and edge #312827.
- Eyes: a heavy lid on row 13 (5 wide near, 3 far). Flat dark eyes 3×2 (near) and 2×2 (far). Greyish whites at the two corners only.
- Face: blush is two 2-block patches on row 17 (#D19C81). The nose is 1 block. The mouth is 3 blocks on row 19 (#9D644B).
- Skin ramp: #E1BDA4 #DDB79C #D19C81 #C5886F #9D644B (edge) #8C6242.
- Shirt ramp: #E8E5E0 #CCC7BF #B9B5AE #ABA49C (edge) #A29F94. Collar points on rows 21–23. The tie is 5 wide on rows 26–37.
- Trousers: #BFA577 #AA8E6B #9E8358 #836E4A (edge). The legs split at x 12 from row 50. Shoes are rows 65–69, 2 tones.
- Edges use a darker tone of the same material, never black. Light comes from the left, and the right side is shaded.

## Build
- One reference block is one sheet pixel. There is a single grid, with no sub-grid sparkles or 1px details. The engine frame is unchanged: 64×112, pivot (32,100), a 6×44 sheet, the same ROWMAP and anchor.
- tools/ref_v6b.py builds modular layers (parts/<name>/...) and sheets:
  - idle, walk and sit in 4 directions; the other rows reuse these poses.
  - The face/expression layer has 11 states.
  - Blink, talk, tired and sleep are baked in.
- Ichsan "reference" outfit: pixel-identical to the reference in the se idle pose.
- Ichsan default: dark trousers. There is also a glasses variant.
- Noor default: graphic tee, ripped baggy jeans, black shoes and a phone. Noor cardigan: a lilac cardigan over a plain tee.
- tools/preview_v6b.py generates the previews. tools/ingame_v6b.py does the local in-game capture. That script hides the game's old .mexpr face overlay with CSS !important and removes me.ex, which removes the black pixels near the mouth.

## Caveats
- The figure is 69 px tall (1:1 with the reference). The live characters are about 88 px.
- Lighting flips on the mirrored directions (sw/nw).
- Ichsan's angry/sad brows hardly show against his dark hair.
- Arms keep the cup pose while walking.
- Before deploying, the game itself needs a flag so these sheets skip exAttachHtml. Right now that fix exists only in the test harness.
