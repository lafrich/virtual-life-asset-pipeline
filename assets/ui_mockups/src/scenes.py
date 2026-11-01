import sys
sys.path.insert(0,'assets/environment/tools')
import mock
from mock import Room
from PIL import Image
CH='game/assets/chars/'
_c={}
def _sheet(name):
    if name not in _c: _c[name]=Image.open(CH+name+'_v6b_sheet.png').convert('RGBA')
    return _c[name]
mock.sheet=_sheet
def frame(name,anim='idle',d='se',f=0):
    row=mock.ANIM[anim]*4+mock.DIRS[d]; return _sheet(name).crop((f*64,row*112,f*64+64,row*112+112))
def cafe(work=False):
    m=Room(14,10,'floor_night',title='')
    m.wallR(3,'window'); m.wallR(8,'window'); m.wallL(4,'door'); m.wallR(11,'window')
    m.add('clock_R',6,0); m.add('poster_L',0,2)
    m.add('coffee_counter_sw',5,1); m.add('prop_coffee_machine_sw',6,1) if False else None
    m.add('pool_warm_1',6,4); m.add('pool_warm_1',2,6)
    m.add('rug_lounge_sw',8,5); m.add('sofa_2_sw',9,3); m.add('coffee_table_sw',9,5); m.add('armchair_lounge_ne',9,7)
    m.add('plant_palm',13,0); m.add('plant_bush',0,9); m.add('plant_tall',4,0); m.add('water_dispenser_sw',12,0)
    m.add('desk_single_se',1,3); m.add('office_chair_nw',2,3); m.add('high_table',3,7); m.add('high_stool',4,7)
    m.avatar('fm_barista',6,0.6,'idle','sw',0)
    m.avatar('ichsan',*( (6.9,0.9,'talk','sw',1) if work else (6.2,3.4,'idle','ne',0)))
    m.avatar('raka',11.5,8.5,'walk','nw',1)
    return m
def school():
    m=Room(12,9,'wood_walnut',skin='library',title='')
    m.wallL(5,'window'); m.wallR(7,'door'); m.wallR(3,'window')
    m.add('bookshelf_tall_sw',1,0); m.add('bookshelf_tall_sw',2,0); m.add('bookshelf_tall_1_sw',9,0)
    m.add('reading_table_sw',3,4); m.add('library_chair_ne',3,5); m.add('library_chair_ne',4,5)
    m.add('whiteboard_wall_R',5,0); m.add('globe',10,4); m.add('rug_library_sw',6,4); m.add('plant_tall',11,0)
    m.avatar('theodore',6.5,2.2,'idle','sw',0); m.avatar('ichsan',6.7,4.6,'idle','ne',0)
    return m
def bagshop():
    m=Room(12,9,'tile_stone',title='')
    m.wallR(2,'window'); m.wallR(8,'window'); m.wallL(4,'door')
    m.add('coffee_counter_sw',5,1); m.add('bookshelf_low_sw',2,0); m.add('bookshelf_low_sw',9,0); m.add('plant_snake',11,0)
    m.add('rug_coordination_sw',6,4)
    m.avatar('fm_kasir',6,0.6,'idle','sw',0); m.avatar('ichsan',6.3,3.6,'idle','ne',0)
    return m
def room():
    m=Room(7,6,'wood_walnut',title='')
    m.wallR(2,'window'); m.wallL(3,'door')
    m.add('rug_round',3,3); m.add('sofa_2_sw',2,0); m.add('coffee_table_sw',2,2); m.add('armchair_lounge_ne',4,4)
    m.add('plant_tall',6,0); m.add('tv_stand_se',0,2); m.add('plant_bush',0,5); m.add('poster_L',0,1)
    m.avatar('ichsan',5,2.5,'idle','sw',0)
    return m
def crop(m,W,H,cx=None,cy=None):
    im=m.render(scale=1,label=False)
    cx=im.width//2 if cx is None else cx; cy=im.height//2 if cy is None else cy
    out=Image.new('RGBA',(W,H),(11,14,19,255))
    out.alpha_composite(im,(W//2-cx,H//2-cy)); return out
if __name__=='__main__':
    for n,f in [('cafe',cafe),('school',school),('bagshop',bagshop),('room',room)]:
        im=f().render(scale=1,label=False); print(n,im.size); im.save(f'scene_{n}.png')
