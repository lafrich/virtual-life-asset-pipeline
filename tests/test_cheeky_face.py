"""Horn-free mischievous emote QA in native mirrored 64x112 faces."""
import unittest
import numpy as np
from PIL import Image
from tools.human_pose_extras import cheeky_face
FRAME=(64,112)
PAL={"K7":(113,76,66),"0":(48,35,27)}
def actor(view,bob):
    face=Image.new("RGBA",FRAME)
    x=35 if view=="se" else 28
    y=50+bob
    for dx in (-1,0,1):face.putpixel((x+dx,y),(113,76,66,255))
    for dx in (-4,4):face.putpixel((x+dx,y-6),(113,76,66,255))
    return {"face":face,"brows":Image.new("RGBA",FRAME)}
class CheekyFaceTest(unittest.TestCase):
    def test_four_distinct_frames_attach_to_actual_mouth(self):
        for view in ("se","sw"):
            for bob in (-1,0,1):
                samples=[]
                for n in range(4):
                    layers,parts=cheeky_face(actor(view,bob),view,n,PAL)
                    self.assertFalse(np.asarray(parts["eyes"])[:38,:,3].any())
                    rgba=np.asarray(parts["mouth"])
                    mask=(rgba[:,:,0]==224)&(rgba[:,:,1]==119)&(rgba[:,:,2]==142)&(rgba[:,:,3]==255)
                    ys,xs=np.nonzero(mask)
                    if n:
                        self.assertGreater(len(xs),0)
                        self.assertLessEqual(abs(np.median(xs)-(35 if view=="se" else 28)),2)
                        self.assertGreaterEqual(ys.min(),50+bob)
                        self.assertLessEqual(ys.max(),57+bob)
                    else:self.assertEqual(len(xs),0)
                    samples.append(np.asarray(layers["face"]).tobytes())
                self.assertEqual(len(set(samples)),4)
    def test_rear_not_given_fake_face(self):
        for direction in ("ne","nw"):
            source=actor("se",0)
            layers,parts=cheeky_face(source,direction,2,PAL)
            self.assertEqual(np.asarray(layers["face"]).tobytes(),
                             np.asarray(source["face"]).tobytes())
            self.assertFalse(any(np.asarray(p)[:,:,3].any() for p in parts.values()))
if __name__=="__main__":unittest.main()
