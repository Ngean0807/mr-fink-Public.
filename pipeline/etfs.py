"""ETFs issued by the Big Three: iShares (BlackRock), Vanguard and SPDR (State Street).

Fund size and largest holdings come from each fund's latest Form N-PORT on SEC EDGAR (the fund
series, so all share classes together); prices and returns from Yahoo Finance. SPY, MDY and GLD
are unit or grantor trusts that do not file N-PORT, so they show market data only.
Writes web/data/etfs.json, loaded by the ETF page and the Emerging sector card.
"""
from __future__ import annotations

import io
import json
import re
import time
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone
from pathlib import Path

from . import edgar, nport, quotes

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "etfs.json"
MF_TICKERS = "https://www.sec.gov/files/company_tickers_mf.json"

# (manager, ticker, name, category)
CATALOG = [
    ("statestreet", "SPY", "SPDR S&P 500 ETF Trust", "US large cap"),
    ("statestreet", "SPYM", "SPDR Portfolio S&P 500 ETF", "US large cap"),
    ("statestreet", "MDY", "SPDR S&P MidCap 400 ETF Trust", "US mid cap"),
    ("statestreet", "SPSM", "SPDR Portfolio S&P 600 Small Cap ETF", "US small cap"),
    ("statestreet", "SPTM", "SPDR Portfolio S&P 1500 Composite Stock Market ETF", "US total market"),
    ("statestreet", "SPYG", "SPDR Portfolio S&P 500 Growth ETF", "US growth"),
    ("statestreet", "SPYV", "SPDR Portfolio S&P 500 Value ETF", "US value"),
    ("statestreet", "SPDW", "SPDR Portfolio Developed World ex-US ETF", "International developed"),
    ("statestreet", "SPEM", "SPDR Portfolio Emerging Markets ETF", "Emerging markets"),
    ("statestreet", "SPAB", "SPDR Portfolio Aggregate Bond ETF", "US bonds"),
    ("statestreet", "GLD", "SPDR Gold Shares", "Gold"),
    ("vanguard", "VOO", "Vanguard S&P 500 ETF", "US large cap"),
    ("vanguard", "VTI", "Vanguard Total Stock Market ETF", "US total market"),
    ("vanguard", "VO", "Vanguard Mid-Cap ETF", "US mid cap"),
    ("vanguard", "VB", "Vanguard Small-Cap ETF", "US small cap"),
    ("vanguard", "VUG", "Vanguard Growth ETF", "US growth"),
    ("vanguard", "VTV", "Vanguard Value ETF", "US value"),
    ("vanguard", "VIG", "Vanguard Dividend Appreciation ETF", "US dividend"),
    ("vanguard", "VYM", "Vanguard High Dividend Yield ETF", "US dividend"),
    ("vanguard", "VEA", "Vanguard FTSE Developed Markets ETF", "International developed"),
    ("vanguard", "VWO", "Vanguard FTSE Emerging Markets ETF", "Emerging markets"),
    ("vanguard", "VXUS", "Vanguard Total International Stock ETF", "International total"),
    ("vanguard", "BND", "Vanguard Total Bond Market ETF", "US bonds"),
    ("vanguard", "BNDX", "Vanguard Total International Bond ETF", "International bonds"),
    ("blackrock", "IVV", "iShares Core S&P 500 ETF", "US large cap"),
    ("blackrock", "IJH", "iShares Core S&P Mid-Cap ETF", "US mid cap"),
    ("blackrock", "IJR", "iShares Core S&P Small-Cap ETF", "US small cap"),
    ("blackrock", "IWM", "iShares Russell 2000 ETF", "US small cap"),
    ("blackrock", "IWF", "iShares Russell 1000 Growth ETF", "US growth"),
    ("blackrock", "IWD", "iShares Russell 1000 Value ETF", "US value"),
    ("blackrock", "USMV", "iShares MSCI USA Min Vol Factor ETF", "US low volatility"),
    ("blackrock", "IEFA", "iShares Core MSCI EAFE ETF", "International developed"),
    ("blackrock", "EFA", "iShares MSCI EAFE ETF", "International developed"),
    ("blackrock", "IEMG", "iShares Core MSCI Emerging Markets ETF", "Emerging markets"),
    ("blackrock", "EEM", "iShares MSCI Emerging Markets ETF", "Emerging markets"),
    ("blackrock", "AGG", "iShares Core U.S. Aggregate Bond ETF", "US bonds"),
    ("blackrock", "TLT", "iShares 20+ Year Treasury Bond ETF", "US Treasuries"),
]

