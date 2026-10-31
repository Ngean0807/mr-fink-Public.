import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from pipeline import notify

EVENTS = [
    {"kind": "13f", "manager": "vanguard", "entity": "VANGUARD CAPITAL MANAGEMENT LLC", "form": "13F-HR", "period": "2026-09-30",
     "filed": "2026-11-13", "accepted": "2026-11-13T21:00:00.000Z", "accession": "A1", "url": "https://www.sec.gov/a1"},
    {"kind": "13g", "manager": "blackrock", "tickers": ["NVDA"], "entity": "BlackRock, Inc.", "form": "SCHEDULE 13G/A", "percent": 0.0812,
     "eventDate": "2026-10-31", "filed": "2026-11-05", "accepted": "2026-11-05T15:00:00.000Z", "accession": "A2", "url": "https://www.sec.gov/a2"},
    {"kind": "report", "tickers": ["BRK.B"], "entity": "BERKSHIRE HATHAWAY INC", "form": "10-Q", "period": "2026-09-30",
     "filed": "2026-11-02", "accepted": "2026-11-02T12:00:00.000Z", "accession": "A3", "url": "https://www.sec.gov/a3"},
]


class NotifyTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.state = Path(self.tmp.name) / "notified.json"
        patcher = mock.patch.object(notify, "STATE", self.state)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(self.tmp.cleanup)

    def run_notify(self, events):
        sent = []
        with mock.patch.dict(os.environ, {"GITHUB_REPOSITORY": "Ngean0807/mr-fink"}, clear=False):
            notify.notify_new(events, send=sent.extend, log=lambda *_: None)
        return sent

    def test_first_run_records_without_sending(self):
        self.assertEqual(self.run_notify(EVENTS[:1]), [])
        self.assertEqual(json.loads(self.state.read_text())["seen"], ["A1"])

    def test_only_new_filings_are_sent_oldest_first(self):
        self.run_notify(EVENTS[:1])
        sent = self.run_notify(EVENTS)
        # Most important first: the 13G stake before the 10-Q.
        self.assertEqual([e["accession"] for e in sent], ["A2", "A3"])
        self.assertEqual(self.run_notify(EVENTS), [])

    def test_new_filing_type_is_recorded_silently(self):
        self.state.write_text(json.dumps(["A1"]))  # state written before 8-Ks were tracked
        later = EVENTS[:1] + [dict(EVENTS[2], kind="8k", key=True, items=["1.01"], labels=["material agreement"], accession="A9")]
        self.assertEqual(self.run_notify(later), [])
        fresh = later + [dict(EVENTS[2], kind="8k", key=True, items=["5.02"], labels=["executive change"], accession="A10", accepted="2026-11-20T00:00:00.000Z")]
        self.assertEqual([e["accession"] for e in self.run_notify(fresh)], ["A10"])

    def test_manager_13f_filings_are_grouped_and_unsent_ones_wait(self):
        self.run_notify(EVENTS[:1])
        burst = [dict(EVENTS[0], accession=f"V{i}", entity=f"VANGUARD ENTITY {i}") for i in range(10)]
        others = [dict(EVENTS[2], accession=f"R{i}", accepted=f"2026-11-0{i}T00:00:00.000Z") for i in range(1, 10)]
        with mock.patch.object(notify, "MAX_PER_RUN", 3):
            sent = self.run_notify(EVENTS[:1] + burst + others)
            self.assertEqual(len([e for e in sent if e["accession"].startswith("V")]), 10)  # one grouped push
            self.assertEqual(len([e for e in sent if e["accession"].startswith("R")]), 2)
            again = self.run_notify(EVENTS[:1] + burst + others)
            self.assertEqual([e["accession"] for e in again], ["R3", "R4", "R5"])
        title = notify.describe_unit(burst)[0]
        self.assertEqual(title, "Vanguard 13F: 10 filings for Q3 2026")

    def test_routing_to_private_and_public_channels(self):
        self.state.write_text(json.dumps({"seen": [], "kinds": sorted(notify.ALL_KINDS)}))
        sent_to = []
        with mock.patch.object(notify, "_send", lambda server, topic, unit, site: sent_to.append((topic, unit[0]["accession"]))), \
             mock.patch.dict(os.environ, {"NTFY_TOPIC": "private-x", "GITHUB_REPOSITORY": "o/r"}), \
             mock.patch.object(notify.config, "public_topics", lambda: {"13f": "pub-13f", "13g": "pub-stakes", "report": "pub-reports"}):
            notify.notify_new(EVENTS[1:], log=lambda *_: None)
        self.assertEqual(sorted(sent_to), sorted([("private-x", "A2"), ("pub-stakes", "A2"), ("private-x", "A3"), ("pub-reports", "A3")]))

    def test_messages_and_links(self):
        title, _, priority, _ = notify.describe(EVENTS[0])
        self.assertEqual((title, priority), ("Vanguard 13F: new holdings for Q3 2026", "high"))
        self.assertEqual(notify.describe(EVENTS[1])[0], "BlackRock owns 8.12% of NVDA")
        self.assertEqual(notify.click_url(EVENTS[2], "https://x.github.io/mr-fink/"), "https://x.github.io/mr-fink/#t-brk-b")
        with mock.patch.dict(os.environ, {"GITHUB_REPOSITORY": "Ngean0807/mr-fink", "SITE_URL": ""}):
            self.assertEqual(notify.site_url(), "https://ngean0807.github.io/mr-fink/")


if __name__ == "__main__":
    unittest.main()


class TickerChannelTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        patcher = mock.patch.object(notify, "TICKER_STATE", Path(self.tmp.name) / "notified_tickers.json")
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(self.tmp.cleanup)

    def run_t(self, events, day="2026-11-02"):
        sent = []
        notify.notify_tickers(events, send=lambda t, e: sent.append((t, e["accession"])), today=day, log=lambda *_: None)
        return sent

    def test_first_run_seeds_then_each_company_gets_its_own_channel(self):
        self.assertEqual(self.run_t(EVENTS), [])
        new = dict(EVENTS[2], accession="A4", accepted="2026-11-03T00:00:00.000Z", tickers=["BRK.B", "BRK.A"])
        sent = self.run_t(EVENTS + [new])
        self.assertEqual(sent, [("mrfink-ngean0807-t-brk-b", "A4"), ("mrfink-ngean0807-t-brk-a", "A4")])
        self.assertEqual(self.run_t(EVENTS + [new]), [])

    def test_manager_13f_has_no_company_channel(self):
        self.run_t([])
        self.assertEqual(self.run_t([dict(EVENTS[0], accession="F1")]), [])

    def test_daily_cap_holds_the_rest_for_tomorrow(self):
        self.run_t([])
        many = [dict(EVENTS[2], accession=f"R{i}", accepted=f"2026-11-02T00:{i:02d}:00.000Z") for i in range(10)]
        with mock.patch.object(notify, "TICKER_MAX_PER_DAY", 4), mock.patch.object(notify, "TICKER_MAX_PER_RUN", 3):
            self.assertEqual(len(self.run_t(many)), 3)
            self.assertEqual(len(self.run_t(many)), 1)            # day cap reached at 4
            self.assertEqual(len(self.run_t(many, day="2026-11-03")), 3)  # new day
