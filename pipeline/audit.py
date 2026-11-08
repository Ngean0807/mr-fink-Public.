"""Sanity checks on every refresh, most useful in 13F season.

A wrong number on the site usually comes from a filing the pipeline read in a way nobody
expected: a complex that filed only part of its quarter, a value reported in thousands instead
of dollars, a split the detector missed. These checks run on the built data and are published
with it (dashboard.json meta.warnings); the Trintel push server announces each new warning to
subscribers of "site health".
"""
from __future__ import annotations


def check(views: dict, latest: str, period_list: list[str]) -> list[str]:
    """Plain-language warnings about the data just built (empty when everything looks normal)."""
    out = []
    prev_i = period_list.index(latest) - 1
    for vid, v in views.items():
        t = v["totals"]
        if prev_i >= 0 and t[-1] and t[prev_i]:
            ch = t[-1] / t[prev_i] - 1
            if abs(ch) > 0.3:  # markets rarely move a whole book 30% in a quarter: a units or completeness problem
                out.append(f"{v['name']}: total book {ch:+.0%} vs the previous quarter ({latest})")
        for r in v["rows"]:
            q = r.get("qoq") or {}
            if q.get("dSharesPct") is not None and abs(q["dSharesPct"]) > 3 and q.get("status") != "new":
                out.append(f"{v['name']}: {r['cusip']} shares {q['dSharesPct']:+.0%} QoQ (missed split or CUSIP change?)")
        e = v.get("early")
        if e and t[-1]:
            ch = e["total"] / t[-1] - 1
            if abs(ch) > 0.3:
                out.append(f"{v['name']} {e['label']} (filed early): total book {ch:+.0%} vs {latest}")
            for r in e["rows"]:
                if r["dSharesPct"] is not None and abs(r["dSharesPct"]) > 3:
                    out.append(f"{v['name']} {e['label']}: {r['ticker']} shares {r['dSharesPct']:+.0%} (missed split?)")
        for side in ("bought", "sold"):
            for r in (v.get("moves") or {}).get(side, [])[:5]:
                if t[-1] and abs(r["flow"]) > 0.01 * t[-1]:  # one trade worth 1% of the whole book
                    out.append(f"{v['name']}: {side} {r['ticker']} {r['flow'] / 1e9:+.1f}B in a quarter (check for a split or listing change)")
    return out