# The same sector from each issuer: SPDR Select Sector, Vanguard sector, iShares U.S. sector.
SECTORS = {
    "Communication Services": ("XLC", "VOX", "IYZ"),
    "Consumer Discretionary": ("XLY", "VCR", "IYC"),
    "Consumer Staples": ("XLP", "VDC", "IYK"),
    "Energy": ("XLE", "VDE", "IYE"),
    "Financials": ("XLF", "VFH", "IYF"),
    "Health Care": ("XLV", "VHT", "IYH"),
    "Industrials": ("XLI", "VIS", "IYJ"),
    "Information Technology": ("XLK", "VGT", "IYW"),
    "Materials": ("XLB", "VAW", "IYM"),
    "Real Estate": ("XLRE", "VNQ", "IYR"),
    "Utilities": ("XLU", "VPU", "IDU"),
}
SECTOR_NAMES = {"statestreet": "Select Sector SPDR", "vanguard": "Vanguard sector ETF", "blackrock": "iShares U.S. sector ETF"}


# SPY and MDY are unit investment trusts and do not file N-PORT; State Street publishes their
# full holdings every business day. GLD holds gold bullion, not securities.
SSGA_DAILY = {"SPY", "MDY"}
SSGA_URL = "https://www.ssga.com/us/en/intermediary/library-content/products/fund-data/etfs/us/holdings-daily-us-en-{}.xlsx"
NO_SECURITIES = {"GLD": ("Holds physical gold bullion (allocated bars in vaults in London), not securities.", "https://www.spdrgoldshares.com/usa/gld/")}


def _xlsx_rows(data: bytes) -> list[list[str]]:
    """Rows of the first worksheet of an .xlsx file, as text (standard library only)."""
    import zipfile
    ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    z = zipfile.ZipFile(io.BytesIO(data))
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(ns + "si"):
            shared.append("".join(t.text or "" for t in si.iter(ns + "t")))
    sheet = sorted(n for n in z.namelist() if n.startswith("xl/worksheets/sheet"))[0]
    rows = []
    for r in ET.fromstring(z.read(sheet)).iter(ns + "row"):
        cells = {}
        for c in r.iter(ns + "c"):
            col = re.match(r"[A-Z]+", c.get("r", "A")).group(0)
            idx = sum((ord(ch) - 64) * 26 ** k for k, ch in enumerate(reversed(col))) - 1
            v = c.find(ns + "v")
            text = "".join(t.text or "" for t in c.iter(ns + "t")) if c.get("t") == "inlineStr" else (v.text if v is not None else "")
            cells[idx] = shared[int(text)] if c.get("t") == "s" and text else text
        rows.append([cells.get(i, "") for i in range(max(cells) + 1)] if cells else [])
    return rows


