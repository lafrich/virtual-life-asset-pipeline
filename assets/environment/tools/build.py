"""Build all environment PNGs + manifest.json.  python3 tools/build.py"""
import os, json, sys
sys.path.insert(0, os.path.dirname(__file__))
from iso import Sprite, scr, OX, OY
import assets as A
from palette import AD, DERIVED, PAL, SHADE_STATUS, FLOOR_TINTS, FLOOR_TINT, V13, V13_DERIVED, V13_PENDING

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F4, F2 = ['sw', 'se', 'ne', 'nw'], ['sw', 'se']
DIRV = {(0, 1): 'sw', (1, 0): 'se', (0, -1): 'ne', (-1, 0): 'nw'}

REG = []
def reg(id, area, fn, W=1, D=1, facings=('sw',), kind='object', blocking=True, frames=1, fps=0, kw=None, note=None, tags=None, extra=None, tilebox=False):
    REG.append(dict(id=id, area=area, fn=fn, W=W, D=D, facings=list(facings), kind=kind, blocking=blocking,
                    frames=frames, fps=fps, kw=kw or {}, note=note, tags=tags or [], extra=extra or {}, tilebox=tilebox))

# ---------------- 1. tileset
for k in A.FLOORS:
    for v in 'ab':
        reg(f'{k}_{v}', 'tiles', A.floor_tile, kind='floor', blocking=False, kw=dict(kind=k, var=v))
for side in 'LR':
    reg(f'floor_edge_{side}', 'tiles', A.floor_edge, kind='floor', blocking=False, kw=dict(side=side),
        note='slab side for the open front edges of a room (purely visual)')
for skin in ('night', 'gallery', 'library'):
    for side in 'LR':
        for kind in ('plain', 'window', 'door', 'doorway', 'door_open'):
            if skin != 'night' and kind in ('door_open',): continue
            reg(f'wall_{side}_{kind}' + ('' if skin == 'night' else f'_{skin}'), 'walls', A.wall_seg, kind='wall',
                kw=dict(side=side, kind=kind, skin=skin), blocking=False)
        reg(f'wall_{side}_cap' + ('' if skin == 'night' else f'_{skin}'), 'walls', A.wall_cap, kind='wall', kw=dict(side=side, skin=skin), blocking=False)
    reg('wall_corner' + ('' if skin == 'night' else f'_{skin}'), 'walls', A.wall_corner, kind='wall', kw=dict(skin=skin), blocking=False)
for n, fn in (('partition_low', A.partition_low), ('partition_glass', A.partition_glass),
              ('partition_doorway', A.partition_doorway), ('partition_post', A.partition_post)):
    reg(n, 'walls', fn, facings=['sw', 'se'] if n != 'partition_post' else ['sw'], blocking=(n != 'partition_doorway'))

