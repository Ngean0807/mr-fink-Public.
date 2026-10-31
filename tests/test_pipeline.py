import unittest

from pipeline import analytics, fundamentals, periods, thirteenf

INFO_TABLE = b"""<?xml version="1.0"?>
<informationTable xmlns="http://www.sec.gov/edgar/document/thirteenf/informationtable">
  <infoTable><nameOfIssuer>APPLE INC</nameOfIssuer><titleOfClass>COM</titleOfClass><cusip>037833100</cusip>
    <value>1000</value><shrsOrPrnAmt><sshPrnamt>10</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt></infoTable>
  <infoTable><nameOfIssuer>APPLE INC</nameOfIssuer><titleOfClass>COM</titleOfClass><cusip>037833100</cusip>
    <value>500</value><shrsOrPrnAmt><sshPrnamt>5</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt></infoTable>
  <infoTable><nameOfIssuer>APPLE INC</nameOfIssuer><titleOfClass>CALL</titleOfClass><cusip>037833100</cusip>
    <value>999</value><shrsOrPrnAmt><sshPrnamt>99</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt><putCall>Call</putCall></infoTable>
  <infoTable><nameOfIssuer>SOME BOND</nameOfIssuer><titleOfClass>NOTE</titleOfClass><cusip>123456AB7</cusip>
    <value>70</value><shrsOrPrnAmt><sshPrnamt>70</sshPrnamt><sshPrnamtType>PRN</sshPrnamtType></shrsOrPrnAmt></infoTable>
</informationTable>"""


class InfoTableTest(unittest.TestCase):
    def test_aggregates_by_cusip_and_skips_options_and_principal(self):
        parsed = thirteenf.parse_info_table(INFO_TABLE, value_multiplier=1000)
        self.assertEqual(parsed["holdings"]["037833100"][:2], [15, 1_500_000])
        self.assertNotIn("123456AB7", parsed["holdings"])
        self.assertEqual(parsed["total"], 1_570_000)
        self.assertEqual(parsed["rows"], 4)


class FundamentalsTest(unittest.TestCase):
    def test_derives_fourth_quarter_from_full_year(self):
        pts = {
            ("2024-01-01", "2024-03-31"): 10, ("2024-04-01", "2024-06-30"): 11, ("2024-01-01", "2024-06-30"): 21,
            ("2024-07-01", "2024-09-30"): 12, ("2024-01-01", "2024-09-30"): 33, ("2024-01-01", "2024-12-31"): 50,
        }
        q = fundamentals.discrete_quarters(pts)
        self.assertEqual(q["2024-12-31"]["val"], 17)
        self.assertTrue(q["2024-12-31"]["derived"])
        self.assertEqual(fundamentals.ttm_series(q)["2024-12-31"], 50)

    def test_sixteen_week_fiscal_fourth_quarter(self):
        # Costco-style year: three 12-week quarters and a 16-week Q4.
        pts = {
            ("2024-09-02", "2024-11-24"): 60, ("2024-11-25", "2025-02-16"): 62,
            ("2025-02-17", "2025-05-11"): 61, ("2024-09-02", "2025-08-31"): 270,
        }
        q = fundamentals.discrete_quarters(pts)
        self.assertEqual(q["2025-08-31"]["val"], 87)
        self.assertEqual(fundamentals.ttm_series(q)["2025-08-31"], 270)


class AnalyticsTest(unittest.TestCase):
    P = ["2024-03-31", "2024-06-30", "2024-09-30"]

    def test_detects_split_agreed_across_managers(self):
        books = {
            "a": {"2024-03-31": {"X": [100, 10_000]}, "2024-06-30": {"X": [1_000, 11_000]}, "2024-09-30": {"X": [1_010, 12_000]}},
            "b": {"2024-03-31": {"X": [50, 5_000]}, "2024-06-30": {"X": [500, 5_400]}, "2024-09-30": {"X": [500, 6_000]}},
        }
        splits = analytics.detect_splits("X", books, self.P)
        self.assertEqual(splits, [{"period": "2024-06-30", "ratio": 10}])
        series = analytics.position_series(["X"], books["a"], self.P, splits)
        self.assertEqual([x["s"] for x in series], [1_000, 1_000, 1_010])

    def test_new_position_and_since_inception(self):
        series = [{"p": "a", "s": 0, "v": 0, "px": None}, {"p": "b", "s": 100, "v": 1000, "px": 10.0}, {"p": "c", "s": 150, "v": 1800, "px": 12.0}]
        m = analytics.position_metrics(series)
        self.assertEqual(m["qoq"]["status"], "added")
        self.assertAlmostEqual(m["qoq"]["trade"] + m["qoq"]["priceEffect"], 800)
        self.assertEqual(m["inception"]["period"], "b")
        self.assertAlmostEqual(m["inception"]["priceReturn"], 0.2)
        self.assertFalse(m["inception"]["atWindowStart"])


class PeriodsTest(unittest.TestCase):
    def test_quarter_ends(self):
        self.assertEqual(periods.quarter_ends("2026-06-30", 3), ["2025-12-31", "2026-03-31", "2026-06-30"])
        self.assertEqual(periods.label("2026-06-30"), "Q2 2026")


if __name__ == "__main__":
    unittest.main()


