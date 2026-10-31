"""Fund-level holdings from Form N-PORT for the Big Three's flagship index funds.

13F shows each manager's whole book; N-PORT shows what each individual fund holds, as of a
month end, so a buying wave can be traced to the fund doing it (for small caps, usually the
Russell 2000 or S&P SmallCap 600 trackers). Only the third month of each fiscal quarter is made
public, about 60 days later, so each fund appears four times a year.
"""
from __future__ import annotations

import io
import re
import xml.etree.ElementTree as ET

from . import edgar

SEARCH = "https://efts.sec.gov/LATEST/search-index?q=%22{series}%22&forms=NPORT-P"

# (manager, ETF ticker, SEC series id, fund name)
FUNDS = [
    ("blackrock", "IVV", "S000004310", "iShares Core S&P 500 ETF"),
    ("blackrock", "IJR", "S000004313", "iShares Core S&P Small-Cap ETF"),
    ("blackrock", "IWM", "S000004344", "iShares Russell 2000 ETF"),
    ("blackrock", "IWO", "S000004343", "iShares Russell 2000 Growth ETF"),
    ("blackrock", "IWN", "S000004342", "iShares Russell 2000 Value ETF"),
    ("vanguard", "VTI", "S000002848", "Vanguard Total Stock Market Index Fund"),
    ("vanguard", "VOO", "S000002839", "Vanguard 500 Index Fund"),
    ("vanguard", "VXF", "S000002841", "Vanguard Extended Market Index Fund"),
    ("vanguard", "VB", "S000002845", "Vanguard Small-Cap Index Fund"),
    ("vanguard", "VBK", "S000002846", "Vanguard Small-Cap Growth Index Fund"),
    ("statestreet", "SPTM", "S000006973", "SPDR Portfolio S&P 1500 Composite Stock Market ETF"),
    ("statestreet", "SPMD", "S000006986", "SPDR Portfolio S&P 400 Mid Cap ETF"),
    ("statestreet", "SPSM", "S000041317", "SPDR Portfolio S&P 600 Small Cap ETF"),
]


def filings(series: str, ttl_hours: float) -> list[dict]:
    """The fund's N-PORT-P filings, newest reporting period first."""
    url = SEARCH.format(series=series)
    data = edgar.cached_json(url, ttl_hours=ttl_hours)
    if "hits" not in data:  # EDGAR full-text search answers some outages with an error body and status 200
        edgar.forget(url)
        raise RuntimeError(f"EDGAR search error: {str(data.get('errorMessage') or data)[:120]}")
    out = {}
    for h in data.get("hits", {}).get("hits", []):
        acc, _, doc = h["_id"].partition(":")
        src = h["_source"]
        if doc != "primary_doc.xml" or not src.get("period_ending") or not src.get("ciks"):
            continue
        cik = int(src["ciks"][0])
        # An amendment (NPORT-P/A) restates the whole report: for each period keep the latest filed.
        prior = out.get(src["period_ending"])
        if prior and (prior["filed"] or "") >= (src.get("file_date") or ""):
            continue
        out[src["period_ending"]] = {
            "period": src["period_ending"], "filed": src.get("file_date"), "accession": acc,
            "xml": f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace('-', '')}/primary_doc.xml",
            "url": f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace('-', '')}/{acc}-index.htm",
        }
    return sorted(out.values(), key=lambda f: f["period"], reverse=True)


def _cusip_from_isin(isin: str) -> str | None:
    return isin[2:11] if isin and len(isin) == 12 and isin[:2] in ("US", "CA") else None


def holdings(f: dict, wanted: set[str]) -> tuple[dict, dict]:
    """({cusip: (shares, value, pct)} for wanted CUSIPs, fund header) from one N-PORT XML."""
    key = f"nport_{f['accession']}.json.gz"
    cached = edgar.load_artifact(key)
    if cached is None:
        xml = edgar.fetch(f["xml"])  # parsed result is cached below; the raw XML is not kept
        rows, header = {}, {}
        for _, el in ET.iterparse(io.BytesIO(xml), events=("end",)):
            tag = el.tag.rsplit("}", 1)[-1]
            if tag in ("repPdDate", "netAssets", "seriesName") and el.text:
                header[tag] = el.text.strip()
            if tag != "invstOrSec":
                continue
            rec = {}
            for ch in el.iter():
                t = ch.tag.rsplit("}", 1)[-1]
                if t == "isin":
                    rec["isin"] = ch.get("value")
                elif ch.text and ch.text.strip():
                    rec[t] = ch.text.strip()
            el.clear()
            if rec.get("units") != "NS" or rec.get("payoffProfile", "Long") != "Long":
                continue
            cusip = (rec.get("cusip") or "").upper()
            if not re.fullmatch(r"[0-9A-Z]{9}", cusip) or cusip == "000000000":
                cusip = _cusip_from_isin(rec.get("isin") or "") or ""
            if not cusip:
                continue
            prev = rows.get(cusip, [0, 0, 0])
            rows[cusip] = [prev[0] + float(rec.get("balance", 0)), prev[1] + float(rec.get("valUSD", 0)), prev[2] + float(rec.get("pctVal", 0))]
        cached = {"rows": rows, "header": header}
        edgar.save_artifact(key, cached)  # filings never change, so every holding is kept
    return {c: v for c, v in cached["rows"].items() if c in wanted}, cached["header"]


def build(cusip_chains: dict[str, list[str]], ttl_hours: float, log=print) -> tuple[dict[str, list], list[dict]]:
    """Fund positions for every tracked security (with predecessor CUSIPs) and feed events."""
    wanted = {c for chain in cusip_chains.values() for c in chain}
    by_cusip: dict[str, list] = {}
    events = []
    for manager, ticker, series, name in FUNDS:
        try:
            fs = filings(series, ttl_hours)
        except Exception as e:
            log(f"  N-PORT search failed for {ticker}: {e}")
            continue
        if not fs:
            continue
        latest = fs[0]
        prev = fs[1] if len(fs) > 1 else None
        cur_rows, header = holdings(latest, wanted)
        prev_rows = holdings(prev, wanted)[0] if prev else {}
        events.append({
            "kind": "nport", "manager": manager, "fund": ticker, "entity": header.get("seriesName", name),
            "form": "NPORT-P", "filed": latest["filed"], "accepted": f"{latest['filed']}T12:00:00.000Z",
            "period": latest["period"], "accession": latest["accession"], "url": latest["url"],
            "netAssets": float(header["netAssets"]) if header.get("netAssets") else None,
        })
        for main, chain in cusip_chains.items():
            cur = next((cur_rows[c] for c in chain if c in cur_rows), None)
            if not cur:
                continue
            before = next((prev_rows[c] for c in chain if c in prev_rows), None)
            by_cusip.setdefault(main, []).append({
                "manager": manager, "fund": ticker, "name": name, "period": latest["period"],
                "shares": cur[0], "value": cur[1], "weight": cur[2] / 100,
                "prevPeriod": prev["period"] if prev else None, "prevShares": before[0] if before else 0,
                "url": latest["url"],
            })
    log(f"N-PORT: {len(events)} funds, positions for {len(by_cusip)} tracked securities")
    return by_cusip, events
