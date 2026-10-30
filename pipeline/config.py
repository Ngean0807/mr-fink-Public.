"""Manager complexes and pipeline settings.

A "complex" is every SEC filer whose 13F-HR together makes up one asset manager's book.
Entities that file 13F-NT are covered by a sibling's 13F-HR, so summing every 13F-HR in the
complex for a period never double counts.
"""

import os

MANAGERS = [
    {
        "id": "blackrock",
        "name": "BlackRock",
        # BlackRock, Inc. was re-registered under a new CIK after the GIP acquisition (Oct 2024);
        # the old registrant became BlackRock Finance, Inc.
        "ciks": ["0001364742", "0002012383"],
    },
    {
        "id": "vanguard",
        "name": "Vanguard",
        # From Q1 2026 Vanguard Group files 13F-NT and its advisers report separately
        # (Vanguard Portfolio Management / Vanguard Capital Management split, among others).
        "ciks": [
            "0000102909",  # Vanguard Group Inc
            "0002100121",  # Vanguard Portfolio Management LLC
            "0002100119",  # Vanguard Capital Management LLC
            "0000933478",  # Vanguard Fiduciary Trust Co
            "0001550100",  # Vanguard Investments Australia
            "0000217448",  # Vanguard Marketing Corp
            "0001767306",  # Vanguard Personalized Indexing Management
            "0001680208",  # Vanguard Asset Management Ltd
            "0001984256",  # Vanguard National Trust Co
            "0001811242",  # Vanguard Global Advisers
            "0000947529",  # Vanguard Advisers Inc
        ],
    },
    {
        "id": "statestreet",
        "name": "State Street",
        "ciks": ["0000093751"],
    },
]

# Q1 2017 is the first quarter BlackRock, Inc. filed one combined 13F-HR for the whole firm;
# before that its subsidiaries filed separately, so the series would not be comparable.
HISTORY_START = "2017-03-31"
TOP_N = 30
CANDIDATES = 90          # largest CUSIPs screened per manager before excluding funds/ETFs

# OpenFIGI security types that represent an operating company's equity (funds and ETPs are excluded).
COMPANY_SECURITY_TYPES = {"Common Stock", "ADR", "REIT", "NY Reg Shrs", "GDR", "Tracking Stk", "Dutch Cert", "MLP"}

# How stale EDGAR filing indexes may be before they are re-read. The scheduled refresh sets 0 so
# every run sees filings accepted minutes earlier; local runs default to one hour.
SUBMISSIONS_TTL_HOURS = float(os.environ.get("MRFINK_SUBMISSIONS_TTL", "1"))
