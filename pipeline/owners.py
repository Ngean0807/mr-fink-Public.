"""Ownership index: every Big Three position worth $50M or more, by ticker.

The dashboard profiles a few hundred companies in depth. The portfolio X-ray, the Israel page and
Ask need a lighter answer for any listed company: how much of it each manager holds, how that
changed last quarter, and whether the change moved with the manager's index-fund flows.

Tickers come from OpenFIGI (cached; at most NEW_PER_RUN new CUSIPs per run so the first fill
spreads over a few runs), shares outstanding from the SEC's XBRL frames (the cover-page share count
each company reports). Writes web/data/owners.json.
"""
from __future__ import annotations

import json
from pathlib import Path

from . import edgar, securities, style
from .movers import split_ratio

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "owners.json"
MIN_VALUE = 50e6
NEW_PER_RUN = 200
STOCK_TYPES = {"Common Stock", "ADR", "REIT", "MLP", "NY Reg Shrs", "Tracking Stk", "GDR", "Ltd Part", "Royalty Trst"}
FRAMES = "https://data.sec.gov/api/xbrl/frames/dei/EntityCommonStockSharesOutstanding/shares/{q}.json"


def shares_outstanding(latest: str) -> dict[str, float]:
    """CIK (10 digits) -> latest reported shares outstanding, from the two quarters around `latest`."""
    y, m = int(latest[:4]), int(latest[5:7])
    qs = []
    for k in range(3):
        qq = (m - 1) // 3 + 1 + 1 - k  # the quarter after `latest`, then `latest`, then the one before
        yy = y
        while qq < 1:
            qq += 4
            yy -= 1
        while qq > 4:
            qq -= 4
            yy += 1
        qs.append(f"CY{yy}Q{qq}I")
    out: dict[str, tuple[str, float]] = {}
    for q in qs:
        try:
            data = edgar.cached_json(FRAMES.format(q=q), ttl_hours=24)
        except Exception:
            continue
        for d in data.get("data", []):
            cik = str(d["cik"]).zfill(10)
            if cik not in out or d["end"] > out[cik][0]:
                out[cik] = (d["end"], float(d["val"]))
    return {k: v[1] for k, v in out.items()}


def build(books: dict[str, dict], latest: str, prev: str, figi_known: dict, log=print) -> dict:
    """books: {manager id: {period: {cusip: [shares, value, name]}}} for the three managers."""
    mids = [m for m in ("blackrock", "vanguard", "statestreet") if m in books]
    now = {m: books[m].get(latest, {}) for m in mids}
    before = {m: books[m].get(prev, {}) for m in mids}
    total = {}
    for m in mids:
        for c, r in now[m].items():
            total[c] = total.get(c, 0) + r[1]
    cusips = sorted((c for c, v in total.items() if v >= MIN_VALUE), key=lambda c: -total[c])
    cache = edgar.load_artifact("openfigi.json.gz") or {}
    missing = [c for c in cusips if c not in cache and c not in figi_known]
    if missing:
        securities.map_cusips(missing[:NEW_PER_RUN])
        cache = edgar.load_artifact("openfigi.json.gz") or {}
    so = shares_outstanding(latest)
    base = {m: style.baseline(now[m], before[m]) for m in mids}
    rows = {}
    for c in cusips:
        f = figi_known.get(c) or cache.get(c)
        if not f or f.get("type") not in STOCK_TYPES:
            continue
        t = securities.display_ticker(f["ticker"])
        sec = securities.sec_company(f["ticker"])
        out_sh = so.get(sec["cik"]) if sec else None
        per = {}
        sh_now = sh_prev = 0.0
        for m in mids:
            a, b = now[m].get(c), before[m].get(c)
            if a:
                ratio = split_ratio(b, a) if b else 1.0
                d = (a[0] / (b[0] * ratio) - 1) if b and b[0] else None
                st = style.classify("new" if not b else None, d, base[m])
                per[m] = [round(a[0]), round(a[1]), None if d is None else round(d, 4), st["kind"] if st else None]
                sh_now += a[0]
                sh_prev += (b[0] * ratio) if b else 0
        if not per:
            continue
        name = (now[mids[0]].get(c) or next(now[m][c] for m in mids if c in now[m]))[2]
        stake = sh_now / out_sh if out_sh and 0 < sh_now / out_sh < 1.2 else None
        rows[t] = {"n": (sec or {}).get("title") or name, "v": round(total[c]), "s": None if stake is None else round(stake, 4),
                   "q": round(sh_now / sh_prev - 1, 4) if sh_prev else None, "m": per}
    out = {"asOf": latest, "base": base, "rows": rows}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    log(f"owners: {len(rows)} companies ({len(missing)} CUSIPs still to map, {min(len(missing), NEW_PER_RUN)} this run)")
    return out
