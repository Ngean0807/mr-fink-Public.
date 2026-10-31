"""The quarter's largest buys and sells across a whole 13F book, not just the top holdings.

Net flow = change in shares (split-adjusted) valued at the quarter-end price. A CUSIP change
(redomicile, reverse split with a new CUSIP) would otherwise read as one full sale plus one new
purchase, so new positions are linked to the security they replaced before ranking.
"""
from __future__ import annotations

from . import analytics, config


def split_ratio(prev: list, now: list) -> float:
    """A stock split between two quarters from one book: the share count moves by a whole ratio
    and the implied price by its inverse. 1.0 when there is none."""
    if not prev or not now or not prev[0] or not now[0] or not prev[1] or not now[1]:
        return 1.0
    k = now[0] / prev[0]
    px = (now[1] / now[0]) / (prev[1] / prev[0])
    for r in (2, 3, 4, 5, 8, 10, 15, 20, 25, 40, 50):
        for ratio in (r, 1 / r):
            if abs(k / ratio - 1) < 0.25 and abs(px * ratio - 1) < 0.2:
                return ratio
    return 1.0


def _flow(prev: list | None, now: list | None) -> float:
    if now and now[0]:
        ratio = split_ratio(prev, now) if prev else 1.0
        return (now[0] - (prev[0] * ratio if prev else 0)) * now[1] / now[0]
    if prev and prev[0]:
        return -prev[1]  # sold out: the position's value at the previous quarter end
    return 0.0


def candidates(now: dict, prev: dict, k: int = 120) -> list[str]:
    """CUSIPs with the largest estimated net flow either way, before fund screening."""
    flows = {c: _flow(prev.get(c), now.get(c)) for c in set(now) | set(prev)}
    buys = sorted((c for c in flows if flows[c] > 0), key=lambda c: -flows[c])[:k]
    sells = sorted((c for c in flows if flows[c] < 0), key=lambda c: flows[c])[:k]
    return buys + sells


def quarter_moves(book: dict, latest: str, prev: str, period_list: list[str], figi: dict, n: int = 25,
                  universe_now: dict | None = None) -> dict:
    """{"bought": [...], "sold": [...]}: the n largest net buys and sells of operating companies."""
    now, before = book.get(latest, {}), book.get(prev, {})
    linked: dict[str, str] = {}  # new CUSIP -> the CUSIP it replaced
    for c in candidates(now, before):
        if c in now and c not in before:
            preds = analytics.find_predecessors(c, now[c][2], {"x": book}, period_list)
            if preds and preds[0]["until"] == prev:
                linked[c] = preds[0]["cusip"]
    replaced = set(linked.values())
    rows = []
    for c in candidates(now, before):
        info = figi.get(c) or figi.get(linked.get(c, ""))
        if c in replaced or not info or info["type"] not in config.COMPANY_SECURITY_TYPES:
            continue
        old = before.get(linked.get(c, c))
        cur = now.get(c)
        flow = _flow(old, cur)
        ratio = split_ratio(old, cur) if old and cur else 1.0
        old_sh = old[0] * ratio if old else 0
        rows.append({
            "cusip": c, "ticker": info["ticker"], "name": (cur or old)[2].title(),
            "flow": round(flow), "value": cur[1] if cur else 0,
            "dShares": (cur[0] if cur else 0) - old_sh,
            "dSharesPct": (cur[0] / old_sh - 1) if cur and old_sh else None,
            "status": "new" if not old else "exited" if not cur else None,
        })
    # A listing that replaced another one for the same issuer (ADR to ordinary shares, a new
    # holding company) shows as an exit plus a new position: net the two into one row.
    by_key: dict[str, list[dict]] = {}
    for r in rows:
        by_key.setdefault(_key(r["name"]), []).append(r)
    for group in by_key.values():
        if len(group) < 2:
            continue
        ins = [r for r in group if r["flow"] > 0]
        outs = [r for r in group if r["flow"] < 0 and r["status"] == "exited"]
        if ins and outs:
            keep = max(ins, key=lambda r: r["flow"])
            for o in outs:
                keep["flow"] += o["flow"]
                o["flow"] = 0
            keep.update(status="converted", dSharesPct=None)
    # A company that left every Big Three book (acquired for cash, delisted) was not sold by choice.
    gone = [r for r in rows if r["status"] == "exited" and r["flow"] and universe_now is not None and not universe_now.get(r["cusip"])]
    gone_ids = {r["cusip"] for r in gone}
    bought = sorted((r for r in rows if r["flow"] > 0), key=lambda r: -r["flow"])[:n]
    sold = sorted((r for r in rows if r["flow"] < 0 and r["cusip"] not in gone_ids), key=lambda r: r["flow"])[:n]
    return {"bought": bought, "sold": sold, "gone": sorted(gone, key=lambda r: r["flow"])[:8]}


ADR_WORDS = {"SPONSORED", "SPON", "ADR", "ADS", "AMERICAN", "DEPOSITARY", "DEPOSITORY", "SHARES", "SHS", "RECEIPTS", "EACH", "REPSTG", "REP"}


def _key(name: str) -> str:
    return " ".join(w for w in analytics._issuer_key(name).split() if w not in ADR_WORDS)
