# Mr. Fink

Big Three 13F intelligence: the 30 largest company holdings of **BlackRock**, **Vanguard** and
**State Street**, with quarter-over-quarter, year-over-year and since-inception analytics and
fundamentals for every name. Everything is computed from SEC EDGAR primary filings.

## What it shows

- **Holdings register** for the Big Three combined and for each manager: top 30 operating-company
  positions (ETFs and funds excluded), ranked by market value, amounts in `388M` / `388B` / `7.8T` form.
- **Analytics** per position
  - QoQ: action (added / trimmed / new), change in shares, net trading flow in dollars, price move
  - YoY: change in shares and in value
  - Since first held: start quarter, change in share count, price return and CAGR
- **Value bridge**: change in value = net flow (Δ shares × price) + price effect on the old position.
- **Stake**: shares held ÷ shares outstanding (all classes, as-converted).
- **Fundamentals** from XBRL: TTM revenue and growth, EPS growth, gross / operating / net / FCF margin,
  ROE, market cap, P/E, P/S, FCF yield, net cash, quarterly revenue history.
- Detail drawer per company with the three managers side by side, share-count and price history,
  split markers and links to the underlying filings.

## Data handling

| Problem | How it is handled |
| --- | --- |
| Vanguard reports through ~10 separate advisers from Q1 2026 (parent files 13F-NT) | all filers in a manager's complex are summed per quarter (`pipeline/config.py`) |
| BlackRock re-registered under a new CIK in 2024 | both CIKs belong to the BlackRock complex |
| Amendments | RESTATEMENT replaces earlier filings, NEW HOLDINGS adds rows |
| `<value>` units changed from $000s to $ on 2023-01-03 | normalised by filing date |
| Stock splits (NVDA, AVGO, AAPL, TSLA, GE reverse split…) | detected from the filings: all managers' share counts jump by the ratio while the implied price falls by it |
| CUSIP changes (Broadcom, Lam Research, GE) | predecessor CUSIPs with the same issuer that vanish the same quarter are linked |
| Fiscal calendars, 52/53-week and 16-week quarters | XBRL YTD figures are reduced to discrete quarters before summing to TTM |

History starts in Q1 2017, the first quarter BlackRock filed one combined 13F for the whole firm.

## Run it

Python 3.11+ with no third-party packages.

```bash
export SEC_USER_AGENT="Your Name your.email@example.com"   # SEC asks automated clients to identify themselves
python -m pipeline.build        # writes web/data/dashboard.json (first run ~3 min, then cached in .cache/)
python scripts/bundle.py        # optional: single-file build in dist/index.html
python -m http.server -d web    # open http://localhost:8000
python -m unittest discover -s tests -t .
```

## Live updates

EDGAR has no webhooks and blocks browser requests (no CORS), so updates come from a scheduled
poller: `.github/workflows/refresh.yml` runs every 5 minutes on GitHub Actions, re-reads the
filing indexes of every manager entity and every tracked company, rebuilds what changed and
deploys `web/` to GitHub Pages. Each run writes `data/status.json` with a fingerprint of every
filing behind the page; open browsers poll it every minute and swap in the new data with a
"New SEC filing" notice, with no reload.

What triggers a change:

| Filing | Effect |
| --- | --- |
| 13F-HR / 13F-HR/A from any manager entity | holdings, rankings and all analytics |
| Schedule 13G / 13G/A by a manager on a tracked company | ownership stake between 13F reports |
| 10-Q / 10-K from a tracked company | fundamentals (XBRL re-read for that company only) |

### Live stock prices

| Tier | Source | Freshness | Needs |
| --- | --- | --- | --- |
| Real-time | Finnhub websocket (trades) + REST opening quote, straight from the browser | seconds | free key from finnhub.io as repository variable `FINNHUB_KEY` |
| Delayed | Yahoo Finance chart data written to `data/quotes.json` by the workflow | ≤ 5 min | nothing |
| Saved copy | prices embedded in the single-file build | frozen | nothing |

Prices drive the price strip, the Price / Today columns, the company page (1D–Max chart, day range,
market cap and P/E at the live price) and "Top 30 at today's prices". The Finnhub key is visible to
anyone who opens the page; use a free key dedicated to this site. Yahoo Finance data is unofficial
and for personal use.

### Notifications for every visitor

The bell in the header opens a notification center. Each visitor picks the filing types they care
about (13F, 13G/13D, material 8-Ks, 10-Q/10-K, N-PORT) and how to hear about them:

- **In the browser**, with no install: notifications while the site is open in a tab.
- **On the phone, even when the site is closed**: subscribe in the free ntfy app to the public
  channel of each type (`mrfink-ngean0807-13f`, `-stakes`, `-8k`, `-reports`, `-funds`). The
  refresh publishes every new filing to its channel. Channels carry public SEC data only.

Fully install-free push to a closed browser needs a server that stores subscriptions, which a
static GitHub Pages site does not have.

### Owner's phone notifications

Each refresh compares the filing feed with what it has already announced and pushes the new
ones to a phone through [ntfy](https://ntfy.sh) (free app for iOS and Android, no account):

| Filing | Push |
| --- | --- |
| 13F-HR / 13F-HR/A by a manager | high priority: "Vanguard 13F: new holdings for Q3 2026" |
| Schedule 13G / 13G/A by a manager on a tracked company | "BlackRock owns 8.12% of NVDA" |
| 10-Q / 10-K by a tracked company | low priority: "NVDA filed its quarterly report (10-Q)" |

Tapping a push opens the company or manager page; the "SEC filing" button opens EDGAR.
Setup: pick a hard-to-guess topic name, subscribe to it in the ntfy app, and save it as the
repository secret `NTFY_TOPIC`. Run the workflow manually with "Send a test push" to check.
`NTFY_KINDS` (e.g. `13f,13g`) narrows what is sent.

Setup once: push to GitHub and enable Pages with source "GitHub Actions". The workflow identifies
itself to SEC with the maintainer's contact; override it with a repository variable
`SEC_USER_AGENT`. GitHub pauses scheduled
workflows in repositories with no activity for 60 days; any push re-enables them.

## Layout

```
pipeline/   edgar.py (client + cache) · thirteenf.py · analytics.py · fundamentals.py · securities.py · build.py
web/        index.html · styles.css · app.js · data/dashboard.json
scripts/    bundle.py
tests/      unit tests for parsing, TTM derivation, split detection and metrics
```

13F covers long US-listed equity positions only; it lags the quarter by up to 45 days and is not a
complete picture of any manager's exposure. Not investment advice.
