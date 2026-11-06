import unittest

from pipeline import news


class HeadlineTest(unittest.TestCase):
    def test_title_after_labels_and_date(self):
        raw = "<p>Exhibit 99.1</p><p>FOR IMMEDIATE RELEASE</p><p>November 5, 2026</p><p>Certara Reports Third Quarter 2026 Financial Results</p><p>Body text.</p>"
        self.assertEqual(news.headline(raw), "Certara Reports Third Quarter 2026 Financial Results")

    def test_opening_sentence_when_there_is_no_title(self):
        raw = ("<p>NASHVILLE, Tenn., Nov. 5, 2026 /PRNewswire/ -- Acme Corp. (NYSE: ACME) today announced a dividend of $0.40 per share. "
               "More text follows and goes on for long enough to be the body of the release.</p>")
        self.assertEqual(news.headline(raw), "Acme Corp. (NYSE: ACME) today announced a dividend of $0.40 per share.")

    def test_company_name_in_its_own_paragraph_and_all_caps(self):
        self.assertEqual(news.headline("<p>Tigo</p><p>Energy Reports Third Quarter 2026 Financial Results</p>", "Tigo Energy, Inc."),
                         "Tigo Energy Reports Third Quarter 2026 Financial Results")
        self.assertEqual(news.headline("<p>MARVELL AND LUMENTUM TO COMBINE, CREATING A LEADER IN AI CONNECTIVITY</p>"),
                         "Marvell and Lumentum to Combine, Creating a Leader in AI Connectivity")

    def test_not_news(self):
        self.assertIsNone(news.headline("<p>Corporate Presentation November 2026</p>"))
        self.assertEqual(news.headline("<p>FOR RELEASE AT 5:15 AM CT</p><p>Rochester Hills, MI 48309</p><p>Chevron Reports Third Quarter 2026 Results</p>"),
                         "Chevron Reports Third Quarter 2026 Results")


class CompanyFilterTest(unittest.TestCase):
    def test_short_tickers_count_only_in_quoted_forms(self):
        r = news._names("C", "Citigroup Inc.")
        self.assertEqual([bool(r.search(x)) for x in ["Has Citigroup (C) Outpaced", "Series C funding round", "NYSE: C rises", "citigroup cuts"]],
                         [True, False, True, True])
        r = news._names("JPM", "JPMorgan Chase & Co.")
        self.assertEqual([bool(r.search(x)) for x in ["JPM shares", "jpm shares", "Eaton Vance funds"]], [True, False, False])


if __name__ == "__main__":
    unittest.main()
