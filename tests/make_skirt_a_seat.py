#!/usr/bin/env python3
"""Build the optional seated skirt strip (side outline opened) into mh-wear/preview/."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/workspace/lgr-leg-fix-a/art/wear")
OUT = ROOT / "site/media/lgr1/mh-wear/preview"
OUTLINE = (255, 164, 172, 255)
FILL = (255, 146, 181, 255)

def open_sides(im):
    out = im.copy(); px = out.load(); w, h = out.size
    for vi in range(w // 64):
        x0 = vi * 64
        for y in range(h):
            xs = [x for x in range(64) if px[x0 + x, y][3]]
            if not xs:
                continue
            for edge, inward in ((xs[0], 1), (xs[-1], -1)):
                if px[x0 + edge, y] != OUTLINE:
                    continue
                nx = edge + inward
                fill = px[x0 + nx, y] if 0 <= nx < 64 and px[x0 + nx, y][3] else FILL
                px[x0 + edge, y] = fill
    return out

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for src, dest in (("skirt_a.png", "skirt_a_seat.png"), ("skirt_a_f.png", "skirt_a_seat_f.png")):
        open_sides(Image.open(SRC / src).convert("RGBA")).save(OUT / dest)
        print("wrote", OUT / dest)

if __name__ == "__main__":
    main()
