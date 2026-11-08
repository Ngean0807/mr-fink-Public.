import unittest
from unittest import mock

from pipeline import votes

XML = b"""<edgarSubmission xmlns:inf="http://www.sec.gov/edgar/document/npxproxy/informationtable"><inf:proxyVoteTable>
<inf:proxyTable><inf:issuerName>ACME</inf:issuerName><inf:cusip>000000001</inf:cusip><inf:meetingDate>05/01/2026</inf:meetingDate>
<inf:voteDescription>Elect Jane Doe</inf:voteDescription><inf:voteCategories><inf:voteCategory><inf:categoryType>DIRECTOR ELECTIONS</inf:categoryType></inf:voteCategory></inf:voteCategories>
<inf:voteSource>ISSUER</inf:voteSource><inf:sharesVoted>100</inf:sharesVoted>
<inf:vote><inf:voteRecord><inf:howVoted>ABSTAIN</inf:howVoted><inf:sharesVoted>10</inf:sharesVoted><inf:managementRecommendation>AGAINST</inf:managementRecommendation></inf:voteRecord>
<inf:voteRecord><inf:howVoted>FOR</inf:howVoted><inf:sharesVoted>90</inf:sharesVoted><inf:managementRecommendation>FOR</inf:managementRecommendation></inf:voteRecord></inf:vote>
<inf:voteSeries>S1</inf:voteSeries></inf:proxyTable>
<inf:proxyTable><inf:issuerName>ACME</inf:issuerName><inf:cusip>000000001</inf:cusip><inf:meetingDate>05/01/2026</inf:meetingDate>
<inf:voteDescription>Elect Jane Doe</inf:voteDescription><inf:voteSource>ISSUER</inf:voteSource>
<inf:vote><inf:voteRecord><inf:howVoted>AGAINST</inf:howVoted><inf:sharesVoted>5</inf:sharesVoted></inf:voteRecord></inf:vote>
<inf:voteSeries>S2</inf:voteSeries></inf:proxyTable>
</inf:proxyVoteTable></edgarSubmission>"""


class VotesTest(unittest.TestCase):
    def test_reads_one_series_and_the_largest_vote_record(self):
        with mock.patch.object(votes.edgar, "fetch", return_value=XML):
            rows = votes.read_votes("x", "S1")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][:7], ["000000001", "ACME", "2026-05-01", "Elect Jane Doe", "DIRECTOR ELECTIONS", "ISSUER", "FOR"])
        self.assertEqual(rows[0][7], 90)

    def test_with_management(self):
        self.assertTrue(votes.with_management({"s": "Company"}, "FOR"))
        self.assertFalse(votes.with_management({"s": "Company"}, "WITHHOLD"))
        self.assertTrue(votes.with_management({"s": "Shareholder"}, "AGAINST"))
        self.assertFalse(votes.with_management({"s": "Shareholder"}, "FOR"))


if __name__ == "__main__":
    unittest.main()
