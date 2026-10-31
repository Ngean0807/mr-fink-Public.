# Emerging holdings screen

**Question it answers:** which small, low-priced companies (default $2–$30 a share, market cap
under $3B) are BlackRock, Vanguard and State Street together owning a growing share of?

## Signal

The signal is the **change in combined ownership stake**:

    stake = shares held by the three managers / shares outstanding (company cover page, SEC XBRL)

Share counts alone are misleading for small companies: offerings, reverse mergers, splits and
IPOs move them without anyone choosing to buy. The stake is immune to all of these.

A company passes when, at the latest 13F quarter:

| Test | Default |
| --- | --- |
| Quarter-end price (13F value ÷ shares) | $1–$40 computed, $2–$30 shown |
| Market cap (price × shares outstanding) | $50M–$10B computed, under $3B shown |
| Combined position | at least $5M |
| Stake change over four quarters | at least +1 percentage point |
| Security type | operating company (OpenFIGI); no ETFs, funds, SPACs, warrants |
| Not already a top-50 holding | of any of the three managers or the combined book |

Each row is classified by the shape of its stake over the last five quarters:

- **Steady accumulation**: the stake rose in at least three of the last four quarters.
- **Step-up**: one quarter delivered at least 3 points and most of the gain; the usual footprint of
  an index addition (Russell reconstitution in June, S&P index changes any time).
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
| 6 | A pending acquisition pins the price; the stake means nothing | "Deal pending" flag from DEFM14A/PREM14A/425/SC TO-T/SC 14D9 filings in the last 9 months; hidden by default |
| 7 | 13F filing errors (value units, share counts) are common for small positions | Managers must agree on the implied price within 10%, else "Check data"; stake above 100% dropped |
| 8 | Quarter-end price is stale | Price filter and market cap use the live price |
| 9 | Untradeable stocks | Five-day average dollar volume under $1M flagged "Thin trading", hidden by default |
| 10 | 13F lags 45 days | Data date shown on the page |
| 11 | Missing shares outstanding (foreign filers, class-only tagging) | Excluded and counted in the funnel, never guessed |
| 12 | Heavy dilution makes a stable stake look like buying in dollar terms | "Share count +30%" flag |

## Known limits

- 13F shows positions, not intent. The screen finds where the money is going, not why.
- Shares outstanding come from the cover-page frame for each calendar quarter, which can be dated a
  few weeks after the quarter end.
- Foreign private issuers that do not file XBRL cover pages are not covered.
