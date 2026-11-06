"""News for the companies on the site, from two sources.

1. The company's own announcements: the press release attached to an 8-K as Exhibit 99 (earnings,
   deals, leadership changes). Public SEC data, read once per filing and kept.
2. Finnhub: third-party headlines per company and market headlines (FINNHUB_KEY). Only articles
   that name the company are kept; Finnhub tags many loosely related ones to each ticker.

Writes web/data/news.json. Each run refreshes the stalest companies within a small budget and
carries the rest over from the previous run (the live site's own news.json), so a run stays fast.
"""
from __future__ import annotations

import html as htmlmod
import json
import os
import re
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from . import edgar

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "news.json"
PRESS = OUT.with_name("press.json")  # accession -> press release found (or 0), carried run to run
FINNHUB = "https://finnhub.io/api/v1"
# 8-K items that usually come with a press release worth a headline
PR_ITEMS = {"1.01", "1.02", "2.01", "2.02", "2.05", "2.06", "5.02", "7.01", "8.01"}
PR_BUDGET = 40          # new 8-Ks read per run (two SEC requests each)
FH_BUDGET = 15          # companies refreshed from Finnhub per run (free plan: 60 calls a minute)
FH_REFRESH_MIN = 45     # a company's Finnhub headlines are refreshed about this often
KEEP_DAYS = 14

_SKIP = re.compile(r"^(exhibit\s*99|ex-99|for immediate release|for release|embargoed|press release|news release|media release|"
                   r"contacts?:|investor|media:|source:|page \d|\(?nyse|\(?nasdaq|[a-z]+day,? [a-z]+ \d)", re.I)
_DATE = re.compile(r"^[A-Z][a-z]+\.? \d{1,2}, \d{4}\b")


def _text_lines(raw: str) -> list[str]:
    """Paragraph-level text: a headline wrapped by <br> or font tags stays one line."""
    raw = re.sub(r"(?is)<(script|style|head)\b.*?</\1>", " ", raw)
    raw = re.sub(r"(?i)</(p|div|tr|h\d|li|td|table)>|<(p|div|tr|h\d|li|table)\b[^>]*>", "\n", raw)
    text = htmlmod.unescape(re.sub(r"<[^>]+>", " ", raw)).replace("\xa0", " ")
    return [" ".join(l.split()) for l in text.split("\n") if l.strip()]


_WIRE = re.compile(r"PR ?Newswire|GLOBE ?NEWSWIRE|Business ?Wire|ACCESS ?WIRE|ACCESS Newswire", re.I)
_DATELINE = re.compile(r"^[A-Z][A-Za-z .'-]+,( [A-Z][A-Za-z.]+,?)*( (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2},? \d{4})?\s*[-–—(/]")
_ADDRESS = re.compile(r"\b[A-Z]{2},? \d{5}\b|^\d+ [A-Z][a-z]+ (Street|St\.|Avenue|Ave\.|Road|Rd\.|Drive|Boulevard|Blvd\.|Parkway)\b")
_ABBREV = {"corp", "inc", "co", "ltd", "llc", "plc", "n.v", "s.a", "jr", "sr", "dr", "mr", "ms", "no", "st", "u.s", "e.g", "i.e", "vs", "approx", "nos"}
_ACRONYMS = {"AI", "CEO", "CFO", "COO", "CTO", "US", "U.S.", "USA", "FDA", "REIT", "ETF", "IPO", "EPS", "LLC", "LP", "II", "III", "NYSE", "M&A", "R&D", "EV", "GAAP"}
_SMALL = {"a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with", "vs"}


def _uncap(title: str) -> str:
    """ACADIA HEALTHCARE ANNOUNCES ... -> Acadia Healthcare Announces ... (short words lower, Q3 kept)."""
    out = []
    for i, w in enumerate(title.split()):
        lw = w.lower()
        keep = re.search(r"\d", w) or w.strip(".,;:()") in _ACRONYMS
        out.append(w if keep else lw if i and lw in _SMALL else w.capitalize())
    return " ".join(out)


_LINK_WORDS = {"and", "or", "of", "the", "for", "to", "with", "in", "on", "its", "a", "an", "&", "at", "by", "as", "from"}


def _opening_sentence(line: str) -> str:
    """"CITY, State, Nov. 5, 2026 /PRNewswire/ -- Company today announced ..." -> "Company today announced ..." """
    body = re.sub(r"^.*?(" + _WIRE.pattern + r")\S*\s*[-–—)/]*\s*", "", line, count=1, flags=re.I)
    if body == line:
        body = re.split(r"\s[-–—]{1,2}\s", line, maxsplit=1)[-1]
    body = re.sub(r"^([A-Z][a-z]+\.? \d{1,2}, \d{4})\s*[-\u2013\u2014]+\s*", "", body)
    sent = body
    for m in re.finditer(r"(?<=[a-z0-9)%])\.\s+(?=[A-Z\"\u201c])", body):
        word = body[:m.start()].rsplit(" ", 1)[-1].lstrip("(")
        if word.lower() not in _ABBREV and not re.fullmatch(r"[A-Z]", word[-1:] or "x"):
            sent = body[:m.start() + 1]
            break
    return (sent[:200].rsplit(" ", 1)[0] + "…") if len(sent) > 200 else sent


