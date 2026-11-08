"""Day-by-day trades of State Street's SPDR ETFs, from the holdings file each fund publishes daily.

State Street posts every SPDR fund's full holdings each business day (shares held per security).
Comparing one day's file with the previous one shows what the fund bought and sold. Most of that is
money coming in or going out of the fund (creations and redemptions scale every holding by the same
ratio); what is left after taking that ratio out is the fund changing its mix: index additions and
deletions, rebalances, corporate actions. Both are shown, with the second labelled as such.

iShares and Vanguard do not publish a downloadable daily file, so BlackRock and Vanguard stay on
their monthly N-PORT filings (pipeline/etfs.py).

Writes web/data/daily.json (read by the Daily page and the company pages) and daily-snap.json (the
last holdings of each fund, only for the next run to compare against; carried through the live site).
"""
from __future__ import annotations

import io
import json
import os
import re
import statistics
import time
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "daily.json"
SNAP = OUT.with_name("daily-snap.json")
URL = "https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-{t}.xlsx"
UA = {"User-Agent": "Mozilla/5.0 (Trintel dashboard)"}
CHECK_EVERY_MIN = 60   # the files change once a day; a check an hour finds a new one soon enough
HISTORY_DAYS = 90

# (ticker, name, category)
FUNDS = [
    ("SPY", "SPDR S&P 500 ETF Trust", "US large cap"),
    ("SPYM", "SPDR Portfolio S&P 500 ETF", "US large cap"),
    ("MDY", "SPDR S&P MidCap 400 ETF Trust", "US mid cap"),
    ("SPSM", "SPDR Portfolio S&P 600 Small Cap ETF", "US small cap"),
    ("SPTM", "SPDR Portfolio S&P 1500 Composite Stock Market ETF", "US total market"),
    ("SPYG", "SPDR Portfolio S&P 500 Growth ETF", "US growth"),
    ("SPYV", "SPDR Portfolio S&P 500 Value ETF", "US value"),
    ("DIA", "SPDR Dow Jones Industrial Average ETF Trust", "US large cap"),
    ("XLK", "Technology Select Sector SPDR", "Sector: technology"),
    ("XLF", "Financial Select Sector SPDR", "Sector: financials"),
    ("XLV", "Health Care Select Sector SPDR", "Sector: health care"),
    ("XLE", "Energy Select Sector SPDR", "Sector: energy"),
    ("XLY", "Consumer Discretionary Select Sector SPDR", "Sector: consumer discretionary"),
    ("XLP", "Consumer Staples Select Sector SPDR", "Sector: consumer staples"),
    ("XLI", "Industrial Select Sector SPDR", "Sector: industrials"),
    ("XLU", "Utilities Select Sector SPDR", "Sector: utilities"),
    ("XLB", "Materials Select Sector SPDR", "Sector: materials"),
    ("XLRE", "Real Estate Select Sector SPDR", "Sector: real estate"),
    ("XLC", "Communication Services Select Sector SPDR", "Sector: communication services"),
    ("KRE", "SPDR S&P Regional Banking ETF", "Industry: regional banks"),
    ("XBI", "SPDR S&P Biotech ETF", "Industry: biotech"),
]
MONTHS = {m: i for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def read_xlsx(raw: bytes) -> list[list]:
    """The first sheet's rows as lists of cell values (strings or floats), standard library only."""
    z = zipfile.ZipFile(io.BytesIO(raw))
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
    sheet = sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n))[0]
    rows = []
    for r in ET.fromstring(z.read(sheet)).iter(f"{{{NS['m']}}}row"):
        out = {}
        for c in r.findall("m:c", NS):
            col = re.match(r"[A-Z]+", c.get("r", "A")).group(0)
            idx = 0
            for ch in col:
                idx = idx * 26 + ord(ch) - 64
            v = c.find("m:v", NS)
            if c.get("t") == "s" and v is not None:
                val = shared[int(v.text)]
            elif c.get("t") == "inlineStr":
                val = "".join(t.text or "" for t in c.iter(f"{{{NS['m']}}}t"))
            elif v is not None:
                try:
                    val = float(v.text)
                except ValueError:
                    val = v.text
            else:
                val = None
            out[idx - 1] = val
        rows.append([out.get(i) for i in range(max(out) + 1)] if out else [])
    return rows


