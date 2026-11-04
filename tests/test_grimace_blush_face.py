"""QA: emoji-faithful expressive face on existing male/female native rig."""
import unittest
import numpy as np
from PIL import Image
from tools.human_pose_extras import grimace_blush_face
FRAME=(64,112)
PAL={"K7":(113,76,66),"0":(48,35,27)}
def actor(view,bob):
    face=Image.new("RGBA",FRAME)
    x=35 if view=="se" else 28
    y=50+bob
    for dx in (-1,0,1):face.putpixel((x+dx,y),(113,76,66,255))
    for dx in (-4,4):face.putpixel((x+dx,y-6),(113,76,66,255))
    return {"face":face,"brows":Image.new("RGBA",FRAME),
            "body":Image.new("RGBA",FRAME)}
class GrimaceBlushFaceTest(unittest.TestCase):
    def test_same_actor_mirrored_alignment_worried_eyes_white_teeth_and_two_cheeks(self):
        for view in ("se","sw"):
            for bob in (-1,0,1):
                anchor=35 if view=="se" else 28
                frames=[]
                for index in range(4):
                    source=actor(view,bob)
                    body=source["body"].tobytes()
                    layers,parts=grimace_blush_face(source,view,index,PAL)
                    self.assertEqual(layers["body"].tobytes(),body)
                    eyes=np.asarray(parts["eyes"])
                    ey,ex=np.nonzero(eyes[:,:,3]>0)
                    self.assertGreater(len(ex),9)
                    self.assertGreaterEqual(int(ey.min()),36+bob)
                    self.assertLessEqual(int(ey.max()),47+bob)
                    self.assertLessEqual(max(abs(ex.min()-anchor),abs(ex.max()-anchor)),10)
                    blush=np.asarray(parts["blush"])
                    mask=(blush[:,:,0]==224)&(blush[:,:,1]==119)&(blush[:,:,2]==142)&(blush[:,:,3]==255)
                    ys,xs=np.nonzero(mask)
                    self.assertGreaterEqual(len(xs),2)
                    self.assertTrue((xs<anchor).any() and (xs>anchor).any())
                    self.assertLessEqual(int(ys.max()),49+bob)
                    mouth=np.asarray(parts["mouth"])
                    teeth=(mouth[:,:,0]==248)&(mouth[:,:,1]==246)&(mouth[:,:,2]==240)&(mouth[:,:,3]==255)
                    ty,tx=np.nonzero(teeth)
                    self.assertGreater(len(tx),9)
                    self.assertLessEqual(abs(np.median(tx)-anchor),4)
                    self.assertTrue((ty>=48+bob).all() and (ty<=52+bob).all())
                    self.assertLessEqual(int(np.nonzero(mouth[:,:,3]>0)[0].max()),55+bob)
                    frames.append(layers["face"].tobytes())
                self.assertEqual(len(set(frames)),4)
    def test_rear_preserved_without_fake_face(self):
        for view in ("ne","nw"):
            original=actor("se",0)
            face=original["face"].tobytes()
            layers,parts=grimace_blush_face(original,view,1,PAL)
            self.assertEqual(layers["face"].tobytes(),face)
            self.assertFalse(any(np.asarray(p)[:,:,3].any() for p in parts.values()))
if __name__=="__main__":unittest.main()
