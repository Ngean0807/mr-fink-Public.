# Mr. Fink push server

A Cloudflare Worker (free tier) that sends Web Push notifications for new SEC filings, so phones
and desktops get them with the site closed, without the ntfy app.

- Browsers subscribe from the bell panel with their filing types and watchlist (`POST /subscribe`).
- Every 5 minutes a cron reads the public site (`data/status.json`, `data/dashboard.json`, and
  `data/co/<ticker>.json` for watched Emerging names) and pushes filings not announced before.
  No secret is shared with the site or GitHub; the VAPID key pair is generated on first use and
  kept in KV.
- Deployed by `.github/workflows/deploy-worker.yml` with the `CLOUDFLARE_API_TOKEN` secret and the
  `CLOUDFLARE_ACCOUNT_ID` variable. The refresh workflow writes the server's public URL into
  `web/data/config.json`.

Free-tier use: about 300 cron runs, a few hundred KV reads and well under 100 KV writes a day.