def parse_holdings(rows: list[list]) -> dict:
    """{asOf, holdings: {key: {t, n, w, sh}}} from a SPDR daily holdings sheet."""
    as_of, head, out = None, None, {}
    for r in rows:
        cells = [c for c in r]
        if not cells:
            continue
        if cells[0] == "Holdings:" and len(cells) > 1 and isinstance(cells[1], str):
            m = re.search(r"(\d{1,2})-([A-Za-z]{3})-(\d{4})", cells[1])
            if m:
                as_of = f"{m.group(3)}-{MONTHS[m.group(2).title()]:02d}-{int(m.group(1)):02d}"
            continue
        if head is None:
            if cells[0] == "Name" and "Shares Held" in cells:
                head = {h: i for i, h in enumerate(cells) if isinstance(h, str)}
            continue
        name = cells[0]
        if not name or not isinstance(name, str):
            if out:
                break  # the disclaimers start after a blank row
            continue
        get = lambda h: cells[head[h]] if h in head and head[h] < len(cells) else None
        sh, w = get("Shares Held"), get("Weight")
        if not isinstance(sh, float):
            continue
        t = get("Ticker") if isinstance(get("Ticker"), str) else ""
        key = get("Identifier") if isinstance(get("Identifier"), str) and get("Identifier") not in ("-", "") else t or name
        prev = out.get(key)
        out[key] = {"t": t, "n": " ".join(name.split()), "w": (w if isinstance(w, float) else 0.0) + (prev["w"] if prev else 0), "sh": sh + (prev["sh"] if prev else 0)}
    return {"asOf": as_of, "holdings": out}


def fund_value(h: dict, prices: dict) -> float | None:
    """The fund's market value: from holdings whose price is known, value = shares x price / weight."""
    est = [h_["sh"] * prices[h_["t"]] / (h_["w"] / 100) for h_ in h.values() if h_["t"] in prices and prices[h_["t"]] and h_["w"] > 0.2]
    return statistics.median(est) if est else None


def compare(prev: dict, now: dict, value: float | None) -> dict:
    """What changed between two days of one fund's holdings."""
    ph, nh = prev["holdings"], now["holdings"]
    ratios = [(nh[k]["sh"] / ph[k]["sh"], ph[k]["w"]) for k in nh if k in ph and ph[k]["sh"] > 0 and nh[k]["sh"] > 0]
    ratios.sort()
    # weighted median: the ratio that money in or out applies to every holding
    half, acc, r = sum(w for _, w in ratios) / 2, 0.0, 1.0
    for x, w in ratios:
        acc += w
        if acc >= half:
            r = x
            break
    price = lambda k, h: (h[k]["w"] / 100 * value / h[k]["sh"]) if value and h[k]["sh"] else None
    trades, adds, drops = [], [], []
    for k in set(ph) | set(nh):
        a, b = ph.get(k), nh.get(k)
        sa, sb = (a or {}).get("sh", 0.0), (b or {}).get("sh", 0.0)
        if sa == sb:
            continue
        p = price(k, nh) if b else (price(k, ph) if a else None)
        info = b or a
        row = {"k": k, "t": info["t"], "n": info["n"], "sh": sb - sa, "usd": (sb - sa) * p if p else None,
               "mix": (sb - sa * r) * p if p else None, "pct": (sb / sa - 1) if sa else None}
        trades.append(row)
        if not a:
            adds.append(row)
        elif not b or sb == 0:
            drops.append(row)
    flow_pct = r - 1
    mix = sorted([x for x in trades if x["mix"] is not None and abs(x["mix"]) >= 250_000 and x not in adds and x not in drops
                  and (x["pct"] is None or abs((1 + x["pct"]) / r - 1) > 0.01)], key=lambda x: -abs(x["mix"]))
    return {"asOf": now["asOf"], "prevAsOf": prev["asOf"], "n": len(nh), "value": value, "flowPct": flow_pct,
            "flowUsd": value * flow_pct / (1 + flow_pct) if value else None,
            "adds": sorted(adds, key=lambda x: -(x["usd"] or 0))[:15], "drops": sorted(drops, key=lambda x: (x["usd"] or 0))[:15],
            "mix": mix[:15], "trades": trades}


