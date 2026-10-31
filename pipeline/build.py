"""Build web/data/dashboard.json from SEC EDGAR.

    python -m pipeline.build            # incremental (EDGAR archives are cached under .cache/)
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import hashlib
import re

from . import analytics, config, edgar, emerging, feed, fundamentals, notify, nport, periods, quotes, securities, thirteenf

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


def describe_security(c: str, info: dict, books: dict, row: list, period_list: list[str], quiet: bool = False) -> dict:
    """Identity, splits, CUSIP history and SEC profile for one security."""
    ticker = securities.display_ticker(info["ticker"])
    preds = analytics.find_predecessors(c, row[2], books, period_list)
    splits = analytics.detect_splits(c, analytics.stitch(c, preds, books, period_list), period_list)
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
    if not quiet:
        print(f"  {ticker:<7} {meta['name'][:34]:<34} splits={[(s['period'], s['ratio']) for s in splits]} preds={[p['cusip'] for p in preds]}")
    return meta


def holders_of(c: str, meta: dict, books_with_big3: dict, views: dict, period_list: list[str]) -> dict:
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
    return holders


def add_fundamentals(meta: dict, latest: str, version: str | None) -> None:
    if not meta.get("cik"):
        return
    meta["fundamentals"] = fundamentals.analyze(meta["cik"], meta["ticker"], meta["price"], latest, meta.get("sic", 0), version)
    pred_cik = securities.PREDECESSOR_REGISTRANTS.get(meta["cik"])
    if pred_cik and not (meta["fundamentals"] or {}).get("available"):
        # New holding-company registrant with no reporting history yet: use the predecessor's filings.
        meta["fundamentals"] = fundamentals.analyze(pred_cik, meta["ticker"], meta["price"], latest, meta.get("sic", 0), "pred")
        meta["fundamentalsCik"] = pred_cik


def prune_legacy_cache() -> None:
    """Raw company-facts and N-PORT files from earlier versions; slim parsed copies replace them."""
    for pattern in ("data.sec.gov_api_xbrl_companyfacts_*", "www.sec.gov_Archives_edgar_data_*_primary_doc.xml"):
        for f in edgar.CACHE_DIR.glob(pattern):
            if pattern.endswith(".xml") and f.stat().st_size < 1_000_000:
                continue  # small primary docs (13F cover pages, 13G) stay cached
            f.unlink(missing_ok=True)


def write_company_pages(lite: dict[str, dict], quotes_now: dict) -> None:
    """One file per Emerging company outside the main data: profile, price history, intraday."""
    folder = OUT.with_name("co")
    folder.mkdir(parents=True, exist_ok=True)
    tickers = sorted({m["ticker"] for m in lite.values()})
    hist = {}
    for t in tickers:
        try:
            hist[t] = quotes.history(t)
        except Exception as e:
            print(f"  price history unavailable for {t}: {e}")
    day = quotes.intraday_cached(tickers, budget=90)
    written = set()
    for meta in lite.values():
        t = meta["ticker"]
        slug = re.sub(r"[^a-z0-9]+", "-", t.lower())
        q = {**(day.get(t) or {}), **(quotes_now.get(t) or {})}  # the batch quote is the fresher price
        if day.get(t, {}).get("intraday"):
            q["intraday"] = day[t]["intraday"]
        (folder / f"{slug}.json").write_text(json.dumps({"security": meta, "history": hist.get(t), "quote": q or None}, separators=(",", ":")))
        written.add(f"{slug}.json")
    for f in folder.glob("*.json"):
        if f.name not in written:
            f.unlink()
    print(f"Company pages: {len(written)} files, {len(hist)} with price history, {sum(1 for v in day.values() if v.get('intraday'))} with intraday")


def main() -> None:
    t0 = time.time()
    prune_legacy_cache()
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
    sec_meta = {c: describe_security(c, figi[c], books, books_with_big3["big3"][latest][c], period_list) for c in sorted(selected)}

    # Small caps the Big Three are accumulating, outside their top holdings.
    emerging_rows, emerging_diag = emerging.screen(books, books_with_big3["big3"], period_list, exclude=selected)
    for r in emerging_rows:
        c = r["cusip"]
        if not r["profiled"] and c not in sec_meta:
            continue
        if c not in sec_meta:
            sec_meta[c] = describe_security(c, r["figi"], books, books_with_big3["big3"][latest][c], period_list)
        sec_meta[c]["emerging"] = True
    # The other Emerging names get the same company page, written to its own file (data/co/) and
    # loaded when opened, so the main data file stays small. They are not in the filing feed.
    lite: dict[str, dict] = {}
    for r in emerging_rows:
        c = r["cusip"]
        if c in sec_meta:
            continue
        try:
            lite[c] = describe_security(c, r["figi"], books, books_with_big3["big3"][latest][c], period_list, quiet=True)
            lite[c]["emerging"] = True
        except Exception as e:
            print(f"  company page skipped for {r['ticker']}: {e}")
    print(f"Emerging: {len(lite)} company pages outside the main data file")

    feed_events, stakes_13g, latest_report = feed.build_feed(sec_meta, config.SUBMISSIONS_TTL_HOURS)
    # Fund-level positions (N-PORT) for every tracked security, and the funds' filings in the feed.
    chains = {c: [c] + [p["cusip"] for p in m["predecessors"]] for c, m in {**sec_meta, **lite}.items()}
    fund_positions, nport_events = nport.build(chains, ttl_hours=6)
    for c, m in {**sec_meta, **lite}.items():
        m["funds"] = sorted(fund_positions.get(c, []), key=lambda f: -f["value"])
    feed_events = sorted(feed_events + nport_events, key=lambda e: e["accepted"], reverse=True)
    for c, meta in sec_meta.items():
        meta["stakes13g"] = sorted(stakes_13g.get(c, []), key=lambda g: g["accepted"], reverse=True)
        add_fundamentals(meta, latest, latest_report.get(meta.get("cik")))

    # Every selected security gets each manager's full history, so the detail view can compare
    # all three houses even where a name is outside one manager's top 30.
    for c, meta in sec_meta.items():
        meta["holders"] = holders_of(c, meta, books_with_big3, views, period_list)
    for c, meta in lite.items():
        if meta.get("cik"):
            report, stakes, filings = feed.company_filings(meta["cik"], meta["ticker"], ttl_hours=6)
            meta["stakes13g"] = stakes
            meta["filings"] = filings
            add_fundamentals(meta, latest, report)
        else:
            meta["stakes13g"], meta["filings"] = [], []
        meta["holders"] = holders_of(c, meta, books_with_big3, views, period_list)

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
            "notify": {"server": config.NTFY_SERVER, "topics": config.public_topics()},
        },
        "views": out_views,
        "securities": sec_meta,
        "feed": feed_events,
        "emerging": {
            "asOf": latest,
            "params": config.EMERGING,
            "diagnostics": emerging_diag,
            "rows": [{k: v for k, v in r.items() if k != "figi"} for r in emerging_rows],
        },
    }
    # Market prices: a delayed quote, five sessions intraday and ten years of daily closes.
    tickers = sorted({m["ticker"] for m in sec_meta.values()})
    quote_data, price_history = quotes.build(tickers)
    # Emerging names without a full company page still need a price on first paint.
    light = sorted({r["ticker"] for r in emerging_rows} - set(quote_data["quotes"]))
    quote_data["quotes"].update(quotes.batch_quotes(light))
    # The page ships without intraday series (they are in quotes.json, loaded for 1D/5D charts).
    data["quotes"] = {**quote_data, "quotes": {t: {k: v for k, v in q.items() if k != "intraday"} for t, q in quote_data["quotes"].items()}}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    OUT.with_name("quotes.json").write_text(json.dumps(quote_data, separators=(",", ":")))
    OUT.with_name("history.json").write_text(json.dumps(price_history, separators=(",", ":")))
    write_company_pages(lite, data["quotes"]["quotes"])
    # Phone pushes go out only after the new data is written, so the link opens fresh numbers.
    notify.sync_from_site()
    notify.notify_new(feed_events)
    notify.export_state(OUT.with_name("notified.json"))
    if os.environ.get("NTFY_TEST") == "true":
        notify.send_test()
    STATUS.write_text(json.dumps({"checkedAt": now, "fingerprint": fingerprint, "latest": latest, "latestFiling": feed_events[0]["accepted"] if feed_events else None, "quotesAsOf": quote_data["asOf"]}))
    print(f"Wrote {OUT} ({OUT.stat().st_size/1024:,.0f} KB) in {time.time()-t0:,.0f}s")


if __name__ == "__main__":
    main()
