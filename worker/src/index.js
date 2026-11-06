// Mr. Fink push server (Cloudflare Worker + KV, free tier). Every notification Mr. Fink sends goes
// through here.
//
// Browsers subscribe with their filing types and watchlist; every 5 minutes a cron reads the
// public site's data (no secrets shared with the site or GitHub) and sends Web Push for new
// filings. Works with the site closed, on Android, desktop and iPhone (installed app).
// "health" subscribers also hear when the site stops updating (and recovers) and about each new
// data-check warning.
//
//   GET  /vapid        public key the browser subscribes with
//   POST /subscribe    { subscription, kinds, tickers }   (also updates preferences)
//   POST /unsubscribe  { endpoint }
//   POST /test         { endpoint }   one test push to that subscription
//   GET  /health
import { generateVapid, sendPush } from "./webpush.js";

const KINDS = new Set(["13f", "13g", "8k", "report", "nport", "health"]);
const STALE_MIN = 40;          // no fresh data for this long: the refresh is stuck
const MAX_PER_SUB = 3;         // pushes per subscription per run; the rest are summarised
const SEEN_MAX = 4000;

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/vapid") return json({ publicKey: (await vapid(env)).publicKey }, cors);
      if (url.pathname === "/health") return json({ ok: true, subscribers: (await env.PUSH.list({ prefix: "sub:" })).keys.length }, cors);
      if (request.method !== "POST") return json({ error: "not found" }, cors, 404);
      const body = await request.json();
      if (url.pathname === "/subscribe") {
        const sub = body.subscription;
        if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
          return json({ error: "invalid subscription" }, cors, 400);
        }
        const record = {
          subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          kinds: (body.kinds || []).filter((k) => KINDS.has(k)),
          tickers: (body.tickers || []).filter((t) => typeof t === "string" && /^[A-Z0-9.\-]{1,10}$/.test(t)).slice(0, 200),
          updated: new Date().toISOString(),
        };
        await env.PUSH.put("sub:" + (await id(sub.endpoint)), JSON.stringify(record));
        return json({ ok: true }, cors);
      }
      if (url.pathname === "/unsubscribe") {
        await env.PUSH.delete("sub:" + (await id(body.endpoint || "")));
        return json({ ok: true }, cors);
      }
      if (url.pathname === "/test") {
        const rec = await env.PUSH.get("sub:" + (await id(body.endpoint || "")), "json");
        if (!rec) return json({ error: "not subscribed" }, cors, 404);
        const status = await sendPush(rec.subscription, {
          title: "Mr. Fink notifications are on", body: "You will get a push for each new filing you chose, even with the site closed.",
          url: env.SITE_URL, tag: "test",
        }, await vapid(env), env.VAPID_SUBJECT);
        return json({ ok: status < 300, status }, cors);
      }
      return json({ error: "not found" }, cors, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, cors, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkSite(env));
  },
};

