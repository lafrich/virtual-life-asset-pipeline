# Virtual Life · HUD restyle Y2K Windows (preview, mockup only)

Restyle of the gameplay HUD chrome to a Windows 98/2000/XP look. Game graphics (scene, sprites, furniture) are unchanged: the background is the same cafe scene used in `../ui_mockups/` (`environment/tools/mock.py` + v6b character sprites). Game code was not touched. The Nokia handset (`../ui_nokia/`) is used as-is: it was lifted pixel-for-pixel from `ui_nokia/1x_native/01_standby.png`.
Example name: **Ichsan** everywhere (matches the portrait sprite). Numbers, item names and wages are sample data.

## Vista revision (1 Nov 2026, Ichsan's request) — current version
The version from before this revision is in `_prev_pre_vista/` (all PNGs, 1x, 667x375, README, src).
- **Joystick** is back to the original `ui_mockups` style (`ui.joystick`: dark disc, grey arrows, light round knob, Ø68), same bottom-left position. Note: the live game joystick (CSS `body.mob #joy`) differs slightly: 74 px, very transparent (opacity .28), thin crosshair, rounded-square yellow/grey knob. The mockup follows the old mockup, not the live CSS.
- **Action** = round Aero glass orb (Vista style), green, Ø68: 5 stepped bands with dithered seams, top gloss, glow at the bottom, bright inner rim, dark outer rim, body slightly transparent (alpha ~205), extra gloss layer drawn over the icon. Label "Action" inside the orb; target badge = small grey glass orb (Ø22) top right; tooltip label above.
- **HP + Tas + Uang = one bar**: a smoky Aero glass capsule (alpha ~125–150, height 28) at the bottom right, docked to the Action orb (like the Vista taskbar + Start orb, mirrored). Contents left to right: money segment (coin + Tahoma Bold white with shadow), separator, **HP** orb (blue glass Ø38, Nokia icon) + label, separator, **Tas** orb (blue glass Ø38, backpack icon) + label. HP and Tas stay separate buttons, the money is text only (tap = open Dompet in HP, see state 05).
- The minimap moves up to the top-right corner (y 8) because the money/HP no longer sit there. Profile card, need bars, and Y2K windows are unchanged.
- States: Tas pressed / full (red 12/12 badge) / disabled; HP pressed (phone open) / disabled (working); money pending (hourglass + grey text) / pressed / money in (balloon). Hold Action: ring around the orb (r 38–44) + context menu above the bar near the thumb.
- Sizes (1x): Action orb r 34 · HP/Tas orb r 19 · badge orb r 11 · bar h 28, width = content (±300 px at 844 and 667) · joystick r 34.
- New colours: Action orb `#8EE08A → #1E7A22` (glow `#B8F5B0`), HP/Tas orb `#8CC4F5 → #0B3F86` (glow `#A8DCFF`), disabled orb `#D0D0D0 → #6A6A6A`, bar glass top `#566E8E` / bottom `#142034` (alpha 125/150), edge `#060A12`, top line `#EBF5FF`, glow line `#6EA0D2`, Tas badge `#D8343A`.
- Vista limitations: real Vista glass = blur + soft gradient + anti-aliasing. Here it's pixel art: no blur behind the glass (the scene just shows through, sharp), alpha only in flat steps, circle edges hard (nearest-neighbour), so it reads as "glossy orb" more than true glass. Vista (2007) on top of Y2K/XP chrome is a style clash: profile card, need bars, minimap, and windows are still classic Win2000/XP bevels, while the bottom-right buttons are Aero. If you want a single style, the profile card/minimap could later move to the same glass capsule. Translucency over a bright scene (light blue floor) reduces label contrast; text on the bar relies on a dark 1 px shadow. Not tested on a phone.

