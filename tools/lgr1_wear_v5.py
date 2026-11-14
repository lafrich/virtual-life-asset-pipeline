"""LGR-1 W4 wear v5 (PREVIEW ONLY): calmer tee + unstriped trousers, derived from tee_v4 / trousers_v4.

The silhouette (alpha) is untouched, so the joint-safe W4 geometry, the _under / _under_own strips and the
rest mask stay exactly as in v4. Only key colours change:
  tee:      C3 -> C2 (one shadow tone instead of two; drops the chest seam and the sleeve zig-zags),
            chest pocket (interior OD line + C4 box) -> C1, remaining OD (white collar/cuff key) -> C3 (neckline accent).
            v4 used C1/C2/C3/C4/OD; v5 uses C1/C2/C4 + C3 only where v4 had OD.
  trousers: interior one-pixel vertical creases (P3 between P1, P4 between P2) and the waistband's P4 loops
            (between P3) are filled with their neighbours. Leg outlines, the crotch strip and hems are kept.
usage: python3 tools/lgr1_wear_v5.py   (writes site/media/lgr1/mh-wear/preview/{tee,trousers}_v5*.png)
"""
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PRE = ROOT / "site/media/lgr1/mh-wear/preview"
K = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255)
C1, C2, C3, C4, OD = K("#FF50D6"), K("#FF56D3"), K("#FF5CD0"), K("#FF62CD"), K("#FF8CB8")
P1, P2, P3, P4 = K("#FF92B5"), K("#FF98B2"), K("#FF9EAF"), K("#FFA4AC")


def frames(im):
    for d in range(im.width // 64):
        yield d * 64


def tee(im):
    src = im.load(); out = im.copy(); px = out.load()
    for x0 in frames(im):
        g = lambda x, y: src[x, y] if x0 <= x < x0 + 64 and 0 <= y < im.height else (0, 0, 0, 0)
        bb = im.crop((x0, 0, x0 + 64, im.height)).getbbox()
        if not bb: continue
        chest = range(bb[1], bb[1] + 16)          # the pocket lives on the chest; the hem outline below is kept
        for y in range(im.height):
            for x in range(x0, x0 + 64):
                c = src[x, y]
                if c[3] == 0: continue
                inner = all(g(x + dx, y + dy)[3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                if c == C3: px[x, y] = C2
                elif c == OD: px[x, y] = C1 if inner and y in chest else C3   # pocket line -> base, neckline/cuff -> accent
                elif c == C4 and y in chest and inner and g(x-1, y) == C1 and g(x+1, y) == C1:
                    px[x, y] = C1                                             # pocket sides
        src2 = out.copy().load()
        for y in chest:
            for x in range(x0 + 1, x0 + 63):
                if src2[x, y] == C4 and src2[x, y-1] == C1 and src2[x, y+1] == C1: px[x, y] = C1   # pocket bottom
    return out


def trousers(im):
    src = im.load(); out = im.copy(); px = out.load()
    for x0 in frames(im):
        for y in range(im.height):
            for x in range(x0 + 1, x0 + 63):
                c, l, r = src[x, y], src[x-1, y], src[x+1, y]
                if c == P3 and l == r == P1: px[x, y] = P1          # crease on the lit leg
                elif c == P4 and l == r == P2: px[x, y] = P2        # crease on the shaded leg
                elif c == P4 and l == r == P3: px[x, y] = P3        # waistband loops
    return out


def main():
    for f in ("", "_f"):
        for name, fn in (("tee", tee), ("trousers", trousers)):
            im = Image.open(PRE / f"{name}_v4{f}.png").convert("RGBA")
            v5 = fn(im)
            assert v5.getchannel("A").tobytes() == im.getchannel("A").tobytes()
            v5.save(PRE / f"{name}_v5{f}.png", optimize=True)
            for u in ("_under", "_under_own"):
                shutil.copyfile(PRE / f"{name}_v4{u}{f}.png", PRE / f"{name}_v5{u}{f}.png")
    print("wrote", sorted(p.name for p in PRE.glob("*_v5*.png")))


if __name__ == "__main__":
    main()
