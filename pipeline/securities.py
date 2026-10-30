"""Security master: CUSIP -> ticker / security type (OpenFIGI) -> SEC CIK, SIC industry and sector."""
from __future__ import annotations

import json
import re
import time

from . import edgar

OPENFIGI_URL = "https://api.openfigi.com/v3/mapping"


def _figi_batch(cusips: list[str], us_only: bool = True) -> list[dict]:
    jobs = [{"idType": "ID_CUSIP", "idValue": c, **({"exchCode": "US"} if us_only else {})} for c in cusips]
    body = json.dumps(jobs).encode()
    for attempt in range(6):
        try:
            return json.loads(edgar.fetch(OPENFIGI_URL, data=body, headers={"Content-Type": "application/json"}))
        except Exception:
            time.sleep(7 * (attempt + 1))  # anonymous OpenFIGI: 25 requests/minute
    raise RuntimeError("OpenFIGI unavailable")


def _pick(data: list[dict]) -> dict | None:
    if not data:
        return None
    # Prefer the US composite listing, then any US venue (UN, UW, UZ...), never a foreign line.
    us = sorted((d for d in data if d.get("exchCode", "").startswith("U")), key=lambda d: d["exchCode"] != "US")
    if not us:
        return None
    d = us[0]
    return {"ticker": d["ticker"], "name": d["name"], "type": d["securityType"], "figi": d.get("compositeFIGI") or d.get("figi")}


def map_cusips(cusips: list[str]) -> dict[str, dict | None]:
    """CUSIP -> ticker and security type. Misses are retried every run (and without the US
    exchange filter, which OpenFIGI rejects for some large caps such as Exxon Mobil)."""
    cache = edgar.load_artifact("openfigi.json.gz") or {}
    todo = [c for c in dict.fromkeys(cusips) if cache.get(c) is None]
    for us_only in (True, False):
        for i in range(0, len(todo), 10):
            batch = todo[i : i + 10]
            for cusip, res in zip(batch, _figi_batch(batch, us_only)):
                cache[cusip] = _pick(res.get("data") or [])
            time.sleep(2.5)
        todo = [c for c in todo if cache.get(c) is None]
        if not todo:
            break
    edgar.save_artifact("openfigi.json.gz", cache)
    return {c: cache.get(c) for c in cusips}


FUND_WORDS = re.compile(r"\b(ETF|FUND|FD|TRUST|TR|INDEX|ISHARES|SPDR|PORTFOLIO|SELECT SECTOR)\b")
SUFFIXES = re.compile(r"\b(INC|CORP|CORPORATION|CO|COMPANY|PLC|LTD|LIMITED|NV|N V|SA|AG|HLDGS|HOLDINGS|INTL|INTERNATIONAL|IRELAND|THE|NEW|DE)\b")


def _norm(name: str) -> str:
    n = re.sub(r"[^A-Z0-9 ]", " ", name.upper())
    n = SUFFIXES.sub(" ", n)
    return " ".join(n.split())


def fallback_map(issuer: str) -> dict | None:
    """Match a 13F issuer name to an SEC registrant when OpenFIGI has no answer (common for
    Irish-domiciled CINS codes such as Linde or Eaton)."""
    if FUND_WORDS.search(issuer.upper()):
        return None
    sec_company("AAPL")  # load the ticker table
    target = _norm(issuer)
    if not target:
        return None
    for ticker, info in _TICKERS.items():
        if _norm(info["title"]) == target:
            return {"ticker": ticker.replace("-", "/"), "name": info["title"].upper(), "type": "Common Stock", "figi": None, "matchedBy": "sec-name"}
    return None


def sec_ticker(figi_ticker: str) -> str:
    """OpenFIGI writes share classes as BRK/B; SEC uses BRK-B."""
    return figi_ticker.replace("/", "-").replace(".", "-")


def display_ticker(figi_ticker: str) -> str:
    return figi_ticker.replace("/", ".")


_TICKERS: dict[str, dict] | None = None


