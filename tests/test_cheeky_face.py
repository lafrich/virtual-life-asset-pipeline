"""Jahil / Tongue-Out emote: 4 native Male/Female frames, no horns."""
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
    return {"face":face,"brows":Image.new("RGBA",FRAME),
            "body":Image.new("RGBA",FRAME)}
class CheekyFaceTest(unittest.TestCase):
    def test_wide_eyes_smile_white_teeth_and_attached_animated_tongue(self):
        for view in ("se","sw"):
            for bob in (-1,0,1):
                seen=[]
                anchor=35 if view=="se" else 28
                tips=[]
                for frame in range(4):
                    orig=actor(view,bob)
                    body=orig["body"].tobytes()
                    result,parts=cheeky_face(orig,view,frame,PAL)
                    self.assertEqual(result["body"].tobytes(),body)
                    eye=np.asarray(parts["eyes"])
                    ey,ex=np.nonzero(eye[:,:,3]>0)
                    self.assertTrue(len(ex)>20)
                    self.assertGreaterEqual(int(ey.min()),36+bob)
                    self.assertLessEqual(int(ey.max()),48+bob)
                    self.assertLessEqual(max(abs(ex.min()-anchor),abs(ex.max()-anchor)),10)
                    # Eyes must be OPEN and contain both visible white patches.
                    white_eye=(eye[:,:,0]==248)&(eye[:,:,1]==246)&(eye[:,:,2]==240)&(eye[:,:,3]==255)
                    wy,wx=np.nonzero(white_eye)
                    self.assertGreater(len(wx),10)
                    self.assertTrue((wx<anchor).any() and (wx>anchor).any())
                    mouth=np.asarray(parts["mouth"])
                    white_teeth=(mouth[:,:,0]==248)&(mouth[:,:,1]==246)&(mouth[:,:,2]==240)&(mouth[:,:,3]==255)
                    self.assertGreater(int(white_teeth.sum()),6)
                    tongue=(mouth[:,:,0]==224)&(mouth[:,:,1]==119)&(mouth[:,:,2]==142)&(mouth[:,:,3]==255)
                    y,x=np.nonzero(tongue)
                    self.assertGreater(len(x),5,"Tongue must be present in EVERY phase")
                    self.assertLessEqual(abs(float(np.median(x))-anchor),3)
                    self.assertLessEqual(int(y.min()),53+bob,
                                         "Tongue root must touch the open mouth")
                    self.assertGreaterEqual(int(y.max()),55+bob)
                    self.assertLessEqual(int(y.max()),60+bob)
                    tips.append(int(y.max()))
                    seen.append(result["face"].tobytes())
                self.assertEqual(len(set(seen)),4)
                self.assertGreater(max(tips)-min(tips),2)
    def test_rear_does_not_paint_front_facial_marks(self):
        for view in ("ne","nw"):
            source=actor("se",0)
            before=source["face"].tobytes()
            changed,parts=cheeky_face(source,view,2,PAL)
            self.assertEqual(changed["face"].tobytes(),before)
            self.assertFalse(any(np.asarray(x)[:,:,3].any() for x in parts.values()))
if __name__=="__main__":unittest.main()
