"""Regression: Male/Female cheeky and grimace may change only the face.
No forehead, ear, jaw, neck, torso, or rig pixels may be replaced by a new body.
"""
from pathlib import Path
from PIL import Image
import numpy as np

ROOT=Path("_site/media")
for gender in ("male","female"):
    prefix=f"human-{gender}-base-expression-"
    with Image.open(ROOT/f"{prefix}neutral.png") as source:
        neutral=np.array(source.convert("RGBA"))
    assert neutral.shape==(448,256,4)
    for expression in ("cheeky","grimace_blush"):
        with Image.open(ROOT/f"{prefix}{expression}.png") as source:
            altered=np.array(source.convert("RGBA"))
        assert altered.shape==neutral.shape
        for facing in range(4):
            for frame in range(4):
                y0=facing*112
                base=neutral[y0:y0+112,frame*64:(frame+1)*64]
                changed=altered[y0:y0+112,frame*64:(frame+1)*64]
                # Real expressions must not redraw or alter the neck or ANY
                # body pixels. Front facial marks remain above body y=60.
                difference=np.any(base!=changed,axis=2)
                assert not difference[60:].any(),(
                    gender,expression,facing,frame,"neck or body modified")
                assert not difference[:32].any(),(
                    gender,expression,facing,frame,"scalp/head changed")
                if facing<2:
                    assert difference[32:60].sum()>=10,(
                        gender,expression,facing,frame,"expression missing")
                else:
                    assert not difference.any(),(
                        gender,expression,facing,frame,"rear face painted")
print("PASS native Male/Female expression isolation: 2 gestures, 4 views, 4 frames, zero changes to neck/body")
