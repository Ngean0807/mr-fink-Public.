"""Inline web/ (HTML, CSS, JS and data) into single-file builds under dist/.

dist/index.html     standalone page, open directly in a browser
dist/mr-fink.html   the same page without the document wrapper, for hosts that add their own
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
DIST = ROOT / "dist"


def main() -> None:
    html = (WEB / "index.html").read_text()
    css = (WEB / "styles.css").read_text()
    js = (WEB / "app.js").read_text()
    data = json.loads((WEB / "data" / "dashboard.json").read_text())
    payload = json.dumps(data, separators=(",", ":")).replace("</", "<\\/")
    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
    html = html.replace('<script src="app.js"></script>', f"<script>window.MRFINK_DATA={payload};</script>\n<script>\n{js}\n</script>")
    DIST.mkdir(exist_ok=True)
    (DIST / "index.html").write_text(html)
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    head = re.sub(r'<meta charset="utf-8">\s*|<meta name="viewport"[^>]*>\s*', "", head)
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    (DIST / "mr-fink.html").write_text(head.strip() + "\n" + body.strip() + "\n")
    print(f"dist/index.html {len(html)/1024:,.0f} KB")


if __name__ == "__main__":
    main()
