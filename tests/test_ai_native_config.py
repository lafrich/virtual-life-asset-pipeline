import sys
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from generate_npc_from_spec import validate


class NativeSpecTests(unittest.TestCase):
    def setUp(self):
        self.spec={"id":"ai_maya_12345678","name":"Maya","body":"female",
                   "skin":"medium","hair":"long","hair_color":"walnut",
                   "top":"hoodie","top_color":"steel",
                   "pants_color":"charcoal","shoes":"sneakers",
                   "shoes_color":"paper","skirt":"none",
                   "glasses":True,"ponytail":False,"quiff":False,
                   "tufts":False,"apron":False,"notes":"Review long hair."}

    def test_valid(self):
        out=validate(self.spec)
        self.assertEqual(out["body"],"female")
        self.assertEqual(out["id"],"ai_maya_12345678")

    def test_prevent_dynamic_python(self):
        with self.assertRaises(ValueError):
            validate({**self.spec,"python_code":"__import__('os').system('ls')"})
        with self.assertRaises(ValueError):
            validate({**self.spec,"top_color":"url_to_secret"})
        with self.assertRaises(ValueError):
            validate({**self.spec,"id":"../.github/workflows/evil"})

    def test_categories_not_bones(self):
        with self.assertRaises(ValueError):
            validate({**self.spec,"hair":"unrecognized_shape"})
        self.assertTrue(all(k in validate(self.spec) for k in ("top","hair","shoes")))


if __name__=="__main__":
    unittest.main()
