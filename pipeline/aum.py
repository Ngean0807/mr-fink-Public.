"""Each manager's total assets under management, as it reports it.

A 13F covers only US-listed equities (and a few other "13(f) securities"), so it is well under half of
what these firms manage: bonds, non-US stocks, cash and private funds are not in it. The site shows both.

BlackRock and State Street report AUM each quarter in their earnings release (8-K, item 2.02, Exhibit
99): read from the latest one and kept per filing. Vanguard is private and files no earnings releases;
its figure is the one it publishes itself (VANGUARD below), updated by hand when it publishes a new one.
"""
from __future__ import annotations

import html
import re

from . import edgar

NAMES = {"blackrock": "BlackRock", "statestreet": "State Street"}
FILERS = {
    "blackrock": 2012383,    # BlackRock, Inc. (the holding company since the 2024 reorganization)
    "statestreet": 93751,    # State Street Corp (State Street Global Advisors)
}
VANGUARD = {  # "Vanguard manages USD $13.3 trillion ... in global assets ... (as of July 30, 2026)"
    "value": 13.3e12, "asOf": "2026-07-30",
    "source": "Vanguard (company announcement)",
    "url": "https://finance.yahoo.com/news/vanguard-announces-cash-distributions-vanguard-164400615.html",
}


def _quarter_end_before(day: str) -> str:
    """The calendar quarter an earnings release filed on `day` reports on."""
    y, m = int(day[:4]), int(day[5:7])
    q = (m - 1) // 3  # quarters completed before this month's quarter
    if q == 0:
        return f"{y - 1}-12-31"
    return {1: f"{y}-03-31", 2: f"{y}-06-30", 3: f"{y}-09-30"}[q]


def parse(manager: str, text: str) -> float | None:
    """AUM in dollars from an earnings release's text."""
    if manager == "blackrock":
        m = re.search(r"AUM \(end of period\)\s*\$\s*([\d,]+)", text)  # table in $ millions
        if m:
            return float(m.group(1).replace(",", "")) * 1e6
        m = re.search(r"\$\s?([\d.]+)\s*trillion in AUM", text)
        return float(m.group(1)) * 1e12 if m else None
    if manager == "statestreet":
        m = re.search(r"(?i)AUM as of quarter-end[^$]{0,80}\$\s?([\d.]+)\s*(trillion|billion)", text)
        if m:
            return float(m.group(1)) * (1e12 if m.group(2).lower() == "trillion" else 1e9)
        m = re.search(r"Assets Under Management(?:\s*\$?\s*\(?[\d,]+\)?){5}\s*\$?\s*([\d,]+)", text)  # table in $ billions, last column = quarter end
        return float(m.group(1).replace(",", "")) * 1e9 if m else None
    return None


def latest(manager: str, cik: int) -> dict | None:
    sub = edgar.cached_json(f"https://data.sec.gov/submissions/CIK{cik:010d}.json", ttl_hours=12)
    r = sub["filings"]["recent"]
    for i, form in enumerate(r["form"]):
        if form != "8-K" or "2.02" not in (r["items"][i] or ""):
            continue
        acc, filed = r["accessionNumber"][i], r["filingDate"][i]
        key = f"aum_{acc}.json.gz"
        hit = edgar.load_artifact(key)
        if hit is None:
            folder = f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace('-', '')}"
            idx = edgar.fetch(f"{folder}/{acc}-index.htm").decode("utf-8", "ignore")
            docs = re.findall(r'href="(/Archives/[^"]+?\.htm)"[^<]*</a></td>\s*<td[^>]*>([^<]*)</td>', idx)
            hit = {}
            for doc, kind in docs:
                if not kind.strip().startswith("EX-99"):
                    continue
                raw = edgar.fetch("https://www.sec.gov" + doc).decode("utf-8", "ignore")
                text = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", raw)).split())
                value = parse(manager, text)
                if value:
                    hit = {"value": value, "asOf": _quarter_end_before(filed), "filed": filed,
                           "source": f"{NAMES[manager]} earnings release (8-K)", "url": "https://www.sec.gov" + doc}
                    break
            edgar.save_artifact(key, hit)
        return hit or None  # the latest earnings release only: an older figure would mislead
    return None


def build(log=print) -> dict:
    """{manager: {value, asOf, source, url}} plus "big3", the sum (dates can differ by a quarter)."""
    out = {}
    for m, cik in FILERS.items():
        try:
            hit = latest(m, cik)
            if hit:  # the name is set here so a cached figure picks up any change to it
                out[m] = {**hit, "source": f"{NAMES[m]} earnings release (8-K)"}
        except Exception as e:
            log(f"  AUM unavailable for {m}: {e}")
    out["vanguard"] = dict(VANGUARD)
    if len(out) == 3:
        out["big3"] = {"value": sum(out[m]["value"] for m in ("blackrock", "vanguard", "statestreet")),
                       "asOf": min(out[m]["asOf"] for m in ("blackrock", "vanguard", "statestreet")), "source": "sum of the three"}
    log("AUM: " + ", ".join(f"{m} ${v['value'] / 1e12:.2f}T ({v['asOf']})" for m, v in out.items()))
    return out


if __name__ == "__main__":
    build()
