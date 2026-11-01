import os
from PIL import Image
from mock import BY, img, screen, ROOT
BG = (16, 20, 27, 255)
for id, scale in (('campfire', 4), ('coffee_counter_sw', 3)):
    e = BY[id]; frames = []
    for f in e['animation']['files']:
        im = Image.new('RGBA', img(f['main']).size, BG); im.alpha_composite(img(f['main']))
        if 'glow' in f: im = screen(im, img(f['glow']), (0, 0))
        frames.append(im.resize((im.width * scale, im.height * scale), Image.NEAREST).convert('P', palette=Image.ADAPTIVE))
    p = os.path.join(ROOT, 'previews', f'anim_{id}.gif')
    frames[0].save(p, save_all=True, append_images=frames[1:], duration=int(1000 / e['animation']['fps']), loop=0, disposal=2)
    print(p)
# outdoor pool: whole mock re-rendered per water frame, cropped to the pool (180 ms/frame)
import mocks
fr = []
for f in range(4):
    m = mocks.outdoor(f)
    im = m.render(1, label=False)
    im = im.crop((150, 120, 640, 420))
    fr.append(im.resize((im.width * 2, im.height * 2), Image.NEAREST).convert('P', palette=Image.ADAPTIVE))
p = os.path.join(ROOT, 'previews', 'anim_pool.gif')
fr[0].save(p, save_all=True, append_images=fr[1:], duration=180, loop=0, disposal=2); print(p)
