"""Israeli companies listed in the US: who holds them, what changed, prices in dollars and shekels.

The list is Israeli-founded or Israel-headquartered companies with a US listing (kept only if the
SEC's ticker list still has them, so delistings drop out by themselves). Ownership comes from
the ownership index (pipeline/owners.py) and the famous investors' books (pipeline/gurus.py);
prices and the dollar-shekel rate from Yahoo Finance. Writes web/data/israel.json.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from . import gurus, owners, quotes, securities

OUT = Path(__file__).resolve().parent.parent / "web" / "data" / "israel.json"

# (ticker, short name, field)
COMPANIES = [
    ("TEVA", "Teva Pharmaceutical", "Pharma"), ("CHKP", "Check Point Software", "Cyber security"), ("NICE", "NICE", "Software"),
    ("MBLY", "Mobileye", "Autonomous driving"), ("CYBR", "CyberArk", "Cyber security"), ("WIX", "Wix.com", "Software"),
    ("MNDY", "monday.com", "Software"), ("ESLT", "Elbit Systems", "Defense"), ("ICL", "ICL Group", "Chemicals"),
    ("TSEM", "Tower Semiconductor", "Semiconductors"), ("NVMI", "Nova", "Semiconductors"), ("CAMT", "Camtek", "Semiconductors"),
    ("GLBE", "Global-e Online", "E-commerce"), ("SEDG", "SolarEdge", "Solar energy"), ("FVRR", "Fiverr", "Internet"),
    ("INMD", "InMode", "Medical devices"), ("LMND", "Lemonade", "Insurance"), ("ZIM", "ZIM Integrated Shipping", "Shipping"),
    ("FROG", "JFrog", "Software"), ("CLBT", "Cellebrite", "Digital forensics"), ("ENLT", "Enlight Renewable Energy", "Renewable energy"),
    ("PLTK", "Playtika", "Gaming"), ("RDWR", "Radware", "Cyber security"), ("CGNT", "Cognyte", "Software"),
    ("AUDC", "AudioCodes", "Communications"), ("ALLT", "Allot", "Cyber security"), ("GILT", "Gilat Satellite Networks", "Communications"),
    ("ITRN", "Ituran", "Telematics"), ("SMWB", "Similarweb", "Software"), ("RSKD", "Riskified", "E-commerce"),
    ("TBLA", "Taboola", "Advertising"), ("PERI", "Perion Network", "Advertising"), ("INVZ", "Innoviz", "Autonomous driving"),
    ("NNOX", "Nano-X Imaging", "Medical devices"), ("KRNT", "Kornit Digital", "Printing technology"), ("MGIC", "Magic Software", "Software"),
    ("FORTY", "Formula Systems", "Software"), ("SPNS", "Sapiens", "Software"), ("ARBE", "Arbe Robotics", "Autonomous driving"),
    ("REE", "REE Automotive", "Electric vehicles"), ("SILC", "Silicom", "Networking"),
]


def build(log=print) -> dict:
    securities.sec_company("AAPL")  # loads the SEC ticker list
    rows_in = [(t, n, f) for t, n, f in COMPANIES if securities.sec_company(t)]
    tickers = [t for t, _, _ in rows_in]
    q = quotes.batch_quotes(tickers + ["ILS=X"], log=lambda *a: None)
    fx = (q.get("ILS=X") or {}).get("price")
    idx = json.loads(owners.OUT.read_text()) if owners.OUT.exists() else {"rows": {}}
    g = json.loads(gurus.OUT.read_text()) if gurus.OUT.exists() else {"managers": []}
    out_rows = []
    for t, name, field in rows_in:
        px = q.get(t) or {}
        own = idx["rows"].get(t)
        famous = [m["id"] for m in g["managers"] if any(r.get("t") == t for r in m["top"] + m["buys"])]
        out_rows.append({"t": t, "n": name, "f": field, "price": px.get("price"), "prev": px.get("prevClose"), "own": own, "famous": famous})
    out = {"asOf": datetime.now(timezone.utc).isoformat(timespec="seconds"), "usdils": fx, "rows": out_rows, "ownersPending": idx.get("pending", 0)}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    log(f"israel: {len(out_rows)} companies, USD/ILS {fx}")
    return out


if __name__ == "__main__":
    build()
