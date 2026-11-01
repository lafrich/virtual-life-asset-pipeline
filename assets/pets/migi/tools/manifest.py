"""Write pets/migi/manifest.json in the ENVIRONMENT manifest schema (+ shadow layer, pivot, pet use_points)."""
import json, os
OUT = 'assets/pets/migi'
info = json.load(open(f'{OUT}/props/_props_info.json'))
ENV = json.load(open('assets/environment/manifest.json'))['_meta']
d = 0.36   # bowl centre -> Migi pivot distance (tiles) so his muzzle is over the bowl in 'eat'
eat_pts = [
    {'point': [0.5, 0.5 - d], 'facing': 'sw', 'actor': 'pet', 'anim': 'eat', 'recommended': True, 'note': 'faces the camera; bowl draws over his chin'},
    {'point': [0.5 - d, 0.5], 'facing': 'se', 'actor': 'pet', 'anim': 'eat', 'recommended': True, 'note': 'faces the camera; bowl draws over his chin'},
    {'point': [0.5, 0.5 + d], 'facing': 'ne', 'actor': 'pet', 'anim': 'eat', 'note': 'back to the camera'},
    {'point': [0.5 + d, 0.5], 'facing': 'nw', 'actor': 'pet', 'anim': 'eat', 'note': 'back to the camera'},
]
def ent(id_, base, main, extra):
    i = info[id_]
    e = {'id': id_, 'base_id': base, 'area': 'pets', 'kind': 'object', 'facing': None,
         'size': i['size'], 'anchor': i['anchor'], 'footprint': [1, 1],
         'main': f'props/{id_}.png', 'shadow': f'props/{id_}__shadow.png', 'shadow_blend': 'normal',
         'floor_center_px': i['floor_center_px'],
         'pivot_px': i['floor_center_px'],
         'anchor_note': 'anchor = pixel on P(c,r) (north vertex of the footprint), exactly like environment/manifest.json; pivot_px = the tile-centre foot point P(c+0.5, r+0.5) in PNG px.',
         'blocking': True, 'block_cells': [[0, 0]], 'pet_walkable_cells': [[0, 0]]}
    e.update(extra); return e
assets = [
    ent('pet_bowl_empty', 'pet_bowl', None, {'state': 'empty', 'states': {'empty': 'pet_bowl_empty', 'full': 'pet_bowl_full'},
        'use_points': eat_pts, 'depth_offset': {'back': 1.0}}),
    ent('pet_bowl_full', 'pet_bowl', None, {'state': 'full', 'states': {'empty': 'pet_bowl_empty', 'full': 'pet_bowl_full'},
        'use_points': eat_pts, 'depth_offset': {'back': 1.0}}),
    ent('pet_bed_grid', 'pet_bed_grid', None, {
        'use_points': [{'point': [0.5, 0.5], 'facing': 'any', 'actor': 'pet', 'anim': 'sleep', 'anims': ['sleep', 'loaf', 'sit'],
                        'z_px': 8, 'pet_offset_y_px': -8, 'recommended': True,
                        'note': 'Migi lies ON the pillow: draw his frame 8 px higher (pet_offset_y_px, x0.5 in SVG units). Facing se/sw shows his face.'}],
        'seat_z_px': 8, 'depth_offset': {'back': 0.95},
        'note': 'black pillow with a cream grid (Migi\'s real pillow), black-hair ramp + gallery_mid lines. Like floor_cushion_*: people do not walk through it.'}),
]
man = {'_meta': {
    'version': '1.0', 'schema': 'environment/manifest.json (same fields; adds shadow, shadow_blend, pivot_px, pet_walkable_cells, use_points[].actor/anim/z_px/pet_offset_y_px, states)',
    'style_sheet': 'art-direction/style-sheet.md v1.4 + "Migi (the user\'s cat)" AD direction',
    'projection': ENV['projection'], 'tile_px': ENV['tile_px'], 'height_step_px': ENV['height_step_px'],
    'screen_of_world': ENV['screen_of_world'], 'anchor_rule': ENV['anchor_rule'],
    'depth_rule': ENV['depth_rule'] + ' ; pet (Migi): pos.c + pos.r + 0.05 (same as avatars)',
    'layer_order': ['floor tiles', 'floor_overlay (rugs)', 'floor light pools (screen)', 'SHADOW layers of pets/props (normal blend, #0B0E13 @ 40%)',
                    'back walls + wall_item', 'objects + avatars + Migi (depth sorted)', 'glow layers'],
    'pet_actor': {'id': 'migi', 'metadata': 'metadata.json', 'sheet': 'migi_sheet.png', 'shadow_sheet': 'migi_sheet_shadow.png',
                  'frame': [32, 32], 'pivot': [32 // 2, 24],
                  'draw_rule': 'frame top-left = P(pos) - (16, 24) px (+ use_point.pet_offset_y_px); SVG units: x=P.x-8, y=P.y-12, w=h=16'},
    'palette': 'official hexes only (no new hexes, nothing pending)'},
    'assets': assets}
json.dump(man, open(f'{OUT}/manifest.json', 'w'), indent=1)
print('manifest ok', [a['id'] for a in assets])
