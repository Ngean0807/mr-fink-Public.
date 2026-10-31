"""Emerging holdings: small, low-priced companies where the Big Three's combined ownership is rising.

The signal is the change in the managers' share of the company (stake = shares held / shares
outstanding), not the change in shares held. Share counts move with offerings, splits and
reverse mergers; the stake does not, so it isolates genuine accumulation or index inclusion.
Shares outstanding come from SEC XBRL frames (cover-page counts for every filer in one call).
"""
from __future__ import annotations

import re
from datetime import date, timedelta

from . import analytics, config, edgar, securities

# Balance-sheet share count (dated on the period end, so it lines up with the 13F date) first;
# the cover-page count (dated weeks later) only fills gaps, and such rows are flagged.
FRAMES = [
    ("balance-sheet", "https://data.sec.gov/api/xbrl/frames/us-gaap/CommonStockSharesOutstanding/shares/{}.json"),
    ("cover-page", "https://data.sec.gov/api/xbrl/frames/dei/EntityCommonStockSharesOutstanding/shares/{}.json"),
]
SPAC = re.compile(r"\b(ACQUISITION|ACQUISITIONS|SPAC|BLANK CHECK|MERGER CORP)\b")
FUND_SIC = {6221, 6722, 6726, 6770}  # commodity pools, open/closed-end funds, blank checks
DEAL_FORMS = {"DEFM14A", "PREM14A", "DEFM14C", "PREM14C", "SC TO-T", "SC TO-T/A", "SC 14D9", "SC 14D9/A", "425", "SC 13E3"}
HISTORY = 9  # quarters of stake history (two years plus the current quarter)


def frame_name(period: str) -> str:
    y, m, _ = period.split("-")
    return f"CY{y}Q{(int(m) - 1) // 3 + 1}I"


def shares_outstanding(period_list: list[str]) -> dict[str, dict[str, tuple[float, str]]]:
    """{period: {cik: (shares outstanding, source)}}, balance-sheet count preferred."""
    out = {}
    for p in period_list:
        merged: dict[str, tuple[float, str]] = {}
        for source, url in FRAMES:
            try:
                data = edgar.cached_json(url.format(frame_name(p)), ttl_hours=24)
            except Exception:
                continue
            for r in data.get("data", []):
                cik = str(r["cik"]).zfill(10)
                if r.get("val") and cik not in merged:
                    merged[cik] = (float(r["val"]), source)
        out[p] = merged
    return out


def _filings(cik: str) -> dict:
    return edgar.cached_json(f"https://data.sec.gov/submissions/CIK{cik}.json", ttl_hours=24)


def deal_and_listing(cik: str) -> tuple[list[str], str | None, bool]:
    """(recent merger/tender filings, first filing date on record, files as a foreign private issuer)."""
    sub = _filings(cik)
    r = sub["filings"]["recent"]
    since = (date.today() - timedelta(days=270)).isoformat()
    deals = sorted({r["form"][i] for i in range(len(r["form"])) if r["form"][i] in DEAL_FORMS and r["filingDate"][i] >= since})
    # Older filers have paginated history ("files"); for them the first filing is long ago.
    first = None if sub["filings"].get("files") else (min(r["filingDate"]) if r["filingDate"] else None)
    foreign = any(f in ("20-F", "40-F", "6-K") for f in r["form"][:200])
    return deals, first, foreign


