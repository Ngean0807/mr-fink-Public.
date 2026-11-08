import unittest

from pipeline import daily


def snap(as_of, rows):
    return {"asOf": as_of, "holdings": {k: {"t": k, "n": k, "w": w, "sh": sh} for k, (w, sh) in rows.items()}}


class DailyTest(unittest.TestCase):
    def test_parse_sheet(self):
        rows = [["Fund Name:", "X"], ["Holdings:", "As of 05-Nov-2026"], [],
                ["Name", "Ticker", "Identifier", "SEDOL", "Weight", "Sector", "Shares Held", "Local Currency"],
                ["APPLE INC", "AAPL", "037833100", "2046251", 7.9, "-", 100.0, "USD"],
                ["CBRE GROUP INC   A", "CBRE", "12504L109", "x", 0.1, "-", 5.0, "USD"],
                [], ["Disclaimer text"]]
        p = daily.parse_holdings(rows)
        self.assertEqual(p["asOf"], "2026-11-05")
        self.assertEqual(set(p["holdings"]), {"037833100", "12504L109"})
        self.assertEqual(p["holdings"]["12504L109"]["n"], "CBRE GROUP INC A")

    def test_flow_and_mix(self):
        prev = snap("2026-11-04", {"A": (50, 1000.0), "B": (30, 600.0), "C": (20, 400.0)})
        # 1% inflow scales every holding; B is also cut by 10% on top of that; D is new
        now = snap("2026-11-05", {"A": (50, 1010.0), "B": (27, 600.0 * 1.01 * 0.9), "C": (20, 404.0), "D": (3, 50.0)})
        d = daily.compare(prev, now, 1_000_000_000)
        self.assertAlmostEqual(d["flowPct"], 0.01, places=6)
        self.assertEqual([x["t"] for x in d["adds"]], ["D"])
        self.assertEqual([x["t"] for x in d["mix"]], ["B"])
        self.assertLess(d["mix"][0]["mix"], 0)


if __name__ == "__main__":
    unittest.main()
