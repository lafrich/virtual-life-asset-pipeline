"""Native V6B bed sleep must project its original head along the body axis.

A quarter-turn alone leaves the head too upright against the isometric body.
The skull/eyes/hair share a neck pivot and an integer-pixel perspective slope,
without dropping head scanlines or resampling. All four views retain a seam.
"""
import sys
from pathlib import Path
import unittest
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"chars-iso"/"v6b"/"tools"))
import live_v6b as v6b


def specimen():
    body=np.zeros((112,64,4),dtype=np.uint8)
    for yy in range(30,56):
        inset=4 if yy<33 else 2 if yy<35 else 0 if yy<50 else 3 if yy<53 else 6
        body[yy,17+inset:42-inset]=[248,180,115,255]
    body[56:59,27:33]=[248,180,115,255]
    torso=np.zeros_like(body)
    torso[56:83,22:42]=[55,74,92,255]
    eye=np.zeros_like(body)
    eye[42:44,24:27]=[17,32,42,255]
    eye[42:44,33:36]=[17,32,42,255]
    hair=np.zeros_like(body)
    hair[30:34,20:39]=[25,25,28,255]
    return {
        "body":Image.fromarray(body,"RGBA"),
        "shirt":Image.fromarray(torso,"RGBA"),
        "face":Image.fromarray(eye,"RGBA"),
        "hair_front":Image.fromarray(hair,"RGBA"),
    }


def projected_pixel(x,y,pivot,shift,view,lift=0):
    neck_x,neck_y=pivot
    dx,dy=shift
    u=y-neck_y
    v=x-neck_x
    sg=1 if view in ("se","sw") else -1
    return (neck_x+dx+u,neck_y+dy+lift+int(np.floor(u*sg/2))-v)


def adjacent(a,b):
    """Allow a 1-pixel welded neck seam, never a disconnected floating head."""
    dilation=b.copy()
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            src_y0=max(0,-dy);src_y1=min(112,112-dy)
            src_x0=max(0,-dx);src_x1=min(64,64-dx)
            dilation[src_y0+dy:src_y1+dy,src_x0+dx:src_x1+dx] |= (
                b[src_y0:src_y1,src_x0:src_x1])
    return bool(np.any(a & dilation))


class BedSleepHeadRotation(unittest.TestCase):
    def test_head_and_eyes_rotate_together_exactly_one_to_one(self):
        source=specimen()
        for view in ("se","ne"):
            pivot=v6b.lie_neck_pivot(source)
            shift=v6b.lie_head_shift(source,view)
            lift=v6b.lie_head_frame_lift(source,view,shift,pivot)
            self.assertIsNotNone(pivot)
            output=v6b.lie_preserve_head(source,view,shift,pivot,lift)
            original=np.asarray(source["body"])
            result=np.asarray(output["body"])
            # Every original head pixel has the exact original RGBA value
            # in the same diagonal projection as the body, not vertical.
            count=0
            for y in range(30,56):
                for x in range(64):
                    if original[y,x,3]==0:continue
                    rx,ry=projected_pixel(x,y,pivot,shift,view,lift)
                    self.assertTrue(0<=rx<64 and 0<=ry<112)
                    np.testing.assert_array_equal(result[ry,rx],original[y,x],
                        err_msg=f"{view} head pixel ({x},{y}) failed projection")
                    count+=1
            self.assertGreater(count,250)
            # Facial features rotate around EXACTLY the same joint.
            face=np.asarray(source["face"])
            face_out=np.asarray(output["face"])
            for y,x in zip(*np.nonzero(face[...,3])):
                rx,ry=projected_pixel(int(x),int(y),pivot,shift,view,lift)
                np.testing.assert_array_equal(face_out[ry,rx],face[y,x])

    def test_projected_skull_connects_to_original_reclined_shoulder_in_all_views(self):
        source=specimen()
        body=np.asarray(source["body"]).copy()
        body[:56]=0
        for direction in ("se","sw","ne","nw"):
            view="se" if direction in ("se","sw") else "ne"
            pivot=v6b.lie_neck_pivot(source)
            shift=v6b.lie_head_shift(source,view)
            lift=v6b.lie_head_frame_lift(source,view,shift,pivot)
            # Isolate the rotated original skull from body/legs.
            head_image=np.asarray(source["body"]).copy()
            head_image[56:]=0
            head=v6b.lie_preserve_head(
                {"body":Image.fromarray(head_image,"RGBA")},view,shift,pivot,lift)
            head_mask=np.asarray(head["body"])[...,3]>0
            flat=v6b.lie_flat({
                "body":Image.fromarray(body,"RGBA"),
                "shirt":source["shirt"]},view,"lie")
            torso_image=Image.new("RGBA",(64,112))
            flat_total=Image.alpha_composite(flat["body"],flat["shirt"])
            torso_image.paste(flat_total,(0,lift))
            torso=np.asarray(torso_image)[...,3]>0
            if direction in ("sw","nw"):
                head_mask=np.fliplr(head_mask)
                torso=np.fliplr(torso)
            self.assertTrue(adjacent(head_mask,torso),
                f"{direction} projected head no longer touches shoulder")

    def test_head_hair_is_unscaled_and_matches_both_body_slopes(self):
        source=specimen()
        hair=np.asarray(source["hair_front"])
        yy,xx=np.nonzero(hair[...,3]>0)
        self.assertGreater(len(xx),40)
        for view,sign in (("se",1),("ne",-1)):
            pivot=v6b.lie_neck_pivot(source)
            shift=v6b.lie_head_shift(source,view)
            lift=v6b.lie_head_frame_lift(source,view,shift,pivot)
            result=np.asarray(v6b.lie_preserve_head(
                source,view,shift,pivot,lift)["hair_front"])
            # Pixel count and exact RGB values must survive the projection.
            self.assertEqual(int(np.count_nonzero(result[...,3])),len(xx))
            for y,x in zip(yy,xx):
                rx,ry=projected_pixel(int(x),int(y),pivot,shift,view,lift)
                np.testing.assert_array_equal(result[ry,rx],hair[y,x])
            # Moving down the original head axis moves right one pixel and
            # slopes by +1/2 (SE) or -1/2 (NE), matching lie_flat on the torso.
            neck_x,neck_y=pivot
            y0=neck_y-14
            x0=neck_x
            a=projected_pixel(x0,y0,pivot,shift,view,lift)
            b=projected_pixel(x0,y0+4,pivot,shift,view,lift)
            self.assertEqual(b[0]-a[0],4)
            self.assertEqual(b[1]-a[1],2*sign)
            self.assertNotEqual(b[1]-a[1],0,
                "A pure quarter-turn would not follow the isometric slope")


if __name__=="__main__":
    unittest.main()
