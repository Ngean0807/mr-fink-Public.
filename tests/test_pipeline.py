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
