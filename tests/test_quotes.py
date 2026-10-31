import json
import os
import tempfile
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

from pipeline import edgar, quotes


class IntradayCacheTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.patch = mock.patch.object(edgar, "CACHE_DIR", Path(self.tmp.name))
        self.patch.start()
        self.fetched = []

    def tearDown(self):
        self.patch.stop()
        self.tmp.cleanup()

    def fake(self, t):
        self.fetched.append(t)
        return {"price": 1.0, "intraday": [[0, 1.0]]}

    def age(self, t, seconds):
        p = Path(self.tmp.name) / "prices" / f"{t}_5d.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps({"price": 0.5, "intraday": []}))
        old = time.time() - seconds
        os.utime(p, (old, old))

    def test_missing_always_fetched_stale_limited_by_budget(self):
        self.age("AAA", 4000)
        self.age("BBB", 9000)
        self.age("CCC", 60)
        with mock.patch.object(quotes, "intraday", self.fake), mock.patch.object(quotes, "market_open", return_value=True), \
                mock.patch.object(quotes.time, "sleep"):
            out = quotes.intraday_cached(["AAA", "BBB", "CCC", "NEW1", "NEW2"], budget=1, log=lambda *a: None)
        # both missing files, then only the oldest stale one; the fresh copy is left alone
        self.assertEqual(self.fetched, ["NEW1", "NEW2", "BBB"])
        self.assertEqual(set(out), {"AAA", "BBB", "CCC", "NEW1", "NEW2"})
        self.assertEqual(out["AAA"]["price"], 0.5)

    def test_closed_market_keeps_copies(self):
        self.age("AAA", 4000)
        with mock.patch.object(quotes, "intraday", self.fake), mock.patch.object(quotes, "market_open", return_value=False):
            quotes.intraday_cached(["AAA"], budget=10, log=lambda *a: None)
        self.assertEqual(self.fetched, [])

    def test_market_open(self):
        self.assertTrue(quotes.market_open(datetime(2026, 11, 2, 15, 0, tzinfo=timezone.utc)))   # Mon 10:00 ET
        self.assertFalse(quotes.market_open(datetime(2026, 10, 31, 15, 0, tzinfo=timezone.utc)))  # Saturday
        self.assertFalse(quotes.market_open(datetime(2026, 11, 2, 22, 0, tzinfo=timezone.utc)))   # after close


if __name__ == "__main__":
    unittest.main()