## Files
| File | Contents |
|---|---|
| `01_hud_y2k.png` | main HUD, 844x390 shown **2x** (1688x780) |
| `667x375/01_hud_y2k_667x375@2x.png` | same HUD at 667x375 (2x) |
| `02_action_hold_y2k.png` | Action held: progress ring (75%) + context menu by the thumb (Kentut / Pipis locked / Emote ▸ / Batal) + balloon "Hadap tembok dulu" |
| `03_states_action_targets_tas.png` | Action orb with target badge: NPC (Bicara), kopi (Minum), makanan (Makan), kursi (Duduk), kasur (Tidur), barang (Ambil), empty area (Kentut); Action orb normal/pressed/disabled; HP·Tas·Uang bar: normal, Tas pressed, Tas full 12/12, HP open (others disabled) |
| `04_needs25_blink_f1.png`, `_f2.png`, `04_needs25_blink.gif` | Hunger at 25%: red bar + warning icon, row highlight blinks (2 frames, 600 ms/frame in the GIF) |
| `05_states_money_badge.png` | money segment in the bar: normal, pressed, pending server (hourglass + grey text), money in (balloon +Rp 50.000) |
| `06_locked_phone_open_y2k.png` | phone open: HUD disabled (grey icons, embossed text, inactive grey captions), HP pressed, Nokia unchanged |
| `07_icon_sheet_4x.png` | every icon: old 16 px vs new 16 + 32 px, labelled, **4x** |
| `08_before_after.png` | before (`ui_mockups/01_hud`) vs after, plus 2x zoom of the corners |
| `09_components_y2k.png` | bevel states, buttons (XP Luna + classic), tool buttons, joystick + scrollbar arrows, progress bars + hold ring, tab strips (XP + classic), XP window (X only), HUD captions, tooltips, context menu, font, palette |
| `10_window_tas_y2k.png` | Tas window restyled (XP Luna, X only, Tahoma, 32 px icons 1:1 in the slots) |
| `11_window_kerja_y2k.png` | work-progress window "Bekerja: Barista" (XP Luna, X only, progress bar, timer, Berhenti), joystick/Action/HP disabled |
| `1x_native/` | 1x source of every PNG above |
| `667x375/` | every full-screen state at 667x375 (2x) |
| `fonts/` | Wine Tahoma + Tahoma Bold (LGPL-2.1, from the Debian `fonts-wine` 10.0 package) |
| `src/` | `icons.py` (icons), `y2k.py` (components + HUD layout), `screens.py` (full screens), `sheets.py` (sheets). Run: `cd src && python3 screens.py && python3 sheets.py` (needs Pillow, `../ui_mockups/src`, the environment pack, and the fonts at `/usr/share/fonts/truetype/wine/`, or change `TAH` in `y2k.py` to `../fonts/`) |

## Layout (kept from earlier decisions; pre-Vista version — see the Vista revision above for the current version)
- The left column (zoom +, zoom -, fit screen, bell, comment) is **gone**.
- Top left, inset 16 px for the safe area: profile card (avatar, name in a caption bar, Lv. 4, XP bar). Directly below it: 4 need bars (Hunger, Hygiene, Bladder, Energy).
- Top right, inset 12 px: money badge; below it, the minimap (caption "Peta") with the HP button to its left (Nokia handset icon).
- Bottom left: joystick. Bottom right: **two separate buttons**, Tas (58x58) and Action (70x64, green). Tap Action = contextual action; the label shows as a tooltip above and the target icon as a badge in the top-right corner. Hold Action = progress ring + context menu by the thumb.
- Windows (Tas, work, etc.) stay XP Luna with only the X button, as in `ui_mockups/`. Only the font changed (Tahoma) and the icons are now 32/16 native.

