#!/usr/bin/env python3
"""Decode and validate native V6B r4 Mainkan fixture PNGs from review payload shards."""
from __future__ import annotations
import base64, io, json, pathlib, re, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1] if pathlib.Path(__file__).resolve().parent.name=='tools' else pathlib.Path.cwd()
ASSETS = ROOT / 'assets' / 'street_buildings'
PAYLOAD = ASSETS / 'mainkan_gameplay_payload'
CATALOG = ASSETS / 'mainkan_gameplay_catalog.json'


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
            expected[p] = (v['size'],v['pivot'])
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
                size,pivot=expected[relative]
                assert list(im.size)==size, (relative,im.size,size)
                assert 0<=pivot[0]<=size[0] and 0<pivot[1]<=size[1], relative
                assert set(im.getchannel('A').getdata()).issubset({0,56,255}), relative
                assert im.getbbox(), relative
            dest = ROOT / relative
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(source)
            count+=1
    assert len(seen)==len(expected)==120, (len(seen),len(expected))
    print(f'PASS: {count} registered V6B r4 native sprite PNGs decoded and validated')

if __name__=='__main__':main()