"""Native V6B bed sleep must rotate its full-size head around the neck.

A standing/vertical head attached to an isometric lying body is not a valid
sleep pose. All head, eye and hair pixels must rotate together *without*
scaling or flattening, and must touch the real projected shoulder on both
perspectives (SE/SW and NE/NW).
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


def rotated_pixel(x,y,pivot,shift):
    neck_x,neck_y=pivot
    dx,dy=shift
    return (neck_x+dx+y-neck_y,neck_y+dy-(x-neck_x))


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
            self.assertIsNotNone(pivot)
            output=v6b.lie_preserve_head(source,view,shift,pivot)
            original=np.asarray(source["body"])
            result=np.asarray(output["body"])
            # Every original head pixel has the exact original RGBA value
            # in its 90-degree CLOCKWISE position, not standing upright.
            count=0
            for y in range(30,56):
                for x in range(64):
                    if original[y,x,3]==0:continue
                    rx,ry=rotated_pixel(x,y,pivot,shift)
                    self.assertTrue(0<=rx<64 and 0<=ry<112)
                    np.testing.assert_array_equal(result[ry,rx],original[y,x],
                        err_msg=f"{view} head pixel ({x},{y}) failed rotation")
                    count+=1
            self.assertGreater(count,250)
            # Facial features rotate around EXACTLY the same joint.
            face=np.asarray(source["face"])
            face_out=np.asarray(output["face"])
            for y,x in zip(*np.nonzero(face[...,3])):
                rx,ry=rotated_pixel(int(x),int(y),pivot,shift)
                np.testing.assert_array_equal(face_out[ry,rx],face[y,x])

    def test_rotated_skull_connects_to_original_reclined_shoulder_in_all_views(self):
        source=specimen()
        body=np.asarray(source["body"]).copy()
        body[:56]=0
        for direction in ("se","sw","ne","nw"):
            view="se" if direction in ("se","sw") else "ne"
            pivot=v6b.lie_neck_pivot(source)
            shift=v6b.lie_head_shift(source,view)
            # Isolate the rotated original skull from body/legs.
            head_image=np.asarray(source["body"]).copy()
            head_image[56:]=0
            head=v6b.lie_preserve_head(
                {"body":Image.fromarray(head_image,"RGBA")},view,shift,pivot)
            head_mask=np.asarray(head["body"])[...,3]>0
            flat=v6b.lie_flat({
                "body":Image.fromarray(body,"RGBA"),
                "shirt":source["shirt"]},view,"lie")
            torso=(np.asarray(flat["body"])[...,3]>0 |
                   np.asarray(flat["shirt"])[...,3]>0)
            if direction in ("sw","nw"):
                head_mask=np.fliplr(head_mask)
                torso=np.fliplr(torso)
            self.assertTrue(adjacent(head_mask,torso),
                f"{direction} rotated head no longer touches shoulder")

    def test_rotation_keeps_size_not_old_sheared_or_upright_pose(self):
        source=specimen()
        view="ne"
        pivot=v6b.lie_neck_pivot(source)
        shift=v6b.lie_head_shift(source,view)
        head=np.asarray(source["hair_front"])[...,3]>0
        result=np.asarray(
            v6b.lie_preserve_head(source,view,shift,pivot)["hair_front"])[...,3]>0
        self.assertEqual(int(np.sum(result)),int(np.sum(head)))
        sy,sx=np.nonzero(head);ry,rx=np.nonzero(result)
        self.assertEqual(int(sx.max()-sx.min()),int(ry.max()-ry.min()))
        self.assertEqual(int(sy.max()-sy.min()),int(rx.max()-rx.min()))
        # The topmost hair band was horizontal. During bed sleep it becomes
        # VERTICAL: previous broken implementation merely translated it.
        self.assertLess(int(rx.max()-rx.min()),int(ry.max()-ry.min()))


if __name__=="__main__":
    unittest.main()
