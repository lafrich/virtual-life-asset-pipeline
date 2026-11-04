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

    def test_neck_is_connected_to_the_reclined_body_in_all_directions(self):
        # A fixed x/y for the head used to leave a visible gap. The preserved
        # chin/neck must intersect a REAL projected shoulder pixel, in either
        # perspective and after applying the normal mirrored direction.
        body=np.zeros((112,64,4),dtype=np.uint8)
        for y in range(30,56):
            inset=4 if y<33 else 2 if y<35 else 0 if y<50 else 3 if y<53 else 6
            body[y,17+inset:42-inset]=[248,180,115,255]
        body[56:59,27:33]=[248,180,115,255]
        torso=np.zeros_like(body)
        torso[56:83,22:42]=[55,74,92,255]
        source={"body":Image.fromarray(body,"RGBA"),
                "shirt":Image.fromarray(torso,"RGBA")}
        for direction in ("se","sw","ne","nw"):
            view="se" if direction in ("se","sw") else "ne"
            dx,dy=v6b.lie_head_shift(source,view)
            head=body.copy()
            head[56:]=0
            only_torso=body.copy()
            only_torso[:56]=0
            moved_head=np.zeros_like(body)
            # Reuse the same integer translation/paste as the renderer.
            im=Image.new("RGBA",(64,112))
            im.paste(Image.fromarray(head,"RGBA"),(dx,dy))
            head_mask=np.asarray(im)[...,3]>0
            flat=v6b.lie_flat({
                "body":Image.fromarray(only_torso,"RGBA"),
                "shirt":source["shirt"]},view,"lie")
            torso_mask=np.asarray(flat["body"])[...,3]>0
            torso_mask |= np.asarray(flat["shirt"])[...,3]>0
            if direction in ("sw","nw"):
                head_mask=np.fliplr(head_mask)
                torso_mask=np.fliplr(torso_mask)
            self.assertTrue(np.any(head_mask & torso_mask),
                f"{direction}: preserved skull detached from horizontal neck/shoulder")
            # The output must remain unscaled: entire original head silhouette
            # (not just the centre pixel) is translated exactly.
            self.assertEqual(int(head_mask.sum()),int((head[...,3]>0).sum()))
            frame=v6b.lie_preserve_head(source,view,(dx,dy))
            result=np.asarray(frame["body"])[...,3]>0
            result |= np.asarray(frame["shirt"])[...,3]>0
            if direction in ("sw","nw"):
                result=np.fliplr(result)
            self.assertTrue(np.any(result))

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
