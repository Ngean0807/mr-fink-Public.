"""Backtest of the Emerging screen: what buying it each quarter since 2018 would have returned.

    python -m pipeline.backtest     # writes web/data/backtest.json (minutes; cached SEC data)

Built only from what was knowable at the time, with no survivorship bias:
- Universe and prices come from the historical 13F filings themselves (value / shares), so
  companies that were later acquired, delisted or went bankrupt are included.
- Shares outstanding come from the SEC XBRL frame for that quarter, matched to the 13F issuer
  name, so the stake is measured as the live screen measures it.
- A quarter's 13F is public 45 days after the quarter end. The portfolio is bought at the next
  quarter end (the first price after the data is public) and held 3 or 12 months, equal weight.
- A position that leaves every Big Three book before the exit (takeover, delisting) is valued at
  its last 13F price; takeover premiums and bankruptcy losses after that point are not counted.
- Benchmarks: the same small-cap universe without the stake test (isolates the signal from the
  small-cap effect), IWM and SPY price returns from Yahoo Finance.
Insider buying cannot be backtested: Form 4 data is collected for the last 90 days only.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path
from statistics import mean, median

from . import config, edgar, movers, periods, quotes, securities, thirteenf
from .emerging import FRAMES, SPAC, frame_name

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "backtest.json"
E = config.EMERGING


def outstanding_by_name(period: str) -> dict[str, float]:
    """{normalized issuer name: shares outstanding} from the quarter's XBRL frames."""
    out: dict[str, float] = {}
    clash: set[str] = set()
    for _, url in FRAMES:
        try:
            data = edgar.cached_json(url.format(frame_name(period)), ttl_hours=24 * 365)
        except Exception:
            continue
        for r in data.get("data", []):
            key = securities._norm(r.get("entityName") or "")
            if not key or not r.get("val"):
                continue
            if key in out and abs(out[key] / r["val"] - 1) > 0.02:
                clash.add(key)
            out.setdefault(key, float(r["val"]))
    for k in clash:  # two companies with one normalized name: ambiguous, left out
        out.pop(k, None)
    return out


def quarter_end_price(hist: dict, period: str) -> float | None:
    if not hist or not hist.get("c"):
        return None
    target = date.fromisoformat(period).toordinal() - date(1970, 1, 1).toordinal()
    day, best = hist["d0"], None
    for gap, c in zip([0] + hist["dd"], hist["c"]):
        day += gap
        if day > target:
            break
        best = c / 100
    return best


def hold_return(c: str, big3: dict, plist: list[str], i0: int, i1: int) -> tuple[float | None, bool]:
    """Price return of one CUSIP from period i0 to i1, chaining quarter to quarter through the 13F
    implied prices and adjusting for splits. (return, carried at last price because it left)."""
    row = big3[plist[i0]].get(c)
    if not row or not row[0]:
        return None, False
    growth = 1.0
    for i in range(i0, i1):
        nxt = big3[plist[i + 1]].get(c)
        if not nxt or not nxt[0]:
            return growth - 1, True
        ratio = movers.split_ratio(row, nxt)
        growth *= (nxt[1] / nxt[0]) * ratio / (row[1] / row[0])
        row = nxt
    return growth - 1, False


