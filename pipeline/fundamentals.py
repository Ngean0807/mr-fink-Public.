"""Fundamentals from SEC XBRL company facts (10-K / 10-Q as filed).

Flow items (revenue, income, cash flow) are reduced to discrete fiscal quarters: 10-Qs report
3-month and year-to-date figures while 10-Ks only report the full year, so missing quarters are
derived as YTD minus the quarters already known (e.g. Q4 = FY - 9M).
"""
from __future__ import annotations

import json
from datetime import date

from . import edgar

# Total revenue first: ASC 606 contract revenue alone omits e.g. Walmart membership fees and
# Berkshire's insurance premiums.
REVENUE = [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "RevenuesNetOfInterestExpense",
    "SalesRevenueNet",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "SalesRevenueGoodsNet",
]
COST_OF_REVENUE = ["CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfGoodsSold", "CostOfGoodsAndServiceExcludingDepreciationDepletionAndAmortization"]
GROSS_PROFIT = ["GrossProfit"]
OPERATING_INCOME = ["OperatingIncomeLoss"]
NET_INCOME = ["NetIncomeLoss", "NetIncomeLossAvailableToCommonStockholdersBasic", "ProfitLoss"]
EPS_DILUTED = ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted", "EarningsPerShareBasic"]
OPERATING_CF = ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"]
CAPEX = ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets", "PaymentsForCapitalImprovements"]
EQUITY = ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"]
CASH = ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", "Cash"]
SHORT_INVESTMENTS = ["ShortTermInvestments", "MarketableSecuritiesCurrent", "AvailableForSaleSecuritiesDebtSecuritiesCurrent"]
DEBT_TOTAL = ["LongTermDebt", "DebtInstrumentCarryingAmount", "LongTermDebtAndCapitalLeaseObligations"]
DEBT_NONCURRENT = ["LongTermDebtNoncurrent", "LongTermDebtAndCapitalLeaseObligationsNoncurrent"]
DEBT_CURRENT = ["LongTermDebtCurrent", "DebtCurrent", "LongTermDebtAndCapitalLeaseObligationsCurrent"]
SHORT_BORROWINGS = ["ShortTermBorrowings", "CommercialPaper"]

# Berkshire reports EPS and share counts in Class A equivalents; one Class A converts into 1,500 Class B.
CLASS_EQUIVALENTS = {"BRK.B": 1500}


def _d(s: str) -> date:
    return date.fromisoformat(s)


def _days(start: str, end: str) -> int:
    return (_d(end) - _d(start)).days + 1


def _facts(cf: dict, concepts: list[str], unit: str, taxonomy: str = "us-gaap") -> list[tuple[str, list[dict]]]:
    tx = cf.get("facts", {}).get(taxonomy, {})
    out = []
    for c in concepts:
        units = tx.get(c, {}).get("units", {})
        if unit in units:
            out.append((c, units[unit]))
    return out


def flow_points(cf: dict, concepts: list[str], unit: str = "USD") -> dict[tuple[str, str], float]:
    """{(start, end): value}. Concepts are merged in priority order, preferring whichever concept
    carries the most recent data (companies migrate tags over time)."""
    series = []
    for name, items in _facts(cf, concepts, unit):
        pts: dict[tuple[str, str], tuple[str, float]] = {}
        for it in items:
            if "start" not in it or it.get("form") not in ("10-K", "10-Q", "10-K/A", "10-Q/A", "20-F", "40-F"):
                continue
            key = (it["start"], it["end"])
            if key not in pts or it["filed"] > pts[key][0]:
                pts[key] = (it["filed"], it["val"])
        if pts:
            series.append({k: v for k, (_, v) in pts.items()})
    if not series:
        return {}
    series.sort(key=lambda s: max(e for _, e in s), reverse=True)
    merged = dict(series[0])
    primary_ends = {e for _, e in merged}
    for s in series[1:]:
        for k, v in s.items():
            if k not in merged and k[1] not in primary_ends:
                merged[k] = v
    return merged


