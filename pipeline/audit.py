"""Sanity checks on every refresh, most useful in 13F season.

A wrong number on the site usually comes from a filing the pipeline read in a way nobody
expected: a complex that filed only part of its quarter, a value reported in thousands instead
of dollars, a split the detector missed. These checks run on the built data, are published in
status.json, and each new warning is pushed once to the owner's private channel.
"""
from __future__ import annotations

import json
import os
import urllib.request

from . import config, edgar

STATE = edgar.CACHE_DIR / "audit_seen.json"


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


def notify_new(warnings: list[str], log=print) -> None:
    """Push warnings not pushed before to the owner's private channel (NTFY_TOPIC)."""
    topic = os.environ.get("NTFY_TOPIC")
    seen = set(json.loads(STATE.read_text())) if STATE.exists() else set()
    fresh = [w for w in warnings if w not in seen]
    if fresh and topic:
        body = "\n".join(fresh[:10]) + (f"\n…and {len(fresh) - 10} more" if len(fresh) > 10 else "")
        req = urllib.request.Request(f"{config.NTFY_SERVER.rstrip('/')}/{topic}", data=body.encode(),
                                     headers={"Title": "Mr. Fink data check", "Tags": "mag", "Priority": "default"})
        try:
            urllib.request.urlopen(req, timeout=20).read()
        except Exception as e:  # never fail the refresh over an alert
            log(f"Audit push failed: {e}")
            return
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(sorted(seen | set(warnings))[-500:]))
    log(f"Audit: {len(warnings)} warnings, {len(fresh)} new")
