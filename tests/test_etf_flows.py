import unittest

from pipeline import etfs


class QuarterFlows(unittest.TestCase):
    def test_month_back_crosses_year(self):
        self.assertEqual(etfs._month_back("2026-02", 3), "2025-11")
        self.assertEqual(etfs._month_back("2026-06", 0), "2026-06")

    def test_common_calendar_quarter(self):
        m = lambda months: {k: {"in": 10.0, "out": 4.0} for k in months}
        rows = [
            {"months": m(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]), "netAssets": 100.0},  # SPDR, June FQ
            {"months": m(["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]), "netAssets": 60.0},  # Vanguard, August FQ
            {"months": m(["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]), "netAssets": 30.0},  # iShares, July FQ
        ]
        self.assertEqual(etfs.quarter_flows(rows), "2026-06")
        for r in rows:
            self.assertEqual(r["flow"]["from"], "2026-04")
            self.assertEqual(r["flow"]["flow"], 18.0)
        self.assertAlmostEqual(rows[0]["flow"]["flowPct"], 0.18)

    def test_fund_missing_a_month_has_no_flow(self):
        full = {k: {"in": 1.0, "out": 0.0} for k in ("2026-04", "2026-05", "2026-06")}
        rows = [{"months": dict(full), "netAssets": 1.0} for _ in range(10)] + [{"months": {"2026-06": {"in": 1.0, "out": 0.0}}, "netAssets": 1.0}]
        self.assertEqual(etfs.quarter_flows(rows), "2026-06")
        self.assertIsNone(rows[-1]["flow"])


if __name__ == "__main__":
    unittest.main()
