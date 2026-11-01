# every animation row, labelled: for each anim -> se/sw/ne/nw, frames 0..n; old live vs new v6b
import sys
from PIL import Image, ImageDraw
ROWMAP = {'walk': 0, 'idle': 4, 'talk': 8, 'sit': 12, 'sit_type': 16, 'sleep': 20, 'tired': 24, 'swim': 28, 'float': 32, 'lie': 36, 'perch': 40}
NF = {'walk': 6, 'swim': 6}
def build(sheets, out, Z=3, frames=None):
    W = 64 * 6 * len(sheets) + 20 * len(sheets); H = 112 * 44
    o = Image.new('RGBA', (W, H + 0), (236, 232, 224, 255)); d = ImageDraw.Draw(o)
    for j, (lab, p) in enumerate(sheets):
        s = Image.open(p).convert('RGBA'); x0 = j * (64 * 6 + 20)
        for an, r0 in ROWMAP.items():
            for di in range(4):
                r = r0 + di
                for f in range(NF.get(an, 4)):
                    o.alpha_composite(s.crop((f * 64, r * 112, (f + 1) * 64, (r + 1) * 112)), (x0 + f * 64, r * 112))
                d.text((x0 + 2, r * 112 + 2), f'{lab} {an} {"se sw ne nw".split()[di]}', fill=(0, 0, 0, 255))
            d.line([(x0, r0 * 112), (x0 + 384, r0 * 112)], fill=(200, 60, 60, 255))
            for y in (84,):
                for xx in range(x0, x0 + 384, 3): o.putpixel((xx, (r0) * 112 + y), (255, 0, 0, 120))
    o.resize((W * Z // 2, H * Z // 2), Image.NEAREST).save(out)
if __name__ == '__main__':
    a = sys.argv[1:]; out = a[0]; sh = [(a[i], a[i + 1]) for i in range(1, len(a), 2)]; build(sh, out)
