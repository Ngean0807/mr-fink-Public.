"""Market prices for the tracked tickers.

Server side (this module, every pipeline run): Yahoo Finance chart data for a delayed quote,
the last five sessions intraday and ten years of daily closes. The browser then upgrades to
real-time trades over the Finnhub websocket when a key is configured (see web/app.js).
"""
from __future__ import annotations

import json
import time
import urllib.request
from datetime import datetime, timezone

from . import edgar

CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval={interval}&range={range}&includePrePost=false"
HEADERS = {"User-Agent": "Mozilla/5.0 (MrFink dashboard)"}


def yahoo_symbol(ticker: str) -> str:
    return ticker.replace(".", "-")


def _get(url: str) -> dict:
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(url)


def _series(res: dict) -> list[tuple[int, float]]:
    ts = res.get("timestamp") or []
    closes = (res.get("indicators", {}).get("quote") or [{}])[0].get("close") or []
    return [(t, round(c, 4)) for t, c in zip(ts, closes) if c is not None]


def intraday(ticker: str) -> dict:
    res = _get(CHART.format(sym=yahoo_symbol(ticker), interval="5m", range="5d"))["chart"]["result"][0]
    m = res["meta"]
    pts = _series(res)
    regular = (m.get("currentTradingPeriod") or {}).get("regular") or {}
    # Average daily dollar volume over the five sessions, for the liquidity check.
    q = (res.get("indicators", {}).get("quote") or [{}])[0]
    dollars = sum((v or 0) * (c or 0) for v, c in zip(q.get("volume") or [], q.get("close") or []))
    sessions = len({t // 86400 for t in res.get("timestamp") or []}) or 1
    return {
        "price": m.get("regularMarketPrice"),
        "prevClose": m.get("previousClose") or m.get("chartPreviousClose"),
        "time": m.get("regularMarketTime"),
        "dayHigh": m.get("regularMarketDayHigh"),
        "dayLow": m.get("regularMarketDayLow"),
        "volume": m.get("regularMarketVolume"),
        "high52": m.get("fiftyTwoWeekHigh"),
        "low52": m.get("fiftyTwoWeekLow"),
        "exchange": m.get("fullExchangeName"),
        "session": {"start": regular.get("start"), "end": regular.get("end")},
        "intraday": [[t, round(p, 2)] for t, p in pts],
        "avgDollarVolume": round(dollars / sessions),
    }


def history(ticker: str) -> dict:
    """Daily closes for ten years (split-adjusted by the source), cached for the day."""
    url = CHART.format(sym=yahoo_symbol(ticker), interval="1d", range="10y")
    path = edgar.CACHE_DIR / "prices" / f"{yahoo_symbol(ticker)}.json"
    if path.exists() and time.time() - path.stat().st_mtime < 6 * 3600:
        return json.loads(path.read_text())
    res = _get(url)["chart"]["result"][0]
    pts = _series(res)
    # Compact form: first trading day (days since epoch), then day gaps and closes in cents.
    days = [t // 86400 for t, _ in pts]
    out = {"d0": days[0] if days else 0, "dd": [b - a for a, b in zip(days, days[1:])], "c": [round(c * 100) for _, c in pts]}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out))
    return out


SPARK = "https://query1.finance.yahoo.com/v8/finance/spark?symbols={syms}&range=1d&interval=1d"


def batch_quotes(tickers: list[str], log=print) -> dict:
    """Last price and previous close for many tickers, 20 per request (no intraday or history)."""
    out = {}
    for i in range(0, len(tickers), 20):
        chunk = tickers[i : i + 20]
        try:
            data = _get(SPARK.format(syms=",".join(yahoo_symbol(t) for t in chunk)))
        except Exception as e:
            log(f"  batch quotes failed for {chunk[0]}..: {e}")
            continue
        by_symbol = {yahoo_symbol(t): t for t in chunk}
        for sym, q in data.items():
            closes = [c for c in q.get("close") or [] if c is not None]
            if sym in by_symbol and closes:
                out[by_symbol[sym]] = {
                    "price": round(closes[-1], 4),
                    "prevClose": q.get("chartPreviousClose") or q.get("previousClose"),
                    "time": (q.get("timestamp") or [None])[-1],
                }
        time.sleep(0.25)
    log(f"Batch quotes: {len(out)}/{len(tickers)} tickers")
    return out


def build(tickers: list[str], log=print) -> tuple[dict, dict]:
    quotes, hist = {}, {}
    for t in tickers:
        try:
            quotes[t] = intraday(t)
            hist[t] = history(t)
        except Exception as e:  # keep going; the page falls back to the 13F price
            log(f"  price data unavailable for {t}: {e}")
        time.sleep(0.25)
    log(f"Quotes: {len(quotes)}/{len(tickers)} tickers")
    return {"asOf": datetime.now(timezone.utc).isoformat(timespec="seconds"), "source": "Yahoo Finance", "quotes": quotes}, hist
