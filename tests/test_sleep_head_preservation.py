"""Sleep must preserve actual native head shape and eye coordinates at 1:1."""
import sys
from pathlib import Path
import unittest
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"chars-iso"/"v6b"/"tools"))
import live_v6b as v6b

class HeadPreservingLie(unittest.TestCase):
    def test_face_and_head_use_same_native_pixel_translation(self):
        body=np.zeros((112,64,4),dtype=np.uint8)
        # Distinct head pixels, with an asymmetric wedge silhouette. A
        # flattened/rotated head would not retain this exact pixel pattern.
        for yy in range(31,53):
            for xx in range(16,36):
                if (xx+yy)%7 != 0:
                    body[yy,xx]=[247,121,63,255]
        body[53:57,25:31]=[247,121,63,255]
        body[57:96,24:38]=[62,69,85,255]
        # The face layer is authored in standing-head coordinates.
        face=np.zeros_like(body);face[43:45,24:26]=[0,0,0,255]
        skin=Image.fromarray(body,"RGBA")
        eye=Image.fromarray(face,"RGBA")
        shift=v6b.lie_head_shift({"body":skin})
        out=v6b.lie_preserve_head({"body":skin},"se",shift)["body"]
        overlay=v6b.lie_preserve_head({"face":eye},"se",shift)["face"]
        dx,dy=shift
        for y in range(31,53):
            for x in range(16,36):
                if (x+y)%7 != 0:
                    self.assertEqual(out.getpixel((x+dx,y+dy)),(247,121,63,255))
        # Eyes must land at the SAME relative point within the original skull.
        self.assertEqual(overlay.getpixel((24+dx,43+dy)),(0,0,0,255))
        self.assertEqual(overlay.getpixel((25+dx,44+dy)),(0,0,0,255))
        self.assertNotEqual(shift, v6b.lie_head_shift({"face":eye}),
         "A face-only recentering would misalign the face; shared shift is required")

    def test_one_pixel_in_source_stays_one_pixel_in_sleep(self):
        figure=np.zeros((112,64,4),dtype=np.uint8)
        figure[33,19]=[14,28,210,255]
        figure[41:50,25:35]=[248,173,116,255]
        figure[57:97,21:40]=[31,65,88,255]
        src=Image.fromarray(figure,"RGBA")
        shift=v6b.lie_head_shift({"figure":src})
        out=v6b.lie_preserve_head({"figure":src},"ne",shift)["figure"]
        self.assertEqual(out.getpixel((19+shift[0],33+shift[1])),(14,28,210,255))
        # Native head colours remain unchanged and pixelated.
        self.assertEqual(out.getpixel((25+shift[0],41+shift[1])),(248,173,116,255))

if __name__=="__main__":
    unittest.main()
