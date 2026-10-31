"""Live filing feed: what changed on EDGAR for the managers and the companies they hold.

- 13F-HR / 13F-HR/A / 13F-NT from every filer in a manager complex (quarterly books)
- Schedule 13G / 13G/A filed by a manager on a tracked company (ownership between 13Fs)
- 10-Q / 10-K from tracked companies (new fundamentals)
"""
from __future__ import annotations

import re
from datetime import date, timedelta

from . import config, edgar

MANAGER_FORMS = {"13F-HR", "13F-HR/A", "13F-NT", "13F-NT/A"}
# Beneficial-ownership reports: 13G (passive, the usual for index managers) and 13D (active intent).
G_FORMS = {"SC 13G", "SC 13G/A", "SCHEDULE 13G", "SCHEDULE 13G/A", "SC 13D", "SC 13D/A", "SCHEDULE 13D", "SCHEDULE 13D/A"}
REPORT_FORMS = {"10-Q", "10-K", "10-Q/A", "10-K/A"}
EVENT_FORMS = {"8-K", "8-K/A"}
# 8-K items worth a phone push; the rest (results, votes, Reg FD) only appear in the feed.
KEY_8K_ITEMS = {"1.01", "1.02", "1.03", "2.01", "2.06", "3.01", "4.01", "4.02", "5.01", "5.02"}
ITEM_LABELS = {
    "1.01": "material agreement", "1.02": "agreement terminated", "1.03": "bankruptcy", "2.01": "acquisition or sale completed",
    "2.02": "results of operations", "2.03": "new debt", "2.05": "restructuring charges", "2.06": "impairment",
    "3.01": "delisting notice", "3.02": "unregistered share sale", "3.03": "shareholder rights changed",
    "4.01": "auditor change", "4.02": "restatement: prior financials unreliable", "5.01": "change in control",
    "5.02": "executive or director change", "5.03": "charter or bylaws amended", "5.07": "shareholder vote",
    "7.01": "Reg FD disclosure", "8.01": "other event", "9.01": "exhibits",
}

# Filing agents that file 13Gs for a manager under their own accession prefix.
EXTRA_AGENTS = {"0001086364": "blackrock"}  # BlackRock Advisors, LLC


def _agent_map() -> dict[str, str]:
    out = dict(EXTRA_AGENTS)
    for m in config.MANAGERS:
        for cik in m["ciks"]:
            out[cik.zfill(10)] = m["id"]
    return out


def _recent(cik: str, ttl_hours: float) -> tuple[dict, list[dict]]:
    sub = edgar.cached_json(f"https://data.sec.gov/submissions/CIK{cik.zfill(10)}.json", ttl_hours=ttl_hours)
    r = sub["filings"]["recent"]
    rows = [
        {
            "form": r["form"][i],
            "filed": r["filingDate"][i],
            "accepted": r["acceptanceDateTime"][i],
            "accession": r["accessionNumber"][i],
            "period": r["reportDate"][i],
            "doc": r["primaryDocument"][i],
            "items": (r.get("items") or [""] * len(r["form"]))[i],
        }
        for i in range(len(r["form"]))
    ]
    return sub, rows


def _parse_13g(cik: str, accession: str) -> dict | None:
    """Schedule 13G is structured XML since December 2024; older paper-style filings are skipped."""
    folder = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession.replace('-', '')}"
    try:
        xml = edgar.cached_bytes(f"{folder}/primary_doc.xml").decode("utf-8", "replace")
    except Exception:
        return None
    pct = re.search(r"<(?:classPercent|percentOfClass)>\s*([\d.]+)", xml)
    person = re.search(r"<reportingPersonName>\s*([^<]+)", xml)
    event = re.search(r"<eventDateRequiresFilingThisStatement>\s*([^<]+)", xml)
    shares = re.search(r"<aggregateAmountOwned>\s*([\d.,]+)", xml)
    if not pct:
        return None
    ev = event.group(1).strip() if event else None
    if ev and re.match(r"\d{2}/\d{2}/\d{4}", ev):
        mm, dd, yy = ev.split("/")
        ev = f"{yy}-{mm}-{dd}"
    return {
        "percent": float(pct.group(1)) / 100,
        "reporter": person.group(1).strip() if person else None,
        "eventDate": ev,
        "shares": float(shares.group(1).replace(",", "")) if shares else None,
        "url": f"{folder}/{accession}-index.htm",
    }