## Font
- **Tahoma 11 px Regular / Bold**, aliased (no smoothing). The files are **Wine's Tahoma clone** (`tahoma.ttf`, `tahomabd.ttf`, LGPL), which matches Microsoft Tahoma's metrics. Microsoft's own Tahoma is not on the box and can't be redistributed (`ttf-mscorefonts-installer` doesn't include Tahoma, and apt on the box returns errors). The fonts were installed to `/usr/share/fonts/truetype/wine/` from the `.deb` (system fonts only, no game changes).
- 11 px is the only size used in the mockups (except one 10 px sample in the components sheet). Wine Tahoma at 9–10 px renders unevenly when aliased, so avoid it.
- Web implementation: `font-family: Tahoma, "Wine Tahoma", Verdana, "DejaVu Sans", sans-serif; font-size: 11px;` plus `-webkit-font-smoothing: none` / `font-smooth: never` where the browser supports it. Windows and macOS (Tahoma is usually installed) get real Tahoma. Android/iOS without Tahoma: bundle `fonts/tahoma*.ttf` as a webfont (LGPL; keep the license notice) or fall back to Verdana/DejaVu, which are wider, so long labels may need checking.
- Win98 MS Sans Serif (bitmap 13/16/20 px, also from Wine) was considered but not used: it's 13 px tall and has no fitting bold.

## Palette (new chrome colours, hex)
Classic bevel: face `#ECE9D8` · highlight `#FFFFFF` · light `#F1EFE2` · shadow `#ACA899` · dark shadow `#716F64` · outer edge `#404040`.
HUD caption (Win2000 gradient, stepped + dithered): active `#0A246A → #A6CAF0`, inactive `#808080 → #C0C0C0`.
Selection `#316AC5` · tooltip `#FFFFE1` (1 px border `#000000`) · Action green `#3C9A3C` / light `#6CC56C` / dark `#1D4F1D` / bevel highlight `#A9E3A9` · XP bar / level blue `#2A7BF6` · classic progress navy `#0A246A` · error / need <= 25% `#E5484D` · disabled text `#ACA899` + white emboss.
Need bars (unchanged from the style sheet): Hunger `#F5B941`, Hygiene `#5CB8FF`, Bladder `#F5D547`, Energy `#3DDC84`.
XP windows keep the old palette from `ui_mockups/README.md` (Luna `#0831D9/#0A5FE8/#2A7BF6`, close `#E35A2F`, etc.).
New compared with `ui_mockups`: `#404040 #716F64 #F1EFE2 #0A246A #A6CAF0 #808080 #C0C0C0 #A9E3A9`. Icon colours are mostly game/style-sheet colours. Icon outlines are a dark tint of the fill colour (generated), or black for the hand, warn, and so on.

## Icons (`src/icons.py`, each drawn natively at 32 and 16 px)
bag (Tas, backpack) · hand (Action, Windows link-select cursor) · hunger (bowl of noodles) · hygiene (soap + bubbles) · bladder (toilet) · energy (battery + lightning, "Power Options" style) · phone (Nokia 3310-like handset) · coin (money badge) · map (minimap caption) · user (profile) · talk (NPC) · coffee · food · chair · bed · box (item) · lock · fart · pee · emote · cancel (Windows error) · warn · info · check · clock · hourglass (waiting) · key · book · bottle · house (Simpan/kamar) · work (briefcase).
Style: 1 px outline, highlight on the inner top-left edge, shade on the inner bottom-right edge, 4-step dither gradient on large areas, hard drop shadow 1 px (16) / 2 px (32). Nearest-neighbour only, no anti-aliasing.

## Sizes (1x logical px, pre-Vista; current changes are in the Vista revision)
Profile card 156x58 (caption 16, avatar well 34) · need panel 156x78 (row 18, bar 126x14) · money badge h 24 · minimap 84x90 · HP 46x54 · Tas 58x58 · Action 70x64 (target badge 22x22) · joystick Ø76 (arrows 15x15, knob Ø28) · hold ring r 40–46, 24 segments · context menu 150 wide, row 28 (touch, taller than desktop Windows' 18–22) · tooltip h 18 (31 with a second line) · icons 32 in buttons/slots, 16 in bars/menus/tooltips · safe area left 16, right 12, top 8, bottom 10.

## Limitations
- **Font**: this is not Microsoft Tahoma. Wine's clone looks similar but differs in a few glyphs/spacing. Not tested in a browser or on a physical phone.
- **Pixel-scale mixing**: HUD and windows now render 1:1 (32/16 icons at native size, sprites 1x), so the 2x icons from before are gone. **Still mixed**: (a) the Nokia handset from `ui_nokia` uses a 2x2 LCD pixel per logical pixel (that's how it was designed, unchanged); (b) the avatar portrait is a 1x sprite crop (fine). The old icons in the left column of `07_icon_sheet_4x` are 16 px 1x; in the old HUD they were shown at 2x.
- 16 px icons are scaled from the same drawing as the 32s and then cleaned up only lightly. Some (coin, hygiene, bladder) are less clear at 16 than at 32.
- Classic grey bevels + Win2000 captions on the HUD sit alongside XP Luna windows. That's intentional (both Y2K), but it's two Windows "generations" on one screen. If you want one, swap the HUD captions to Luna.
- The original user screenshot of the live HUD ("Noorz") is not on the box. The "before" in `08_before_after` uses `ui_mockups/01_hud`, which has the same layout (avatar card + Lv, money, minimap, HP, Tas, Action). The live game shows a login page in headless Chrome, so no live screenshot was taken (no account was created).
- The 667x375 versions are generated automatically. Only `01_hud_y2k` was checked by eye. 3x versions were not made.
- Animation (ring, blink) is static frames + a 2-frame GIF only. Hover states appear only in the components sheet. There's no prototype HTML for this set.
- Context labels in the world (NPC nameplate, "Bicara" prompt) now use the Windows tooltip style. This replaces the earlier decision (dark #10141B + brass label) in `ui_mockups` and deviates from the art direction style sheet (brass accent). Check with AD.
- The bladder colour `#F5D547` is still the extra colour from earlier (not yet checked by AD) and is close to Hunger `#F5B941`. At 25% both turn red, so they're told apart by icon.
