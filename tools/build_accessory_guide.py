"""Build an accurate bare Theodore accessory fitting guide.
The exact v6b body, bald head and goggles come from the existing Theodore
source layers. His fixed helmet and backpack are intentionally NOT rendered.
This guide is never saved into accessory artwork or changed game sprites.
"""
from __future__ import annotations

import sys
from pathlib import Path
from PIL import Image
import numpy as np

def build_accessory_guide(root: Path, media: Path) -> Path:
    sys.path.insert(0, str(root / "assets" / "npc_gfunk"))
    sys.path.insert(0, str(root / "assets" / "npc_theodore"))
    import make_theodore as theodore

    # Full modular Theodore render: chest badge, belly marble, belt, bald head,
    # original goggles and body. Helmet and backpack are suppressed by the
    # shared modular flag. EACH DIRECTION IS RENDERED INDEPENDENTLY.
    sheet = Image.new("RGBA", (64 * 4, 112), (0, 0, 0, 0))
    directions = ("se", "sw", "ne", "nw")
    for position, direction in enumerate(directions):
        body = theodore.frame(direction,"idle",0,"neutral",modular=True)
        sheet.alpha_composite(body,(position*64,0))
    output = media / "theodore-accessory-fitting-guide.png"
    sheet.save(output, optimize=True)
    return output