class SplitFalsePositiveTest(unittest.TestCase):
    def test_buying_by_two_managers_is_not_a_split(self):
        # Lyft, Q4 2025 -> Q1 2026: two managers doubled, one did not, price fell 31%.
        p = ["2025-12-31", "2026-03-31"]
        books = {
            "a": {p[0]: {"X": [22_448_075, 22_448_075 * 19.37]}, p[1]: {"X": [49_000_870, 49_000_870 * 13.30]}},
            "b": {p[0]: {"X": [37_009_463, 37_009_463 * 19.37]}, p[1]: {"X": [41_601_797, 41_601_797 * 13.30]}},
            "c": {p[0]: {"X": [6_999_670, 6_999_670 * 19.37]}, p[1]: {"X": [13_192_493, 13_192_493 * 13.30]}},
        }
        self.assertEqual(analytics.detect_splits("X", books, p), [])


class QuarterStatusTest(unittest.TestCase):
    """13F season: a manager moves to a new quarter only when it has fully reported it."""

    def setUp(self):
        from pipeline import build
        self.qs = build.quarter_status

    def test_partial_complex_keeps_previous_quarter(self):
        rep = {"VPM": {"2026-03-31": "13F-HR", "2026-06-30": "13F-HR", "2026-09-30": "13F-HR"},
               "VCM": {"2026-03-31": "13F-HR", "2026-06-30": "13F-HR"},
               "Vanguard Group": {"2026-03-31": "13F-NT", "2026-06-30": "13F-NT"}}
        latest, prog = self.qs(rep, "2026-11-05")
        self.assertEqual(latest, "2026-06-30")
        self.assertEqual(prog, {"period": "2026-09-30", "filed": ["VPM"], "pending": ["VCM"]})

    def test_complete_when_every_entity_reported(self):
        rep = {"VPM": {"2026-06-30": "13F-HR", "2026-09-30": "13F-HR"}, "VCM": {"2026-06-30": "13F-HR", "2026-09-30": "13F-HR"}}
        self.assertEqual(self.qs(rep, "2026-11-05")[0], "2026-09-30")

    def test_entity_that_stopped_filing_does_not_block_after_the_deadline(self):
        rep = {"BlackRock Finance": {"2024-06-30": "13F-HR"}, "BlackRock Inc": {"2024-06-30": "13F-HR", "2024-09-30": "13F-HR"}}
        self.assertEqual(self.qs(rep, "2024-11-10")[0], "2024-06-30")   # before the deadline: wait
        self.assertEqual(self.qs(rep, "2024-11-20")[0], "2024-09-30")   # after Nov 14: move on

    def test_split_between_quarters(self):
        from pipeline import movers
        self.assertEqual(movers.split_ratio([100, 10_000], [1000, 10_500]), 10)   # 10-for-1, price /10
        self.assertEqual(movers.split_ratio([100, 10_000], [200, 20_000]), 1.0)   # bought more, same price
        self.assertEqual(movers.split_ratio([1000, 10_000], [100, 9_800]), 0.1)   # 1-for-10 reverse split

    def test_quarter_moves_link_cusip_changes_and_skip_funds(self):
        from pipeline import movers
        per = ["2026-03-31", "2026-06-30"]
        book = {"2026-03-31": {"OLD000001": [100, 1000, "ACME CORP", "COM"], "FUND00001": [10, 5000, "SPDR S&P 500", "ETF"],
                               "SOLD00001": [50, 2000, "GONE INC", "COM"], "BUY000001": [10, 100, "UP INC", "COM"]},
                "2026-06-30": {"NEW000001": [100, 1100, "ACME CORP", "COM"], "FUND00001": [20, 10000, "SPDR S&P 500", "ETF"],
                               "BUY000001": [110, 1100, "UP INC", "COM"]}}
        co = {"type": "Common Stock", "ticker": "X"}
        figi = {"OLD000001": co, "NEW000001": co, "SOLD00001": co, "BUY000001": co, "FUND00001": {"type": "ETP", "ticker": "SPY"}}
        m = movers.quarter_moves(book, "2026-06-30", "2026-03-31", per, figi)
        self.assertEqual([r["cusip"] for r in m["bought"]], ["BUY000001"])   # ACME's CUSIP change is not a buy; the ETF is skipped
        self.assertEqual([(r["cusip"], r["status"]) for r in m["sold"]], [("SOLD00001", "exited")])


class MoversPairingTest(unittest.TestCase):
    def test_adr_to_ordinary_is_netted_and_cash_takeover_is_not_a_sale(self):
        from pipeline import movers
        per = ["2026-03-31", "2026-06-30"]
        book = {"2026-03-31": {"ADR000001": [200, 20_000, "ASTRAZENECA PLC SPONSORED ADR", "ADR"], "TGT000001": [10, 1_000, "TARGETCO INC", "COM"],
                               "HOLD00001": [100, 1_000, "KEEP INC", "COM"]},
                "2026-06-30": {"ORD000001": [100, 20_500, "ASTRAZENECA PLC", "ORD"], "HOLD00001": [50, 500, "KEEP INC", "COM"]}}
        co = {"type": "Common Stock", "ticker": "X"}
        figi = {c: co for c in ("ADR000001", "ORD000001", "TGT000001", "HOLD00001")}
        m = movers.quarter_moves(book, "2026-06-30", "2026-03-31", per, figi, universe_now=book["2026-06-30"])
        azn = [r for r in m["bought"] if r["cusip"] == "ORD000001"]
        self.assertTrue(not azn or azn[0]["flow"] < 1_000)                       # 20.5K bought vs 20K sold: netted
        self.assertEqual([r["cusip"] for r in m["sold"]], ["HOLD00001"])         # the takeover target is not "sold"
        self.assertEqual([r["cusip"] for r in m["gone"]], ["TGT000001"])
