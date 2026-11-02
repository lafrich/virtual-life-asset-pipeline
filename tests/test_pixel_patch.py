"""Pixel editor patch round-trip and protection of Theodore body."""
from __future__ import annotations
import base64
import io
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from assets.npc_otis import make_otis as O

class PixelPatchTests(unittest.TestCase):
    def make_patch(self, png: Image.Image):
        content=io.BytesIO()
        png.save(content,format="PNG")
        return {
            "format":"virtual-life-pixel-patch-v1","version":1,"actor":"legacy_otis",
            "frame_size":[64,112],"region":[8,18,56,72],
            "frames":[{"action":"walk","direction":"se","frame":1,
                       "png":"data:image/png;base64,"+base64.b64encode(content.getvalue()).decode("ascii")}]
        }
    def stored(self,record):
        d=tempfile.TemporaryDirectory()
        p=Path(d.name)/"edit.json"
        p.write_text(json.dumps(record),encoding="utf-8")
        return d,p
    def test_applies_only_head_region_to_generated_native_frame(self):
        source=Image.new("RGBA",(64,112),(150,50,75,255))
        edited=Image.new("RGBA",(64,112),(0,0,0,0))
        edited.putpixel((24,40),(20,200,230,255))
        edited.putpixel((24,95),(0,0,0,0)) # feet cannot be overwritten
        d,p=self.stored(self.make_patch(edited))
        try:
            patches=O.load_pixel_overrides(p)
            result=O.apply_pixel_override(source,"se","walk",1,patches)
            self.assertEqual(result.getpixel((24,40)),(20,200,230,255))
            self.assertEqual(result.getpixel((24,95)),source.getpixel((24,95)))
            self.assertEqual(result.getpixel((0,40)),source.getpixel((0,40)))
            self.assertEqual(result.getpixel((24,40)),(20,200,230,255))
            self.assertEqual(O.apply_pixel_override(source,"se","walk",0,patches).tobytes(),source.tobytes())
        finally:d.cleanup()
    def test_rejects_wrong_actor_region_png_or_frame(self):
        png=Image.new("RGBA",(64,112))
        base=self.make_patch(png)
        cases=[
            {**base,"actor":"legacy_theodore"},
            {**base,"region":[0,0,64,112]},
            {**base,"frames":[{**base["frames"][0],"frame":77}]},
            {**base,"frames":base["frames"]*2},
            {**base,"frames":[{**base["frames"][0],"png":"data:image/png;base64,NOT_PNG"}]}
        ]
        for data in cases:
            with self.subTest(case=data):
                d,p=self.stored(data)
                try:
                    with self.assertRaises(ValueError):O.load_pixel_overrides(p)
                finally:d.cleanup()
    def test_v2_full_body_patch_is_explicit_and_preserves_theodore_source(self):
        source=Image.new("RGBA",(64,112),(145,70,55,255))
        edited=source.copy()
        edited.putpixel((12,80),(80,130,190,255))
        record=self.make_patch(edited)
        record["format"]="virtual-life-pixel-patch-v2"
        record["version"]=2
        record["region"]=[0,0,64,112]
        record["masters"]=[{"direction":"se","part":"arm_l","diff":[[12,80,80,130,190,255]]}]
        d,p=self.stored(record)
        try:
            patches=O.load_pixel_overrides(p)
            result=O.apply_pixel_override(source,"se","walk",1,patches)
            self.assertEqual(result.getpixel((12,80)),(80,130,190,255))
            self.assertEqual(source.getpixel((12,80)),(145,70,55,255))
            self.assertEqual(result.getpixel((12,80)),edited.getpixel((12,80)))
        finally:d.cleanup()
    def test_patch_is_optional(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(O.load_pixel_overrides(Path(d)/"none.json"),{})
if __name__=="__main__":unittest.main()