def previous(site: str | None, name: str) -> dict:
    if not site:
        return {}
    try:
        with urllib.request.urlopen(f"{site.rstrip('/')}/data/{name}?v={int(time.time())}", timeout=30) as r:
            return json.loads(r.read())
    except Exception:
        return {}


def fetch(t: str) -> bytes:
    req = urllib.request.Request(URL.format(t=t.lower()), headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def write(prices: dict, log=print, site: str | None = None, now: datetime | None = None) -> dict:
    """prices: {ticker: last price} for valuing the funds. Returns the daily.json content."""
    site = site if site is not None else os.environ.get("SITE_URL")
    now = now or datetime.now(timezone.utc)
    old = previous(site, "daily.json") if site else (json.loads(OUT.read_text()) if OUT.exists() else {})
    snap = previous(site, "daily-snap.json") if site else (json.loads(SNAP.read_text()) if SNAP.exists() else {})
    checked = old.get("checkedAt")
    if checked and (now - datetime.fromisoformat(checked)).total_seconds() < CHECK_EVERY_MIN * 60 and snap:
        OUT.write_text(json.dumps(old, separators=(",", ":")))
        SNAP.write_text(json.dumps(snap, separators=(",", ":")))
        return old
    funds = {f["t"]: f for f in old.get("funds", [])}
    history = old.get("history", {})
    stock_days = snap.get("_days", {})  # {asOf: {ticker: [usd, mix, name]}}: per-stock totals of the last few days
    new_snap = dict(snap)
    for t, name, cat in FUNDS:
        try:
            cur = parse_holdings(read_xlsx(fetch(t)))
        except Exception as e:
            log(f"  daily {t}: {e}")
            continue
        if not cur["asOf"] or not cur["holdings"]:
            continue
        prev = snap.get(t)
        compact = {"asOf": cur["asOf"], "holdings": cur["holdings"]}
        if prev and prev.get("asOf") and prev["asOf"] < cur["asOf"]:
            diff = compare(prev, cur, fund_value(cur["holdings"], prices))
            day = {k: v for k, v in diff.items() if k != "trades"}
            funds[t] = {"t": t, "name": name, "cat": cat, **day}
            hist = [x for x in history.get(t, []) if x[0] != cur["asOf"]] + [[cur["asOf"], diff["flowUsd"], diff["flowPct"]]]
            history[t] = hist[-HISTORY_DAYS:]
            sd = stock_days.setdefault(cur["asOf"], {})
            for x in diff["trades"]:
                if x["t"] and x["usd"] is not None:
                    a = sd.setdefault(x["t"], [0.0, 0.0, x["n"]])
                    a[0] += x["usd"]
                    a[1] += x["mix"] or 0.0
            new_snap[t] = compact
        elif not prev or prev.get("asOf", "") <= cur["asOf"]:
            new_snap[t] = compact
            funds.setdefault(t, {"t": t, "name": name, "cat": cat, "asOf": cur["asOf"], "n": len(cur["holdings"]),
                                 "value": fund_value(cur["holdings"], prices), "pending": True})
    days = sorted(stock_days)[-5:]
    stock_days = {d: stock_days[d] for d in days}
    latest = days[-1] if days else None
    stocks = []
    if latest:
        stocks = [{"t": t, "n": v[2], "usd": v[0], "mix": v[1]} for t, v in stock_days[latest].items()]
        stocks.sort(key=lambda x: -abs(x["usd"]))
    by_ticker = {}
    for d in days:
        for t, v in stock_days[d].items():
            if abs(v[0]) >= 1_000_000 or abs(v[1]) >= 250_000:
                by_ticker.setdefault(t, []).append([d, round(v[0]), round(v[1])])
    out = {"checkedAt": now.isoformat(timespec="seconds"), "asOf": latest,
           "funds": sorted(funds.values(), key=lambda f: -(f.get("value") or 0)), "history": history,
           "stocks": stocks[:60], "byTicker": by_ticker}
    new_snap["_days"] = stock_days
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    SNAP.write_text(json.dumps(new_snap, separators=(",", ":")))
    log(f"daily: {len(funds)} SPDR funds, latest day {latest}, {sum(1 for f in funds.values() if not f.get('pending'))} compared")
    return out


if __name__ == "__main__":
    write({})