# ---------------- 2. workspace
reg('desk_single', 'workspace', A.desk, 1, 1, F4)
reg('desk_double', 'workspace', A.desk, 2, 1, F4)
reg('desk_plain', 'workspace', A.desk_plain, 2, 1, F4)
reg('desk_L', 'workspace', A.desk_L, 2, 2, F2)
reg('cubicle', 'workspace', A.cubicle, 2, 2, F2)
reg('office_chair', 'workspace', A.office_chair, 1, 1, F4)
reg('filing_cabinet', 'workspace', A.filing_cabinet, 1, 1, F2)
reg('trash_bin', 'workspace', A.trash_bin)
reg('pc_tower', 'workspace', A.pc_tower, 1, 1, F2)
reg('prop_monitor', 'workspace', A.prop_monitor, 1, 1, F4, kind='surface_prop', blocking=False)
reg('prop_keyboard', 'workspace', A.prop_keyboard, 1, 1, F2, kind='surface_prop', blocking=False)
reg('prop_desk_lamp', 'workspace', A.prop_lamp, kind='surface_prop', blocking=False)
reg('prop_mug', 'workspace', A.prop_mug, kind='surface_prop', blocking=False)
reg('prop_papers', 'workspace', A.prop_papers, kind='surface_prop', blocking=False)
reg('plant_desk', 'workspace', A.plant_small, kind='surface_prop', blocking=False)
# ---------------- 3. library
reg('bookshelf_tall', 'library', A.bookshelf, 2, 1, F4)
reg('bookshelf_tall_1', 'library', A.bookshelf, 1, 1, F2)
reg('bookshelf_low', 'library', A.bookshelf_low, 1, 1, F2)
reg('reading_table', 'library', A.reading_table, 2, 1, F2)
reg('armchair_leather', 'library', A.armchair, 1, 1, F4)
reg('library_chair', 'library', A.library_chair, 1, 1, F4)
reg('globe', 'library', A.globe)
reg('library_ladder', 'library', A.ladder, 1, 1, F2)
reg('floor_lamp', 'library', A.floor_lamp)
reg('rug_library', 'library', A.rug, 2, 3, F2, kind='floor_overlay', blocking=False, kw=dict(m='oxblood', border='brass'))
# ---------------- 4. lounge
reg('sofa_2', 'lounge', A.sofa, 2, 1, F4)
reg('sofa_3', 'lounge', A.sofa, 3, 1, F4)
reg('armchair_lounge', 'lounge', A.lounge_armchair, 1, 1, F4)
reg('coffee_table', 'lounge', A.coffee_table, 2, 1, F2)
reg('pingpong_table', 'lounge', A.pingpong, 3, 2, F2)
reg('coffee_counter', 'lounge', A.coffee_counter, 2, 1, F2, frames=3, fps=6)
reg('prop_coffee_machine', 'lounge', A.prop_coffee_machine, 1, 1, F2, kind='surface_prop', blocking=False, frames=3, fps=6)
reg('plant_palm', 'lounge', A.plant_palm)
reg('plant_bush', 'lounge', A.plant_bush)
reg('plant_snake', 'lounge', A.plant_snake)
reg('plant_tall', 'lounge', A.plant_tall)
reg('rug_lounge', 'lounge', A.rug, 3, 2, F2, kind='floor_overlay', blocking=False, kw=dict(m='plum', border='brass', lift=1))
# ---------------- 5. coordination
reg('meeting_table', 'coordination', A.meeting_table, 3, 2, F2)
reg('meeting_chair', 'coordination', A.meeting_chair, 1, 1, F4)
reg('whiteboard_wall', 'coordination', A.whiteboard_wall, 2, 1, F2, kind='wall_item', blocking=False)
reg('whiteboard_stand', 'coordination', A.whiteboard_stand, 2, 1, F4)
reg('tv_wall', 'coordination', A.tv_wall, 2, 1, F2, kind='wall_item', blocking=False)
reg('tv_stand', 'coordination', A.tv_stand, 2, 1, F4)
reg('rug_coordination', 'coordination', A.rug, 5, 4, F2, kind='floor_overlay', blocking=False, kw=dict(m='night', border='steel'))
# ---------------- 6. gallery
for n, fn, w in (('frame_small', A.frame_small, 1), ('frame_medium', A.frame_medium, 1),
                 ('frame_large', A.frame_large, 2), ('frame_portrait', A.frame_portrait, 1)):
    reg(n, 'gallery', fn, w, 1, F2, kind='wall_item', blocking=False)
    reg(n + '_empty', 'gallery', fn, w, 1, F2, kind='wall_item', blocking=False, kw=dict(empty=True),
        note='picture area left dark; map a thumbnail onto picture_quad')
