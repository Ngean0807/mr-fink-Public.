"""Build web/data/dashboard.json from SEC EDGAR.

    python -m pipeline.build            # incremental (EDGAR archives are cached under .cache/)
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import hashlib

from . import analytics, config, feed, fundamentals, periods, quotes, securities, thirteenf

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "dashboard.json"
STATUS = OUT.with_name("status.json")


def latest_common_period() -> str:
    """Most recent quarter end for which every manager complex has filed a 13F-HR."""
    latest = []
    for m in config.MANAGERS:
        ps = [f.period for cik in m["ciks"] for f in thirteenf.list_filings(cik)]
        latest.append(max(ps))
    return min(latest)


def rank_companies(book: dict, figi: dict) -> list[str]:
    ranked = sorted(book, key=lambda c: book[c][1], reverse=True)
    return [c for c in ranked if figi.get(c) and figi[c]["type"] in config.COMPANY_SECURITY_TYPES]


def combine(books: dict[str, dict], period_list: list[str]) -> dict:
    out = {}
    for p in period_list:
        merged: dict[str, list] = {}
        for book in books.values():
            for c, (s, v, n, cls) in book.get(p, {}).items():
                slot = merged.get(c)
                if slot is None:
                    merged[c] = [s, v, n, cls]
                else:
                    slot[0] += s
                    slot[1] += v
        out[p] = merged
    return out


def main() -> None:
    t0 = time.time()
    latest = latest_common_period()
    count = 0
    while periods.quarter_ends(latest, count + 1)[0] >= config.HISTORY_START:
        count += 1
    period_list = periods.quarter_ends(latest, count)
    print(f"Periods: {period_list[0]} .. {latest} ({count} quarters)")

    complexes = {}
    for m in config.MANAGERS:
        print(f"Loading {m['name']} 13F filings")
        complexes[m["id"]] = thirteenf.build_complex(m, period_list)
    books = {mid: {p: q["book"] for p, q in qs.items()} for mid, qs in complexes.items()}
    books_with_big3 = {**books, "big3": combine(books, period_list)}
    prev = period_list[-2]

    # Screen the largest positions (this quarter and last) through OpenFIGI to drop funds and ETFs.
    candidates = []
    for book in books_with_big3.values():
        for p in (latest, prev):
            b = book.get(p, {})
            candidates += sorted(b, key=lambda c: b[c][1], reverse=True)[: config.CANDIDATES]
    print(f"Mapping {len(set(candidates))} CUSIPs via OpenFIGI")
    figi = securities.map_cusips(candidates)
    for c in sorted({c for c in candidates if not figi.get(c)}):
        row = books_with_big3["big3"][latest].get(c) or books_with_big3["big3"][prev].get(c)
        figi[c] = securities.fallback_map(row[2]) if row else None
        status = f"matched by SEC name -> {figi[c]['ticker']}" if figi[c] else "excluded (fund or unknown)"
        print(f"  OpenFIGI miss {c} {row[2] if row else ''} ${row[1]/1e9 if row else 0:,.1f}B: {status}")

    views = {}
    selected: set[str] = set()
    for vid, book in books_with_big3.items():
        now_rank = rank_companies(book[latest], figi)
        prev_rank = rank_companies(book.get(prev, {}), figi)
        top = now_rank[: config.TOP_N]
        views[vid] = {"top": top, "rank": {c: i + 1 for i, c in enumerate(now_rank)}, "prevRank": {c: i + 1 for i, c in enumerate(prev_rank)}}
        selected.update(top)

    print(f"Profiling {len(selected)} securities (splits, CUSIP history, fundamentals)")
    sec_meta = {}
    for c in sorted(selected):
        info = figi[c]
        row = books_with_big3["big3"][latest][c]
        ticker = securities.display_ticker(info["ticker"])
        preds = analytics.find_predecessors(c, row[2], books, period_list)
        chain = [c] + [p["cusip"] for p in preds]
        # Split detection runs on the stitched history so splits before a CUSIP change are caught too.
        stitched = {}
        for mid, b in books.items():
            stitched[mid] = {}
            for p in period_list:
                rows = [b[p][x] for x in chain if x in b.get(p, {})]
                stitched[mid][p] = {c: max(rows, key=lambda r: r[1])} if rows else {}
        splits = analytics.detect_splits(c, stitched, period_list)
        company = securities.sec_company(info["ticker"])
        meta = {
            "cusip": c,
            "ticker": ticker,
            "name": row[2].title() if not company else company["title"],
            "classTitle": row[3],
            "securityType": info["type"],
            "figi": info["figi"],
            "price": row[1] / row[0] if row[0] else None,
            "splits": splits,
            "predecessors": preds,
            "cik": company["cik"] if company else None,
        }
        if company:
            prof = securities.profile(company["cik"])
            meta.update(prof)
            meta["sector"] = securities.SECTOR_OVERRIDES.get(ticker, prof["sector"])
        sec_meta[c] = meta
        print(f"  {ticker:<7} {meta['name'][:34]:<34} splits={[(s['period'], s['ratio']) for s in splits]} preds={[p['cusip'] for p in preds]}")

    feed_events, stakes_13g, latest_report = feed.build_feed(sec_meta, config.SUBMISSIONS_TTL_HOURS)
    for c, meta in sec_meta.items():
        meta["stakes13g"] = sorted(stakes_13g.get(c, []), key=lambda g: g["accepted"], reverse=True)
        if meta.get("cik"):
            meta["fundamentals"] = fundamentals.analyze(
                meta["cik"], meta["ticker"], meta["price"], latest, meta.get("sic", 0), latest_report.get(meta["cik"])
            )
            pred_cik = securities.PREDECESSOR_REGISTRANTS.get(meta["cik"])
            if pred_cik and not (meta["fundamentals"] or {}).get("available"):
                # New holding-company registrant with no reporting history yet: use the predecessor's filings.
                meta["fundamentals"] = fundamentals.analyze(pred_cik, meta["ticker"], meta["price"], latest, meta.get("sic", 0), "pred")
                meta["fundamentalsCik"] = pred_cik

    # Every selected security gets each manager's full history, so the detail view can compare
    # all three houses even where a name is outside one manager's top 30.
    for c, meta in sec_meta.items():
        chain = [c] + [p["cusip"] for p in meta["predecessors"]]
        so = (meta.get("fundamentals") or {}).get("sharesOutstanding")
        holders = {}
        for vid, book in books_with_big3.items():
            series = analytics.position_series(chain, book, period_list, meta["splits"])
            if not any(x["s"] for x in series):
                continue
            holders[vid] = {
                "series": [[x["s"], x["v"]] for x in series],
                "rank": views[vid]["rank"].get(c),
                "ownership": series[-1]["s"] / so if so else None,
                **analytics.position_metrics(series),
            }
        meta["holders"] = holders

    out_views = {}
    names = {m["id"]: m["name"] for m in config.MANAGERS}
    names["big3"] = "Big Three"
    for vid, v in views.items():
        book = books_with_big3[vid]
        rows = []
        for c in v["top"]:
            meta = sec_meta[c]
            chain = [c] + [p["cusip"] for p in meta["predecessors"]]
            series = analytics.position_series(chain, book, period_list, meta["splits"])
            m = analytics.position_metrics(series)
            fund = meta.get("fundamentals") or {}
            so = fund.get("sharesOutstanding")
            row = {
                "cusip": c,
                "rank": v["rank"][c],
                "prevRank": v["prevRank"].get(c),
                "shares": series[-1]["s"],
                "value": series[-1]["v"],
                "ownership": series[-1]["s"] / so if so else None,
                **m,
            }
            if vid == "big3":
                row["byManager"] = {mid: {"shares": books[mid][latest].get(c, [0, 0])[0], "value": books[mid][latest].get(c, [0, 0])[1]} for mid in books}
            rows.append(row)
        if vid == "big3":
            totals = [sum(complexes[mid][p]["total"] for mid in complexes if p in complexes[mid]) for p in period_list]
            sources = [s for mid in complexes for s in complexes[mid][latest]["sources"]]
            prev_sources = [s for mid in complexes for s in complexes[mid][prev]["sources"]]
        else:
            totals = [complexes[vid][p]["total"] if p in complexes[vid] else None for p in period_list]
            sources = complexes[vid][latest]["sources"]
            prev_sources = complexes[vid][prev]["sources"]
        out_views[vid] = {
            "id": vid,
            "name": names[vid],
            "totals": totals,
            "positions": len(book[latest]),
            "rows": rows,
            "sources": sources,
            "prevSources": prev_sources,
        }

    # The fingerprint changes whenever any filing behind the page changes; the browser polls
    # status.json and reloads the data only when it differs.
    accessions = sorted({s["accession"] for v in out_views.values() for s in v["sources"]} | {e["accession"] for e in feed_events})
    fingerprint = hashlib.sha1("|".join(accessions).encode()).hexdigest()[:16]
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    data = {
        "meta": {
            "app": "Mr. Fink",
            "generatedAt": now,
            "fingerprint": fingerprint,
            "latest": latest,
            "latestLabel": periods.label(latest),
            "periods": period_list,
            "periodLabels": [periods.label(p) for p in period_list],
            "managers": [{"id": m["id"], "name": m["name"], "ciks": m["ciks"]} for m in config.MANAGERS],
            "topN": config.TOP_N,
        },
        "views": out_views,
        "securities": sec_meta,
        "feed": feed_events,
    }
    # Market prices: a delayed quote, five sessions intraday and ten years of daily closes.
    tickers = sorted({m["ticker"] for m in sec_meta.values()})
    quote_data, price_history = quotes.build(tickers)
    data["quotes"] = quote_data
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    OUT.with_name("quotes.json").write_text(json.dumps(quote_data, separators=(",", ":")))
    OUT.with_name("history.json").write_text(json.dumps(price_history, separators=(",", ":")))
    STATUS.write_text(json.dumps({"checkedAt": now, "fingerprint": fingerprint, "latest": latest, "latestFiling": feed_events[0]["accepted"] if feed_events else None, "quotesAsOf": quote_data["asOf"]}))
    print(f"Wrote {OUT} ({OUT.stat().st_size/1024:,.0f} KB) in {time.time()-t0:,.0f}s")


if __name__ == "__main__":
    main()
