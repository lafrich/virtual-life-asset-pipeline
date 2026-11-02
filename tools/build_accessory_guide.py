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

    sheet = Image.new("RGBA", (64 * 4, 112), (0, 0, 0, 0))
    directions = ("se", "sw", "ne", "nw")
    # Compose only the native, uncapped and unpacked layers. This is exactly
    # the original Theodore silhouette with the existing goggles reapplied.
    behind = ("hair_back", "body", "arm_far", "shoes", "pants", "shoes_over",
              "rips", "shirt", "shirt_graphic", "outer")
    front = ("acc", "arm_near", "body_front", "held", "face",
             "hair_front", "glasses", "brows")
    for position, direction in enumerate(directions):
        layers, palette, head_offset, base, suit = theodore.render(
            direction, anim="idle", f=0, expr="neutral"
        )
        canvas = Image.new("RGBA", (64, 112), (0, 0, 0, 0))
        for key in (*behind, *front):
            if key in layers:
                canvas.alpha_composite(layers[key].convert("RGBA"))
        rgba = np.array(canvas)
        theodore.goggles(rgba, base, head_offset)
        canvas = Image.fromarray(rgba, "RGBA")
        if direction in ("sw", "nw"):
            canvas = canvas.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        sheet.alpha_composite(canvas, (position * 64, 0))
    output = media / "theodore-accessory-fitting-guide.png"
    sheet.save(output, optimize=True)
    return output