reg('picture_light', 'gallery', A.picture_light, 1, 1, F2, kind='wall_item', blocking=False)
reg('easel', 'gallery', A.easel, 1, 1, F4)
reg('pedestal_bust', 'gallery', A.pedestal)
reg('pedestal_sculpture', 'gallery', A.pedestal_sculpt)
reg('light_spot', 'gallery', A.light_pool, 1, 1, kind='floor_overlay', blocking=False, kw=dict(col='glow', alpha=40))
# ---------------- 7. sharing
reg('campfire', 'sharing', A.campfire, frames=6, fps=8)
for m in ('oxblood', 'plum', 'steel', 'baize', 'tan', 'cream'):
    reg(f'beanbag_{m}', 'sharing', A.beanbag, 1, 1, F4, kw=dict(m=m))
for m in ('plum', 'oxblood', 'tan', 'steel'):
    reg(f'floor_cushion_{m}', 'sharing', A.floor_cushion, kw=dict(m=m))
reg('notice_board_wall', 'sharing', A.notice_board_wall, 2, 1, F2, kind='wall_item', blocking=False)
reg('notice_board_stand', 'sharing', A.notice_board_stand, 2, 1, F4)
reg('rug_round', 'sharing', A.rug, 3, 3, kind='floor_overlay', blocking=False, kw=dict(m='tan', border='ember', shape='round'))
# ---------------- 8. misc
reg('clock', 'misc', A.clock, 1, 1, F2, kind='wall_item', blocking=False)
reg('poster', 'misc', A.poster, 1, 1, F2, kind='wall_item', blocking=False)
reg('window', 'misc', A.window_wall, 2, 1, F2, kind='wall_item', blocking=False)
reg('window_1', 'misc', A.window_wall, 1, 1, F2, kind='wall_item', blocking=False)
reg('copier', 'misc', A.copier, 1, 1, F2)
reg('water_dispenser', 'misc', A.water_dispenser, 1, 1, F2)
# ---------------- fx (floor light pools, blend layer)
reg('pool_warm_1', 'fx', A.light_pool, 1, 1, kind='floor_overlay', blocking=False, kw=dict(col='glow'))
reg('pool_warm_2', 'fx', A.light_pool, 2, 2, kind='floor_overlay', blocking=False, kw=dict(col='glow'))
reg('pool_ember_3', 'fx', A.light_pool, 3, 3, kind='floor_overlay', blocking=False, kw=dict(col='ember', alpha=50))

# ================= v1.3 new areas (style sheet v1.3) =================
import assets_v13 as B
from palette import ACCENT_BRAINSTORM, ACCENT_MEETING
SWIM = dict(zone='swim', walkable_for=['swimmer'], water_surface_z_px=B.WATER_Z, water_line_px=B.WATER_LINE_PX,
            swim_avatar_offset_y_px=B.WATER_LINE_PX - B.WATER_Z, contract='outdoor_contract.json')
for k, area in (('carpet_coral', 'brainstorm'), ('carpet_teal', 'meeting'), ('grass_night', 'outdoor'), ('deck_stone', 'outdoor')):
    for v in 'ab':
        reg(f'{k}_{v}', area, B.floor13, kind='floor', blocking=False, kw=dict(kind=k, var=v))
# ---- brainstorm
reg('whiteboard_big', 'brainstorm', B.whiteboard_big, 3, 1, F2, kind='wall_item', blocking=False)
reg('sticky_wall', 'brainstorm', B.sticky_wall, 2, 1, F2, kind='wall_item', blocking=False)
reg('moodboard', 'brainstorm', B.moodboard, 2, 1, F2, kind='wall_item', blocking=False)
reg('high_table', 'brainstorm', B.high_table, extra=dict(surface_z_px=B.HIGH_TABLE_Z))
reg('high_stool', 'brainstorm', B.high_stool, note='seat_z 26: draw the sit frame lifted 12 px (avatar_offset_y_px -12)')
reg('rug_brainstorm', 'brainstorm', A.rug, 3, 2, F2, kind='floor_overlay', blocking=False, kw=dict(m='night', border='coral'))
# ---- meeting
reg('meeting_table_teal', 'meeting', B.meeting_table_acc, 3, 2, F2, note='v1.1 3x2 meeting table re-inlaid with the meeting accent; chair_slots = 6 seats around it')
reg('meeting_chair_teal', 'meeting', B.meeting_chair_acc, 1, 1, F4)
reg('tv_meeting', 'meeting', B.tv_meeting, 2, 1, F2, kind='wall_item', blocking=False)
reg('glass_partition_tall', 'meeting', B.glass_partition, 1, 1, ['sw', 'se'],
    extra=dict(cutaway_variant='glass_partition_tall_cutaway', render_rule='OPAQUE only where nothing walkable is behind it (against a back wall); anywhere it can occlude an avatar use the _cutaway variant'))