/** Read the site, find filings not announced before, push each subscriber what they chose. */
async function checkSite(env) {
  const site = env.SITE_URL.replace(/\/?$/, "/");
  let status = null;
  try { status = await (await fetch(site + "data/status.json?t=" + Date.now(), { cf: { cacheTtl: 0 } })).json(); } catch (e) { /* site down: counts as stale */ }
  await checkHealth(env, site, status);
  if (!status) return;
  const lastFp = await env.PUSH.get("fingerprint");
  const coDue = Date.now() - Number((await env.PUSH.get("coCheckedAt")) || 0) > 30 * 60000;
  if (status.fingerprint === lastFp && !coDue) return;

  const subs = [];
  for (const k of (await env.PUSH.list({ prefix: "sub:" })).keys) {
    const rec = await env.PUSH.get(k.name, "json");
    if (rec) subs.push([k.name, rec]);
  }
  const dash = await (await fetch(site + "data/dashboard.json?t=" + Date.now())).json();
  await announceWarnings(env, site, subs, (dash.meta && dash.meta.warnings) || []);
  let events = (dash.feed || []).slice();
  // Watched companies outside the main feed (Emerging pages) carry their own filings file.
  if (coDue) {
    const inFeed = new Set(Object.values(dash.securities || {}).map((s) => s.ticker));
    const wanted = [...new Set(subs.flatMap(([, r]) => r.tickers))].filter((t) => !inFeed.has(t)).slice(0, 25);
    for (const t of wanted) {
      try {
        const r = await fetch(site + "data/co/" + t.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json");
        if (r.ok) events = events.concat(((await r.json()).security.filings) || []);
      } catch (e) { /* try again next time */ }
    }
    await env.PUSH.put("coCheckedAt", String(Date.now()));
  }
  const seenRaw = await env.PUSH.get("seen", "json");
  const seen = new Set(seenRaw || []);
  const fresh = events.filter((e) => e.accession && !seen.has(e.accession));
  if (fresh.length) await env.PUSH.put("seen", JSON.stringify([...seen, ...fresh.map((e) => e.accession)].slice(-SEEN_MAX)));
  if (status.fingerprint !== lastFp) await env.PUSH.put("fingerprint", status.fingerprint);
  // First run (or lost state): record what is there without announcing months of filings.
  if (!seenRaw || fresh.length > 60) return;

  const keys = await vapid(env);
  for (const [key, rec] of subs) {
    const mine = fresh.filter((e) => (e.tickers || []).some((t) => rec.tickers.includes(t))
      || (rec.kinds.includes(e.kind) && (e.kind !== "8k" || e.key)));
    if (!mine.length) continue;
    const pushes = mine.slice(0, MAX_PER_SUB).map((e) => message(e, site));
    if (mine.length > MAX_PER_SUB) pushes.push({ title: `${mine.length - MAX_PER_SUB} more new SEC filings`, body: "Open Mr. Fink for the full list.", url: site, tag: "more" });
    for (const p of pushes) {
      const code = await sendPush(rec.subscription, p, keys, env.VAPID_SUBJECT).catch(() => 0);
      if (code === 404 || code === 410) { await env.PUSH.delete(key); break; }  // the browser unsubscribed
    }
  }
}

/** Pushes to every subscriber who chose "site health". */
async function pushHealth(env, subs, msg) {
  const keys = await vapid(env);
  for (const [key, rec] of subs) {
    if (!rec.kinds.includes("health")) continue;
    const code = await sendPush(rec.subscription, msg, keys, env.VAPID_SUBJECT).catch(() => 0);
    if (code === 404 || code === 410) await env.PUSH.delete(key);
  }
}
async function allSubs(env) {
  const subs = [];
  for (const k of (await env.PUSH.list({ prefix: "sub:" })).keys) {
    const rec = await env.PUSH.get(k.name, "json");
    if (rec) subs.push([k.name, rec]);
  }
  return subs;
}
/** The site stopped updating (or came back): one push each way. */
async function checkHealth(env, site, status) {
  const at = status && status.checkedAt ? Date.parse(status.checkedAt) : 0;
  const ageMin = at ? (Date.now() - at) / 60000 : Infinity;
  const was = (await env.PUSH.get("health:stale")) === "1";
  if (ageMin > STALE_MIN && !was) {
    await env.PUSH.put("health:stale", "1");
    const since = at ? new Date(at).toISOString().slice(11, 16) + " UTC" : "unknown";
    await pushHealth(env, await allSubs(env), { title: "Mr. Fink stopped updating", body: `No fresh SEC data since ${since}. The refresh may have failed; check GitHub Actions.`, url: site, tag: "health", urgent: true });
  } else if (ageMin <= STALE_MIN && was) {
    await env.PUSH.put("health:stale", "0");
    await pushHealth(env, await allSubs(env), { title: "Mr. Fink is updating again", body: "Fresh SEC data is coming in again.", url: site, tag: "health" });
  }
}
/** Each data-check warning once (the pipeline publishes them with the data). */
async function announceWarnings(env, site, subs, warnings) {
  const seen = new Set((await env.PUSH.get("health:warnings", "json")) || []);
  const fresh = warnings.filter((w) => !seen.has(w));
  if (!fresh.length) return;
  await env.PUSH.put("health:warnings", JSON.stringify([...seen, ...fresh].slice(-300)));
  if (!seen.size && fresh.length > 10) return;  // first run: record, don't flood
  await pushHealth(env, subs, { title: `Mr. Fink data check: ${fresh.length} new warning${fresh.length === 1 ? "" : "s"}`, body: fresh.slice(0, 3).join("\n") + (fresh.length > 3 ? `\n…and ${fresh.length - 3} more` : ""), url: site, tag: "warnings" });
}

const MGR = { blackrock: "BlackRock", vanguard: "Vanguard", statestreet: "State Street" };
const quarter = (p) => (p ? `Q${Math.floor((+p.slice(5, 7) - 1) / 3) + 1} ${p.slice(0, 4)}` : "");

function message(e, site) {
  const t = (e.tickers || [])[0];
  const url = t ? `${site}#t-${t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : `${site}#${e.manager || "big3"}`;
  if (e.kind === "13f") return { title: `${MGR[e.manager] || e.entity} 13F for ${quarter(e.period)}`, body: `${e.entity} filed ${e.form}.`, url, tag: e.accession, urgent: true };
  if (e.kind === "13g") return { title: `${MGR[e.manager] || ""} owns ${(e.percent * 100).toFixed(2)}% of ${t}`, body: `${e.entity} filed ${e.form.replace("SCHEDULE ", "")}`, url, tag: e.accession };
  // the company's own press release headline, when the 8-K carries one
  if (e.kind === "8k") return { title: `${(e.tickers || []).join(" / ")} 8-K: ${(e.labels || []).join(", ") || "current report"}`, body: e.pr ? e.pr.title : e.entity, url, tag: e.accession, urgent: !!e.key };
  if (e.kind === "nport") return { title: `${e.fund} holdings as of ${e.period}`, body: `${e.entity} published its portfolio (N-PORT).`, url, tag: e.accession };
  return { title: `${(e.tickers || []).join(" / ")} filed its ${e.form.startsWith("10-K") ? "annual" : "quarterly"} report`, body: `Period ended ${e.period}.`, url, tag: e.accession };
}

/** The VAPID key pair, generated on first use and kept in KV (no secret to set up by hand). */
async function vapid(env) {
  let v = await env.PUSH.get("vapid", "json");
  if (!v) {
    v = await generateVapid();
    await env.PUSH.put("vapid", JSON.stringify(v));
  }
  return v;
}

async function id(endpoint) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(h)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = new URL(env.SITE_URL).origin;
  return {
    "Access-Control-Allow-Origin": origin === allowed ? origin : allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(obj, headers, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