def ssga_daily(ticker: str) -> dict:
    """Ten largest holdings from State Street's daily holdings file (cached for 12 hours)."""
    url = SSGA_URL.format(ticker.lower())
    path = edgar.CACHE_DIR / "ssga" / f"{ticker}.xlsx"
    if path.exists() and time.time() - path.stat().st_mtime < 12 * 3600:
        data = path.read_bytes()
    else:
        import urllib.request
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Mr. Fink dashboard)"})
        data = urllib.request.urlopen(req, timeout=60).read()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    rows = _xlsx_rows(data)
    as_of = next((r[1] for r in rows if r and r[0].startswith("Holdings")), "")
    head = next(i for i, r in enumerate(rows) if r and r[0] == "Name")
    cols = {name: i for i, name in enumerate(rows[head])}
    hold = []
    for r in rows[head + 1:]:
        if not r or not r[0] or len(r) <= cols["Weight"]:
            break
        if (r[cols["Ticker"]] or "").startswith("CASH") or not r[cols["Weight"]]:
            continue
        hold.append({"name": r[0], "cusip": r[cols["Identifier"]], "pct": float(r[cols["Weight"]]) / 100, "lines": 1})
    m = re.search(r"(\d{1,2})-(\w{3})-(\d{4})", as_of)
    period = datetime.strptime(m.group(0), "%d-%b-%Y").date().isoformat() if m else None
    return {"top": sorted(hold, key=lambda h: -h["pct"])[:10], "holdings": len(hold), "period": period, "filing": url, "source": "State Street daily holdings"}


def etf_name(fund: str, manager: str) -> str:
    """The ETF's market name from its N-PORT series name: "State Street(R) Technology Select Sector
    SPDR(R) ETF" -> "State Street Technology Select Sector SPDR ETF", "VANGUARD HEALTH CARE INDEX
    FUND" -> "Vanguard Health Care ETF" (the ETF share class of that fund)."""
    n = re.sub(r"\s*\((?:R|TM)\)", "", fund).strip()
    if n.isupper():
        n = " ".join(w if w in ("ETF", "REIT", "US", "U.S.") else w.capitalize() for w in n.split())
    if manager == "vanguard":
        n = re.sub(r"\s+Index Fund$", " ETF", n)
    return n


def summary(f: dict) -> dict:
    """Fund size and the 10 largest positions from one N-PORT filing (parsed once, kept).

    Positions of one issuer are added together, which is right for a stock fund (both Alphabet
    classes) and a broad bond fund (Treasuries as one line). When that leaves fewer than 5 issuers
    (TLT holds nothing but Treasuries), the 10 largest individual bonds are listed instead."""
    key = f"nport_summary4_{f['accession']}.json.gz"
    cached = edgar.load_artifact(key)
    if cached is not None:
        return cached
    xml = edgar.fetch(f["xml"])
    header, by_name, lines, n = {}, {}, [], 0
    for _, el in ET.iterparse(io.BytesIO(xml), events=("end",)):
        tag = el.tag.rsplit("}", 1)[-1]
        if tag in ("netAssets", "seriesName", "repPdDate") and el.text:
            header[tag] = el.text.strip()
        if tag != "invstOrSec":
            continue
        rec = {}
        for ch in el.iter():
            t = ch.tag.rsplit("}", 1)[-1]
            if ch.text and ch.text.strip():
                rec[t] = ch.text.strip()
        el.clear()
        n += 1
        try:
            pct = float(rec.get("pctVal", 0))
        except ValueError:
            continue
        if rec.get("assetCat") == "STIV":  # cash sweep and money-market vehicles are not holdings
            continue
        # Bond funds hold many lines of one issuer (the US Treasury): add them up by issuer.
        nm = rec.get("name") or rec.get("title") or ""
        slot = by_name.setdefault(nm, {"name": nm, "cusip": (rec.get("cusip") or "").upper(), "pct": 0.0, "lines": 0})
        slot["pct"] += pct / 100
        slot["lines"] += 1
        title = rec.get("title") or nm
        if rec.get("maturityDt"):  # a bond: "United States Treasury Bond 4.625% due 2054-05-15"
            try:
                title += f" {float(rec['annualizedRt']):g}%" if rec.get("annualizedRt") else ""
            except ValueError:
                pass
            title += f" due {rec['maturityDt']}"
        lines.append({"name": title, "cusip": (rec.get("cusip") or "").upper(), "pct": pct / 100, "lines": 1})
    top = sorted(by_name.values(), key=lambda r: -r["pct"])[:10]
    individual = len(top) < 5 and len(lines) > len(top)
    if individual:
        top = sorted(lines, key=lambda r: -r["pct"])[:10]
    out = {"netAssets": float(header["netAssets"]) if header.get("netAssets") else None, "name": header.get("seriesName"),
           "period": header.get("repPdDate") or f["period"], "holdings": n, "top": top,
           "individual": individual, "issuers": [{"name": r["name"], "pct": r["pct"], "lines": r["lines"]} for r in sorted(by_name.values(), key=lambda r: -r["pct"])[:3]] if individual else None}
    edgar.save_artifact(key, out)
    return out


