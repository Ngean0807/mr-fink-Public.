import unittest

from pipeline import emerging


class EmergingTest(unittest.TestCase):
    def test_frame_name(self):
        self.assertEqual(emerging.frame_name("2026-06-30"), "CY2026Q2I")
        self.assertEqual(emerging.frame_name("2025-12-31"), "CY2025Q4I")

    def test_patterns(self):
        # oldest -> newest, nine quarters
        steady = [0.10, 0.10, 0.10, 0.10, 0.11, 0.12, 0.13, 0.14, 0.15]
        step = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.12, 0.125]
        new = [None, None, None, None, None, None, 0.03, 0.06, 0.08]
        self.assertEqual(emerging.classify(steady, 0), "steady")
        self.assertEqual(emerging.classify(step, 0), "step")
        self.assertEqual(emerging.classify(new, 6), "new")
        self.assertEqual(emerging.classify([0.1, 0.1, 0.1, 0.1, 0.10, 0.12, 0.11, 0.13, 0.12], 0), "rising")


if __name__ == "__main__":
    unittest.main()
