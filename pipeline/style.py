"""Passive or active: was a quarter's change in a position just money flowing into index funds?

Most of what the Big Three hold sits in index funds. When money comes in, those funds buy more of
every stock in the same proportion, so the share count of most positions rises by about the same
ratio. That ratio, the value-weighted median change in shares across the whole 13F book (split
adjusted), is the quarter's flow baseline. A position that moved with it is labelled "flows"; one
that moved clearly more or less is a tilt: an index weight change or an active decision.
"""
from __future__ import annotations

from .movers import split_ratio

TOLERANCE = 0.02  # within 2 points of the baseline counts as moving with the flows


def baseline(now: dict, prev: dict, min_value: float = 1e8) -> float | None:
    """Value-weighted median of (shares now / shares before) - 1 over positions held in both quarters."""
    pts = []
    for c, a in now.items():
        b = prev.get(c)
        if not b or not a[0] or not b[0] or a[1] < min_value:
            continue
        r = a[0] / (b[0] * split_ratio(b, a)) - 1
        if -0.9 < r < 9:
            pts.append((r, a[1]))
    if len(pts) < 20:
        return None
    pts.sort()
    half, acc = sum(w for _, w in pts) / 2, 0.0
    for r, w in pts:
        acc += w
        if acc >= half:
            return r
    return pts[-1][0]


def classify(status: str | None, d_shares_pct: float | None, base: float | None) -> dict | None:
    """{kind, excess}: kind is new, exit, flows, more or less."""
    if status == "new":
        return {"kind": "new", "excess": None}
    if status in ("exited", "sold", "gone"):
        return {"kind": "exit", "excess": None}
    if d_shares_pct is None or base is None:
        return None
    excess = (1 + d_shares_pct) / (1 + base) - 1
    kind = "flows" if abs(excess) <= TOLERANCE else "more" if excess > 0 else "less"
    return {"kind": kind, "excess": excess}
