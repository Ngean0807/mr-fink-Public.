"""Calendar quarter-end helpers."""
from datetime import date

QUARTER_ENDS = ((3, 31), (6, 30), (9, 30), (12, 31))


def quarter_ends(latest: str, count: int) -> list[str]:
    """`count` quarter-end dates (ISO, ascending) ending at `latest`."""
    y, m, _ = map(int, latest.split("-"))
    q = (m - 1) // 3
    out = []
    for _ in range(count):
        mm, dd = QUARTER_ENDS[q]
        out.append(date(y, mm, dd).isoformat())
        q -= 1
        if q < 0:
            q, y = 3, y - 1
    return out[::-1]


def label(period: str) -> str:
    y, m, _ = period.split("-")
    return f"Q{(int(m) - 1) // 3 + 1} {y}"


def next_quarter(period: str) -> str:
    y, m, _ = map(int, period.split("-"))
    q = (m - 1) // 3 + 1
    if q == 4:
        y, q = y + 1, 0
    mm, dd = QUARTER_ENDS[q]
    return date(y, mm, dd).isoformat()


def filing_deadline(period: str) -> str:
    """13F reports are due 45 days after the quarter end."""
    return date.fromordinal(date.fromisoformat(period).toordinal() + 45).isoformat()
