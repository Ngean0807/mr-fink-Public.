"""Signals, and a ledger that keeps score of every one of them from the day it was issued.

Five signals, each a list of companies:
- active:     the Big Three bought clearly more than their index-fund flows (pipeline/style.py)
- consensus:  three or more famous investors bought it in their latest 13F (pipeline/gurus.py)
- activist:   a new Schedule 13D (5%+ stake with intent to influence) in the last 30 days
- insiders:   two or more company insiders bought on the open market in the last 90 days
- emerging:   the Emerging screen's top small caps by stake gain

The first time a company shows up in a signal it is written to the ledger with that day's price
and the S&P 500's (SPY). Every run then prices the whole ledger again, so the page shows each
signal's return since it was issued against the market. Nothing is back-filled or removed: the
ledger only grows, and it is carried from run to run through the live site.
"""
from __future__ import annotations

import json
import os
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from . import edgar, gurus, quotes

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "signals.json"
KINDS = ["active", "consensus", "activist", "insiders", "emerging"]
PER_KIND = 15
LEDGER_MAX = 3000


def previous(site: str | None) -> dict:
    if not site:
        return json.loads(OUT.read_text()) if OUT.exists() else {}
    try:
        with urllib.request.urlopen(f"{site.rstrip('/')}/data/signals.json?v={int(time.time())}", timeout=30) as r:
            return json.loads(r.read())
    except Exception:
        return {}


def _quarter() -> str:
    d = date.today()
    return f"{d.year}Q{(d.month - 1) // 3 + 1}"


def current(data: dict) -> dict[str, list[dict]]:
    """{kind: [{t, n, why, key}]} from this run's dashboard data and the famous investors' file."""
    out: dict[str, list[dict]] = {k: [] for k in KINDS}
    latest = data["meta"]["latest"]
    act: dict[str, dict] = {}
    for vid in ("blackrock", "vanguard", "statestreet"):
        for r in data["views"][vid].get("moves", {}).get("bought", []):
            st = r.get("style") or {}
            # "more" only: a brand-new position at an index giant is usually an index addition
            if st.get("kind") == "more" and r.get("ticker") and r["flow"] > 2e8:
                x = act.setdefault(r["ticker"], {"t": r["ticker"], "n": r["name"], "key": f"active:{r['ticker']}:{latest}", "f": 0.0, "why": {"m": [], "flow": 0.0}})
                x["f"] += r["flow"]
                x["why"]["flow"] += r["flow"]
                x["why"]["m"].append([vid, st.get("excess")])
    out["active"] = list(act.values())
    out["active"].sort(key=lambda x: -x["f"])
    g = json.loads(gurus.OUT.read_text()) if gurus.OUT.exists() else {"consensus": [], "d13": [], "managers": []}
    for c in g.get("consensus", []):
        if len(c["by"]) >= 3:
            period = max((m["period"] for m in g["managers"] if m["id"] in c["by"]), default=latest)
            out["consensus"].append({"t": c["t"], "n": c["n"], "key": f"consensus:{c['t']}:{period}", "why": {"by": c["by"], "flow": c["f"]}})
    since = (date.today() - timedelta(days=30)).isoformat()
    for d in g.get("d13", []):
        if d.get("t") and not d["amend"] and d["filed"] >= since:
            out["activist"].append({"t": d["t"], "n": d["name"], "key": f"activist:{d['t']}:{d['filed']}", "why": {"g": d["g"], "filed": d["filed"], "url": d["url"]}})
    for s in data["securities"].values():
        ins = s.get("insiders") or {}
        if (ins.get("buyers") or 0) >= 2 and (ins.get("bought") or 0) > 0:
            out["insiders"].append({"t": s["ticker"], "n": s["name"], "key": f"insiders:{s['ticker']}:{_quarter()}",
                                    "why": {"buyers": ins["buyers"], "bought": ins["bought"]}})
    for r in (data.get("emerging") or {}).get("rows", []):
        ins = r.get("insiders") or {}
        if (ins.get("buyers") or 0) >= 2 and (ins.get("bought") or 0) > 0 and not any(x["t"] == r["ticker"] for x in out["insiders"]):
            out["insiders"].append({"t": r["ticker"], "n": r["name"], "key": f"insiders:{r['ticker']}:{_quarter()}",
                                    "why": {"buyers": ins["buyers"], "bought": ins["bought"]}})
    out["insiders"].sort(key=lambda x: -x["why"]["bought"])
    em = sorted((data.get("emerging") or {}).get("rows", []), key=lambda r: -(r.get("stakeChangeYoY") or 0))
    for r in em[:PER_KIND]:
        out["emerging"].append({"t": r["ticker"], "n": r["name"], "key": f"emerging:{r['ticker']}:{latest}",
                                "why": {"stake": r.get("stake"), "yoy": r.get("stakeChangeYoY")}})
    return {k: v[:PER_KIND] for k, v in out.items()}


def build(data: dict, log=print, site: str | None = None) -> dict:
    site = site if site is not None else os.environ.get("SITE_URL")
    old = previous(site)
    # The ledger lives on the site and, as a backup, in the build cache: a failed download must
    # never start the track record over. The longer of the two wins.
    backup = edgar.load_artifact("signals_ledger.json.gz") or []
    ledger = old.get("ledger", [])
    if len(backup) > len(ledger):
        ledger = backup
    known = {x["key"] for x in ledger}
    cur = current(data)
    today = datetime.now(timezone.utc).date().isoformat()
    fresh = [x for k in KINDS for x in cur[k] if x["key"] not in known]
    tickers = sorted({x["t"] for x in ledger} | {x["t"] for x in fresh} | {"SPY"})
    px = quotes.batch_quotes(tickers, log=lambda *a: None)
    spy = (px.get("SPY") or {}).get("price")
    for x in fresh:
        p = (px.get(x["t"]) or {}).get("price")
        if p and spy:
            ledger.append({"key": x["key"], "kind": x["key"].split(":")[0], "t": x["t"], "n": x["n"], "date": today, "p0": p, "spy0": spy})
    ledger = ledger[-LEDGER_MAX:]
    for x in ledger:
        p = (px.get(x["t"]) or {}).get("price")
        if p and spy:
            x["p"], x["spy"] = p, spy
            x["r"] = p / x["p0"] - 1
            x["rs"] = spy / x["spy0"] - 1
    edgar.save_artifact("signals_ledger.json.gz", ledger)
    summary = {}
    for k in KINDS:
        rows = [x for x in ledger if x["kind"] == k and "r" in x]
        aged = [x for x in rows if (date.fromisoformat(today) - date.fromisoformat(x["date"])).days >= 30]
        summary[k] = {"n": len(rows), "aged": len(aged),
                      "avg": sum(x["r"] for x in rows) / len(rows) if rows else None,
                      "avgVsSpy": sum(x["r"] - x["rs"] for x in rows) / len(rows) if rows else None,
                      "beat": sum(1 for x in rows if x["r"] > x["rs"]) / len(rows) if rows else None,
                      "since": min((x["date"] for x in rows), default=None)}
    out = {"asOf": datetime.now(timezone.utc).isoformat(timespec="seconds"), "current": cur, "ledger": ledger, "summary": summary}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    log(f"signals: {sum(len(v) for v in cur.values())} current, {len(fresh)} new to the ledger, {len(ledger)} tracked")
    return out
