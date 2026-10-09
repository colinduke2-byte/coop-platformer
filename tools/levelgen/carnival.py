"""Helpers for World 6 (Midnight Carnival) levels: a corridor with a walkable FLOOR (y = 0, walk on
its top) and a walkable CEILING (underside at y = -H). Gravity flips between them via switches.

    from carnival import H, corridor, ...
    L = LevelKit(...)
    corridor(L, -300, 6000, floor_gaps=[(1400, 2100)])
"""
H = 540            # floor-to-ceiling distance (feet to feet). Jump is 190, so you can't reach the other side unflipped.
FLOOR_DEPTH = 900  # how far ground extends below the floor / above the ceiling


def _segments(x0, x1, gaps):
    segs, cur = [], x0
    for a, b in sorted(gaps):
        if a > cur:
            segs.append((cur, a))
        cur = max(cur, b)
    if cur < x1:
        segs.append((cur, x1))
    return segs


def corridor(L, x0, x1, floor_gaps=(), ceil_gaps=(), floor_y=0, ceil_y=-H, slippery=False):
    """Floor + ceiling ground with optional gaps (pits). Returns (floor_segments, ceiling_segments)."""
    fs = _segments(x0, x1, floor_gaps)
    cs = _segments(x0, x1, ceil_gaps)
    for a, b in fs:
        L.land([(a, floor_y), (b, floor_y)], bottom=floor_y + FLOOR_DEPTH, slippery=slippery)
    for a, b in cs:
        L.ceiling_land([(a, ceil_y), (b, ceil_y)], top=ceil_y - FLOOR_DEPTH)
    return fs, cs


def pit(L, x0, x1, depth=700, top=False):
    """Kill strip under (or, top=True, above) a gap so falling ends quickly."""
    if top:
        L.kill_top(x0, x1, -H - depth)
    else:
        L.pit_kill(x0, x1, depth)


def ceil_lums(L, x0, x1, count=6, arc=0.0):
    """Lums hanging at head height for someone standing on the ceiling."""
    L.lums(x0, -H + 60, x1, -H + 60, count, arc)


def floor_lums(L, x0, x1, count=6, arc=0.0):
    L.lums(x0, -110, x1, -110, count, arc)


def ceil_gem(L, x, drop=70):
    return L.gem(x, -H + drop)