def sec_company(ticker: str) -> dict | None:
    global _TICKERS
    if _TICKERS is None:
        raw = edgar.cached_json("https://www.sec.gov/files/company_tickers.json", ttl_hours=24)
        _TICKERS = {v["ticker"].upper(): {"cik": str(v["cik_str"]).zfill(10), "title": v["title"]} for v in raw.values()}
    return _TICKERS.get(sec_ticker(ticker).upper())


def profile(cik: str) -> dict:
    sub = edgar.cached_json(f"https://data.sec.gov/submissions/CIK{cik}.json", ttl_hours=24 * 7)
    sic = int(sub.get("sic") or 0)
    return {
        "secName": sub.get("name"),
        "sic": sic,
        "industry": (sub.get("sicDescription") or "").title(),
        "sector": sector_for(sic),
        "fiscalYearEnd": sub.get("fiscalYearEnd"),
        "exchange": (sub.get("exchanges") or [None])[0],
    }


# Coarse sector buckets from SEC Standard Industrial Classification codes. SIC predates GICS, so a
# few mega caps sit awkwardly (e.g. Alphabet and Meta are 7370 "computer services"); the overrides
# below place them where an equity analyst would expect.
SIC_SECTORS = [
    ((100, 999), "Materials"),
    ((1000, 1499), "Materials"),
    ((1300, 1399), "Energy"),
    ((1500, 1799), "Industrials"),
    ((2000, 2199), "Consumer Staples"),
    ((2200, 2399), "Consumer Discretionary"),
    ((2400, 2799), "Materials"),
    ((2800, 2829), "Materials"),
    ((2830, 2836), "Health Care"),
    ((2840, 2844), "Consumer Staples"),
    ((2900, 2999), "Energy"),
    ((3000, 3399), "Materials"),
    ((3400, 3569), "Industrials"),
    ((3570, 3579), "Information Technology"),
    ((3580, 3659), "Industrials"),
    ((3660, 3699), "Information Technology"),
    ((3700, 3719), "Consumer Discretionary"),
    ((3720, 3799), "Industrials"),
    ((3800, 3839), "Information Technology"),
    ((3840, 3851), "Health Care"),
    ((3900, 3999), "Consumer Discretionary"),
    ((4000, 4799), "Industrials"),
    ((4800, 4899), "Communication Services"),
    ((4900, 4999), "Utilities"),
    ((5000, 5199), "Industrials"),
    ((5200, 5999), "Consumer Discretionary"),
    ((6000, 6499), "Financials"),
    ((6500, 6799), "Real Estate"),
    ((7000, 7369), "Consumer Discretionary"),
    ((7370, 7379), "Information Technology"),
    ((7380, 7999), "Consumer Discretionary"),
    ((8000, 8099), "Health Care"),
    ((8100, 8999), "Industrials"),
]
SECTOR_OVERRIDES = {
    "GOOGL": "Communication Services", "GOOG": "Communication Services", "META": "Communication Services",
    "NFLX": "Communication Services", "AMZN": "Consumer Discretionary", "TSLA": "Consumer Discretionary",
    "V": "Financials", "MA": "Financials", "PYPL": "Financials", "BRK.B": "Financials", "BRK.A": "Financials",
    "WMT": "Consumer Staples", "COST": "Consumer Staples", "HD": "Consumer Discretionary",
    "LLY": "Health Care", "UNH": "Health Care", "ORCL": "Information Technology", "CRM": "Information Technology",
    "PLTR": "Information Technology", "ACN": "Information Technology", "IBM": "Information Technology",
    "LRCX": "Information Technology", "KLAC": "Information Technology", "AMAT": "Information Technology",
    "XOM": "Energy", "CVX": "Energy", "LIN": "Materials", "GE": "Industrials", "CAT": "Industrials",
}


# Holding-company reorganisations that moved the listed shares to a new SEC registrant.
PREDECESSOR_REGISTRANTS = {
    "0002115436": "0000034088",  # ExxonMobil Holdings Corp <- Exxon Mobil Corp
}


def sector_for(sic: int) -> str:
    match = "Other"
    for (lo, hi), name in SIC_SECTORS:
        if lo <= sic <= hi:
            match = name  # later, narrower ranges win
    return match
