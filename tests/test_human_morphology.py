"""Dimorphic HUMAN sprite fitting-template regression.

The generated pixel base must differ in real alpha silhouette, not only a
recolor of identical male/female clothes. All shapes stay inside 64x112 and
retain the original pose anchors for modular outfit layers.
"""
import sys
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from build_human_templates import sculpt_human_layers,shade_human_anatomy,shade_human_surface,repair_female_chest_voids,FRAME


def colored(left,right,top,bottom,color=(215,175,141,255)):
    a=np.zeros((112,64,4),dtype=np.uint8)
    a[top:bottom,left:right]=color
    return Image.fromarray(a,"RGBA")

def mask(image):
    return np.asarray(image.convert("RGBA"))[...,3]>0


class HumanMorphology(unittest.TestCase):
    def test_neither_gender_gets_extra_wide_shoulders_or_hip_bulges(self):
        """M/F native rig already sculpts the silhouette. Never grow arbitrary
        rectangular wings on shoulders or hips after all motion is posed.
        """
        original_shirt=colored(25,39,54,78)
        original_pants=colored(26,38,77,105)
        for gender in ("male","female"):
            with self.subTest(gender=gender):
                source={"shirt":original_shirt.copy(),"pants":original_pants.copy()}
                result=sculpt_human_layers(source,gender)
                self.assertEqual(result["shirt"].size,FRAME)
                self.assertEqual(result["pants"].size,FRAME)
                self.assertTrue(np.array_equal(mask(result["shirt"]),mask(original_shirt)),
                    "Shoulder must retain original V6B outline")
                self.assertTrue(np.array_equal(mask(result["pants"]),mask(original_pants)),
                    "Buttocks/hips must retain original V6B outline")
                self.assertEqual(result["shirt"].tobytes(),original_shirt.tobytes())
                self.assertEqual(result["pants"].tobytes(),original_pants.tobytes())
        self.assertEqual(int(mask(original_shirt)[55].sum()),14,
                         "Input source template was mutated")

    def test_no_motion_or_gender_independent_layers_are_modified(self):
        head=colored(24,39,31,54)
        arm=colored(19,23,58,83)
        source={"shirt":colored(25,39,55,79),
                "pants":colored(25,39,78,106),
                "head":head,"arm_near":arm}
        for gender in ("male","female"):
            result=sculpt_human_layers(dict(source),gender)
            self.assertEqual(result["head"].tobytes(),head.tobytes())
            self.assertEqual(result["arm_near"].tobytes(),arm.tobytes())
        with self.assertRaises(ValueError):
            sculpt_human_layers(dict(source),"other")

    def test_no_artificial_pelvis_buttock_or_chest_dots_in_native_pose(self):
        sprite=np.zeros((112,64,4),dtype=np.uint8)
        sprite[32:55,23:42]=[218,172,137,255]   # head
        sprite[55:81,23:42]=[218,172,137,255]   # torso
        sprite[80:105,25:39]=[218,172,137,255]  # hips / legs
        source=Image.fromarray(sprite,"RGBA")
        original=source.tobytes()
        for gender in ("male","female"):
            for direction in ("se","sw","ne","nw"):
                with self.subTest(gender=gender,direction=direction):
                    output=shade_human_anatomy(source,gender,direction,55,78,
                                              (159,112,87),(239,199,167))
                    self.assertEqual(output.tobytes(),original,
                        "No standalone chest marks, fake butt cheeks or pelvis V")
                    self.assertIsNot(output,source)
        self.assertEqual(source.tobytes(),original)


    def test_adult_genitals_render_only_on_front_nude_pelvis(self):
        # Only changed pixels inside the actual moving trouser-body mask,
        # without adding alpha pixels or touching head, shoulder or feet.
        skin=(218,172,137,255)
        body=colored(19,46,31,108,skin)
        pelvis=colored(24,40,70,97,skin)
        source=np.asarray(body)
        p_mask=mask(pelvis)
        outputs={}
        for gender in ("male","female"):
            for direction in ("se","sw","ne","nw"):
                with self.subTest(gender=gender,direction=direction):
                    result=shade_human_anatomy(
                        body,gender,direction,54,70,
                        (170,115,87),(239,199,167),
                        pelvis_layer=pelvis,edge_tone=(113,74,61))
                    frame=np.asarray(result)
                    delta=np.any(frame[...,:3]!=source[...,:3],axis=2)
                    self.assertTrue(np.array_equal(frame[...,3],source[...,3]),
                                    "Anatomy must preserve the native sprite silhouette")
                    self.assertTrue(np.all(~delta|p_mask),
                                    "Anatomy must not leave the posed pelvis")
                    self.assertFalse(delta[:70].any(),"No head/torso edits")
                    if direction in ("se","sw"):
                        self.assertGreaterEqual(int(delta.sum()),6,
                                  "Front nude pelvis must contain visible genital detail")
                    else:
                        self.assertFalse(delta.any(),"Rear views have no frontal genitalia")
                    outputs[(gender,direction)]=result
        self.assertNotEqual(outputs[("male","se")].tobytes(),
                            outputs[("female","se")].tobytes(),
                            "Male shaft/scrotum and female vulva must differ")
        # Changing hip position changes the genital anchor along with it.
        moved=colored(29,45,70,97,skin)
        moved_result=shade_human_anatomy(
            body,"male","se",54,70,(170,115,87),(239,199,167),
            pelvis_layer=moved,edge_tone=(113,74,61))
        a=np.any(np.asarray(outputs[("male","se")])[...,:3]!=source[...,:3],axis=2)
        b=np.any(np.asarray(moved_result)[...,:3]!=source[...,:3],axis=2)
        self.assertGreater(np.flatnonzero(np.any(b,axis=0)).mean(),
                           np.flatnonzero(np.any(a,axis=0)).mean()+3,
                           "Detail must follow the shifted native pelvis")
        self.assertEqual(body.tobytes(),Image.fromarray(source,"RGBA").tobytes(),
                         "The original body layer must remain immutable")



    def test_surface_anatomy_is_pose_anchored_and_alpha_safe(self):
        """Torso/chest/back/hip definitions must not spawn extra anatomy
        or alter the shared rig and outfit-fitting outer silhouette."""
        skin=(229,188,154,255)
        body=colored(19,46,31,105,skin)
        torso=colored(24,42,54,80,skin)
        pelvis=colored(25,41,78,96,skin)
        untouched=np.asarray(body)
        mask_torso=mask(torso)
        mask_pelvis=mask(pelvis)
        outputs={}
        for gender in ("male","female"):
            for direction in ("se","sw","ne","nw"):
                with self.subTest(gender=gender,direction=direction):
                    result=shade_human_surface(
                        body,gender,direction,torso,pelvis,
                        (173,121,94),(206,156,121),(238,199,163))
                    pixels=np.asarray(result)
                    delta=np.any(pixels[...,:3]!=untouched[...,:3],axis=2)
                    self.assertTrue(np.array_equal(pixels[...,3],untouched[...,3]))
                    self.assertTrue(np.all(~delta|(mask_torso|mask_pelvis)))
                    self.assertGreaterEqual(int(delta.sum()),6)
                    self.assertFalse(delta[:56].any(), "Head/neck must be untouched")
                    self.assertFalse(delta[99:].any(), "Legs and feet are not shading targets")
                    outputs[(gender,direction)]=pixels.copy()
        self.assertFalse(np.array_equal(outputs[("male","se")],
                                        outputs[("female","se")]))
        self.assertFalse(np.array_equal(outputs[("male","ne")],
                                        outputs[("female","ne")]))
        # A shifted torso and hip must shift the shading automatically.
        moved_torso=colored(29,47,54,80,skin)
        moved_hip=colored(30,46,78,96,skin)
        moved=shade_human_surface(body,"male","se",moved_torso,moved_hip,
                                 (173,121,94),(206,156,121),(238,199,163))
        d0=np.any(outputs[("male","se")][...,:3]!=untouched[...,:3],axis=2)
        d1=np.any(np.asarray(moved)[...,:3]!=untouched[...,:3],axis=2)
        self.assertGreater(np.flatnonzero(np.any(d1,axis=0)).mean(),
                           np.flatnonzero(np.any(d0,axis=0)).mean()+3)
        self.assertEqual(body.tobytes(),Image.fromarray(untouched,"RGBA").tobytes())


    def test_female_bust_holes_are_filled_without_changing_outer_shape(self):
        """Original female native source had two 3px transparent holes,
        including in its rear view. Fill only fully enclosed chest cavities."""
        skin=(241,211,181,255)
        torso=colored(27,38,54,78,skin)
        baseline=np.asarray(colored(19,46,31,103,skin)).copy()
        holes=((26,68),(27,68),(27,69),(37,68),(38,68),(37,69))
        for x,y in holes:
            baseline[y,x]=(0,0,0,0)
        # A diagonal notch from the shoulder to the outside is NOT a
        # closed nipple hole, even when 4-neighbour flood-fill thinks so.
        shoulder_notch=((41,60),(42,59),(43,58),(44,57),(45,56))
        for x,y in shoulder_notch:
            baseline[y,x]=(0,0,0,0)
        source=Image.fromarray(baseline,"RGBA")
        repaired=repair_female_chest_voids(source,torso,79)
        output=np.asarray(repaired)
        for x,y in holes:
            self.assertEqual(output[y,x,3],255,(x,y))
            self.assertEqual(tuple(output[y,x,:3]),skin[:3])
        changed=np.any(output!=baseline,axis=2)
        expected=np.zeros((112,64),dtype=np.bool_)
        for x,y in holes:expected[y,x]=True
        self.assertTrue(np.array_equal(changed,expected),
                        "Only the enclosed holes may change alpha or color")
        self.assertEqual(repair_female_chest_voids(
            colored(19,46,31,103,skin),torso,79).tobytes(),
            colored(19,46,31,103,skin).tobytes())


if __name__=="__main__":
    unittest.main()
