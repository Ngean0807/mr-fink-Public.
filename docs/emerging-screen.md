# Emerging holdings screen

**Question it answers:** which small, low-priced companies (default $2–$30 a share, market cap
under $3B) are BlackRock, Vanguard and State Street together owning a growing share of?

## Signal

The signal is the **change in combined ownership stake**:

    stake = shares held by the three managers / shares outstanding at the quarter end
            (balance-sheet count from SEC XBRL frames; the company's own XBRL or the cover page
            fills gaps, and such rows are flagged "Approx. shares")

Share counts alone are misleading for small companies: offerings and splits move them without
anyone choosing to buy. The stake corrects for those. It does not correct for index changes,
IPOs, mergers or redomiciles, which is why every row carries a pattern and flags, and why
companies whose history cannot be linked across a CUSIP change are left out.

A company passes when, at the latest 13F quarter:

| Test | Default |
| --- | --- |
| Quarter-end price (13F value ÷ shares) | $1–$40 computed, $2–$30 shown |
| Market cap (price × shares outstanding) | $50M–$10B computed, under $3B shown |
| Holdings | not clearly sold (combined shares above 85% of a year ago) |
| Combined position | at least $5M |
| Stake change over four quarters | at least +1 percentage point |
| Security type | operating company (OpenFIGI); no ETFs, funds, SPACs, warrants |
| Not already a top-50 holding | of any of the three managers or the combined book |

Every passing company is listed; the page filters on top. The 120 most relevant under the default
filters get a full company page, the rest link to EDGAR.

Each row is classified by the shape of its stake over the last five quarters:

- **Steady accumulation**: at least three of the last four quarters added 0.75 points or more, and
  the quarters other than the largest added at least 2 points (passive drift alone is ~0.3 a quarter).
- **Step-up**: one quarter added at least 2 points, half the gain or more, and three times the
  median quarter; the usual footprint of an index addition (Russell reconstitution in June).
- **New position**: first held within the last year (IPO, spin-off, index entry).
- **Rising**: higher than a year ago without a clear shape.

## Pre-mortem: how this screen could mislead, and the guard for each

| # | Failure | Guard |
| --- | --- | --- |
| 1 | Index managers buy mechanically; a rising stake is read as foresight | Pattern column; a callout on the page says so plainly |
| 2 | Offerings or conversions inflate shares held | Stake uses shares outstanding, not shares held |
| 3 | Splits and reverse splits (frequent in small caps) | Split detection from the filings; shares outstanding scaled by the same factor; "Reverse split" flag |
| 4 | CUSIP change after a reverse split or reverse merger looks like a new position | CUSIP succession with share-continuity check; "Listed < 2 yrs" flag |
| 5 | ETFs, closed-end funds, SPACs, warrants slip in | OpenFIGI security type, SIC 6221/6722/6726/6770, name patterns |
| 6 | A pending acquisition pins the price; the stake means nothing | "Deal pending" from target-side filings (DEFM14A, PREM14A, SC TO-T, SC 14D9, SC 13E3) in the last 9 months, cleared by a later 8-K item 2.01; hidden by default |
| 7 | 13F filing errors (value units, share counts) are common for small positions | Managers must agree on the implied price within 10%, else "Check data"; stake above 100% dropped |
| 8 | Quarter-end price is stale | The server screens on the quarter-end price; the page re-filters on the live price where one is streamed |
| 9 | Untradeable stocks | Five-day average dollar volume under $1M flagged "Thin trading", hidden by default |
| 10 | 13F lags 45 days | Data date shown on the page |
| 11 | Missing shares outstanding (foreign filers, class-only tagging) | Excluded and counted in the funnel, never guessed |
| 12 | Heavy dilution makes a stable stake look like buying in dollar terms | "Share count +30%" flag |

## Known limits

- 13F shows positions, not intent. The screen finds where the money is going, not why.
- Where the balance-sheet count at the quarter end is missing, a cover-page or neighbouring count is
  used and the row is flagged "Approx. shares".
- Foreign private issuers that do not file XBRL cover pages are not covered.

See `postmortem-emerging.md` for what the independent reviews found and how it was fixed.