def build_feed(securities: dict[str, dict], ttl_hours: float, log=print) -> tuple[list[dict], dict[str, list], dict[str, str]]:
    """Returns (events newest first, 13G stakes per CUSIP, latest 10-Q/10-K accession per CIK)."""
    events: list[dict] = []
    agents = _agent_map()
    names = {m["id"]: m["name"] for m in config.MANAGERS}

    for m in config.MANAGERS:
        for cik in m["ciks"]:
            sub, rows = _recent(cik, ttl_hours)
            for r in rows:
                if r["form"] in MANAGER_FORMS:
                    events.append({
                        "kind": "13f", "manager": m["id"], "entity": sub["name"], "form": r["form"],
                        "filed": r["filed"], "accepted": r["accepted"], "period": r["period"], "accession": r["accession"],
                        "url": f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{r['accession'].replace('-', '')}/{r['accession']}-index.htm",
                    })

    since = (date.today() - timedelta(days=400)).isoformat()
    since_8k = (date.today() - timedelta(days=120)).isoformat()
    stakes: dict[str, list] = {}
    latest_report: dict[str, str] = {}
    by_cik: dict[str, list[str]] = {}
    for cusip, meta in securities.items():
        if meta.get("cik"):
            by_cik.setdefault(meta["cik"], []).append(cusip)
    for cik, cusips in by_cik.items():
        sub, rows = _recent(cik, ttl_hours)
        tickers = [securities[c]["ticker"] for c in cusips]
        for r in rows:
            if r["form"] in REPORT_FORMS:
                latest_report.setdefault(cik, r["accession"])
                if r["filed"] >= since:
                    events.append({
                        "kind": "report", "tickers": tickers, "entity": sub["name"], "form": r["form"],
                        "filed": r["filed"], "accepted": r["accepted"], "period": r["period"], "accession": r["accession"],
                        "url": f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{r['accession'].replace('-', '')}/{r['doc']}",
                    })
            elif r["form"] in EVENT_FORMS and r["filed"] >= since_8k:
                items = [x.strip() for x in (r["items"] or "").split(",") if x.strip() and x.strip() != "9.01"]
                events.append({
                    "kind": "8k", "tickers": tickers, "entity": sub["name"], "form": r["form"], "items": items,
                    "labels": [ITEM_LABELS.get(x, "item " + x) for x in items], "key": bool(set(items) & KEY_8K_ITEMS),
                    "filed": r["filed"], "accepted": r["accepted"], "period": r["period"], "accession": r["accession"],
                    "url": f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{r['accession'].replace('-', '')}/{r['doc']}",
                })
            elif r["form"] in G_FORMS:
                mgr = agents.get(r["accession"][:10])
                if not mgr:
                    continue
                g = _parse_13g(cik, r["accession"])
                if not g:
                    continue
                item = {"manager": mgr, "form": r["form"], "filed": r["filed"], "accepted": r["accepted"], "accession": r["accession"], **g}
                for c in cusips:
                    stakes.setdefault(c, []).append(item)
                events.append({"kind": "13g", "manager": mgr, "tickers": tickers, "entity": g["reporter"] or names[mgr],
                               "form": r["form"], "filed": r["filed"], "accepted": r["accepted"], "accession": r["accession"],
                               "percent": g["percent"], "eventDate": g["eventDate"], "url": g["url"]})
    events.sort(key=lambda e: e["accepted"], reverse=True)
    log(f"Feed: {len(events)} events, {sum(len(v) for v in stakes.values())} manager 13G stakes")
    return events[:300], stakes, latest_report

