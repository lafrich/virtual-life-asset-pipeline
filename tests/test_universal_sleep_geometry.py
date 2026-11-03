"""Reject upright modular "lie" art: all three native bases must truly recline."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
media=ROOT/"_site"/"media"
for key in ("human-male-base","human-female-base","astrofrich-base"):
    filename=media/(key+"-action-lie.png")
    if not filename.is_file():
        raise AssertionError(f"Missing native sleep animation {filename}")
    with Image.open(filename) as atlas:
        if atlas.mode!="RGBA" or atlas.size!=(256,448):
            raise AssertionError(f"Invalid native lie atlas: {key}")
        for d in range(4):
            tile=np.asarray(atlas.crop((0,d*112,64,(d+1)*112)).convert("RGBA"))
            # Body pixels only; ignore alpha-56 ground shadow and 1px particles.
            yy,xx=np.nonzero(tile[...,3]>=200)
            if len(xx)<160:
                raise AssertionError(f"No rendered character for {key} / dir {d}")
            vx=float(np.var(xx));vy=float(np.var(yy))
            # Native V6B lie_flat maps vertical anatomy along the iso X axis.
            # An upright idle/sleep_seat sprite has overwhelmingly larger Y variance.
            if vx<=vy*0.95:
                raise AssertionError(
                    f"{key} direction {d} is not horizontal: xvar={vx:.1f}, yvar={vy:.1f}"
                )
print("PASS all Human Male/Female/Astrofrich native sleep poses are horizontal in SE/SW/NE/NW")
