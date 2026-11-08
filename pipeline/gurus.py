"""Famous investors and activists: their 13F books, last quarter's moves, and recent 13D stakes.

Unlike the Big Three, almost everything these managers do is a decision: a new position or a
large add is a real signal. Each manager's two latest 13F-HR quarters are compared (split
adjusted, as for the Big Three). Activists' Schedule 13D filings (a 5%+ stake taken with intent
to influence the company) come from their own SEC filing history, with the subject company read
from each filing's index page (cached per filing).

The work is memoized per set of latest filings, so a run with nothing new costs only the
submissions lookups. Writes web/data/gurus.json.
"""
from __future__ import annotations

import hashlib
import json
import re
from datetime import date, timedelta
from pathlib import Path

from . import edgar, securities, thirteenf
from .movers import split_ratio

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "gurus.json"
TOP = 25
MOVES = 12
NEW_PER_RUN = 150
STOCK_TYPES = {"Common Stock", "ADR", "REIT", "MLP", "NY Reg Shrs", "Tracking Stk", "GDR", "Ltd Part", "Royalty Trst"}  # CUSIPs mapped to tickers per run (OpenFIGI, cached)
D13_DAYS = 365

# (id, display name, person, style, CIK)
GURUS = [
    ("berkshire", "Berkshire Hathaway", "Warren Buffett, Greg Abel", "Value", "0001067983"),
    ("pershing", "Pershing Square", "Bill Ackman", "Activist", "0001336528"),
    ("icahn", "Icahn Enterprises", "Carl Icahn", "Activist", "0000921669"),
    ("elliott", "Elliott Management", "Paul Singer", "Activist", "0001791786"),
    ("starboard", "Starboard Value", "Jeff Smith", "Activist", "0001517137"),
    ("trian", "Trian Partners", "Nelson Peltz", "Activist", "0001345471"),
    ("thirdpoint", "Third Point", "Dan Loeb", "Activist", "0001040273"),
    ("valueact", "ValueAct", "Mason Morfit", "Activist", "0001418814"),
    ("bridgewater", "Bridgewater Associates", "Ray Dalio (founder)", "Macro", "0001350694"),
    ("duquesne", "Duquesne Family Office", "Stanley Druckenmiller", "Macro", "0001536411"),
    ("soros", "Soros Fund Management", "George Soros (founder)", "Macro", "0001029160"),
    ("appaloosa", "Appaloosa", "David Tepper", "Value", "0001656456"),
    ("baupost", "Baupost Group", "Seth Klarman", "Value", "0001061768"),
    ("akre", "Akre Capital", "Chuck Akre (founder)", "Quality growth", "0001112520"),
    ("gates", "Gates Foundation Trust", "Bill & Melinda Gates Foundation", "Long term", "0001166559"),
    ("ark", "ARK Invest", "Cathie Wood", "Innovation growth", "0001697748"),
    ("tiger", "Tiger Global", "Chase Coleman", "Tech growth", "0001167483"),
    ("coatue", "Coatue", "Philippe Laffont", "Tech growth", "0001135730"),
    ("lonepine", "Lone Pine Capital", "Stephen Mandel (founder)", "Long/short", "0001061165"),
    ("viking", "Viking Global", "Andreas Halvorsen", "Long/short", "0001103804"),
    ("citadel", "Citadel Advisors", "Ken Griffin", "Multi-strategy", "0001423053"),
    ("millennium", "Millennium Management", "Israel Englander", "Multi-strategy", "0001273087"),
    ("point72", "Point72", "Steve Cohen", "Multi-strategy", "0001603466"),
    ("renaissance", "Renaissance Technologies", "Jim Simons (founder)", "Quant", "0001037389"),
    ("deshaw", "D. E. Shaw", "David Shaw (founder)", "Quant", "0001009207"),
    ("twosigma", "Two Sigma", "John Overdeck, David Siegel", "Quant", "0001179392"),
]


def _latest_two(cik: str) -> list[str]:
    periods = sorted({f.period for f in thirteenf.list_filings(cik) if f.form.startswith("13F-HR")}, reverse=True)
    return periods[:2]


def _tickers(cusips: list[str]) -> dict:
    cache = edgar.load_artifact("openfigi.json.gz") or {}
    todo = [c for c in dict.fromkeys(cusips) if c not in cache][:NEW_PER_RUN]
    if todo:
        securities.map_cusips(todo)
        cache = edgar.load_artifact("openfigi.json.gz") or {}
    return cache


def _subject(cik: str, acc: str) -> dict | None:
    """The company a Schedule 13D is about, from the filing's index page (cached per filing)."""
    key = f"d13_{acc}.json.gz"
    hit = edgar.load_artifact(key)
    if hit is not None:
        return hit or None
    folder = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace('-', '')}"
    try:
        page = edgar.fetch(f"{folder}/{acc}-index.htm").decode("utf-8", "ignore")
    except Exception:
        return None
    m = re.search(r'<span class="companyName">\s*([^<]+?)\s*\(Subject\)', page)
    c = re.search(r"\(Subject\).*?CIK=(\d+)", page, re.S)
    out = {"name": m.group(1).strip() if m else None, "cik": c.group(1).zfill(10) if c else None, "url": f"{folder}/{acc}-index.htm"}
    edgar.save_artifact(key, out)
    return out


