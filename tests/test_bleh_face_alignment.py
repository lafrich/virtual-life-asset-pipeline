"""Bleh facial pixels follow the REAL neutral mouth in mirrored/bobbing frames."""
import unittest
import numpy as np
from PIL import Image
from tools.human_pose_extras import bleh_face

FRAME=(64,112)
PAL={"Kh":(202,155,124),"K7":(113,76,66)}

class BlehAlignmentTest(unittest.TestCase):
    def source_face(self,view,bob):
        face=Image.new("RGBA",FRAME)
        mouth_x=35 if view=="se" else 28
        mouth_y=50+bob
        for dx in (-1,0,1):
            face.putpixel((mouth_x+dx,mouth_y),(113,76,66,255))
        for offset in ((-4,0),(4,0)):
            face.putpixel((mouth_x+offset[0],mouth_y-6),(113,76,66,255))
        return {"face":face,"body":Image.new("RGBA",FRAME),
                "brows":Image.new("RGBA",FRAME)}

    def test_face_follows_actual_mouth_and_stays_attached(self):
        for view in ("se","sw"):
            for bob in (-1,0,1):
                original=35 if view=="se" else 28
                expected_y=50+bob
                for frame in range(4):
                    _,parts=bleh_face(self.source_face(view,bob),view,frame,PAL)
                    rgba=np.asarray(parts["mouth"])
                    # Tongue starts at the actual mouth, never floats
                    # below the jaw or appears on the cheek.
                    yy,xx=np.nonzero((rgba[:,:,0]==232)&(rgba[:,:,1]==105)
                                       &(rgba[:,:,2]==139)&(rgba[:,:,3]>0))
                    self.assertTrue(len(xx),(view,bob,frame))
                    self.assertLessEqual(abs(float(np.median(xx))-original),2)
                    self.assertGreaterEqual(yy.min(),expected_y+1)
                    self.assertLessEqual(yy.max(),expected_y+4)
                    eye=np.asarray(parts["eyes"])
                    ey=np.nonzero(eye[:,:,3]>0)[0]
                    self.assertTrue(len(ey))
                    self.assertEqual(int(ey.min()),expected_y-6)

    def test_rear_views_remain_blank(self):
        for view in ("ne","nw"):
            _,parts=bleh_face(self.source_face("se",0),view,0,PAL)
            self.assertTrue(all(not np.any(np.asarray(im)[:,:,3]) for im in parts.values()))

if __name__=="__main__":
    unittest.main()