def _returns(hist: dict) -> tuple[float | None, float | None, list[float]]:
    """(1-year return, year-to-date return, weekly closes over the last year) from daily closes."""
    if not hist or not hist.get("c"):
        return None, None, []
    day, days = hist["d0"], []
    for gap in [0] + hist["dd"]:
        day += gap
        days.append(day)
    closes = [c / 100 for c in hist["c"]]
    today = days[-1]
    def at(d):
        i = max((k for k, x in enumerate(days) if x <= d), default=None)
        return closes[i] if i is not None else None
    y1 = at(today - 365)
    jan1 = date(datetime.fromtimestamp(today * 86400, timezone.utc).year, 1, 1).toordinal() - date(1970, 1, 1).toordinal()
    ytd0 = at(jan1 - 1)
    spark = [closes[k] for k, x in enumerate(days) if x >= today - 365][::5]
    return (closes[-1] / y1 - 1 if y1 else None), (closes[-1] / ytd0 - 1 if ytd0 else None), spark


def build(log=print) -> dict:
    mf = edgar.cached_json(MF_TICKERS, ttl_hours=24)
    series = {r[3]: r[1] for r in mf["data"]}
    funds = [(m, t, n, c) for m, t, n, c in CATALOG]
    for sector, tickers in SECTORS.items():
        for m, t in zip(("statestreet", "vanguard", "blackrock"), tickers):
            funds.append((m, t, f"{SECTOR_NAMES[m]}: {sector}", f"Sector: {sector}"))
    tickers = [t for _, t, _, _ in funds]
    live = quotes.batch_quotes(tickers, log=log)
    out = []
    for m, t, name, cat in funds:
        row = {"ticker": t, "manager": m, "name": name, "category": cat, "series": series.get(t)}
        if row["series"]:
            try:
                fs = nport.filings(row["series"], ttl_hours=24)
                if fs:
                    s = summary(fs[0])
                    row.update(netAssets=s["netAssets"], period=s["period"], holdings=s["holdings"], top=s["top"], filing=fs[0]["url"], source="N-PORT", individual=s.get("individual") or None, issuers=s.get("issuers"))
                    if s.get("name"):
                        row["fundName"] = s["name"]
                        if cat.startswith("Sector:"):  # the fund's own name, as a broker lists it
                            row["name"] = etf_name(s["name"], m)
            except Exception as e:
                log(f"  N-PORT unavailable for {t}: {e}")
        elif t in SSGA_DAILY:
            try:
                row.update(ssga_daily(t))
            except Exception as e:
                log(f"  State Street daily holdings unavailable for {t}: {e}")
        elif t in NO_SECURITIES:
            row["note"], row["noteUrl"] = NO_SECURITIES[t]
        try:
            row["ret1y"], row["ytd"], row["spark"] = _returns(quotes.history(t))
        except Exception as e:
            log(f"  price history unavailable for {t}: {e}")
        q = live.get(t) or {}
        row.update(price=q.get("price"), prevClose=q.get("prevClose"), time=q.get("time"))
        out.append(row)
        time.sleep(0.1)
    data = {"asOf": datetime.now(timezone.utc).isoformat(timespec="seconds"), "funds": out,
            "sectors": {s: dict(zip(("statestreet", "vanguard", "blackrock"), ts)) for s, ts in SECTORS.items()}}
    log(f"ETFs: {len(out)} funds, {sum(1 for r in out if r.get('netAssets'))} with N-PORT data")
    return data


def write(log=print) -> None:
    OUT.write_text(json.dumps(build(log), separators=(",", ":")))


if __name__ == "__main__":
    write()
