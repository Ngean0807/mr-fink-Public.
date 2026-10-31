# Post-mortem: top 50, Emerging screen, 8-K and N-PORT

Scope: expanding the holdings tables to the top 50, the new Emerging small-cap screen, 13D, 8-K and
N-PORT tracking. Process: pre-mortem (`emerging-screen.md`), build, then three independent reviews
running in parallel: a data audit that re-derived numbers from raw SEC filings with its own code, a
red-team methodology review, and a UI QA pass with a mocked real-time feed.

## What the reviews confirmed was right

| Check | Result |
| --- | --- |
| Combined 13F shares for every Emerging row vs raw information tables | exact (90 of 90) |
| Stake, year-ago stake, QoQ, YoY, breadth for 8 sampled rows | exact to 4 decimals |
| N-PORT positions (3 securities × IWM, VTI, SPSM) vs fund XML | exact |
| 8-K items and acceptance times (4 events) | exact |
| State Street ranks 31–50 | exact |
| OpenFIGI fund/ETF exclusion (698 securities, independent mapping) | 100% agreement |

## What went wrong, who found it, and the fix

| # | Defect | Effect | Found by | Fix |
| --- | --- | --- | --- | --- |
| 1 | CUSIP succession could loop between two CUSIPs | build hung | self (stalled run) | visited set, depth limit |
| 2 | Split detector accepted two of three managers | Lyft Q1 2026 read as a 2:1 split, erasing real buying | self | every holder must agree |
| 3 | Missing year-ago share count treated as zero | long-held names (RXRX, BRZE) showed their whole stake as new | self | unknown is skipped, never zero |
| 4 | 8-Ks crowded the feed | 13F filings fell out of it | self | separate caps per kind |
| 5 | Adding a filing type would replay months of it as pushes | phone flood on deploy | self | new kinds recorded silently once |
| 6 | Mergers, redomiciles and renames not linked | UNIT (row 1), DEC, KEEL, ALOY shown as +15–26 pp "new" | red team, data audit | match issuer prefix, more legal suffixes, former SEC names, earliest switch quarter; unlinkable established companies left out |
| 7 | Cover-page share counts dated weeks after the quarter | stakes of 114% (BMNR) and 133% (SENS); wrong patterns | red team, data audit | balance-sheet counts dated on the quarter end; points over 100% and reverting spikes dropped |
| 8 | 90-row cap applied before the page filters | 85% of passing names hidden, most "steady" ones | red team, data audit | all passing rows shipped, filtered in the browser |
| 9 | "Steady" satisfied by passive drift | 20 of 28 steady rows were one-quarter jumps | red team | real per-quarter gains required; step measured against the median step |
| 10 | Notifications: newest 8 sent, all marked seen | a burst of 10 Vanguard filings would push 8 and silently drop 2 | red team | priority order, one push per manager batch, unsent wait for next run, state published with the site |
| 11 | Pending-deal flag stale and on acquirers | CTGO flagged after its merger closed | data audit | target-side forms only, cleared by a later 8-K item 2.01 |
| 12 | Reverse splits missed when index buying coincided | VOR, WATT, VELO unflagged | data audit | also detected from the company's share count halving |
| 13 | June fiscal years missing from the quarter frame | PURR, ABAT, DUOT, LTRX, LPTH absent | data audit | fall back to the company's own XBRL |
| 14 | 10% share-growth prefilter | buyback-driven stake gains (AEO, FIVN, HOG) absent | data audit | keep anything not clearly sold |
| 15 | Overlapping Finnhub quote batches | 124 calls a minute against a 60 limit | QA | one 1.1 s queue that drops symbols leaving the screen |
| 16 | Subscriptions in data order; company pages kept 37 unused | visible rows without live prices | QA | page subject, price strip, then table in sort order |
| 17 | Clipped feed titles, filter edge cases, phone layout | unreadable 13G titles, inverted price bounds | QA | wrapping, input validation, mobile columns |
| 18 | Raw company facts and N-PORT XML cached; cache saved every 5 min | 714 MB cache churning the 10 GB limit | red team | slim extracts (42 KB vs ~4 MB per company), hourly cache save |

## What the reviews say about the idea itself

An index fund owns about the same fraction of every company in its index, so differences in the
Big Three's stake come from index membership, share issuance and corporate events. The red team
estimated 85–90% of the list is index or corporate-action mechanics, much of it the June Russell
reconstitution, which is announced in May, before the 13F. One data point: from the 13F deadline
(Aug 14) to Oct 31 the listed names fell about 21% on average, against about 4% for the top
holdings. That is one period, not a backtest, and it matches the known post-inclusion reversal.

The page therefore presents the screen as a map of index money flowing into small caps, shows the
track record since the last deadline next to the top 50, and labels each name's pattern and flags.

## Known limits that remain

- Companies with no usable share count (multi-class tagging, foreign filers) are left out and counted.
- Rows whose share count is not the balance-sheet figure at the quarter end are flagged "Approx. shares".
- A company dropped from indexes and later re-added (e.g. after an OTC stint) shows as a new position.
- 13F lags the quarter by up to 45 days; N-PORT by about 60. Yahoo Finance prices are unofficial.