def discrete_quarters(points: dict[tuple[str, str], float]) -> dict[str, dict]:
    """Reduce 3M / 6M / 9M / 12M facts to discrete fiscal quarters keyed by quarter end date."""
    quarters: dict[str, dict] = {}
    for (s, e), v in points.items():
        if 75 <= _days(s, e) <= 120:  # 12- to 16-week retail quarters included
            quarters[e] = {"start": s, "end": e, "val": v, "derived": False}
    # Longer periods (YTD, FY) in chronological order let us derive the quarters that were never
    # reported on their own, typically fiscal Q4.
    longer = sorted(((s, e, v) for (s, e), v in points.items() if _days(s, e) > 120), key=lambda x: (x[1], x[0]))
    for s, e, v in longer:
        if e in quarters:
            continue
        span = _days(s, e)
        if not (160 <= span <= 380):
            continue
        inside = [q for q in quarters.values() if _d(q["start"]) >= _d(s) and _d(q["end"]) < _d(e)]
        covered = sum(_days(q["start"], q["end"]) for q in inside)
        if not inside or not (75 <= span - covered <= 120):
            continue
        last_end = max(_d(q["end"]) for q in inside)
        start = date.fromordinal(last_end.toordinal() + 1).isoformat()
        quarters[e] = {"start": start, "end": e, "val": v - sum(q["val"] for q in inside), "derived": True}
    return dict(sorted(quarters.items()))


def share_counts(points: dict[tuple[str, str], float]) -> dict[str, float]:
    """Weighted-average share counts by period end. These are averages, not flows, so they cannot be
    differenced like revenue: use the 3-month figure, else the longest period ending that day (FY)."""
    out: dict[str, tuple[int, float]] = {}
    for (s, e), v in points.items():
        span = _days(s, e)
        # Priority: a 3-month figure (0) beats any longer period; among longer ones the longest wins.
        prio = 0 if 75 <= span <= 120 else 10_000 - span
        if e not in out or prio < out[e][0]:
            out[e] = (prio, v)
    return {e: v for e, (_, v) in sorted(out.items())}


def ttm_series(quarters: dict[str, dict]) -> dict[str, float]:
    """Trailing-twelve-month sums keyed by quarter end, only where four contiguous quarters exist."""
    ends = list(quarters)
    out = {}
    for i in range(3, len(ends)):
        window = [quarters[k] for k in ends[i - 3 : i + 1]]
        contiguous = all(0 <= (_d(window[j + 1]["start"]) - _d(window[j]["end"])).days <= 7 for j in range(3))
        if contiguous:
            out[ends[i]] = sum(q["val"] for q in window)
    return out


def instant(cf: dict, concepts: list[str], unit: str = "USD", taxonomy: str = "us-gaap") -> tuple[str, float] | None:
    """Most recent point-in-time value across concepts (as of the latest balance sheet date)."""
    best = None
    for _, items in _facts(cf, concepts, unit, taxonomy):
        for it in items:
            if "start" in it:
                continue
            if best is None or (it["end"], it["filed"]) > (best[0], best[2]):
                best = (it["end"], it["val"], it["filed"])
    return (best[0], best[1]) if best else None


def instant_at(cf: dict, concepts: list[str], end: str, unit: str = "USD") -> float | None:
    for _, items in _facts(cf, concepts, unit):
        vals = [it for it in items if "start" not in it and it["end"] == end]
        if vals:
            return max(vals, key=lambda it: it["filed"])["val"]
    return None


def shares_outstanding(cf: dict, ticker: str, asof: str) -> tuple[str, float] | None:
    """Total common shares outstanding (all classes) in units of `ticker`'s share class.

    Uses the cover-page count; when a filer tags it by class only (dimensioned facts are not in
    company facts) or it is stale, falls back to the latest diluted weighted-average share count.
    """
    ratio = CLASS_EQUIVALENTS.get(ticker, 1)
    items = cf.get("facts", {}).get("dei", {}).get("EntityCommonStockSharesOutstanding", {}).get("units", {}).get("shares", [])
    if items:
        # Cover-page counts are dated a few weeks after quarter end; take the last one that
        # follows the price date by no more than 75 days, so later splits or buybacks don't leak in.
        usable = [it for it in items if (_d(it["end"]) - _d(asof)).days <= 75]
        latest = max((it["end"] for it in usable), default="1900-01-01")
        if usable and (_d(asof) - _d(latest)).days < 270:
            latest_filed = max(it["filed"] for it in usable if it["end"] == latest)
            classes = [it["val"] for it in usable if it["end"] == latest and it["filed"] == latest_filed]
            if ratio > 1 and len(classes) >= 2:
                small = min(classes)  # Berkshire: the small count is Class A
                return latest, small * ratio + sum(classes) - small
            if ratio == 1:
                return latest, float(sum(classes))
    diluted = share_counts(flow_points(cf, ["WeightedAverageNumberOfDilutedSharesOutstanding"], "shares"))
    diluted = {k: v for k, v in diluted.items() if k <= asof}
    if diluted:
        end = max(diluted)
        if (_d(asof) - _d(end)).days < 270:
            return end, diluted[end] * ratio
    return None


