#!/usr/bin/env python3
"""Build the Semesta launcher globe as a native indexed, nearest-neighbour V6B pixel GIF.
No Canvas placeholder, SVG scaling, 3D screenshot, antialiasing or gradient fills.
Source size 96px; output pixel-perfect x4; exact reusable game palette ramps.
"""
from math import asin, atan2, degrees, pi, sqrt
from pathlib import Path
from PIL import Image

W = H = 96
CX = CY = 48
R = 37
SCALE = 4
STEPS = 32
OUT = Path("assets/launcher_thumbnails/semesta_earth_rotate_v6b_4x.gif")
# Flat V6B material ramp. Palette index 0 is genuinely transparent.
COLORS = [
    (0,0,0),           # transparent
    (27,81,131),       # ocean shadow
    (40,127,187),      # ocean mid
    (58,166,242),      # ocean light (official #3AA6F2)
    (142,205,235),     # ocean highlight
    (22,100,64),       # green shadow
    (32,127,80),       # green mid
    (53,196,106),      # green light (official #35C46A)
    (129,217,137),     # green top-left
    (232,222,198),     # ice light
    (195,195,180),     # ice shadow
]
PAL = []
for rgb in COLORS: PAL.extend(rgb)
PAL.extend([0] * (768-len(PAL)))

# Major landmass silhouettes, longitude (-180..180), latitude (-90..90).
# Coarse vector coastlines deliberately rasterized per pixel without smoothing.
LANDS = [
 # North America
 [(-166,72),(-132,73),(-119,61),(-103,57),(-94,51),(-82,48),(-66,49),(-58,43),(-80,31),(-97,16),(-111,28),(-119,32),(-128,48),(-151,58)],
 # South America
 [(-82,13),(-66,13),(-50,2),(-34,-8),(-39,-23),(-51,-33),(-69,-55),(-77,-37),(-74,-14),(-81,0)],
 # Greenland
 [(-55,84),(-23,79),(-44,59),(-62,62)],
 # Europe and Asia
 [(-13,70),(12,72),(43,61),(65,60),(90,73),(123,59),(162,59),(180,54),(180,36),(141,33),(132,20),(115,19),(106,10),(96,21),(77,7),(64,24),(44,32),(35,35),(27,42),(10,35),(-9,37)],
 # Africa
 [(-17,35),(10,37),(33,31),(49,12),(42,-12),(31,-34),(18,-36),(9,-24),(-2,-5),(-16,12)],
 # Arabian peninsula
 [(35,32),(58,28),(55,13),(43,12)],
 # India
 [(69,26),(84,29),(89,11),(78,7)],
 # SE Asia
 [(96,22),(118,21),(136,5),(125,-8),(114,-8)],
 # Australia
 [(111,-12),(138,-10),(154,-25),(143,-39),(115,-35)],
 # Madagascar
 [(47,-12),(51,-25),(44,-27)],
 # Japan
 [(136,44),(146,35),(140,30)],
 # New Zealand
 [(168,-33),(176,-42),(170,-47)],
]
def contains(poly, px, py):
    inside = False
    j = len(poly)-1
    for i in range(len(poly)):
        ax, ay = poly[i]; bx, by = poly[j]
        if (ay>py) != (by>py):
            if px < (bx-ax)*(py-ay)/(by-ay)+ax:
                inside = not inside
        j=i
    return inside

def land(lon,lat):
    return any(contains(poly,lon,lat) for poly in LANDS)

def frame(index):
    im=Image.new("P",(W,H),0)
    im.putpalette(PAL)
    pixels=im.load()
    phase=2*pi*index/STEPS
    for y in range(H):
        for x in range(W):
            nx=(x+0.5-CX)/R
            ny=(y+0.5-CY)/R
            rr=nx*nx+ny*ny
            if rr>=1: continue
            nz=sqrt(1-rr)
            lon=degrees(atan2(nx,nz)+phase)
            lon=((lon+180)%360)-180
            lat=degrees(asin(-ny))
            is_ice=abs(lat)>73
            is_land=land(lon,lat)
            # V6B flat material lighting: left/top brightest; fixed tone bins.
            light=0.60-0.46*nx-0.28*ny+0.16*nz
            if is_ice:
                tone=9 if light>0.45 else 10
            elif is_land:
                tone=8 if light>0.91 else 7 if light>0.62 else 6 if light>0.31 else 5
            else:
                tone=4 if light>1.0 else 3 if light>0.68 else 2 if light>0.35 else 1
            pixels[x,y]=tone
    # V6B integer scaling only.
    return im.resize((W*SCALE,H*SCALE),Image.Resampling.NEAREST)

def main():
    OUT.parent.mkdir(parents=True,exist_ok=True)
    frames=[frame(i) for i in range(STEPS)]
    for f in frames: f.info["transparency"]=0
    frames[0].save(OUT,save_all=True,append_images=frames[1:],loop=0,
                   duration=105,transparency=0,disposal=2,optimize=False)
    with Image.open(OUT) as test:
        assert test.size==(384,384)
        assert test.n_frames>=28
    print("Created",OUT,"frames",STEPS,"size",OUT.stat().st_size)
if __name__=="__main__": main()