reg('glass_partition_tall_cutaway', 'meeting', B.glass_partition, 1, 1, ['sw', 'se'], kw=dict(cutaway=True),
    extra=dict(opaque_variant='glass_partition_tall', render_rule='default for free-standing / camera-side partitions (iso cutaway convention): frame + top rail + 1px paper highlight, no fill'))
for side in 'LR':
    for k in ('glass', 'glassdoor'):
        reg(f'wall_{side}_{k}_meeting', 'meeting', B.wall_glass, kind='wall', blocking=False, kw=dict(side=side, kind=k),
            extra=dict(cutaway_variant=f'wall_{side}_{k}_meeting_cutaway', render_rule='BACK walls only (r=0 row for R, c=0 column for L): opaque glass is fine there'))
        reg(f'wall_{side}_{k}_meeting_cutaway', 'meeting', B.wall_glass, kind='wall', blocking=False, kw=dict(side=side, kind=k, cutaway=True),
            extra=dict(opaque_variant=f'wall_{side}_{k}_meeting', render_rule=f'FRONT / camera-side glass: place {side} pieces on the front edge (' + ('P(c, R)' if side == 'R' else 'P(C, r)') + ') or any interior run that can occlude avatars; depth key = c + r + 0.5 (after avatars of the row behind)'))
    reg(f'wall_{side}_glassdoor_outdoor', 'outdoor', B.wall_glass, kind='wall', blocking=False,
        kw=dict(side=side, kind='glassdoor', fill='wall_lit', warm=True), note='office -> outdoor transition; pair with door_spill on the deck cell in front')
# ---- outdoor
reg('pool_water', 'outdoor', B.pool_water, kind='floor', blocking=False, frames=B.POOL_FRAMES, fps=5.5,
    extra=dict(SWIM, frame_ms=180), note='water cell; draw instead of a floor tile; glow = underwater light + caustics (screen)')
CORNERS = {'n': 'nw', 'e': 'ne', 's': 'es', 'w': 'sw'}
for sd in 'nesw':
    reg(f'pool_edge_{sd}', 'outdoor', B.pool_coping, kind='floor_overlay', blocking=False, kw=dict(sides=sd), tilebox=True,
        extra=dict(SWIM, overlay_on='pool_water', edge=sd))
for v, sides in CORNERS.items():
    reg(f'pool_corner_{v}', 'outdoor', B.pool_coping, kind='floor_overlay', blocking=False, kw=dict(sides=sides), tilebox=True,
        extra=dict(SWIM, overlay_on='pool_water', corner=v))
    reg(f'pool_inner_{v}', 'outdoor', B.pool_coping, kind='floor_overlay', blocking=False, kw=dict(inner=v), tilebox=True,
        extra=dict(SWIM, overlay_on='pool_water', inner_corner=v))
reg('pool_light', 'outdoor', B.pool_light, 2, 2, kind='floor_overlay', blocking=False, frames=4, fps=5.5,
    extra=dict(frame_ms=180, per_pool=2, placement='2 per pool, on water cells about 1 tile in from the far (n/w) wall; screen blend; same frame index as pool_water'),
    note='underwater light spot: stepped mid #2D8FB0 gradient (dithered rim) to a #7FE0E8 core')
