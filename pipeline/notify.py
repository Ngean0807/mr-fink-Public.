"""Phone push notifications for new SEC filings, sent through ntfy (https://ntfy.sh).

The scheduled refresh remembers which filings it has already announced (in the persisted
cache). On the first run it only records the current feed, so a new setup is not flooded.
Set NTFY_TOPIC (a hard-to-guess topic name, kept as a repository secret) to turn it on.
"""
from __future__ import annotations

import json
import os
import urllib.request

from . import edgar

STATE = edgar.CACHE_DIR / "notified.json"
MAX_PER_RUN = 8


def site_url() -> str:
    """The GitHub Pages address, derived from the repository the workflow runs in."""
    if os.environ.get("SITE_URL"):
        return os.environ["SITE_URL"]
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if "/" not in repo:
        return ""
    owner, name = repo.split("/", 1)
    return f"https://{owner.lower()}.github.io/{name}/"
MANAGER = {"blackrock": "BlackRock", "vanguard": "Vanguard", "statestreet": "State Street"}


def _quarter(period: str) -> str:
    y, m, _ = period.split("-")
    return f"Q{(int(m) - 1) // 3 + 1} {y}"


def describe(e: dict) -> tuple[str, str, str, list[str]]:
    """(title, message, priority, tags) for one feed event."""
    if e["kind"] == "13f":
        who = MANAGER.get(e["manager"], e["entity"])
        if e["form"].startswith("13F-NT"):
            return f"{who} filed a 13F notice", f"{e['entity']}: holdings reported by affiliates", "default", ["page_facing_up"]
        what = "amended holdings" if e["form"].endswith("/A") else "new holdings"
        return f"{who} 13F: {what} for {_quarter(e['period'])}", f"{e['entity']} filed {e['form']}. The dashboard has the updated top 30.", "high", ["bank"]
    if e["kind"] == "13g":
        who = MANAGER.get(e["manager"], e["entity"])
        pct = f"{e['percent'] * 100:.2f}%"
        return f"{who} owns {pct} of {e['tickers'][0]}", f"{e['entity']} filed {e['form'].replace('SCHEDULE ', '')}, as of {e.get('eventDate') or e['filed']}", "default", ["chart_with_upwards_trend"]
    report = "annual report (10-K)" if e["form"].startswith("10-K") else "quarterly report (10-Q)"
    return f"{' / '.join(e['tickers'])} filed its {report}", f"Period ended {e['period']}. Fundamentals on the dashboard are updated.", "low", ["memo"]


def click_url(e: dict, site: str) -> str:
    if not site:
        return e["url"]
    if e.get("tickers"):
        return f"{site.rstrip('/')}/#t-{e['tickers'][0].lower().replace('.', '-')}"
    return f"{site.rstrip('/')}/#{e.get('manager', 'big3')}"


def _send(server: str, topic: str, e: dict, site: str) -> None:
    title, message, priority, tags = describe(e)
    body = json.dumps({
        "topic": topic, "title": title, "message": message, "priority": {"low": 2, "default": 3, "high": 4}[priority],
        "tags": tags, "click": click_url(e, site),
        "actions": [{"action": "view", "label": "SEC filing", "url": e["url"]}],
    }).encode()
    req = urllib.request.Request(server, data=body, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=20).read()


def send_test(log=print) -> None:
    """One confirmation push, for checking the phone setup (workflow input test_notification)."""
    topic = os.environ.get("NTFY_TOPIC")
    if not topic:
        log("Notifications: NTFY_TOPIC is not set, test skipped")
        return
    body = json.dumps({"topic": topic, "title": "Mr. Fink notifications are on",
                       "message": "You will get a push when BlackRock, Vanguard or State Street file with the SEC.",
                       "tags": ["white_check_mark"], "click": site_url() or "https://ntfy.sh"}).encode()
    req = urllib.request.Request(os.environ.get("NTFY_SERVER", "https://ntfy.sh"), data=body, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=20).read()
    log("Notifications: test push sent")


def notify_new(events: list[dict], *, send=None, log=print) -> list[dict]:
    """Announce feed events not seen before. Returns the events that were sent."""
    topic = os.environ.get("NTFY_TOPIC")
    if not topic and send is None:
        return []
    server = os.environ.get("NTFY_SERVER", "https://ntfy.sh")
    site = site_url()
    kinds = set(os.environ.get("NTFY_KINDS", "13f,13g,report").split(","))
    send = send or (lambda e: _send(server, topic, e, site))

    current = [e["accession"] for e in events]
    if not STATE.exists():
        _save(current)
        log(f"Notifications: first run, {len(current)} existing filings recorded, nothing sent")
        return []
    seen = json.loads(STATE.read_text())
    seen_set = set(seen)
    fresh = [e for e in events if e["accession"] not in seen_set and e["kind"] in kinds]
    fresh.sort(key=lambda e: e["accepted"])
    sent = []
    for e in fresh[-MAX_PER_RUN:]:
        try:
            send(e)
            sent.append(e)
        except Exception as err:  # a failed push must never fail the data refresh
            log(f"Notification failed for {e['accession']}: {err}")
    _save(seen + [a for a in current if a not in seen_set])
    log(f"Notifications: {len(sent)} sent, {len(fresh) - len(sent)} skipped")
    return sent


def _save(accessions: list[str]) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(accessions[-5000:]))