def _needed_concepts() -> set[str]:
    lists = [REVENUE, COST_OF_REVENUE, GROSS_PROFIT, OPERATING_INCOME, NET_INCOME, EPS_DILUTED, OPERATING_CF, CAPEX,
             EQUITY, CASH, SHORT_INVESTMENTS, DEBT_TOTAL, DEBT_NONCURRENT, DEBT_CURRENT, SHORT_BORROWINGS]
    extra = ["WeightedAverageNumberOfDilutedSharesOutstanding", "NetIncomeLossAvailableToCommonStockholdersDiluted",
             "NetIncomeLossAvailableToCommonStockholdersBasic", "EntityCommonStockSharesOutstanding"]
    return {c for lst in lists for c in lst} | set(extra)


def company_facts(cik: str, version: str | None = None) -> dict | None:
    """XBRL facts, re-read whenever the company files a new 10-Q/10-K (`version` = its accession).

    Company facts files run to several MB; only the concepts used here are kept on disk.
    """
    key = f"facts_{cik}_{(version or 'latest').replace('/', '_')}.json.gz"
    cached = edgar.load_artifact(key)
    if cached is not None:
        return cached
    try:
        raw = json.loads(edgar.fetch(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"))
    except Exception:
        return None
    keep = _needed_concepts()
    slim = {"facts": {tx: {c: v for c, v in concepts.items() if c in keep} for tx, concepts in raw.get("facts", {}).items()}}
    for old in (edgar.CACHE_DIR / "derived").glob(f"facts_{cik}_*.json.gz"):
        old.unlink(missing_ok=True)
    edgar.save_artifact(key, slim)
    return slim

def _growth(series: dict[str, float], end: str) -> float | None:
    """Year-over-year growth of a TTM series at `end` against the point ~1 year earlier."""
    if end not in series:
        return None
    target = _d(end).toordinal() - 365
    prior = [k for k in series if abs(_d(k).toordinal() - target) <= 20]
    if not prior:
        return None
    base = series[prior[0]]
    # Growth off a negative or loss-making base is not meaningful.
    return series[end] / base - 1 if base > 0 and series[end] > 0 else None


def analyze(cik: str, ticker: str, price: float | None, price_date: str, sic: int = 0, version: str | None = None) -> dict | None:
    cf = company_facts(cik, version)
    if not cf:
        return None

    rev_concepts = (["RevenuesNetOfInterestExpense"] + REVENUE) if 6000 <= sic <= 6799 else REVENUE
    rev_q = discrete_quarters(flow_points(cf, rev_concepts))
    if not rev_q:
        return {"available": False, "reason": "No US-GAAP revenue facts (foreign filer or non-standard taxonomy)."}
    rev_ttm = ttm_series(rev_q)
    ni_ttm = ttm_series(discrete_quarters(flow_points(cf, NET_INCOME)))
    oi_ttm = ttm_series(discrete_quarters(flow_points(cf, OPERATING_INCOME)))
    gp_q = discrete_quarters(flow_points(cf, GROSS_PROFIT))
    if not gp_q or max(gp_q) < max(rev_q):  # GrossProfit tag abandoned (e.g. Costco after 2019)
        cost = discrete_quarters(flow_points(cf, COST_OF_REVENUE))
        gp_q = {k: {**v, "val": rev_q[k]["val"] - cost[k]["val"]} for k, v in cost.items() if k in rev_q}
    gp_ttm = ttm_series(gp_q)
    # TTM EPS = TTM net income / latest quarter's diluted shares. Summing reported quarterly EPS
    # breaks across splits, because older quarters keep pre-split figures until re-filed.
    dil = share_counts(flow_points(cf, ["WeightedAverageNumberOfDilutedSharesOutstanding"], "shares"))
    ni_common = ttm_series(discrete_quarters(flow_points(cf, ["NetIncomeLossAvailableToCommonStockholdersDiluted", "NetIncomeLossAvailableToCommonStockholdersBasic"])))
    ni_for_eps = {k: ni_common.get(k, v) for k, v in ni_ttm.items()}  # after preferred dividends
    eps_ttm = {k: v / dil[k] for k, v in ni_for_eps.items() if dil.get(k, 0) > 0}
    if not eps_ttm:
        eps_ttm = ttm_series(discrete_quarters(flow_points(cf, EPS_DILUTED, "USD/shares")))
    ocf_ttm = ttm_series(discrete_quarters(flow_points(cf, OPERATING_CF)))
    capex_ttm = ttm_series(discrete_quarters(flow_points(cf, CAPEX)))

    if not rev_ttm:
        return {"available": False, "reason": "Not enough quarterly history to build trailing-twelve-month figures."}
    asof = max(rev_ttm)

    def at(series):
        return series.get(asof)

    revenue = at(rev_ttm)
    net_income = at(ni_ttm)
    op_income = at(oi_ttm)
    gross = at(gp_ttm)
    eps = at(eps_ttm)
    ocf = at(ocf_ttm)
    capex = at(capex_ttm)
    fcf = ocf - capex if ocf is not None and capex is not None else None

    equity_now = instant_at(cf, EQUITY, asof)
    year_ago = [k for k in rev_ttm if abs(_d(k).toordinal() - (_d(asof).toordinal() - 365)) <= 20]
    equity_prev = instant_at(cf, EQUITY, year_ago[0]) if year_ago else None
    avg_equity = (equity_now + equity_prev) / 2 if equity_now and equity_prev else equity_now

    cash = instant_at(cf, CASH, asof) or 0
    cash += instant_at(cf, SHORT_INVESTMENTS, asof) or 0
    debt = instant_at(cf, DEBT_TOTAL, asof)
    if debt is None:
        parts = [instant_at(cf, DEBT_NONCURRENT, asof), instant_at(cf, DEBT_CURRENT, asof)]
        debt = sum(p for p in parts if p) if any(parts) else None
    if debt is not None:
        debt += instant_at(cf, SHORT_BORROWINGS, asof) or 0

    def safe_div(a, b):
        return a / b if a is not None and b not in (None, 0) else None

    # Valuation is point-in-time: the 13F quarter-end price against the trailing twelve months
    # that had ended by that date, so multiples are not flattered by later results.
    ratio = CLASS_EQUIVALENTS.get(ticker, 1)
    so = shares_outstanding(cf, ticker, price_date)
    if so is None and net_income and eps and eps > 0:
        # Last resort (e.g. Visa tags share counts by class only): as-converted shares = NI / EPS.
        so = (asof, net_income / eps * ratio)
    eps_cls = eps / ratio if eps is not None else None
    mcap = price * so[1] if price and so else None
    val_ends = [k for k in rev_ttm if k <= price_date]
    val_asof = max(val_ends) if val_ends else asof
    val_eps = eps_ttm.get(val_asof)
    val_eps = val_eps / ratio if val_eps is not None else None
    val_fcf = (
        ocf_ttm[val_asof] - capex_ttm[val_asof] if val_asof in ocf_ttm and val_asof in capex_ttm else None
    )

    # Recent quarters of revenue and net income for the detail charts.
    ni_q = discrete_quarters(flow_points(cf, NET_INCOME))
    recent = list(rev_q)[-12:]
    quarterly = [
        {"end": k, "revenue": rev_q[k]["val"], "netIncome": ni_q[k]["val"] if k in ni_q else None}
        for k in recent
    ]
    rev_ttm_hist = [{"end": k, "value": v} for k, v in list(rev_ttm.items())[-12:]]

    result = {
        "available": True,
        "asOf": asof,
        "priceDate": price_date,
        "revenueTTM": revenue,
        "revenueGrowth": _growth(rev_ttm, asof),
        "netIncomeTTM": net_income,
        "netIncomeGrowth": _growth(ni_ttm, asof),
        "epsTTM": eps_cls,
        "epsGrowth": _growth(eps_ttm, asof),
        "grossMargin": safe_div(gross, revenue),
        "operatingMargin": safe_div(op_income, revenue),
        "netMargin": safe_div(net_income, revenue),
        "fcfTTM": fcf,
        "fcfMargin": safe_div(fcf, revenue),
        "roe": safe_div(net_income, avg_equity) if avg_equity and avg_equity > 0 else None,
        "equity": equity_now,
        "cash": cash or None,
        "debt": debt,
        "netCash": cash - debt if debt is not None else None,
        "debtToEquity": safe_div(debt, equity_now) if equity_now and equity_now > 0 else None,
        "sharesOutstanding": so[1] if so else None,
        "sharesAsOf": so[0] if so else None,
        "marketCap": mcap,
        "valuationAsOf": val_asof,
        "pe": (safe_div(price, val_eps) if val_eps and val_eps > 0 else
               safe_div(mcap, ni_ttm.get(val_asof)) if ni_ttm.get(val_asof, 0) > 0 else None),
        "ps": safe_div(mcap, rev_ttm.get(val_asof)),
        "fcfYield": safe_div(val_fcf, mcap),
        "quarterly": quarterly,
        "revenueTTMHistory": rev_ttm_hist,
    }
    if 6000 <= sic <= 6799:
        # Banks, brokers and insurers: gross margin, operating cash flow and leverage ratios
        # mean something different on a financial balance sheet, so they are not shown.
        for k in ("grossMargin", "operatingMargin", "fcfTTM", "fcfMargin", "fcfYield", "debt", "netCash", "debtToEquity"):
            result[k] = None
        result["financialsNote"] = True
    return result
