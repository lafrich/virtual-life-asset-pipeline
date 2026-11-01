# UI status kamar Cove (gaya HUD Vista ui_y2k, komponen dari ui_loak_tas/src/lt.py). 844x390 + 667x375, 1x native + pratinjau 2x.
import sys, os, json
sys.path.insert(0, 'assets/ui_loak_tas/src')
import lt
from lt import *
O = 'assets/kamar_cove_kosong/'
J = json.load(open(O + 'src/_sprites.json'))
LOB = Image.open(O + 'mock/mock_lobi_status_pintu_1x.png').convert('RGBA'); IP = J['mock']['lobby_ichsan_px']
def bg(W, H):
    im = Image.new('RGBA', (W, H), '#2A2622'); im.alpha_composite(LOB, (W // 2 - IP[0] + 40, H // 2 - IP[1] + 70)); return im
def big(im, k=2): return im.resize((im.width * k, im.height * k), Image.NEAREST)
def save(name, im, W):
    im = im.convert('RGB')
    if W == 844: im.save(f'{O}ui/1x_native/{name}.png'); big(im).save(f'{O}ui/{name}.png')
    else: im.save(f'{O}ui/1x_native/{name}_667x375.png'); big(im).save(f'{O}ui/{name}_667x375@2x.png')
def lockbadge(im, cx, cy, r=19):
    orb(im, cx, cy, r, 'grey', alpha=235); im.alpha_composite(icons.get('lock', 32), (cx - 16, cy - 16)); y2k.gloss(im, cx, cy, r)
def s_ditolak(W, H):
    SCREEN[0] = '01_akses_ditolak'; im = bg(W, H)
    hud(im, W, H, action_label='Kamar 3 · Raka', action_target='lock', action_state='pressed'); dim(im, 140)
    w, h = 300, 136; x, y = (W - w) // 2, (H - h) // 2 - 10; rec('dialog', x, y, w, h)
    glass(im, x, y, w, h, head=26, alpha=225); d = D(im)
    im.alpha_composite(icons.get('warn', 16), (x + 8, y + 5)); wtext(d, x + 28, y + 7, 'Akses ditolak')
    lockbadge(im, x + 34, y + 62); rec('ikon_gembok', x + 15, y + 43, 38, 38)
    wtext(d, x + 64, y + 44, 'Kamar ini milik orang lain.'); wtext(d, x + 64, y + 60, 'Akses ditolak.', '#E5484D')
    wtext(d, x + 64, y + 78, 'Kamar 3 · penghuni: Raka', '#9AA6B6', False)
    gbutton(im, x + w - 100, y + h - 34, 90, 26, 'OK', 'blue', 'hover', icon='check', name='btn_ok'); return im
def toast(im, W, label, sub, icon, col, name):
    w = max(tw(label, 11, True), tw(sub, 11)) + 60; h = 40; x = (W - w) // 2; y = 12; rec(name, x, y, w, h)
    glass(im, x, y, w, h, r=6, alpha=215); d = D(im)
    orb(im, x + 20, y + 20, 14, 'grey', alpha=235); im.alpha_composite(icons.get(icon, 16), (x + 12, y + 12)); y2k.gloss(im, x + 20, y + 20, 14)
    wtext(d, x + 42, y + 6, label, col); wtext(d, x + 42, y + 21, sub, '#9AA6B6', False)
def s_belum(W, H):
    SCREEN[0] = '02_toast_belum_bisa_disewa'; im = bg(W, H); hud(im, W, H, action_label='Kamar 1 · terkunci', action_target='lock', action_state='disabled')
    toast(im, W, 'Kamar 1 belum bisa disewa', 'Kamar ini dikunci pengelola Cove.', 'lock', '#FFD166', 'toast'); return im
def s_tersedia(W, H):
    SCREEN[0] = '03_toast_tersedia_dibeli'; im = bg(W, H); hud(im, W, H, action_label='Lihat kamar 2', action_target='house')
    toast(im, W, 'Kamar 2 tersedia untuk dibeli', 'Isi: kasur + WC. Lemari, kulkas, meja beli nanti.', 'house', '#3DDC84', 'toast'); return im
if __name__ == '__main__':
    for W, H in ((844, 390), (667, 375)):
        SIZE[0] = f'{W}x{H}'
        for n, f in (('01_akses_ditolak', s_ditolak), ('02_toast_belum_bisa_disewa', s_belum), ('03_toast_tersedia_dibeli', s_tersedia)): save(n, f(W, H), W)
    json.dump(lt.REC, open(O + 'src/_ui.json', 'w'), indent=1); print(len(lt.REC))
