"""Insider trades from Form 4: open-market purchases and sales by officers, directors and 10% owners.

Only transaction codes P (open-market or private purchase) and S (open-market or private sale)
count. Awards, option exercises, tax withholding and gifts move shares without anyone choosing to
buy or sell at the market price, so they are left out. Each Form 4 is parsed once and kept.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import date, timedelta

from . import edgar, feed

WINDOW_DAYS = 90
CACHE_KEY = "form4.json.gz"
_cache: dict | None = None
_fetched = 0


def _store() -> dict:
    global _cache
    if _cache is None:
        _cache = edgar.load_artifact(CACHE_KEY) or {}
    return _cache


def save() -> None:
    if _cache is not None:
        edgar.save_artifact(CACHE_KEY, _cache)


def _val(el, path: str) -> str | None:
    node = el.find(path)
    return node.text.strip() if node is not None and node.text else None


def parse(xml: bytes, url: str) -> list[dict]:
    """Open-market trades in one Form 4 (one row per reporting owner and transaction)."""
    root = ET.fromstring(re.sub(rb'\sxmlns="[^"]+"', b"", xml, count=1))
    owners = []
    for o in root.findall("reportingOwner"):
        rel = o.find("reportingOwnerRelationship")
        roles = []
        if rel is not None:
            if _val(rel, "isDirector") in ("1", "true"):
                roles.append("Director")
            if _val(rel, "isOfficer") in ("1", "true"):
                roles.append(_val(rel, "officerTitle") or "Officer")
            if _val(rel, "isTenPercentOwner") in ("1", "true"):
                roles.append("10% owner")
        owners.append({"name": _val(o, "reportingOwnerId/rptOwnerName") or "", "role": ", ".join(roles)})
    plan = _val(root, "aff10b5One") in ("1", "true")
    out = []
    for t in root.findall("nonDerivativeTable/nonDerivativeTransaction"):
        code = _val(t, "transactionCoding/transactionCode")
        if code not in ("P", "S"):
            continue
        try:
            shares = float(_val(t, "transactionAmounts/transactionShares/value") or 0)
            price = float(_val(t, "transactionAmounts/transactionPricePerShare/value") or 0)
        except ValueError:
            continue
        if not shares:
            continue
        after = _val(t, "postTransactionAmounts/sharesOwnedFollowingTransaction/value")
        for o in owners[:1]:  # joint filings repeat the same trade; count it once
            out.append({
                "date": _val(t, "transactionDate/value"), "name": o["name"], "role": o["role"], "code": code,
                "shares": shares, "price": price, "value": round(shares * price),
                "after": float(after) if after else None, "plan": plan, "url": url,
            })
    return out


def company(cik: str, ttl_hours: float, budget: int) -> dict | None:
    """Last 90 days of open-market insider trades for one company. `budget` caps new Form 4
    downloads this run (shared across companies); the rest arrive on later runs."""
    global _fetched
    try:
        _, rows = feed._recent(cik, ttl_hours)
    except Exception:
        return None
    since = (date.today() - timedelta(days=WINDOW_DAYS)).isoformat()
    store = _store()
    trades, pending = [], 0
    for r in rows:
        if r["form"] not in ("4", "4/A") or r["filed"] < since:
            continue
        acc = r["accession"]
        if acc not in store:
            if _fetched >= budget:
                pending += 1
                continue
            folder = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace('-', '')}"
            try:
                store[acc] = parse(edgar.fetch(f"{folder}/{r['doc'].split('/')[-1]}"), f"{folder}/{acc}-index.htm")
            except Exception:
                store[acc] = []  # unparseable or not XML: never retried
            _fetched += 1
        trades += store[acc]
    trades = sorted((t for t in trades if (t["date"] or "") >= since), key=lambda t: t["date"] or "", reverse=True)
    buys = [t for t in trades if t["code"] == "P"]
    sells = [t for t in trades if t["code"] == "S"]
    return {
        "days": WINDOW_DAYS, "bought": sum(t["value"] for t in buys), "sold": sum(t["value"] for t in sells),
        "buys": len(buys), "sells": len(sells), "buyers": len({t["name"] for t in buys}),
        "trades": trades[:12], "pending": pending,
    }


def prune(keep_since_days: int = 120) -> None:
    """Drop parsed filings that can no longer fall inside the window (keyed by accession only,
    so keep anything referenced in the last runs; the cache stays small)."""
    store = _store()
    cutoff = (date.today() - timedelta(days=keep_since_days)).isoformat()
    for acc in [a for a, v in store.items() if v and all((t["date"] or "") < cutoff for t in v)]:
        del store[acc]
