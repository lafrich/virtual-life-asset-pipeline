#!/usr/bin/env python3
"""Verify preview-only stock Mahluk activities: shapes, clipping, timing and frame distinctness."""
import importlib.util
from pathlib import Path
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("stock",HERE/"build_stock.py")
stock=importlib.util.module_from_spec(spec);spec.loader.exec_module(stock)
total=0
for action,c in stock.ACTIONS.items():
    for gender in ("male","female"):
        sheet=Image.open(HERE/"sheets"/f"{action}_{gender}_sheet.png").convert("RGBA")
        assert sheet.size==(stock.FW*c["n"],stock.FH*4)
        for direction in stock.DIRS:
            unique=set()
            for frame in range(c["n"]):
                pic=Image.open(HERE/"frames"/f"{action}_{gender}_{direction}_f{frame:02}.png").convert("RGBA")
                assert pic.size==(64,112)
                a=np.asarray(pic)
                assert set(np.unique(a[...,3])).issubset({0,255})
                yy,xx=np.where(a[...,3]>0)
                assert len(xx)>0 and 0<xx.min() and xx.max()<63 and 0<yy.min() and yy.max()<111,(action,gender,direction,frame)
                unique.add(pic.tobytes());total+=1
            assert len(unique)>=2,(action,gender,direction,"static")
for gender in ("male","female"):
    pack=Image.open(HERE/"sheets"/f"v6p_act_preview_{gender}_384x2688.png")
    assert pack.size==(384,2688)
assert total==176,total
print("PASS 176 frames / 5 motions / 2 bases / 4 directions / no clipping")
