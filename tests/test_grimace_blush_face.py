"""QA: animated worry-eyes + teeth grimace and opaque pink cheeks; no horns."""
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
    def test_mirrored_face_mouth_teeth_and_both_blush_cheeks(self):
        for view in ("se","sw"):
            for bob in (-1,0,1):
                frames=[]
                for i in range(4):
                    before=actor(view,bob)
                    result,parts=grimace_blush_face(before,view,i,PAL)
                    self.assertEqual(result["face"].size,FRAME)
                    self.assertEqual(result["body"].tobytes(),before["body"].tobytes())
                    brows=np.asarray(parts["eyes"])[:,:,3]
                    self.assertFalse(brows[:35].any(),"No horn pixels above forehead")
                    blush=np.asarray(parts["blush"])
                    mask=(blush[:,:,0]==224)&(blush[:,:,1]==119)&(blush[:,:,2]==142)&(blush[:,:,3]==255)
                    yy,xx=np.nonzero(mask)
                    self.assertGreaterEqual(len(xx),4)
                    self.assertLess(xx.min(),(35 if view=="se" else 28))
                    self.assertGreater(xx.max(),(35 if view=="se" else 28))
                    mouth=np.asarray(parts["mouth"])
                    ivory=(mouth[:,:,0]==248)&(mouth[:,:,1]==246)&(mouth[:,:,2]==240)&(mouth[:,:,3]==255)
                    ty,tx=np.nonzero(ivory)
                    self.assertTrue(len(tx)>3)
                    self.assertLessEqual(abs(np.median(tx)-(35 if view=="se" else 28)),5)
                    self.assertTrue(np.all((ty>=48+bob)&(ty<=52+bob)))
                    frames.append(result["face"].tobytes())
                self.assertEqual(len(set(frames)),4)
    def test_rear_no_fake_face(self):
        for view in ("ne","nw"):
            original=actor("se",0)
            result,parts=grimace_blush_face(original,view,1,PAL)
            self.assertEqual(result["face"].tobytes(),original["face"].tobytes())
            self.assertTrue(all(not np.asarray(x)[:,:,3].any() for x in parts.values()))
if __name__=="__main__":unittest.main()
