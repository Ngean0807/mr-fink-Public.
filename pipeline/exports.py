"""CSV copies of the site's data, for spreadsheets: =IMPORTDATA("<site>/data/csv/<file>.csv") in
Google Sheets, or Data > From Web in Excel. Written at the end of every run from the JSON files.
"""
from __future__ import annotations

import csv
import io
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "web" / "data"
OUT = DATA / "csv"


def _load(name: str):
    p = DATA / name
    return json.loads(p.read_text()) if p.exists() else None


def _write(name: str, header: list[str], rows: list[list]) -> None:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    for r in rows:
        w.writerow(["" if x is None else (round(x, 6) if isinstance(x, float) else x) for x in r])
    (OUT / name).write_text(buf.getvalue())


def write(data: dict, log=print) -> list[str]:
    OUT.mkdir(parents=True, exist_ok=True)
    done = []
    secs = data["securities"]
    for vid, v in data["views"].items():
        rows = []
        for r in v["rows"]:
            s = secs.get(r["cusip"], {})
            q = r.get("qoq") or {}
            rows.append([r["rank"], s.get("ticker"), s.get("name"), s.get("sector"), r["value"], r["shares"], r.get("ownership"),
                         q.get("dSharesPct"), q.get("trade"), (r.get("style") or {}).get("kind")])
        _write(f"holdings-{vid}.csv", ["rank", "ticker", "name", "sector", "value_usd", "shares", "stake", "qoq_shares_change",
                                       "qoq_net_flow_usd", "passive_or_active"], rows)
        done.append(f"holdings-{vid}.csv")
    own = _load("owners.json")
    if own:
        mids = ["blackrock", "vanguard", "statestreet"]
        rows = []
        for t, r in sorted(own["rows"].items(), key=lambda kv: -kv[1]["v"]):
            row = [t, r["n"], r["v"], r["s"], r["q"]]
            for m in mids:
                x = r["m"].get(m) or [None, None, None, None]
                row += x
            rows.append(row)
        _write("ownership.csv", ["ticker", "name", "big3_value_usd", "big3_stake", "big3_qoq_shares_change"]
               + [f"{m}_{k}" for m in mids for k in ("shares", "value_usd", "qoq_shares_change", "passive_or_active")], rows)
        done.append("ownership.csv")
    g = _load("gurus.json")
    if g:
        rows = []
        for m in g["managers"]:
            for side in ("buys", "sells", "top"):
                for r in m[side]:
                    rows.append([m["name"], m["person"], m["period"], {"buys": "buy", "sells": "sell", "top": "holding"}[side],
                                 r.get("t"), r["n"], r["v"], r["w"], r["f"], r["d"], r["st"]])
        _write("famous-investors.csv", ["manager", "person", "quarter_end", "list", "ticker", "name", "value_usd", "pct_of_book",
                                        "net_flow_usd", "shares_change", "status"], rows)
        _write("activist-13d.csv", ["manager", "filed", "form", "company", "ticker", "url"],
               [[next((m["name"] for m in g["managers"] if m["id"] == d["g"]), d["g"]), d["filed"], d["form"], d["name"], d.get("t"), d["url"]] for d in g["d13"]])
        done += ["famous-investors.csv", "activist-13d.csv"]
    dl = _load("daily.json")
    if dl:
        rows = [[day, t, u, m] for t, days in dl.get("byTicker", {}).items() for day, u, m in days]
        rows.sort(key=lambda r: (r[0], -abs(r[2])), reverse=False)
        _write("spdr-daily.csv", ["date", "ticker", "net_bought_usd", "not_from_money_flows_usd"], rows)
        _write("spdr-funds.csv", ["fund", "name", "category", "date", "value_usd", "money_in_out_usd", "money_in_out_pct"],
               [[f["t"], f["name"], f["cat"], f.get("asOf"), f.get("value"), f.get("flowUsd"), f.get("flowPct")] for f in dl["funds"]])
        done += ["spdr-daily.csv", "spdr-funds.csv"]
    sg = _load("signals.json")
    if sg:
        _write("signals.csv", ["signal", "ticker", "name", "issued", "price_then", "price_now", "return", "sp500_return"],
               [[x["kind"], x["t"], x["n"], x["date"], x["p0"], x.get("p"), x.get("r"), x.get("rs")] for x in sg["ledger"]])
        done.append("signals.csv")
    il = _load("israel.json")
    if il:
        _write("israel.csv", ["ticker", "name", "field", "price_usd", "price_ils", "big3_value_usd", "big3_stake"],
               [[r["t"], r["n"], r["f"], r.get("price"), (r["price"] * il["usdils"]) if r.get("price") and il.get("usdils") else None,
                 (r.get("own") or {}).get("v"), (r.get("own") or {}).get("s")] for r in il["rows"]])
        done.append("israel.csv")
    log(f"CSV exports: {len(done)} files")
    return done