def run(log=print) -> dict:
    latest = min(max(f.period for cik in m["ciks"] for f in thirteenf.list_filings(cik)) for m in config.MANAGERS)
    plist = [p for p in periods.quarter_ends(latest, 60) if p >= config.HISTORY_START]
    log(f"Backtest periods {plist[0]} .. {plist[-1]}")
    books = {m["id"]: {p: q["book"] for p, q in thirteenf.build_complex(m, plist, log=lambda *a: None).items()} for m in config.MANAGERS}
    big3: dict[str, dict] = {}
    for p in plist:
        merged: dict[str, list] = {}
        for b in books.values():
            for c, (s, v, n, cls) in b.get(p, {}).items():
                slot = merged.setdefault(c, [0, 0, n, cls])
                slot[0] += s
                slot[1] += v
        big3[p] = merged
    so = {p: outstanding_by_name(p) for p in plist}
    bench = {t: quotes.history(t) for t in ("IWM", "SPY")}

    cohorts = []
    for i in range(4, len(plist) - 2):  # need a year-ago stake and at least a 3-month exit
        Q, Y, entry = plist[i], plist[i - 4], i + 1
        uni, picks = [], []
        gain: dict[str, float] = {}
        breadth: dict[str, int] = {}
        for c, (s, v, name, cls) in big3[Q].items():
            if s <= 0 or v < E["min_value"]:
                continue
            px = v / s
            up = name.upper()
            if not (2 <= px <= 30) or SPAC.search(up) or securities.FUND_WORDS.search(up):
                continue
            key = securities._norm(name)
            out_q, out_y = so[Q].get(key), so[Y].get(key)
            if not out_q or not (E["mcap_min"] <= px * out_q <= 3e9):
                continue
            stake = s / out_q
            if stake > 1:
                continue
            uni.append(c)
            prev = big3[Y].get(c)
            if not prev or not out_y:
                continue
            stake_y = prev[0] / out_y
            if stake_y <= 1 and stake - stake_y >= E["min_stake_change"] and s >= 0.85 * prev[0]:
                picks.append(c)
                gain[c] = stake - stake_y
                # All three managers raised their own holding over the year.
                breadth[c] = sum(1 for b in books.values() if b.get(Q, {}).get(c, [0])[0] > b.get(Y, {}).get(c, [0])[0] > 0)
        if not picks:
            continue

        def avg(cs, i1):
            rs = [hold_return(c, big3, plist, entry, i1) for c in cs]
            vals = [r for r, _ in rs if r is not None]
            return (mean(vals) if vals else None), sum(1 for _, carried in rs if carried), vals

        r3, carried3, v3 = avg(picks, entry + 1)
        u3, _, _ = avg(uni, entry + 1)
        has12 = entry + 4 < len(plist)
        r12, carried12, v12 = avg(picks, entry + 4) if has12 else (None, 0, [])
        u12, _, _ = avg(uni, entry + 4) if has12 else (None, 0, [])

        top = sorted(picks, key=lambda c: -gain[c])[:25]
        three = [c for c in picks if breadth[c] == 3]
        t3, _, _ = avg(top, entry + 1)
        t12, _, _ = avg(top, entry + 4) if has12 else (None, 0, [])
        a3, _, _ = avg(three, entry + 1)
        a12, _, _ = avg(three, entry + 4) if has12 else (None, 0, [])

        def bench_ret(t, i1):
            a, b = quarter_end_price(bench[t], plist[entry]), quarter_end_price(bench[t], plist[i1])
            return b / a - 1 if a and b else None

        cohorts.append({
            "period": Q, "public": periods.filing_deadline(Q), "entry": plist[entry], "n": len(picks), "universe": len(uni),
            "r3": r3, "u3": u3, "iwm3": bench_ret("IWM", entry + 1), "spy3": bench_ret("SPY", entry + 1),
            "r12": r12, "u12": u12, "iwm12": bench_ret("IWM", entry + 4) if has12 else None, "spy12": bench_ret("SPY", entry + 4) if has12 else None,
            "hit12": (sum(1 for x in v12 if x > 0) / len(v12)) if v12 else None, "median12": median(v12) if v12 else None,
            "carried": carried12 if has12 else carried3,
            "top3": t3, "top12": t12, "three3": a3, "three12": a12, "nThree": len(three),
        })
        log(f"  {periods.label(Q)}: {len(picks):4d} picks of {len(uni):4d}  3m {r3:+.1%} vs {u3:+.1%}" + (f"  12m {r12:+.1%} vs {u12:+.1%}" if r12 is not None else ""))

    def chain(key):
        g, out = 1.0, []
        for c in cohorts:
            if c[key] is None:
                break
            g *= 1 + c[key]
            out.append(round(g, 4))
        return out

    full = [c for c in cohorts if c["r12"] is not None and c["u12"] is not None]
    summary = {
        "cohorts": len(cohorts), "cohorts12": len(full),
        "avg12": mean(c["r12"] for c in full) if full else None, "avgUniverse12": mean(c["u12"] for c in full) if full else None,
        "avgIwm12": mean(c["iwm12"] for c in full if c["iwm12"] is not None) if full else None,
        "beatUniverse12": sum(1 for c in full if c["r12"] > c["u12"]) / len(full) if full else None,
        "beatIwm12": sum(1 for c in full if c["iwm12"] is not None and c["r12"] > c["iwm12"]) / len(full) if full else None,
        "growth3": {"screen": chain("r3"), "universe": chain("u3"), "iwm": chain("iwm3"), "spy": chain("spy3"), "top25": chain("top3"), "allThree": chain("three3")},
        "avgTop12": mean(c["top12"] for c in full if c["top12"] is not None) if full else None,
        "avgThree12": mean(c["three12"] for c in full if c["three12"] is not None) if full else None,
        "beatUniverseTop12": sum(1 for c in full if c["top12"] is not None and c["top12"] > c["u12"]) / len(full) if full else None,
        "beatUniverseThree12": sum(1 for c in full if c["three12"] is not None and c["three12"] > c["u12"]) / len(full) if full else None,
        "avgPicks": mean(c["n"] for c in cohorts),
    }
    return {"generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "latest": plist[-1], "cohorts": cohorts, "summary": summary,
            "method": __doc__.split("\n\n", 2)[2].strip()}


def main() -> None:
    data = run()
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    s = data["summary"]
    print(f"Wrote {OUT}: {s['cohorts']} cohorts; 12m screen {s['avg12']:+.1%} vs universe {s['avgUniverse12']:+.1%} vs IWM {s['avgIwm12']:+.1%}; "
          f"beat universe {s['beatUniverse12']:.0%}, beat IWM {s['beatIwm12']:.0%}")
    print(f"  top 25 by stake gain: 12m {s['avgTop12']:+.1%}, beat universe {s['beatUniverseTop12']:.0%}; "
          f"all three buying: 12m {s['avgThree12']:+.1%}, beat universe {s['beatUniverseThree12']:.0%}")
    print("  growth of $1 (3-month rebalancing):", {k: v[-1] if v else None for k, v in s["growth3"].items()})


if __name__ == "__main__":
    main()
