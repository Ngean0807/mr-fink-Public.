"""Discover, select and parse Form 13F-HR filings, then aggregate them per manager complex."""
from __future__ import annotations

import io
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass

from . import config, edgar

# SEC switched 13F <value> from thousands of dollars to whole dollars for filings made on/after this date.
DOLLAR_VALUE_CUTOFF = "2023-01-03"


@dataclass(frozen=True)
class Filing:
    cik: str
    entity: str
    form: str
    period: str
    filed: str
    accession: str
    accepted: str = ""

    @property
    def folder(self) -> str:
        return f"https://www.sec.gov/Archives/edgar/data/{int(self.cik)}/{self.accession.replace('-', '')}"

    @property
    def index_url(self) -> str:
        return f"{self.folder}/{self.accession}-index.htm"


def list_filings(cik: str) -> list[Filing]:
    """All 13F-HR and 13F-HR/A filings for one CIK, across the paginated submissions history."""
    cik = cik.zfill(10)
    root = edgar.cached_json(f"https://data.sec.gov/submissions/CIK{cik}.json", ttl_hours=config.SUBMISSIONS_TTL_HOURS)
    blocks = [root["filings"]["recent"]]
    for extra in root["filings"].get("files", []):
        blocks.append(edgar.cached_json(f"https://data.sec.gov/submissions/{extra['name']}", ttl_hours=24 * 7))
    out = []
    for b in blocks:
        for i, form in enumerate(b["form"]):
            if form in ("13F-HR", "13F-HR/A") and b["reportDate"][i]:
                out.append(Filing(cik, root["name"], form, b["reportDate"][i], b["filingDate"][i], b["accessionNumber"][i], b["acceptanceDateTime"][i]))
    return out


def reported_periods(cik: str) -> tuple[str, dict[str, str]]:
    """(entity name, {period: form}) for every 13F report (13F-HR, or 13F-NT for one filed by affiliates)."""
    cik = cik.zfill(10)
    root = edgar.cached_json(f"https://data.sec.gov/submissions/CIK{cik}.json", ttl_hours=config.SUBMISSIONS_TTL_HOURS)
    out: dict[str, str] = {}
    r = root["filings"]["recent"]
    for i, form in enumerate(r["form"]):
        if form.startswith("13F-") and r["reportDate"][i]:
            out.setdefault(r["reportDate"][i], form)
    for f in list_filings(cik):  # older pages of the history
        out.setdefault(f.period, f.form)
    return root["name"], out


def _text(xml: bytes, tag: str) -> str | None:
    m = re.search(rb"<(?:\w+:)?" + tag.encode() + rb">\s*([^<]*?)\s*</", xml)
    return m.group(1).decode() if m else None


def amendment_type(f: Filing) -> str:
    xml = edgar.cached_bytes(f"{f.folder}/primary_doc.xml")
    return (_text(xml, "amendmentType") or "RESTATEMENT").upper()


def select_filings(filings: list[Filing]) -> list[Filing]:
    """For one entity and one period: the effective set of filings.

    A RESTATEMENT amendment supersedes everything filed before it; a NEW HOLDINGS amendment adds rows.
    """
    chosen: list[Filing] = []
    for f in sorted(filings, key=lambda x: (x.accepted or x.filed, x.accession)):
        if f.form == "13F-HR":
            if not chosen:
                chosen = [f]
        elif amendment_type(f) == "RESTATEMENT":
            chosen = [f]
        else:
            chosen.append(f)
    return chosen


def _info_table_url(f: Filing) -> str:
    idx = edgar.cached_json(f"{f.folder}/index.json")
    xmls = [i["name"] for i in idx["directory"]["item"] if i["name"].lower().endswith(".xml") and i["name"] != "primary_doc.xml"]
    if not xmls:
        raise ValueError(f"no information table in {f.accession}")
    return f"{f.folder}/{xmls[0]}"


def parse_info_table(xml: bytes, value_multiplier: int) -> dict:
    """Aggregate an information table by CUSIP. Long share positions only (no options, no principal amounts)."""
    agg: dict[str, list] = {}
    total = 0
    rows = 0
    for _, el in ET.iterparse(io.BytesIO(xml), events=("end",)):
        if not el.tag.endswith("infoTable"):
            continue
        rec = {}
        for child in el.iter():
            rec[child.tag.rsplit("}", 1)[-1]] = (child.text or "").strip()
        el.clear()
        rows += 1
        if rec.get("putCall"):
            continue
        value = int(float(rec.get("value") or 0)) * value_multiplier
        total += value
        if rec.get("sshPrnamtType", "SH").upper() != "SH":
            continue
        cusip = rec.get("cusip", "").upper().strip()
        if len(cusip) != 9:
            continue
        shares = int(float(rec.get("sshPrnamt") or 0))
        slot = agg.get(cusip)
        if slot is None:
            agg[cusip] = [shares, value, rec.get("nameOfIssuer", ""), rec.get("titleOfClass", "")]
        else:
            slot[0] += shares
            slot[1] += value
    return {"holdings": agg, "total": total, "rows": rows}


def load_filing(f: Filing) -> dict:
    key = f"13f_{f.accession}.json.gz"
    cached = edgar.load_artifact(key)
    if cached is not None:
        return cached
    multiplier = 1 if f.filed >= DOLLAR_VALUE_CUTOFF else 1000
    xml = edgar.fetch(_info_table_url(f))
    parsed = parse_info_table(xml, multiplier)
    edgar.save_artifact(key, parsed)
    return parsed


def build_complex(complex_cfg: dict, periods: list[str], log=print) -> dict:
    """Sum every entity's effective 13F-HR per period into one holdings book for the complex."""
    by_key: dict[tuple[str, str], list[Filing]] = defaultdict(list)
    for cik in complex_cfg["ciks"]:
        for f in list_filings(cik):
            if f.period in periods:
                by_key[(f.period, f.cik)].append(f)

    quarters = {}
    for period in periods:
        book: dict[str, list] = {}
        total = 0
        sources = []
        for cik in complex_cfg["ciks"]:
            group = by_key.get((period, cik.zfill(10)))
            if not group:
                continue
            for f in select_filings(group):
                parsed = load_filing(f)
                total += parsed["total"]
                sources.append({"entity": f.entity, "form": f.form, "filed": f.filed, "accession": f.accession, "url": f.index_url, "value": parsed["total"], "rows": parsed["rows"]})
                for cusip, (shares, value, name, cls) in parsed["holdings"].items():
                    slot = book.get(cusip)
                    if slot is None:
                        book[cusip] = [shares, value, name, cls]
                    else:
                        slot[0] += shares
                        slot[1] += value
        if sources:
            quarters[period] = {"book": book, "total": total, "sources": sources}
            log(f"  {complex_cfg['id']:<12} {period}  {len(sources)} filing(s)  ${total/1e12:,.2f}T  {len(book):,} CUSIPs")
        else:
            log(f"  {complex_cfg['id']:<12} {period}  (no 13F-HR found)")
    return quarters