reg('pool_spill', 'outdoor', B.pool_spill, kind='floor_overlay', blocking=False, tilebox=True, note='deck/grass cells adjacent to water (screen blend)')
reg('door_spill', 'outdoor', B.door_spill, kind='floor_overlay', blocking=False, note='warm interior spill in front of wall_*_glassdoor_outdoor')
reg('sun_lounger', 'outdoor', B.sun_lounger, 1, 2, F4)
reg('sun_lounger_towel', 'outdoor', B.sun_lounger, 1, 2, F4, kw=dict(towel='steel'))
reg('sun_lounger_towel_coral', 'outdoor', B.sun_lounger, 1, 2, F4, kw=dict(towel='coral'))
reg('parasol', 'outdoor', B.parasol, note='hex pending AD (muted yellow computed); exactly one, by the pool bar')
reg('parasol_closed', 'outdoor', B.parasol, kw=dict(open_=False))
reg('pool_bar', 'outdoor', B.pool_bar, 2, 1, F2)
reg('towel_stack', 'outdoor', B.towel_stack)
for m in B.TOWELS:
    reg(f'towel_folded_{m}', 'outdoor', B.towel_folded, kind='surface_prop', blocking=False, kw=dict(m=m))
reg('planter_hedge', 'outdoor', B.planter_hedge)
reg('planter_hedge_2', 'outdoor', B.planter_hedge, 2, 1, F2)

WALL_OF = {'sw': 'R', 'se': 'L'}

def render(r, facing, frame, box=None):
    s = Sprite(r['W'], r['D'], facing)
    r['fn'](s, frame=frame, **r['kw'])
    imgs, anchor = s.finish(silhouette=r['kind'] not in ('floor', 'floor_overlay', 'wall'), box=box)
    return s, imgs, anchor

def wpt(s, a, b):
    return s.T(a, b)