def classify(stakes: list[float | None], first_idx: int) -> str:
    """Name the shape of the stake history (oldest to newest, one value per quarter).

    Passive drift alone moves a stake about 0.3 points a quarter, so "steady" needs real
    quarter-after-quarter gains, and "step" means one quarter stands far above the others.
    """
    if first_idx >= len(stakes) - 4:
        return "new"
    last = list(enumerate(stakes))[-5:]
    steps = [b - a for (i, a), (j, b) in zip(last, last[1:]) if a is not None and b is not None]
    if len(steps) < 3:
        return "rising"
    total = sum(steps)
    top = max(steps)
    median = sorted(steps)[len(steps) // 2]
    if top >= 0.02 and top >= 0.5 * total and top >= 3 * max(median, 0.0025):
        return "step"
    if sum(1 for d in steps if d >= 0.0075) >= 3 and total - top >= 0.02:
        return "steady"
    return "rising"


def screen(books: dict[str, dict], big3: dict, period_list: list[str], exclude: set[str], log=print) -> tuple[list[dict], dict]:
    E = config.EMERGING
    L, Q, Y = period_list[-1], period_list[-2], period_list[-5]
    diag = {"held": len(big3[L])}

    # 1. Cheap pre-filter on the raw 13F books: price band (widened for splits), size, growth.
    pre = []
    for c, (s, v, name, cls) in big3[L].items():
        if s <= 0 or c in exclude or v < E["min_value"]:
            continue
        px = v / s
        if not (E["price_min"] * 0.5 <= px <= E["price_max"] * 1.5):
            continue
        sy = big3.get(Y, {}).get(c, [0])[0]
        sq = big3.get(Q, {}).get(c, [0])[0]
        if sy and s <= sy and (not sq or s <= sq):
            continue  # not growing at all (the stake test below decides what counts as growth)
        pre.append(c)
    diag["prefilter"] = len(pre)

    # 2. Operating companies only.
    figi = securities.map_cusips(pre)
    comp = []
    for c in pre:
        info = figi.get(c)
        name = big3[L][c][2].upper()
        if not info or info["type"] not in config.COMPANY_SECURITY_TYPES or SPAC.search(name) or SPAC.search(info["name"].upper()):
            continue
        company = securities.sec_company(info["ticker"])
        if not company:
            continue
        comp.append((c, info, company["cik"]))
    diag["companies"] = len(comp)

    hist_periods = period_list[-HISTORY:]
    so = shares_outstanding(hist_periods)
    rows = []
    skipped_no_shares = 0
    unlinked = 0
    for c, info, cik in comp:
        if cik not in so[L] and cik not in so[Q]:
            skipped_no_shares += 1
            continue
        prof = securities.profile(cik)
        if prof["sic"] in FUND_SIC:
            continue
        name = big3[L][c][2]
        preds = analytics.find_predecessors(c, name, books, period_list)
        chain = [c] + [p["cusip"] for p in preds]
        splits = analytics.detect_splits(c, analytics.stitch(c, preds, books, period_list), period_list)
        series = analytics.position_series(chain, big3, period_list, splits)
        idx = {p: i for i, p in enumerate(period_list)}

        approx: set[str] = set()

        def outstanding(p):
            """Shares outstanding at the quarter end. A cover-page count or the neighbouring
            quarter's count fills a gap and marks the row approximate; never zero-filled."""
            if p in so and so[p].get(cik):
                val, source = so[p][cik]
                if source != "balance-sheet":
                    approx.add(p)
                return val
            i = hist_periods.index(p)
            for j in (i - 1, i + 1):
                if 0 <= j < len(hist_periods) and so[hist_periods[j]].get(cik):
                    approx.add(p)
                    return so[hist_periods[j]][cik][0]
            return None

        def stake(p, ser=series):
            out_raw = outstanding(p)
            if not out_raw:
                return None
            return ser[idx[p]]["s"] / (out_raw * analytics.split_factor(splits, p))

        stakes = [stake(p) for p in hist_periods]
        bad = [i for i, x in enumerate(stakes) if x is not None and x > 1.0]
        if stakes[-1] is not None and stakes[-1] > 1.0:
            continue  # more than 100% owned: a share count that predates an issuance
        stakes = [None if i in bad else x for i, x in enumerate(stakes)]
        now, q_ago, y_ago = stakes[-1], stakes[-2], stakes[-5]
        if now is None:
            continue
        px = series[-1]["v"] / series[-1]["s"]
        mcap = px * outstanding(L)
        first_idx = next((i for i, x in enumerate(series[-HISTORY:]) if x["s"] > 0), HISTORY - 1)
        held_year_ago = series[-5]["s"] > 0
        if y_ago is None and held_year_ago:
            skipped_no_shares += 1
            continue  # held a year ago but no share count to measure the stake: unknown, not zero
        if not held_year_ago and outstanding(Y) and outstanding(Y) * px > 3e8:
            # Already a sizeable public company a year ago, yet not held under any linked CUSIP:
            # a merger, redomicile or CUSIP change the history could not be joined across.
            # The gain is unknown, so the row is left out rather than shown as a new position.
            unlinked += 1
            continue
        d_y = now - (y_ago or 0)
        if not (E["price_min"] <= px <= E["price_max"] and E["mcap_min"] <= mcap <= E["mcap_max"] and d_y >= E["min_stake_change"]):
            continue

        per_mgr = {}
        for mid, b in books.items():
            ms = analytics.position_series(chain, b, period_list, splits)
            m_now = ms[-1]["s"] / (outstanding(L) * analytics.split_factor(splits, L))
            m_y = ms[-5]["s"] / (outstanding(Y) * analytics.split_factor(splits, Y)) if outstanding(Y) else None
            per_mgr[mid] = {"stake": m_now, "stakeYearAgo": m_y, "shares": ms[-1]["s"], "value": ms[-1]["v"]}
        breadth = sum(1 for m in per_mgr.values() if m["stake"] - (m["stakeYearAgo"] or 0) > 0.001)

        # Data checks: the three managers must agree on the quarter-end price.
        prices = [b[L][x][1] / b[L][x][0] for b in books.values() for x in chain if x in b.get(L, {}) and b[L][x][0]]
        flags = []
        if prices and max(prices) / min(prices) > 1.1:
            flags.append("price-mismatch")
        deals, first_filing, foreign = deal_and_listing(cik)
        if deals:
            flags.append("pending-deal")
        if any(sp["ratio"] < 1 and sp["period"] >= Y for sp in splits):
            flags.append("reverse-split")
        if bad:
            flags.append("price-mismatch")
        if approx:
            flags.append("approx-shares")
        if outstanding(Y) and outstanding(L) / (outstanding(Y) * analytics.split_factor(splits, Y)) > 1.3:
            flags.append("dilution")
        if foreign:
            flags.append("foreign-filer")
        if first_filing and first_filing >= (date.today() - timedelta(days=730)).isoformat():
            flags.append("new-listing")

        m = analytics.position_metrics(series)
        rows.append({
            "cusip": c,
            "figi": info,
            "ticker": securities.display_ticker(info["ticker"]),
            "name": prof.get("secName") or name,
            "sector": securities.SECTOR_OVERRIDES.get(securities.display_ticker(info["ticker"]), prof["sector"]),
            "industry": prof["industry"],
            "cik": cik,
            "price": px,
            "marketCap": mcap,
            "sharesOutstanding": outstanding(L),
            "stake": now,
            "stakeQuarterAgo": q_ago,
            "stakeYearAgo": y_ago,
            "stakeChangeQoQ": now - q_ago if q_ago is not None else None,
            "stakeChangeYoY": d_y,
            "stakeHistory": stakes,
            "stakePeriods": hist_periods,
            "pattern": classify(stakes, first_idx),
            "breadth": breadth,
            "managers": per_mgr,
            "value": series[-1]["v"],
            "shares": series[-1]["s"],
            "flowQoQ": m["qoq"]["trade"] if m["qoq"] else None,
            "flowYoY": m["yoy"]["trade"] if m["yoy"] else None,
            "flags": flags,
            "deals": deals,
        })
    diag["noSharesOutstanding"] = skipped_no_shares
    diag["unlinkedHistory"] = unlinked
    diag["passed"] = len(rows)
    # Every passing row ships to the page, which filters and sorts. The most relevant ones under
    # the default filters get a full company page (fundamentals, filings, quotes).
    rows.sort(key=lambda r: r["stakeChangeYoY"], reverse=True)
    shortlist = [r for r in rows if 2 <= r["price"] <= 30 and r["marketCap"] <= 3e9 and "pending-deal" not in r["flags"]][: E["profiled"]]
    keep = {r["cusip"] for r in shortlist}
    for r in rows:
        r["profiled"] = r["cusip"] in keep
    log(f"Emerging screen: {diag}")
    return rows, diag
