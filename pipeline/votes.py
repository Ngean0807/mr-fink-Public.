"""How the Big Three vote: proxy votes from Form N-PX, through each manager's flagship S&P 500 fund.

Funds report every shareholder-meeting vote once a year (Form N-PX, filed by the end of August for
the year to June 30). Each manager's votes are read from one flagship fund so the three are
comparable and nothing is counted twice: iShares Core S&P 500 (IVV), Vanguard 500 Index (VOO) and
SPDR Portfolio S&P 500 (SPYM). The filings are large (up to ~180MB of XML); each is read once and
the result kept in the build cache.

Writes web/data/votes.json (summary, and the votes against management at the largest companies)
and web/data/votes/<TICKER>.json (every vote at one company, for its page).
"""
from __future__ import annotations

import io
import json
import re
import xml.etree.ElementTree as ET
from datetime import date, timedelta
from pathlib import Path

from . import edgar, securities

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "votes.json"
FOLDER = OUT.with_name("votes")
# (manager, fund ticker, trust CIK, series id)
FLAGSHIP = [("blackrock", "IVV", "1100663", "S000004310"), ("vanguard", "VOO", "36405", "S000002839"),
            ("statestreet", "SPYM", "1064642", "S000006983")]
LOCAL = lambda tag: tag.rsplit("}", 1)[-1].split(":")[-1]


def _filings(cik: str) -> list[str]:
    s = edgar.cached_json(f"https://data.sec.gov/submissions/CIK{int(cik):010d}.json", ttl_hours=24)
    r = s["filings"]["recent"]
    since = (date.today() - timedelta(days=500)).isoformat()
    return [r["accessionNumber"][i] for i, f in enumerate(r["form"]) if f.startswith("N-PX") and r["filingDate"][i] >= since]


def _docs(cik: str, acc: str) -> list[str]:
    folder = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace('-', '')}"
    idx = edgar.fetch(f"{folder}/{acc}-index.htm").decode("utf-8", "ignore")
    return list(dict.fromkeys("https://www.sec.gov" + d for d in re.findall(r'href="(/Archives/[^"]+\.xml)"', idx) if "/xsl" not in d))


def find_filing(cik: str, series: str) -> tuple[str, str] | None:
    """(accession, vote table URL) of the latest N-PX that reports this series."""
    for acc in _filings(cik):
        key = f"npxcover_{acc}.json.gz"
        hit = edgar.load_artifact(key)
        if hit is None:
            docs = _docs(cik, acc)
            cover = next((d for d in docs if d.endswith("/primary_doc.xml")), None)
            series_ids = re.findall(r"<seriesId>([^<]+)</seriesId>", edgar.fetch(cover).decode("utf-8", "ignore")) if cover else []
            table = next((d for d in docs if not d.endswith("/primary_doc.xml")), None)
            hit = {"series": series_ids, "table": table}
            edgar.save_artifact(key, hit)
        if series in hit["series"] and hit["table"]:
            return acc, hit["table"]
    return None


def read_votes(url: str, series: str) -> list[list]:
    """[cusip, issuer, meeting date (ISO), proposal, category, proposed by, how voted, management recommendation]."""
    raw = edgar.fetch(url)
    out, loose = [], []  # loose: records with no series tag (used only if none carries one)
    rec: dict = {}
    for ev, el in ET.iterparse(io.BytesIO(raw), events=("end",)):
        tag = LOCAL(el.tag)
        if tag in ("issuerName", "cusip", "meetingDate", "voteDescription", "voteSource", "voteSeries"):
            rec[tag] = (el.text or "").strip()
        elif tag == "categoryType":
            rec.setdefault("cat", (el.text or "").strip())
        elif tag == "howVoted":
            rec["_how"] = (el.text or "").strip()
        elif tag == "sharesVoted" and "_how" in rec:
            rec["_sh"] = float((el.text or "0").replace(",", "") or 0)
        elif tag == "voteRecord":
            # a split vote has several records: keep the one cast with the most shares
            if "_how" in rec and rec.get("_sh", 0) >= rec.get("_best", -1):
                rec["how"], rec["_best"] = rec["_how"], rec.get("_sh", 0)
            rec.pop("_how", None)
            rec.pop("_sh", None)
        elif tag == "proxyTable":
            if rec.get("voteSeries") in (series, None, ""):
                m = re.match(r"(\d\d)/(\d\d)/(\d{4})", rec.get("meetingDate", ""))
                (out if rec.get("voteSeries") == series else loose).append([rec.get("cusip", ""), rec.get("issuerName", ""), f"{m.group(3)}-{m.group(1)}-{m.group(2)}" if m else "",
                            rec.get("voteDescription", ""), rec.get("cat", ""), rec.get("voteSource", ""), rec.get("how", ""), rec.get("_best", 0)])
            rec = {}
            el.clear()
    del raw
    return out or loose


