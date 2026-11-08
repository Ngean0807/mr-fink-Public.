"""Small files for "Ask Trintel" (worker/src/ask.js): what the question-answering tools read.

The push server answers questions with Claude and gives it tools that look data up. It cannot
parse the multi-megabyte dashboard file within a Worker's CPU limit, so the run writes compact
copies: data/ask/index.json (managers, top holdings, moves, signals, votes, Israel, famous
investors) and data/ask/co/<TICKER>.json (one company: ownership, famous holders, daily SPDR
trades, insiders, latest contested votes). Built from the files the run already wrote.
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from . import daily, gurus, israel, owners, signals, votes

DATA = Path(__file__).resolve().parent.parent / "web" / "data"
OUT = DATA / "ask"


def _load(p: Path):
    return json.loads(p.read_text()) if p.exists() else None


def _r(x, n=4):
    return round(x, n) if isinstance(x, float) else x


def write(data: dict, log=print) -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "co").mkdir(parents=True)
    secs = data["securities"]
    by_ticker = {s["ticker"]: s for s in secs.values()}
    views = {}
    for vid, v in data["views"].items():
        rows = []
        for r in v["rows"][:25]:
            s = secs.get(r["cusip"], {})
            q = r.get("qoq") or {}
            rows.append([s.get("ticker"), s.get("name"), round(r["value"]), _r(r.get("ownership")), _r(q.get("dSharesPct")), round(q.get("trade") or 0), (r.get("style") or {}).get("kind")])
        moves = v.get("moves") or {}
        mv = {side: [[m.get("ticker"), m.get("name"), round(m.get("flow") or 0), _r(m.get("dSharesPct")), m.get("status"), (m.get("style") or {}).get("kind")] for m in moves.get(side, [])[:15]]
              for side in ("bought", "sold")}
        views[vid] = {"total13f": v["totals"][-1], "positions": v["positions"], "flowBase": _r(v.get("flowBase")),
                      "top": rows, "moves": mv, "early": bool(v.get("early"))}
    g = _load(gurus.OUT) or {"managers": [], "consensus": [], "d13": []}
    sg = _load(signals.OUT) or {}
    vt = _load(votes.OUT) or {}
    il = _load(israel.OUT) or {}
    dl = _load(daily.OUT) or {}
    own = _load(owners.OUT) or {"rows": {}}
    index = {
        "asOf": data["meta"]["latest"], "aum": data["meta"].get("aum"),
        "views": views,
        "famous": [{"id": m["id"], "name": m["name"], "person": m["person"], "style": m["style"], "period": m["period"], "total": m["total"],
                    "top": [[r.get("t"), r["n"], round(r["v"]), _r(r["w"])] for r in m["top"][:10]],
                    "buys": [[r.get("t"), r["n"], round(r["f"]), r["st"]] for r in m["buys"][:8]],
                    "sells": [[r.get("t"), r["n"], round(r["f"]), r["st"]] for r in m["sells"][:8]]} for m in g["managers"]],
        "consensus": [[c["t"], c["n"], c["by"]] for c in g.get("consensus", [])],
        "activist13d": [[d["g"], d["filed"], d.get("t"), d["name"], d["amend"]] for d in g.get("d13", [])[:30]],
        "signals": {"current": {k: [[x["t"], x["n"]] for x in v] for k, v in (sg.get("current") or {}).items()}, "summary": sg.get("summary")},
        "votes": {"funds": vt.get("funds"), "period": vt.get("period"), "summary": vt.get("summary"),
                  "contested": [[c["t"], c["date"], c["d"][:140], c["s"], c["v"]] for c in (vt.get("contested") or [])[:30]]},
        "israel": [[r["t"], r["n"], r["f"], r.get("price"), (r.get("own") or {}).get("v"), (r.get("own") or {}).get("s")] for r in il.get("rows", [])],
        "usdils": il.get("usdils"),
        "spdrDaily": {"asOf": dl.get("asOf"), "stocks": [[s["t"], s["n"], round(s["usd"]), round(s["mix"])] for s in (dl.get("stocks") or [])[:20]],
                      "funds": [[f["t"], f.get("asOf"), _r(f.get("flowUsd"), 0), _r(f.get("flowPct"))] for f in dl.get("funds", [])]},
        "names": sorted([[t, r["n"]] for t, r in own["rows"].items()], key=lambda x: x[0]),
    }
    (OUT / "index.json").write_text(json.dumps(index, separators=(",", ":")))
    held_by = {}
    for m in g["managers"]:
        for side in ("top", "buys", "sells"):
            for r in m[side]:
                if r.get("t"):
                    held_by.setdefault(r["t"], {})[m["name"]] = {"value": round(r["v"]), "pctOfBook": _r(r["w"]), "lastQuarter": r["st"] or _r(r["d"]), "flow": round(r["f"])}
    n = 0
    for t, r in own["rows"].items():
        s = by_ticker.get(t)
        co = {"ticker": t, "name": r["n"], "big3": {"value": r["v"], "stake": r["s"], "qoqShares": r["q"],
                                                    "byManager": {m: {"shares": x[0], "value": x[1], "qoqShares": x[2], "passiveOrActive": x[3]} for m, x in r["m"].items()}}}
        if s:
            co["sector"], co["industry"] = s.get("sector"), s.get("industry")
            ins = s.get("insiders") or {}
            co["insiders90d"] = {k: ins.get(k) for k in ("bought", "sold", "buyers", "buys", "sells")}
        if t in held_by:
            co["famousInvestors"] = held_by[t]
        if t in (dl.get("byTicker") or {}):
            co["spdrDaily"] = dl["byTicker"][t]
        vf = votes.FOLDER / f"{t}.json"
        if vf.exists():
            vv = json.loads(vf.read_text())
            last = vv["items"][0]["date"] if vv["items"] else None
            co["proxyVotes"] = [[it["d"][:120], it["s"], it["v"]] for it in vv["items"] if it["date"] == last][:25]
            co["proxyMeeting"] = last
        safe = re.sub(r"[^A-Z0-9.\-]", "", t)
        if safe:
            (OUT / "co" / f"{safe}.json").write_text(json.dumps(co, separators=(",", ":")))
            n += 1
    log(f"ask data: index {(OUT / 'index.json').stat().st_size // 1024} KB, {n} company files")
