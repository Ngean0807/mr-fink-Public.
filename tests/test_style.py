import unittest

from pipeline import style


class StyleTest(unittest.TestCase):
    def test_baseline_is_value_weighted_median(self):
        prev = {f"c{i}": [100.0, 1e9] for i in range(30)}
        now = {f"c{i}": [101.0, 1e9] for i in range(30)}  # every position +1%
        now["c0"] = [150.0, 1e9]  # one big tilt does not move the median
        self.assertAlmostEqual(style.baseline(now, prev), 0.01, places=6)

    def test_classify(self):
        self.assertEqual(style.classify(None, 0.015, 0.01)["kind"], "flows")
        self.assertEqual(style.classify(None, 0.10, 0.01)["kind"], "more")
        self.assertEqual(style.classify(None, -0.05, 0.01)["kind"], "less")
        self.assertEqual(style.classify("new", None, 0.01)["kind"], "new")
        self.assertEqual(style.classify("exited", -1.0, 0.01)["kind"], "exit")
        self.assertIsNone(style.classify(None, 0.02, None))


if __name__ == "__main__":
    unittest.main()
