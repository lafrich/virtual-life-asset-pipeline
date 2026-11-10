#!/usr/bin/env python3
"""Decode and validate native V6B r4 Mainkan fixture PNGs from review payload shards."""
from __future__ import annotations
import base64, io, json, pathlib, re, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1] if pathlib.Path(__file__).resolve().parent.name=='tools' else pathlib.Path.cwd()
ASSETS = ROOT / 'assets' / 'street_buildings'
PAYLOAD = ASSETS / 'mainkan_gameplay_payload'
CATALOG = ASSETS / 'mainkan_gameplay_catalog.json'


def make_neutral_depth(sprite: Image.Image, footprint, pivot):
    """Preview-grade 16-bit RG pixel depth paired with an isometric fixture.

    Neutral billboard projection (cr=0): it retains screen-space placement and
    avoids invalid missing sampler textures. Geometry-specific foreground and
    overhang depth must be authored after owner approval.
    """
    w,h=sprite.size
    img=Image.new('RGBA',(w,h),(0,0,0,0))
    ink=sprite.load();target=img.load()
    center=(float(footprint[0])+float(footprint[1]))/2
    for y in range(h):
        d=center-(y-pivot[1])/32.0
        v=max(0,min(65535,round((d+24.0)/104.0*65535)))
        color=(v>>8,v&255,255,255)
        for x in range(w):
            if ink[x,y][3]==255:target[x,y]=color
    return img


def main():
    cat = json.loads(CATALOG.read_text(encoding='utf8'))
    specs = {a['id']: a for a in cat['assets']}
    assert len(specs) == 30, 'Expect exactly 30 Mainkan fixtures'
    expected = {}
    for slug, obj in specs.items():
        assert re.fullmatch(r'id_mainkan_[a-z0-9_]+', slug)
        assert obj['source'] == 'pipeline-street' and obj['published'] is True
        assert set(obj['variants']) == {'sw','se','ne','nw'}
        for direction, v in obj['variants'].items():
            p = 'assets/street_buildings/' + v['file']
            assert p == f'assets/street_buildings/props/{slug}_{direction}.png'
            expected[p] = (v['size'],v['pivot'],obj['footprint'])
    seen = set()
    shards = sorted(PAYLOAD.glob('part-*.json'))
    assert len(shards) == 6, 'Expect exactly six source payload shards'
    count=0
    for shard in shards:
        records = json.loads(shard.read_text(encoding='utf8'))
        assert len(records) == 20, f'20 records expected in {shard}'
        for rec in records:
            relative = rec['path']
            assert relative in expected and relative not in seen, f'Unregistered/duplicate {relative}'
            seen.add(relative)
            source = base64.b64decode(rec['data'], validate=True)
            assert source.startswith(b'\x89PNG\r\n\x1a\n'), relative
            with Image.open(io.BytesIO(source)) as im:
                im.load()
                assert im.mode == 'RGBA', f'Not RGBA: {relative}'
                size,pivot,footprint=expected[relative]
                assert list(im.size)==size, (relative,im.size,size)
                assert 0<=pivot[0]<=size[0] and 0<pivot[1]<=size[1], relative
                assert set(im.getchannel('A').getdata()).issubset({0,56,255}), relative
                assert im.getbbox(), relative
                depth=make_neutral_depth(im,footprint,pivot)
            dest = ROOT / relative
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(source)
            depth.save(dest.with_name(dest.stem+'__depth.png'),optimize=True)
            count+=1
    assert len(seen)==len(expected)==120, (len(seen),len(expected))
    print(f'PASS: {count} registered V6B r4 native sprite PNGs + {count} preview-neutral depth maps decoded and validated')

if __name__=='__main__':main()