"""Reusable *pixel-exact* helpers for characters, packaging, and small props.

Renderers retain authority over palettes, perspective and sprites. These
helpers only calculate integer pixel coordinates, so they can be reused
without changing v6b's no-antialiasing style. A lesson is promoted here
only after an approved asset and regression tests.
"""
from __future__ import annotations

from typing import Mapping, Sequence


def isometric_face_y(x: int, *, origin_x: int, origin_y: int, slope: float) -> int:
    """Integer screen Y of a text/barcode column on a vertical iso face.

    Positive slope descends right on a SE/NE face; negative descends left on
    a reflected SW/NW face. Glyph stems remain upright rather than rotated.
    """
    return origin_y + round((x - origin_x) * slope)


def draw_slanted_pixel_text(draw, text: str, glyphs: Mapping[str, Sequence[str]],
                            x0: int, y0: int, color, *, slope: float = 7 / 27,
                            spacing: int = 1) -> None:
    """Print bitmap glyph columns on a sloped panel without interpolation.

    Uses the supplied family-specific 1x glyphs and retains the original
    fixed advance for unknown characters. Not intended for browser/UI text.
    """
    x = x0
    for char in text.lower():
        glyph = glyphs.get(char)
        if not glyph:
            x += 3 + spacing
            continue
        for gy, row in enumerate(glyph):
            for gx, value in enumerate(row):
                if value == "1":
                    px = x + gx
                    draw.point(
                        (px, isometric_face_y(px, origin_x=x0, origin_y=y0 + gy, slope=slope)),
                        fill=color,
                    )
        x += len(glyph[0]) + spacing


def iso_panel_barcode(direction: str, *, frame_width: int = 64, bob: int = 0,
                      first_x: int = 19, columns: int = 9, step: int = 2,
                      origin_x: int = 14, origin_y: int = 65,
                      slope: float = 7 / 27,
                      heights: Sequence[int] = (5, 6, 5, 6, 4, 6, 5, 6, 5)
                      ) -> list[tuple[int, int, int]]:
    """Vertical bars on an isometric rear face, AFTER sprite mirroring.

    NE is descending-right, NW descending-left. Compute Y from the same
    *unmirrored physical coordinate*, then reflect X in the final frame.
    Do not mirror bar slopes a second time or diagonally tilt the stems.
    """
    if direction not in ("ne", "nw"):
        return []
    if columns < 1 or len(heights) != columns or frame_width < 1:
        raise ValueError("Invalid barcode dimensions")
    bars = []
    for i in range(columns):
        local_x = first_x + i * step
        x = local_x if direction == "ne" else frame_width - 1 - local_x
        y = isometric_face_y(local_x, origin_x=origin_x, origin_y=origin_y + bob, slope=slope)
        bars.append((x, y, heights[i]))
    return bars


def iso_side_anchor_x(left_edge_x: int, right_edge_x: int, *, fraction: float = 4 / 9) -> int:
    """Arm/handle attachment point *inside* a narrow side plane, not its back edge.

    'fraction' measures progress from the nearer face edge. Milk Mascot's
    side spans 41..50; its approved anchor is 45 (4/9 along that span).
    """
    if right_edge_x <= left_edge_x or not 0 <= fraction <= 1:
        raise ValueError("Invalid side plane")
    return left_edge_x + round((right_edge_x - left_edge_x) * fraction)
