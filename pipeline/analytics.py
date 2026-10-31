"""Position analytics: split adjustment, CUSIP succession, QoQ / YoY / since-inception metrics."""
from __future__ import annotations

import re

SPLIT_RATIOS = [2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50]
REVERSE_SPLIT_RATIOS = [1 / r for r in SPLIT_RATIOS]


def detect_splits(cusip: str, books: dict[str, dict], periods: list[str]) -> list[dict]:
    """Detect stock splits from the 13F data itself.

    Across a split every holder's share count jumps by the ratio k and the implied price
    (value / shares) moves the opposite way. Requirements, to keep stock-financed mergers and index
    additions out: at least two managers agree on the share jump, and the price itself must move
    against it (a forward split needs the price to fall by 30%+, a reverse split to rise by 40%+).
    All managers holding the stock must agree.
    """
    splits = []
    for prev, cur in zip(periods, periods[1:]):
        share_ratios = []
        price_ratios = []
        for book in books.values():
            a = book.get(prev, {}).get(cusip)
            b = book.get(cur, {}).get(cusip)
            if a and b and a[0] > 0 and b[0] > 0 and a[1] > 0 and b[1] > 0:
                share_ratios.append(b[0] / a[0])
                price_ratios.append((b[1] / b[0]) / (a[1] / a[0]))
        if len(share_ratios) < 2:
            continue
        price = sorted(price_ratios)[len(price_ratios) // 2]
        for k in SPLIT_RATIOS + REVERSE_SPLIT_RATIOS:
            if not (0.4 < price * k < 2.5) or (k > 1 and price > 0.7) or (k < 1 and price < 1.4):
                continue
            # Every manager must show the jump: a split hits all holders alike, while real buying
            # (an index addition, say) shows up in some books and not others (Lyft, Q1 2026).
            votes = sum(1 for s in share_ratios if abs(s / k - 1) < 0.12)
            if votes == len(share_ratios):
                splits.append({"period": cur, "ratio": k})
                break
    return splits


def split_factor(splits: list[dict], period: str) -> float:
    """Multiply historical share counts at `period` by this to express them in today's shares."""
    f = 1.0
    for s in splits:
        if period < s["period"]:
            f *= s["ratio"]
    return f


# Successions the name match cannot see (new name and CUSIP on the same day): new CUSIP -> old CUSIP.
KNOWN_SUCCESSIONS = {
    "75513E101": "913017109",  # Raytheon Technologies (now RTX) <- United Technologies, Apr 2020
}


def _issuer_key(name: str) -> str:
    words = re.sub(r"[^A-Z0-9 ]", " ", name.upper()).split()
    stop = {"THE", "INC", "CORP", "CORPORATION", "CO", "COMPANY", "LTD", "LLC", "LP", "PLC", "NV", "SA", "AG", "NEW",
            "COM", "HLDGS", "HOLDINGS", "GROUP", "SHS", "ORD", "CL", "A", "INDS", "INDUSTRIES", "N", "Y", "P"}
    return " ".join(w for w in words if w not in stop)


def find_predecessors(cusip: str, name: str, books: dict[str, dict], periods: list[str]) -> list[dict]:
    """Chain CUSIP changes (redomiciles, reverse splits, holding-company reorganisations).

    Around the quarter a security first appears, look for a CUSIP that vanished from the same
    managers that quarter and belongs to the same issuer: same 6-character issuer prefix, or the
    same name once legal suffixes are dropped. Its shares must carry over, allowing a split ratio.
    """
    chain = []
    current = cusip
    visited = {cusip}
    while len(chain) < 5:  # guard: a security rarely changes CUSIP more than a couple of times
        firsts = sorted({held[0] for b in books.values() if (held := [p for p in periods if current in b.get(p, {})])})
        found = None
        # Try the earliest switch-over quarter first; one manager may pick up the new line late.
        for first in firsts:
            idx = periods.index(first)
            if idx == 0:
                continue
            prev = periods[idx - 1]
            new_name = next((b[first][current][2] for b in books.values() if current in b.get(first, {})), name)
            keys = {_issuer_key(new_name), _issuer_key(name)}
            candidates: dict[str, float] = {}
            for book in books.values():
                before, after = book.get(prev, {}), book.get(first, {})
                for c, row in before.items():
                    if c in after or c in visited:
                        continue
                    if c[:6] == current[:6] or _issuer_key(row[2]) in keys:
                        candidates[c] = candidates.get(c, 0) + row[1]
            if current in KNOWN_SUCCESSIONS and KNOWN_SUCCESSIONS[current] not in visited:
                candidates = {KNOWN_SUCCESSIONS[current]: 1.0}
            if not candidates:
                continue
            old = max(candidates, key=candidates.get)
            old_sh = sum(b.get(prev, {}).get(old, [0])[0] for b in books.values())
            new_sh = sum(b.get(first, {}).get(current, [0])[0] for b in books.values())
            r = new_sh / old_sh if old_sh else 0
            if any(0.6 < r / k < 1.66 for k in [1] + SPLIT_RATIOS + REVERSE_SPLIT_RATIOS):
                found = (old, prev)
                break
        if not found:
            break
        visited.add(found[0])
        chain.append({"cusip": found[0], "until": found[1]})
        current = found[0]
    return chain


def stitch(cusip: str, preds: list[dict], books: dict[str, dict], periods: list[str]) -> dict[str, dict]:
    """Per-manager books restricted to one security, with predecessor CUSIPs folded in."""
    chain = [cusip] + [p["cusip"] for p in preds]
    out = {}
    for mid, b in books.items():
        out[mid] = {}
        for p in periods:
            rows = [b[p][x] for x in chain if x in b.get(p, {})]
            out[mid][p] = {cusip: max(rows, key=lambda r: r[1])} if rows else {}
    return out


def position_series(cusips: list[str], book: dict[str, dict], periods: list[str], splits: list[dict]) -> list[dict]:
    """Split-adjusted quarterly series for one manager; `cusips` is the security and its predecessors."""
    out = []
    for p in periods:
        rows = [book[p][c] for c in cusips if c in book.get(p, {})]
        row = max(rows, key=lambda r: r[1]) if rows else None
        if row and row[0] > 0:
            f = split_factor(splits, p)
            shares = row[0] * f
            out.append({"p": p, "s": round(shares), "v": row[1], "px": row[1] / shares if shares else None})
        else:
            out.append({"p": p, "s": 0, "v": 0, "px": None})
    return out


def _change(cur: dict, prev: dict | None) -> dict | None:
    if prev is None:
        return None
    if prev["s"] == 0 and cur["s"] == 0:
        return None
    if prev["s"] == 0:
        return {"status": "new", "dShares": cur["s"], "dSharesPct": None, "dValue": cur["v"], "dValuePct": None,
                "trade": cur["v"], "priceEffect": 0, "priceChg": None}
    if cur["s"] == 0:
        return {"status": "exited", "dShares": -prev["s"], "dSharesPct": -1.0, "dValue": -prev["v"], "dValuePct": -1.0,
                "trade": -prev["v"], "priceEffect": 0, "priceChg": None}
    d_shares = cur["s"] - prev["s"]
    # Value bridge: change in value = trading (Δshares at the new price) + price move on the old position.
    trade = d_shares * cur["px"]
    price_effect = prev["s"] * (cur["px"] - prev["px"])
    pct = d_shares / prev["s"]
    status = "added" if pct > 0.005 else "trimmed" if pct < -0.005 else "unchanged"
    return {
        "status": status,
        "dShares": d_shares,
        "dSharesPct": pct,
        "dValue": cur["v"] - prev["v"],
        "dValuePct": cur["v"] / prev["v"] - 1 if prev["v"] else None,
        "trade": trade,
        "priceEffect": price_effect,
        "priceChg": cur["px"] / prev["px"] - 1 if prev["px"] else None,
    }


def position_metrics(series: list[dict]) -> dict:
    cur = series[-1]
    qoq = _change(cur, series[-2] if len(series) >= 2 else None)
    yoy = _change(cur, series[-5] if len(series) >= 5 else None)
    # Start of the current, uninterrupted holding period.
    start_idx = len(series) - 1
    while start_idx > 0 and series[start_idx - 1]["s"] > 0:
        start_idx -= 1
    start = series[start_idx]
    years = (len(series) - 1 - start_idx) / 4
    price_ret = cur["px"] / start["px"] - 1 if start["px"] and cur["px"] else None
    inception = {
        "period": start["p"],
        "atWindowStart": start_idx == 0,
        "quarters": len(series) - start_idx,
        "years": years,
        "sharesStart": start["s"],
        "dShares": cur["s"] - start["s"],
        "dSharesPct": cur["s"] / start["s"] - 1 if start["s"] else None,
        "valueStart": start["v"],
        "priceStart": start["px"],
        "priceReturn": price_ret,
        "cagr": (1 + price_ret) ** (1 / years) - 1 if price_ret is not None and years >= 1 else None,
        "valueMultiple": cur["v"] / start["v"] if start["v"] else None,
    }
    return {"qoq": qoq, "yoy": yoy, "inception": inception}