def headline(raw: str, company: str = "") -> str | None:
    """The headline of a press release: the first paragraph near the top that reads like a title,
    after the exhibit label, release date, logos, addresses and contact lines. A release without one
    gets its opening sentence, without the dateline. Investor slides are not news: None."""
    lines = _text_lines(raw)[:80]
    for i, line in enumerate(lines):
        if _SKIP.search(line) or _DATE.match(line) or _ADDRESS.search(line) or re.search(r"[A-Za-z]_[A-Za-z]", line):
            continue  # labels, dates, addresses, file names (..._DRAFT_FOR_APPROVAL)
        if _WIRE.search(line[:160]) or (_DATELINE.match(line) and len(line) > 160):
            return _opening_sentence(line)  # reached the body: there was no separate headline
        words = line.split()
        if len(line) < 20 or len(line) > 300 or len(words) < 4 or (line.isupper() and len(words) < 5):
            continue
        title = line
        first = (company or "").split()[:1]
        prev = lines[i - 1] if i else ""
        if first and prev and not title.lower().startswith(first[0].lower().rstrip(",")) and len(prev.split()) <= 2 \
                and prev.lower().startswith(first[0].lower().rstrip(",")):
            title = prev + " " + title  # the company's name sits in its own paragraph above ("Tigo" / "Energy Reports ...")
        if words[-1].lower() in _LINK_WORDS and i + 1 < len(lines) and len(lines[i + 1]) < 140:
            title += " " + lines[i + 1]  # a headline the filer split into two paragraphs mid-phrase
        if re.search(r"\b(corporate|investor|company) presentation\b|\bpresentation\b.*\b20\d\d\b", title, re.I):
            return None
        return (_uncap(title) if title.isupper() else title)[:240]
    return None


UNREAD = object()  # not read yet (out of budget this run, or a network error): try again later


def press_release(cik: str, accession: str, budget: list[int], company: str = "", known: dict | None = None):
    """{"title", "url"} of the press release attached to one 8-K, {} when it has none, UNREAD when
    it could not be read this run. Answers are kept per filing."""
    if known and accession in known:
        return known[accession] or {}
    key = f"pr_{accession}.json.gz"
    cached = edgar.load_artifact(key)
    if cached is not None:
        return cached
    if budget[0] <= 0:
        return UNREAD
    budget[0] -= 1
    folder = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession.replace('-', '')}"
    out = {}
    try:
        idx = edgar.fetch(f"{folder}/{accession}-index.htm").decode("utf-8", "ignore")
        # rows of the document table: Seq, Description, Document (link), Type, Size
        doc = None
        for row in re.findall(r"(?is)<tr[^>]*>(.*?)</tr>", idx):
            cells = re.findall(r"(?is)<td[^>]*>(.*?)</td>", row)
            kind = re.sub(r"<[^>]+>|\s", "", cells[3]) if len(cells) >= 4 else ""
            m = re.search(r'href="([^"]+)"', cells[2]) if len(cells) >= 4 else None
            if m and re.fullmatch(r"EX-99(\.0?1)?", kind):
                doc = m.group(1)
                if kind != "EX-99":
                    break  # 99.1 is the release itself; a plain EX-99 only if there is no 99.1
        if doc:
            url = re.sub(r"/ix\?doc=", "", doc if doc.startswith("http") else "https://www.sec.gov" + doc)
            title = headline(edgar.fetch(url).decode("utf-8", "ignore"), company)
            if title:
                out = {"title": title, "url": url}
    except Exception:
        budget[0] += 1
        return UNREAD
    edgar.save_artifact(key, out)
    return out


def add_press_releases(events: list[dict], known: dict | None = None, log=print) -> dict:
    """Puts {"pr": {...}} on 8-K events that carry a press release, newest first, within the budget.
    Returns every answer so far ({accession: release or 0}), carried to the next run."""
    budget = [PR_BUDGET]
    answers: dict = {}
    for e in sorted((e for e in events if e.get("kind") == "8k"), key=lambda e: e["accepted"], reverse=True):
        m = re.search(r"/edgar/data/(\d+)/", e.get("url") or "")
        if not m or not set(e.get("items") or []) & PR_ITEMS:
            continue
        pr = press_release(m.group(1), e["accession"], budget, e.get("entity") or "", known)
        if pr is UNREAD:
            continue
        answers[e["accession"]] = pr or 0
        if pr:
            e["pr"] = pr
    log(f"Press releases: {sum(1 for v in answers.values() if v)} found, {PR_BUDGET - budget[0]} filings read this run")
    return answers


