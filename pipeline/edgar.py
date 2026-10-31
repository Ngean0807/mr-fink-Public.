"""Polite SEC EDGAR client with an on-disk cache.

SEC asks automated clients to identify themselves and stay under 10 requests/sec:
https://www.sec.gov/os/accessing-edgar-data
"""
from __future__ import annotations

import gzip
import json
import os
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

USER_AGENT = os.environ.get("SEC_USER_AGENT", "MrFink 13F Dashboard research@example.com")
CACHE_DIR = Path(os.environ.get("MRFINK_CACHE", Path(__file__).resolve().parent.parent / ".cache"))
MIN_INTERVAL = 0.125  # 8 req/s, comfortably under SEC's 10 req/s ceiling

_lock = threading.Lock()
_last_request = 0.0


def _throttle() -> None:
    global _last_request
    with _lock:
        wait = MIN_INTERVAL - (time.monotonic() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.monotonic()


def fetch(url: str, *, data: bytes | None = None, headers: dict | None = None, retries: int = 5) -> bytes:
    hdrs = {"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"}
    hdrs.update(headers or {})
    for attempt in range(retries):
        if "sec.gov" in url:
            _throttle()
        req = urllib.request.Request(url, data=data, headers=hdrs)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    body = gzip.decompress(body)
                return body
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise
            if e.code not in (403, 429, 500, 502, 503, 504) or attempt == retries - 1:
                raise
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt == retries - 1:
                raise
        time.sleep(2 ** attempt)
    raise RuntimeError(f"unreachable: {url}")


def _cache_path(key: str) -> Path:
    safe = key.replace("https://", "").replace("/", "_").replace("?", "_")
    return CACHE_DIR / safe


def cached_bytes(url: str, *, ttl_hours: float | None = None, version: str | None = None) -> bytes:
    """Fetch with a disk cache. ttl_hours=None means the resource is immutable (EDGAR archives);
    `version` keys the cache entry so it is refetched as soon as the version changes."""
    path = _cache_path(url + (f"@{version}" if version else ""))
    if path.exists() and (ttl_hours is None or time.time() - path.stat().st_mtime < ttl_hours * 3600):
        return path.read_bytes()
    body = fetch(url)
    path.parent.mkdir(parents=True, exist_ok=True)
    if version:
        # Drop superseded versions of the same resource (e.g. company facts before the latest 10-Q).
        for stale in path.parent.glob(_cache_path(url).name + "@*"):
            stale.unlink(missing_ok=True)
    path.write_bytes(body)
    return body


def cached_json(url: str, *, ttl_hours: float | None = None, version: str | None = None):
    return json.loads(cached_bytes(url, ttl_hours=ttl_hours, version=version))


def forget(url: str) -> None:
    """Drop a cached response (e.g. an error body the server returned with status 200)."""
    _cache_path(url).unlink(missing_ok=True)


def load_artifact(name: str):
    path = CACHE_DIR / "derived" / name
    if path.exists():
        with gzip.open(path, "rt") as f:
            return json.load(f)
    return None


def save_artifact(name: str, obj) -> None:
    path = CACHE_DIR / "derived" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wt") as f:
        json.dump(obj, f, separators=(",", ":"))
