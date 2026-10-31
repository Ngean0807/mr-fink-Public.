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
            notify.notify_new(events, send=sent.append, log=lambda *_: None)
        return sent

    def test_first_run_records_without_sending(self):
        self.assertEqual(self.run_notify(EVENTS[:1]), [])
        self.assertEqual(json.loads(self.state.read_text())["seen"], ["A1"])

    def test_only_new_filings_are_sent_oldest_first(self):
        self.run_notify(EVENTS[:1])
        sent = self.run_notify(EVENTS)
        self.assertEqual([e["accession"] for e in sent], ["A3", "A2"])
        self.assertEqual(self.run_notify(EVENTS), [])

    def test_new_filing_type_is_recorded_silently(self):
        self.state.write_text(json.dumps(["A1"]))  # state written before 8-Ks were tracked
        later = EVENTS[:1] + [dict(EVENTS[2], kind="8k", key=True, items=["1.01"], labels=["material agreement"], accession="A9")]
        self.assertEqual(self.run_notify(later), [])
        fresh = later + [dict(EVENTS[2], kind="8k", key=True, items=["5.02"], labels=["executive change"], accession="A10", accepted="2026-11-20T00:00:00.000Z")]
        self.assertEqual([e["accession"] for e in self.run_notify(fresh)], ["A10"])

    def test_messages_and_links(self):
        title, _, priority, _ = notify.describe(EVENTS[0])
        self.assertEqual((title, priority), ("Vanguard 13F: new holdings for Q3 2026", "high"))
        self.assertEqual(notify.describe(EVENTS[1])[0], "BlackRock owns 8.12% of NVDA")
        self.assertEqual(notify.click_url(EVENTS[2], "https://x.github.io/mr-fink/"), "https://x.github.io/mr-fink/#t-brk-b")
        with mock.patch.dict(os.environ, {"GITHUB_REPOSITORY": "Ngean0807/mr-fink", "SITE_URL": ""}):
            self.assertEqual(notify.site_url(), "https://ngean0807.github.io/mr-fink/")


if __name__ == "__main__":
    unittest.main()
