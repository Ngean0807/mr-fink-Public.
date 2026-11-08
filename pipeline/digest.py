"""The weekly digest: the week's most important changes, in a few lines.

Built every run for the current week (Monday to now) from the files the run already wrote; when a
new week starts, the last version of the previous week goes to the archive (carried through the
live site, 12 issues kept). From Friday after the US close the issue is marked ready, and the
push server (worker/) sends it once: a Web Push to subscribers who chose the weekly digest and a
Telegram message to the bot's subscribers.
Writes web/data/digest.json.
"""
from __future__ import annotations

import json
import os
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from . import daily, gurus, signals

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "digest.json"
KEEP = 12


def previous(site: str | None) -> dict:
    if not site:
        return json.loads(OUT.read_text()) if OUT.exists() else {}
    try:
        with urllib.request.urlopen(f"{site.rstrip('/')}/data/digest.json?v={int(time.time())}", timeout=30) as r:
            return json.loads(r.read())
    except Exception:
        return {}


def _load(p: Path) -> dict:
    return json.loads(p.read_text()) if p.exists() else {}


def build(data: dict, now: datetime | None = None, log=print, site: str | None = None) -> dict:
    site = site if site is not None else os.environ.get("SITE_URL")
    now = now or datetime.now(timezone.utc)
    monday = (now - timedelta(days=now.weekday())).date()
    week = f"{monday.isocalendar().year}-W{monday.isocalendar().week:02d}"
    start, end = monday.isoformat(), (monday + timedelta(days=6)).isoformat()
    inweek = lambda d: d and start <= d[:10] <= end
    feed = data.get("feed", [])
    stakes = [e for e in feed if e.get("kind") == "13g" and inweek(e.get("filed"))]
    stakes.sort(key=lambda e: -(e.get("percent") or 0))
    reports = [e for e in feed if e.get("kind") == "8k" and inweek(e.get("filed")) and e.get("key")]
    f13 = [e for e in feed if e.get("kind") == "13f" and inweek(e.get("filed"))]
    dl = _load(daily.OUT)
    week_days = [d for d in sorted({x[0] for v in dl.get("byTicker", {}).values() for x in v}) if inweek(d)]
    flows = sum((h[1] or 0) for hs in dl.get("history", {}).values() for h in hs if inweek(h[0]))
    by_t: dict[str, list] = {}
    for t, rows in dl.get("byTicker", {}).items():
        for day, u, m in rows:
            if inweek(day):
                a = by_t.setdefault(t, [0.0, 0.0])
                a[0] += u
                a[1] += m
    spdr_buys = sorted(([t, v[0], v[1]] for t, v in by_t.items() if v[0] > 0), key=lambda x: -x[1])[:5]
    spdr_sells = sorted(([t, v[0], v[1]] for t, v in by_t.items() if v[0] < 0), key=lambda x: x[1])[:5]
    g = _load(gurus.OUT)
    names = {m["id"]: m["name"] for m in g.get("managers", [])}
    d13 = [{"g": names.get(d["g"], d["g"]), "t": d.get("t"), "n": d["name"], "amend": d["amend"], "filed": d["filed"]} for d in g.get("d13", []) if inweek(d["filed"])]
    seen13: set = set()
    d13 = [d for d in d13 if not ((d["g"], d["t"] or d["n"]) in seen13 or seen13.add((d["g"], d["t"] or d["n"])))]  # latest per manager and company
    g13f = [{"g": m["name"], "period": m["period"], "buy": (m["buys"][0] if m["buys"] else None)} for m in g.get("managers", []) if inweek(m.get("filed"))]
    sg = _load(signals.OUT)
    new_sig = [x for x in sg.get("ledger", []) if inweek(x["date"])]
    aged = [x for x in sg.get("ledger", []) if "r" in x and (now.date() - date.fromisoformat(x["date"])).days >= 7]
    best = sorted(aged, key=lambda x: -(x["r"] - x["rs"]))[:3]
    lines = []
    if stakes:
        e = stakes[0]
        lines.append(["stake", {"m": e.get("manager"), "pct": e.get("percent"), "t": (e.get("tickers") or [None])[0], "n": len(stakes)}])
    if week_days:
        lines.append(["spdr", {"days": len(week_days), "flow": flows, "buy": spdr_buys[0] if spdr_buys else None, "sell": spdr_sells[0] if spdr_sells else None}])
    for d in d13[:3]:
        lines.append(["d13", d])
    for x in g13f[:3]:
        lines.append(["g13f", x])
    if new_sig:
        lines.append(["signals", {"n": len(new_sig), "kinds": sorted({x["kind"] for x in new_sig})}])
    if reports:
        lines.append(["reports", {"n": len(reports), "t": list(dict.fromkeys(t for e in reports for t in (e.get("tickers") or [])[:1]))[:5]}])
    if f13:
        lines.append(["f13", {"m": sorted({e.get("manager") for e in f13 if e.get("manager")})}])
    ready = now.weekday() >= 5 or (now.weekday() == 4 and now.hour >= 21)
    issue = {"week": week, "from": start, "to": min(end, now.date().isoformat()), "ready": ready, "builtAt": now.isoformat(timespec="seconds"),
             "lines": lines, "stakes": stakes[:8], "reports": reports[:10], "spdrBuys": spdr_buys, "spdrSells": spdr_sells,
             "spdrFlow": flows if week_days else None, "d13": d13, "g13f": g13f,
             "newSignals": [{"kind": x["kind"], "t": x["t"], "n": x["n"]} for x in new_sig][:15],
             "best": [{"kind": x["kind"], "t": x["t"], "date": x["date"], "r": x["r"], "rs": x["rs"]} for x in best]}
    old = previous(site)
    archive = old.get("archive", [])
    cur = old.get("current")
    if cur and cur.get("week") != week and not any(a["week"] == cur["week"] for a in archive):
        archive = [cur] + archive
    out = {"current": issue, "archive": archive[:KEEP]}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    log(f"digest {week}: {len(lines)} headlines{' (ready)' if ready else ''}, {len(archive)} past issues")
    return out