VOTED = {"FOR", "AGAINST", "WITHHOLD", "ABSTAIN"}


def with_management(it: dict, vote: str) -> bool:
    """Management backs its own proposals and opposes shareholders'. (The filings' own
    managementRecommendation field is filled inconsistently from fund family to fund family.)"""
    return vote == ("AGAINST" if it["s"] == "Shareholder" else "FOR")


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def build(log=print) -> dict | None:
    per: dict[str, list] = {}
    accs = []
    for mid, fund, cik, series in FLAGSHIP:
        try:
            f = find_filing(cik, series)
        except Exception as e:
            log(f"  votes {fund}: {e}")
            continue
        if not f:
            continue
        acc, url = f
        accs.append(acc)
        key = f"npxvotes3_{acc}_{series}.json.gz"
        votes = edgar.load_artifact(key)
        if votes is None:
            votes = read_votes(url, series)
            edgar.save_artifact(key, votes)
            (edgar.CACHE_DIR / "save-now").write_text(acc)
        per[mid] = votes
    if not per:
        return None
    figi = edgar.load_artifact("openfigi.json.gz") or {}
    companies: dict[str, dict] = {}
    for mid, votes in per.items():
        for cusip, issuer, day, desc, cat, src, how, shares in votes:
            f = figi.get(cusip)
            t = securities.display_ticker(f["ticker"]) if f else None
            if not t:
                continue
            c = companies.setdefault(t, {"n": issuer, "items": {}})
            k = (day, _norm(desc))
            holder = src.upper().startswith(("SECURITY", "SHAREHOLDER"))
            it = c["items"].setdefault(k, {"date": day, "d": desc, "c": cat.title(), "s": "Shareholder" if holder else "Company", "v": {}})
            it["v"].setdefault(mid, []).append((how.upper(), shares or 0))
    # one vote per manager and item: the most common (a director slate lists each nominee)
    for c in companies.values():
        for it in c["items"].values():
            it["k"] = {m: len(v) for m, v in it["v"].items() if len(v) > 1}
            # the fund's vote: the one cast with the most shares (Vanguard reports a proposal once per
            # voting policy of its investor-choice program; a slate lists each nominee)
            for m, v in list(it["v"].items()):
                by: dict[str, float] = {}
                for how, sh in v:
                    by[how] = by.get(how, 0) + sh
                it["v"][m] = max(sorted(by), key=lambda h: (by[h], h == "FOR"))
    summary = {}
    for mid in per:
        items = [it for c in companies.values() for it in c["items"].values() if mid in it["v"] and it["v"][mid] in VOTED]
        against = [it for it in items if not with_management(it, it["v"][mid])]
        sh = [it for it in items if it["s"] == "Shareholder"]
        sh_for = [it for it in sh if it["v"][mid] == "FOR"]
        cats: dict[str, list] = {}
        for it in sh:
            cats.setdefault(it["c"] or "Other", []).append(it["v"][mid] == "FOR")
        summary[mid] = {"proposals": len(items), "againstMgmt": len(against) / len(items) if items else None,
                        "shareholder": len(sh), "shareholderFor": len(sh_for) / len(sh) if sh else None,
                        "byCategory": {k: [len(v), sum(v) / len(v)] for k, v in sorted(cats.items(), key=lambda kv: -len(kv[1])) if len(v) >= 5}}
    FOLDER.mkdir(parents=True, exist_ok=True)
    for old in FOLDER.glob("*.json"):
        old.unlink()
    contested = []
    for t, c in companies.items():
        items = sorted(c["items"].values(), key=lambda it: (it["date"], it["d"]), reverse=True)
        (FOLDER / f"{t}.json").write_text(json.dumps({"t": t, "n": c["n"], "items": items}, separators=(",", ":")))
        for it in items:
            against = [m for m, v in it["v"].items() if v in VOTED and not with_management(it, v)]
            if against:
                contested.append({"t": t, "n": c["n"], **it, "against": against})
    contested.sort(key=lambda x: (-len(x["against"]), x["date"]), reverse=False)
    out = {"funds": {mid: fund for mid, fund, _, _ in FLAGSHIP if mid in per}, "period": max((it["date"] for c in companies.values() for it in c["items"].values()), default=None),
           "summary": summary, "companies": len(companies), "contested": contested[:150]}
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    log(f"votes: {len(companies)} companies, " + ", ".join(f"{m} {s['proposals']} votes" for m, s in summary.items()))
    return out