def main():
    out = {'_meta': {}, 'assets': []}
    for r in REG:
        for facing in r['facings']:
            vid = r['id'] if len(r['facings']) == 1 else (f"{r['id']}_{WALL_OF[facing]}" if r['kind'] == 'wall_item' else f"{r['id']}_{facing}")
            # union crop over all frames so every frame/layer shares one anchor
            boxes = []
            for f in range(r['frames']):
                s, _, _ = render(r, facing, f); boxes.append(s.bbox)
            box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
            if r['kind'] == 'floor' or r.get('tilebox'):
                box = (OX - 32, OY, OX + 32, OY + 32 + (12 if r['id'].startswith('floor_edge') else 0))
            d = os.path.join(ROOT, r['area']); os.makedirs(d, exist_ok=True)
            frames = []
            for f in range(r['frames']):
                s, imgs, anchor = render(r, facing, f, box)
                suf = f'_f{f}' if r['frames'] > 1 else ''
                files = {}
                comp = imgs['base'].copy()
                if imgs['front'] is not None: comp.alpha_composite(imgs['front'])
                if r['kind'] in ('floor_overlay',) and imgs['glow'] is not None and imgs['base'].getbbox() is None:
                    comp = imgs['glow']; imgs['glow'] = None
                    files['main'] = f"{r['area']}/{vid}{suf}.png"; comp.save(os.path.join(ROOT, files['main']))
                    files['blend'] = 'screen'
                else:
                    files['main'] = f"{r['area']}/{vid}{suf}.png"; comp.save(os.path.join(ROOT, files['main']))
                if imgs['front'] is not None:
                    files['back'] = f"{r['area']}/{vid}{suf}__back.png"; imgs['base'].save(os.path.join(ROOT, files['back']))
                    files['front'] = f"{r['area']}/{vid}{suf}__front.png"; imgs['front'].save(os.path.join(ROOT, files['front']))
                if imgs['glow'] is not None:
                    files['glow'] = f"{r['area']}/{vid}{suf}__glow.png"; imgs['glow'].save(os.path.join(ROOT, files['glow']))
                frames.append(files)
            WW, DD = s.WW, s.DD
            e = dict(id=vid, base_id=r['id'], area=r['area'], kind=r['kind'], facing=facing if len(r['facings']) > 1 else None,
                     size=list(comp.size), anchor=list(anchor), footprint=[WW, DD])
            e.update({k: v for k, v in frames[0].items() if k != 'blend'})
            if frames[0].get('blend') or r['kind'] == 'floor_overlay' and r['area'] == 'fx': e['blend'] = 'screen'
            if 'glow' in frames[0]: e['glow_blend'] = 'screen'
            if r['frames'] > 1:
                e['animation'] = {'frames': r['frames'], 'fps': r['fps'], 'loop': True, 'files': frames}
            # floor-centre pixel for convenience
            cx, cy = scr(WW / 2, DD / 2, 0); e['floor_center_px'] = [round(cx - box[0], 1), round(cy - box[1], 1)]
            if r['kind'] == 'wall_item':
                e['wall'] = WALL_OF[facing]; e['footprint'] = [r['W'], 0] if facing == 'sw' else [0, r['W']]
                e['wall_span_tiles'] = r['W']
                if 'wall_z' in s.meta: e['mount_z_px'] = list(s.meta['wall_z'])
            if r['kind'] == 'wall':
                e['wall'] = r['kw'].get('side', 'corner'); e['footprint'] = [1, 0] if e['wall'] == 'R' else ([0, 1] if e['wall'] == 'L' else [0, 0])
                if r['fn'] is A.wall_cap: e['footprint'] = [0, 0]
                e['wall_height_px'] = A.WALL_H
                e['walkable_gap'] = r['kw'].get('kind') in ('doorway', 'door_open', 'glassdoor')
            if r['kind'] == 'surface_prop':
                px, py = scr(*s.T(0.5, 0.5), 0) if False else scr(0, 0, 0)
                cx, cy = s.S(0.5, 0.5, 0); e['anchor'] = [int(cx - box[0]), int(cy - box[1])]
                e['anchor_note'] = 'contact point (prop base centre); place at P(c,r) of the spot on the surface, minus surface_z px'
            # blocking
            walk = set(tuple(int(v) for v in wpt(s, a + 0.5, b + 0.5)) if False else () for a, b in [])
            wl = [s.T(a + 0.5, b + 0.5) for a, b in s.meta.get('walkable_local', [])]
            wl = set((int(x), int(y)) for x, y in wl)
            if r['kind'] in ('object',):
                cells = [[c, rr] for c in range(int(WW)) for rr in range(int(DD)) if (c, rr) not in wl]
                e['blocking'] = r['blocking']; e['block_cells'] = cells if r['blocking'] else []
                if wl: e['walkable_cells'] = [list(c) for c in sorted(wl)]
            else:
                e['blocking'] = False
            if 'surface_z' in s.meta: e['surface_z_px'] = s.meta['surface_z']
            # seats / use points
            def pt(loc, face):
                x, y = s.T(*loc); dv = {'front': (0, 1), 'back': (0, -1), 'right': (1, 0), 'left': (-1, 0)}[face]
                return [round(x, 3), round(y, 3)], DIRV[tuple(int(v) for v in s.Rv(*dv))]
            seats = []
            for st in s.meta.get('seats', []):
                p, fdir = pt(st['local'], st['face'])
                sz = st.get('seat_z', A.SEAT_Z)
                sd = dict(point=p, cell=[int(p[0] // 1), int(p[1] // 1)], facing=fdir if len(r['facings']) > 1 else 'any', seat_z_px=sz,
                          avatar_offset_y_px=A.SEAT_Z - sz, anims=st.get('anims', ['sit', 'sit_type'] if r['area'] in ('workspace', 'coordination', 'meeting') else ['sit']))
                if st.get('pose') == 'lie':
                    sd.update(pose='lie', avatar_offset_y_px=0, lie_seat_z_px=sz, note=st['note'])
                seats.append(sd)
            if seats: e['seats'] = seats
            uses = [dict(zip(('point', 'facing'), pt(u['local'], u['face']))) for u in s.meta.get('use', [])]
            if uses: e['use_points'] = uses
            if 'chair_slots' in s.meta:
                sl = []
                for u in s.meta['chair_slots']:
                    p, fdir = pt(u['local'], u['face'])
                    sl.append(dict(cell=[int(p[0] // 1), int(p[1] // 1)], chair=f"meeting_chair_teal_{fdir}", seat_point=p, facing=fdir))
                e['chair_slots'] = sl
                e['chair_slots_note'] = 'cells relative to the table origin (may be negative); place the chair asset at that cell, its seats[0] is the sit point'
            e.update(r.get('extra', {}))
            if 'picture_local' in s.meta:
                u0, u1, v0, v1, b = s.meta['picture_local']
                q = [s.S(u0, b, v1), s.S(u1, b, v1), s.S(u1, b, v0), s.S(u0, b, v0)]
                e['picture_quad'] = [[round(x - box[0], 1), round(y - box[1], 1)] for x, y in q]
                e['picture_quad_note'] = 'TL,TR,BR,BL in PNG px; map an image with an affine (3 points) - it is a 2:1 sheared rectangle'
            # depth
            base_off = (WW + DD) / 2
            if r['kind'] == 'object':
                dep = {'back': round(base_off, 3)}
                if seats:
                    ssum = [p['point'][0] + p['point'][1] for p in seats]
                    dep['back'] = round(min(base_off, min(ssum) - 0.05), 3)
                    if 'front' in e: dep['front'] = round(max(ssum) + (0.08 if r['id'].startswith(('desk', 'cubicle')) else 0.1), 3)
                elif 'front' in e:
                    dep['front'] = round(base_off + 0.1, 3)
                if r['id'] == 'desk_L': dep['back'] = 1.2
                e['depth_offset'] = dep
            if r['note']: e['note'] = r['note']
            out['assets'].append(e)
            print(vid, e['size'], e['anchor'], 'front' in e, 'glow' in e)
    out['_meta'] = dict(
        version='1.0', style_sheet='art-direction/style-sheet.md v1.1', projection='isometric 2:1 (dimetric)',
        tile_px=[64, 32], height_step_px=32, wall_height_px=A.WALL_H, half_wall_px=32, px_per_world_unit=2,
        tile_world_units=[32, 16], seat_z_px=A.SEAT_Z, desk_z_px=A.DESK_Z, wall_thickness_tiles=A.WT,
        avatar={'frame': [64, 112], 'pivot': [32, 100], 'standing_height_px': '84-88'},
        screen_of_world='sx = X0 + (c - r) * 32 ; sy = Y0 + (c + r) * 16 - z   (px at 1x; z up in px)',
        anchor_rule='image top-left = P(c, r) - anchor, where (c, r) = min corner (north vertex) of the footprint. Wall items: R -> P(c0, 0), L -> P(0, r0).',
        depth_rule='objects: key = c + r + depth_offset.back ; front slice: c + r + depth_offset.front ; avatar: pos.c + pos.r + 0.05 ; draw ascending',
        layer_order=['floor tiles', 'floor_overlay (rugs)', 'floor light pools (screen)', 'back walls + wall_item (in c+r order)',
                     'objects/back slices + avatars + front slices (depth sorted)', 'glow layers (screen, same anchor as object)'],
        facings={'sw': 'front faces +r (screen down-left)', 'se': 'front faces +c (down-right)', 'ne': 'front faces -r (up-right)', 'nw': 'front faces -c (up-left)'},
        palette_ad=AD, palette_accent_shades=DERIVED, palette_note='see palette.json for status (computed / exception)')
    FLOOR_DEFAULTS = {'workspace': 'floor_night', 'library': 'wood_walnut', 'lounge': 'carpet_plum',
                      'coordination': 'carpet_steel', 'gallery': 'floor_gallery', 'sharing': 'carpet_oxblood',
                      'brainstorm': 'carpet_coral', 'meeting': 'carpet_teal', 'outdoor': 'deck_stone', 'outdoor_lawn': 'grass_night'}
    out['_meta']['floor_defaults'] = {room: dict(a=k + '_a', b=k + '_b', rule='use _a when (c+r)%2==0 else _b')
                                      for room, k in FLOOR_DEFAULTS.items()}
    out['_meta']['floor_note'] = ('v1.2 floors: every room is night navy (walnut for library) with a low-contrast 2-value check; '
                                  'carpet_* / floor_gallery are navy tinted %d%% toward the room accent. Same ids/anchors as v1.1. '
                                  'grass_* is a legacy saturated tile, not recommended for room floors.' % round(FLOOR_TINT * 100))
    for e in out['assets']:
        if e.get('kind') == 'floor' and not e['id'].startswith('floor_edge'):
            base = e['id'][:-2]
            rooms = [room for room, k in FLOOR_DEFAULTS.items() if k == base]
            e['recommended_default_for'] = rooms
            if base == 'grass': e['not_recommended'] = 'full-saturation accent; keep for outdoor/planter use only'
    out['_meta']['version'] = '1.3'
    out['_meta']['style_sheet'] = 'art-direction/style-sheet.md v1.3'
    out['_meta']['v13'] = dict(
        new_areas=['brainstorm', 'meeting', 'outdoor'],
        accents={'brainstorm': ACCENT_BRAINSTORM, 'meeting': ACCENT_MEETING},
        seats_extra='seats[].pose = "lie" (loungers): anims ["lie"], lie_seat_z_px; high_stool seat_z_px 26 -> avatar_offset_y_px -12',
        chair_slots='meeting_table_teal_*: chair_slots[] = 6 chair cells (relative to the table origin) + chair id + seat point/facing',
        swim='water cells: pool_water (floor, 4 frames @180 ms + glow) carry zone="swim", water_surface_z_px, water_line_px, swim_avatar_offset_y_px; pool_edge_*/pool_corner_*/pool_inner_* are coping overlays drawn on water cells',
        outdoor_contract='outdoor_contract.json')
    json.dump(out, open(os.path.join(ROOT, 'manifest.json'), 'w'), indent=1)
    json.dump({'ad': AD, 'accent_shades': {k: dict(hex=v, **SHADE_STATUS[k]) for k, v in DERIVED.items()}, 'rule': 'shadow = L x0.75, hue 10 deg toward #1C2330; hilite = 30% toward paper / #FFD166 (warm)', 'approved_by': 'Bima (AD), 21 Oct 2026, env v1.1', 'v13_accents': dict(hexes=V13, status='APPROVED (pre-approved in style-sheet v1.3 by Bima): spark coral (brainstorm), slate teal (meeting), pool water ramp'),
               'v13_computed': dict(hexes=V13_DERIVED, status='computed by v1.2/v1.3 rules: <acc>_fa/_fb = 12% floor tint; teal_glass = wall_shd (1 navy step lighter) at 12% teal (glass fill); grass_dk/md = baize shadow/mid x0.81 (2 night steps of x0.9; AD outdoor review asked one more step)'),
               'v13_parasol': dict(hexes=V13_PENDING, status='APPROVED by Bima (AD), outdoor review 21 Oct 2026. Computed: mid = mix(glow, cool_grey, .35); shadow = rule (HSV value x0.75, hue 10 deg to navy); light = 30% to #FFD166'),
               'floor_tints': dict(hexes=FLOOR_TINTS, status='computed: <acc>_fa = mix(floor_dk, accent, %.2f), <acc>_fb = mix(floor_lt, accent, %.2f); wal_b = mix(wal, wal_dk, 0.15). Per AD in-context review (floor tint <= 10-15%%), APPROVED by Bima (AD), 21 Oct 2026, floors v1.2' % (FLOOR_TINT, FLOOR_TINT))}, open(os.path.join(ROOT, 'palette.json'), 'w'), indent=1)
    print(len(out['assets']), 'assets')

if __name__ == '__main__':
    main()