def _fh(path: str, key: str) -> list | dict:
    req = urllib.request.Request(f"{FINNHUB}{path}&token={key}", headers={"User-Agent": "Mr Fink"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())


def _item(a: dict) -> dict:
    return {"h": a.get("headline", "").strip(), "s": a.get("source") or "", "u": a.get("url") or "",
            "t": int(a.get("datetime") or 0)}


def _names(ticker: str, name: str) -> re.Pattern:
    """Words that mean an article is about this company: its ticker or the start of its name."""
    words = [w for w in re.sub(r"[^A-Za-z0-9&' ]", " ", name).split()
             if w.upper() not in {"INC", "CORP", "CO", "THE", "GROUP", "HOLDINGS", "LTD", "PLC", "COMPANY", "CORPORATION"}]
    # a short ticker (C, MS, GS) only counts in its quoted forms: "(C)", "NYSE: C", "$C"
    t = re.escape(ticker.replace("-", "."))
    terms = [t if len(ticker) > 2 else r"(?<=\()" + t + r"(?=\))|(?<=: )" + t + r"\b|(?<=\$)" + t + r"\b"]
    if words:
        terms.append("(?i:" + (re.escape(words[0]) if len(words[0]) >= 4 else re.escape(" ".join(words[:2]))) + ")")
    return re.compile(r"(?<![A-Za-z])(?:" + "|".join(terms) + r")(?![A-Za-z])")


def company_news(companies: dict[str, str], previous: dict, key: str, log=print) -> dict:
    """{ticker: {"at": epoch, "items": [...]}}: refreshes the stalest within the budget."""
    now = time.time()
    out = {t: v for t, v in (previous or {}).items() if t in companies}
    stale = sorted(companies, key=lambda t: (out.get(t) or {}).get("at", 0))
    todo = [t for t in stale if now - (out.get(t) or {}).get("at", 0) > FH_REFRESH_MIN * 60][:FH_BUDGET]
    frm = (datetime.now(timezone.utc) - timedelta(days=KEEP_DAYS)).date().isoformat()
    to = datetime.now(timezone.utc).date().isoformat()
    done = 0
    for t in todo:
        try:
            arts = _fh(f"/company-news?symbol={t}&from={frm}&to={to}", key)
        except Exception as e:
            log(f"  Finnhub news unavailable for {t}: {e}")
            break  # rate-limited or down: keep the rest as they are
        about = _names(t, companies[t])
        items, seen = [], set()
        for a in sorted(arts if isinstance(arts, list) else [], key=lambda a: -(a.get("datetime") or 0)):
            it = _item(a)
            k = it["h"].lower()[:80]
            if not it["h"] or not it["u"].startswith("http") or k in seen or not about.search(it["h"] + " " + (a.get("summary") or "")[:300]):
                continue
            seen.add(k)
            items.append(it)
            if len(items) >= 8:
                break
        out[t] = {"at": int(now), "items": items}
        done += 1
        time.sleep(1.05)
    cutoff = now - KEEP_DAYS * 86400
    for v in out.values():
        v["items"] = [i for i in v["items"] if i["t"] >= cutoff]
    log(f"Company news: {done} companies refreshed from Finnhub, {sum(1 for v in out.values() if v['items'])} with headlines")
    return out


def market_news(key: str, log=print) -> list[dict]:
    try:
        arts = _fh("/news?category=general", key)
    except Exception as e:
        log(f"  Finnhub market news unavailable: {e}")
        return []
    items, seen = [], set()
    for a in sorted(arts if isinstance(arts, list) else [], key=lambda a: -(a.get("datetime") or 0)):
        it = _item(a)
        if it["h"] and it["u"].startswith("http") and it["h"].lower()[:80] not in seen:
            seen.add(it["h"].lower()[:80])
            items.append(it)
    return items[:20]


def previous(site: str | None, name: str) -> dict:
    """A data file as the live site serves it now (the state the last run left)."""
    if not site:
        return {}
    try:
        with urllib.request.urlopen(f"{site.rstrip('/')}/data/{name}?v={int(time.time())}", timeout=20) as r:
            return json.loads(r.read())
    except Exception:
        return {}


def write(events: list[dict], companies: dict[str, str], log=print) -> None:
    """events: every 8-K event shown on the site (the feed and the company pages' own filings);
    companies: {ticker: name} for the companies whose headlines come from Finnhub."""
    site = os.environ.get("SITE_URL")
    press = add_press_releases(events, previous(site, "press.json"), log)
    PRESS.write_text(json.dumps(press, separators=(",", ":")))
    key = os.environ.get("FINNHUB_KEY")
    prev = previous(site, "news.json")
    data = {"asOf": datetime.now(timezone.utc).isoformat(timespec="seconds"), "source": "Finnhub" if key else None,
            "market": prev.get("market") or [], "companies": prev.get("companies") or {}}
    if key:
        data["market"] = market_news(key, log) or data["market"]
        data["companies"] = company_news(companies, data["companies"], key, log)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