def activist_13d(cik: str, gid: str) -> list[dict]:
    root = edgar.cached_json(f"https://data.sec.gov/submissions/CIK{cik}.json", ttl_hours=1)
    r = root["filings"]["recent"]
    since = (date.today() - timedelta(days=D13_DAYS)).isoformat()
    out = []
    for i, form in enumerate(r["form"]):
        if "13D" not in form or r["filingDate"][i] < since:
            continue
        s = _subject(cik, r["accessionNumber"][i])
        if not s or not s.get("name") or s.get("cik") == cik or re.search(r"\b(FUND|PARTNERS|CAPITAL PARTNERS)\b", s["name"].upper()):
            continue  # the manager's own vehicles (Third Point's funds, for example), not a company
        sec = None
        if s.get("cik"):
            sec = next(({"ticker": t, **v} for t, v in (securities._TICKERS or {}).items() if v["cik"] == s["cik"]), None)
        out.append({"g": gid, "form": form.replace("SCHEDULE ", "SC "), "filed": r["filingDate"][i], "name": s["name"],
                    "t": securities.display_ticker(sec["ticker"]) if sec else None, "url": s["url"], "amend": form.endswith("/A")})
    return out


def build(log=print) -> dict:
    latest = {g[0]: _latest_two(g[4]) for g in GURUS}
    key = hashlib.sha1(json.dumps([latest, date.today().isoformat()], sort_keys=True).encode()).hexdigest()[:16]
    memo = edgar.load_artifact(f"gurus_{key}.json.gz")
    if memo:
        OUT.write_text(json.dumps(memo, separators=(",", ":")))
        return memo
    securities.sec_company("AAPL")  # loads the SEC ticker list used for 13D subjects
    managers, all_cusips = [], []
    for gid, name, person, style_, cik in GURUS:
        ps = latest[gid]
        if not ps:
            continue
        cx = thirteenf.build_complex({"id": gid, "ciks": [cik]}, ps, log=lambda *a: None)
        now = cx.get(ps[0], {}).get("book", {})
        prev = cx.get(ps[1], {}).get("book", {}) if len(ps) > 1 else {}
        total = sum(r[1] for r in now.values())
        rows = []
        for c in set(now) | set(prev):
            a, b = now.get(c), prev.get(c)
            ratio = split_ratio(b, a) if a and b else 1.0
            if a and a[0]:
                flow = (a[0] - (b[0] * ratio if b else 0)) * a[1] / a[0]
            else:
                flow = -(b[1] if b else 0)
            rows.append({"c": c, "n": (a or b)[2], "v": a[1] if a else 0, "w": (a[1] / total) if a and total else 0,
                         "st": "new" if a and not b else "exited" if b and not a else None,
                         "d": (a[0] / (b[0] * ratio) - 1) if a and b and b[0] else None, "f": flow})
        top = sorted((r for r in rows if r["v"]), key=lambda r: -r["v"])[:TOP]
        buys = sorted((r for r in rows if r["f"] > 0), key=lambda r: -r["f"])[:MOVES]
        sells = sorted((r for r in rows if r["f"] < 0), key=lambda r: r["f"])[:MOVES]
        all_cusips += [r["c"] for r in top + buys + sells]
        managers.append({"id": gid, "name": name, "person": person, "style": style_, "cik": cik, "period": ps[0], "prevPeriod": ps[1] if len(ps) > 1 else None,
                         "total": total, "positions": len(now), "top": top, "buys": buys, "sells": sells,
                         "filed": max((s["filed"] for s in cx.get(ps[0], {}).get("sources", [])), default=None)})
    figi = _tickers(all_cusips)
    for m in managers:
        for side in ("top", "buys", "sells"):
            for r in m[side]:
                f = figi.get(r["c"])
                r["t"] = securities.display_ticker(f["ticker"]) if f else None
                sc = securities.sec_company(f["ticker"]) if f else None
                if sc:  # the company's SEC name rather than the 13F's abbreviation ("BANK OF AMER CORP")
                    r["n"] = re.sub(r"\s*/[A-Z]{2,3}/?\s*$", "", sc["title"])
    # Consensus: companies several of these managers bought last quarter (new or added)
    votes: dict[str, dict] = {}
    for m in managers:
        for r in m["buys"]:
            if r.get("t") and (figi.get(r["c"]) or {}).get("type") in STOCK_TYPES:
                v = votes.setdefault(r["t"], {"t": r["t"], "n": r["n"], "by": [], "f": 0.0})
                v["by"].append(m["id"])
                v["f"] += r["f"]
    consensus = sorted((v for v in votes.values() if len(v["by"]) >= 2), key=lambda v: (-len(v["by"]), -v["f"]))[:20]
    d13 = []
    for gid, _, _, style_, cik in GURUS:
        if style_ in ("Activist", "Value", "Macro") or gid == "viking":
            try:
                d13 += activist_13d(cik, gid)
            except Exception as e:
                log(f"  13D {gid}: {e}")
    d13.sort(key=lambda x: x["filed"], reverse=True)
    out = {"managers": managers, "consensus": consensus, "d13": d13[:60]}
    for old in (edgar.CACHE_DIR / "derived").glob("gurus_*.json.gz"):
        old.unlink(missing_ok=True)
    edgar.save_artifact(f"gurus_{key}.json.gz", out)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    log(f"gurus: {len(managers)} managers, {len(consensus)} consensus buys, {len(d13)} 13D filings")
    return out


if __name__ == "__main__":
    build()
