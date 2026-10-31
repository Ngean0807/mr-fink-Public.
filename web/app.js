/* Mr. Fink: Big Three 13F holdings. Plain browser JS, no dependencies. */
(function () {
  "use strict";

  const VIEWS = ["big3", "blackrock", "vanguard", "statestreet"];
  const MGRS = ["blackrock", "vanguard", "statestreet"];
  const MGR_VAR = { blackrock: "--blk", vanguard: "--vg", statestreet: "--ss" };
  const MGR_NAME = { big3: "Big Three", blackrock: "BlackRock", vanguard: "Vanguard", statestreet: "State Street" };
  const RANGES = [["1Y", 4], ["3Y", 12], ["5Y", 20], ["Max", Infinity]];
  const SECTOR_COLOR = {
    "Information Technology": "#1a73e8", "Communication Services": "#9334e6", "Consumer Discretionary": "#b45309",
    "Consumer Staples": "#188038", "Health Care": "#c5156f", "Financials": "#12737d", "Industrials": "#5f6368",
    "Energy": "#b31412", "Materials": "#795548", "Utilities": "#4e6e1e", "Real Estate": "#3949ab",
  };
  const POLL_MS = 60_000;
  // A bundled copy carries its data inline and never polls; the hosted site fetches and polls.
  const HOSTED = !window.MRFINK_DATA && location.protocol.startsWith("http");

  let D = null;
  let status = null;
  const state = {
    cmp: (() => { try { return localStorage.getItem("mrfink.cmp") === "1"; } catch (e) { return false; } })(),
    view: "big3", page: "home", slug: null, range: "5Y", pxRange: "1D", homeMode: "combined", coMode: "price",
    tab: "overview", sort: { key: "rank", dir: 1 }, filter: "", feedTab: "all", feedMore: false, movers: "bought",
    em: { pmin: 2, pmax: 30, mcap: 3e9, pattern: "all", hideDeals: true, hideThin: true, allThree: false, sort: "stakeChangeYoY", dir: -1, limit: 100 },
  };

  // ---------- watchlist (kept in this browser) ----------
  let watch = [];
  try { watch = JSON.parse(localStorage.getItem("mrfink.watch") || "[]").filter((t) => typeof t === "string"); } catch (e) { watch = []; }
  const isWatched = (t) => watch.includes(t);
  function toggleWatch(t) {
    watch = isWatched(t) ? watch.filter((x) => x !== t) : watch.concat(t);
    try { localStorage.setItem("mrfink.watch", JSON.stringify(watch)); } catch (e) { /* storage unavailable */ }
    toast(isWatched(t) ? `${t} added to your watchlist` : `${t} removed from your watchlist`);
  }

  // ---------- formatting ----------
  const SCALE = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  function compact(v) {
    if (v == null || !isFinite(v)) return "—";
    const sign = v < 0 ? "-" : "";
    let a = Math.abs(v);
    if (a < 1000) return sign + (a >= 100 ? a.toFixed(0) : a >= 10 ? a.toFixed(1) : a.toFixed(2));
    // Round to three significant figures first, so 999.6M becomes 1.00B rather than 1000M.
    const p = Math.pow(10, Math.floor(Math.log10(a)) - 2);
    a = Math.round(a / p) * p;
    for (const [n, s] of SCALE) {
      if (a >= n) {
        const x = a / n;
        return sign + x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2) + s;
      }
    }
    return sign + a.toFixed(0);
  }
  const usd = (v) => (v == null || !isFinite(v) ? "—" : (v < 0 ? "-$" : "$") + compact(Math.abs(v)));
  const usdS = (v) => (v == null || !isFinite(v) ? "—" : (v > 0 ? "+$" : v < 0 ? "-$" : "$") + compact(Math.abs(v)));
  const num = (v) => compact(v);
  const numS = (v) => (v == null ? "—" : (v > 0 ? "+" : "") + compact(v));
  function pct(x, digits = 2, signed = true) {
    if (x == null || !isFinite(x)) return "—";
    const v = x * 100;
    const a = Math.abs(v);
    const s = a >= 1000 ? Math.round(v).toLocaleString("en-US") : v.toFixed(a >= 100 ? 0 : digits);
    return (signed && v > 0 ? "+" : "") + s + "%";
  }
  const mult = (x) => (x == null || !isFinite(x) ? "—" : x.toFixed(x >= 100 ? 0 : 1) + "×");
  const price = (x) => (x == null ? "—" : "$" + x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const trim = (t) => t.replace(/\.0+(?=[A-Z]?$)/, "").replace(/(\.\d*?[1-9])0+(?=[A-Z]?$)/, "$1");
  const axisUsd = (v) => (v === 0 ? "$0" : (v < 0 ? "-$" : "$") + trim(compact(Math.abs(v))));
  const axisNum = (v) => (v === 0 ? "0" : trim(compact(v)));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const qlabel = (p) => { const [y, m] = p.split("-"); return `Q${Math.floor((+m - 1) / 3) + 1} ${y}`; };
  const qshort = (p) => qlabel(p).replace(" 20", " ’");
  const d0 = (iso) => new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  const dateL = (iso) => (iso ? d0(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—");
  const monthL = (iso) => d0(iso).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) + " ’" + iso.slice(2, 4);
  function ago(iso) {
    const s = (Date.now() - d0(iso).getTime()) / 1000;
    if (s < 90) return "just now";
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`;
    return dateL(iso);
  }
  const NAME_FIX = { "AMAZON COM INC": "Amazon.com Inc.", "ELI LILLY & Co": "Eli Lilly and Co.", "Nvidia Corp": "NVIDIA Corp.", "Nvidia Corp.": "NVIDIA Corp." };
  function niceName(n) {
    if (!n) return "";
    if (NAME_FIX[n]) return NAME_FIX[n];
    let s = n.replace(/\s*\/[A-Z]+\/?\s*$/i, "").replace(/\s+\/NEW$/i, "");
    const letters = s.replace(/[^A-Za-z]/g, "");
    if (letters.replace(/[^A-Z]/g, "").length / (letters.length || 1) > 0.8) {
      s = s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase())
        .replace(/\bInc\b\.?/g, "Inc.").replace(/\bCorp\b\.?/g, "Corp.").replace(/\bCo\b\.?/g, "Co.")
        .replace(/\bKla\b/, "KLA").replace(/\bJpmorgan\b/, "JPMorgan").replace(/\bRtx\b/, "RTX");
    }
    return NAME_FIX[s] || s;
  }
  const ARROW_UP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>';
  const ARROW_DN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/></svg>';
  /** Google-style change pill: arrow plus absolute percentage on a tinted background. */
  function pill(x, { sm = false, eps = 0.00005 } = {}) {
    if (x == null || !isFinite(x)) return `<span class="change flat${sm ? " sm" : ""}">—</span>`;
    const dir = x > eps ? "up" : x < -eps ? "down" : "flat";
    const label = dir === "up" ? "up " : dir === "down" ? "down " : "";
    return `<span class="change ${dir}${sm ? " sm" : ""}"><span class="sr">${label}</span>${dir === "up" ? ARROW_UP : dir === "down" ? ARROW_DN : ""}${pct(Math.abs(x), 2, false)}</span>`;
  }
  function signed(x, fmt = pct, eps = 0.00005) {
    if (x == null || !isFinite(x)) return '<span class="na">—</span>';
    return `<span class="${x > eps ? "txt-up" : x < -eps ? "txt-down" : ""}">${fmt(x)}</span>`;
  }
  const mColor = (id) => `var(${MGR_VAR[id]})`;
  const slugOf = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // ---------- data access ----------
  const $ = (id) => document.getElementById(id);
  const sec = (c) => D.securities[c];
  const view = () => D.views[state.view];
  const holder = (c, vid) => (sec(c).holders || {})[vid];
  const lastOf = (h) => h.series[h.series.length - 1];
  const bySlug = (slug) => Object.values(D.securities).find((s) => slugOf(s.ticker) === slug);
  function rangeStart(n) {
    const r = RANGES.find(([k]) => k === state.range)[1];
    return Math.max(0, n - 1 - r);
  }
  function rangeLabel() {
    return { "1Y": "past year", "3Y": "past 3 years", "5Y": "past 5 years", Max: `since ${qlabel(D.meta.periods[0])}` }[state.range];
  }
  const tkChip = (s) => `<span class="tk" style="--tk:${SECTOR_COLOR[s.sector] || "#5f6368"}">${esc(s.ticker)}</span>`;
  const dot = (id) => `<span class="mdot" style="background:${mColor(id)}"></span>`;

  // ---------- market prices ----------
  // Three tiers: "realtime" (Finnhub websocket trades, needs a key in data/config.json),
  // "delayed" (data/quotes.json, refreshed by the scheduled pipeline) and "snapshot" (saved copy).
  const PX_RANGES = [["1D", 1], ["5D", 5], ["1M", 31], ["6M", 183], ["YTD", 0], ["1Y", 365], ["5Y", 1826], ["Max", Infinity]];
  let Q = {};
  let H = null;
  let priceMode = "snapshot";
  const NYF = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit", hourCycle: "h23" });
  function marketOpen(ms = Date.now()) {
    const p = Object.fromEntries(NYF.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    const min = (+p.hour % 24) * 60 + +p.minute;
    return !["Sat", "Sun"].includes(p.weekday) && min >= 570 && min < 960;
  }
  const timeNY = (sec) => new Date(sec * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
  const dayNY = (sec) => new Date(sec * 1000).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
  const pxOf = (t) => (Q[t] && Q[t].price) || null;
  const dayChg = (t) => (Q[t] && Q[t].price && Q[t].prevClose ? Q[t].price / Q[t].prevClose - 1 : null);
  function stamp(t) {
    const q = Q[t];
    if (!q || !q.time) return "No market price available";
    const fresh = Date.now() / 1000 - q.time < 1800;
    if (priceMode === "snapshot") return `Saved copy · prices as of ${dayNY(q.time)}, ${timeNY(q.time)} ET`;
    if (marketOpen() && fresh) return `${priceMode === "realtime" ? "Real-time" : "Delayed up to 5 min"} · ${timeNY(q.time)} ET`;
    return `At close · ${dayNY(q.time)}, ${timeNY(q.time)} ET`;
  }
  /** Values that move with the market. Rendered once, then patched in place on every tick. */
  function liveVal(kind, t, n) {
    const p = pxOf(t);
    const f = (bySlug(slugOf(t)) || {}).fundamentals || {};
    switch (kind) {
      case "px": return price(p);
      case "pill": return pill(dayChg(t), { sm: true });
      case "pillLg": return pill(dayChg(t));
      case "chgabs": { const q = Q[t]; if (!q || !q.prevClose || !p) return "—"; const d = p - q.prevClose; return `<span class="${d >= 0 ? "txt-up" : "txt-down"}">${d >= 0 ? "+" : "-"}${price(Math.abs(d)).slice(1)}</span>`; }
      case "mcap": { const so = f.sharesOutstanding || emShares(t); return p && so ? usd(p * so) : "n/a"; }
      case "pe": return p && f.epsTTM > 0 ? mult(p / f.epsTTM) : "—";
      case "val": return p ? usd(p * n) : "—";
      case "stamp": return esc(stamp(t));
      case "mtm": return mtm();
      case "dayr": { const q = Q[t] || {}; return rangeMeter(q.dayLow, q.dayHigh, p); }
      case "yearr": { const [lo, hi] = yearRange(t); return rangeMeter(lo, hi, p); }
      default: return "";
    }
  }
  /** Shares outstanding the Emerging screen measured (balance sheet at the quarter end), by ticker. */
  let emSO = null;
  const emShares = (t) => {
    if (!emSO) emSO = Object.fromEntries((D.emerging ? D.emerging.rows : []).map((r) => [r.ticker, r.sharesOutstanding]));
    return emSO[t] || null;
  };
  /** 52-week low and high: the quote's own figures, else the last year of daily closes. */
  function yearRange(t) {
    const q = Q[t] || {};
    if (q.low52 && q.high52) return [q.low52, q.high52];
    const h = histOf(t);
    if (!h) return [null, null];
    const from = Date.now() - 365 * 86400000;
    const c = h.c.filter((_, i) => h.ms[i] >= from);
    return c.length ? [Math.min(...c), Math.max(...c)] : [null, null];
  }
  /** Low – high with a marker at today's price, as in a quote page's range row. */
  function rangeMeter(lo, hi, p) {
    if (!lo || !hi || hi <= lo) return lo && hi ? `${price(lo)} – ${price(hi)}` : "—";
    const at = p ? Math.max(0, Math.min(1, (p - lo) / (hi - lo))) : null;
    return `<span class="rmeter" title="${at == null ? "" : Math.round(at * 100) + "% of the way from low to high"}"><span>${price(lo)}</span><i>${at == null ? "" : `<b style="left:${(at * 100).toFixed(1)}%"></b>`}</i><span>${price(hi)}</span></span>`;
  }
  const live = (kind, t, n = "", tag = "span") => `<${tag} data-live="${kind}" data-t="${esc(t)}"${n !== "" ? ` data-n="${n}"` : ""}>${liveVal(kind, t, n)}</${tag}>`;
  function mtm() {
    const v = view();
    let now = 0, then = 0;
    for (const r of v.rows) { const p = pxOf(sec(r.cusip).ticker); if (!p) continue; now += r.shares * p; then += r.value; }
    if (!then) return "—";
    return `<b>${usd(now)}</b> ${pill(now / then - 1, { sm: true })} <span class="muted">vs ${dateL(D.meta.latest)}</span>`;
  }
  let dirty = new Set(), flushTimer = null, lastChartDraw = 0;
  function setQuote(t, patch, trade = false) {
    const q = Q[t] || (Q[t] = { intraday: [] });
    const before = q.price;
    Object.assign(q, patch);
    if (trade && patch.price) {
      q.intraday = q.intraday || [];
      const last = q.intraday[q.intraday.length - 1];
      if (last && patch.time - last[0] < 300) last[1] = patch.price;
      else q.intraday.push([patch.time, patch.price]);
      if (q.dayHigh != null) q.dayHigh = Math.max(q.dayHigh, patch.price);
      if (q.dayLow != null) q.dayLow = Math.min(q.dayLow, patch.price);
    }
    if (before !== q.price) {
      q.dir = before == null ? 0 : q.price > before ? 1 : -1;
      dirty.add(t);
      if (!flushTimer) flushTimer = setTimeout(flush, 350);
    }
  }
  function flush() {
    flushTimer = null;
    const changed = dirty;
    dirty = new Set();
    document.querySelectorAll("[data-live]").forEach((n) => {
      const t = n.dataset.t;
      if (n.dataset.live !== "mtm" && n.dataset.live !== "stamp" && !changed.has(t)) return;
      n.innerHTML = liveVal(n.dataset.live, t, n.dataset.n ? +n.dataset.n : "");
      if (n.dataset.live === "px" && Q[t] && Q[t].dir) {
        n.classList.remove("flash-up", "flash-down");
        void n.offsetWidth;
        n.classList.add(Q[t].dir > 0 ? "flash-up" : "flash-down");
      }
    });
    const s = state.page === "company" && bySlug(state.slug);
    if (s && changed.has(s.ticker) && state.coMode === "price" && ["1D", "5D"].includes(state.pxRange) && Date.now() - lastChartDraw > 15000) drawCoChart(s);
  }
  // Intraday series live in quotes.json, fetched the first time a 1D or 5D chart needs them.
  let intradayLoad = null;
  function loadIntraday() {
    if (!intradayLoad) {
      intradayLoad = fetch("data/quotes.json", { cache: "no-store" }).then((r) => r.json()).then((data) => {
        for (const [t, q] of Object.entries(data.quotes || {})) {
          if (q.intraday) (Q[t] || (Q[t] = {})).intraday = Q[t] && Q[t].intraday && Q[t].intraday.length > q.intraday.length ? Q[t].intraday : q.intraday;
        }
      }).catch(() => {});
    }
    return intradayLoad;
  }
  /** Compact daily closes (first day, day gaps, cents) to timestamps and dollars. */
  function decodeHistory(h) {
    let d = h.d0;
    const ms = [d * 86400000];
    for (const g of h.dd) { d += g; ms.push(d * 86400000); }
    return { ms, c: h.c.map((x) => x / 100) };
  }
  function loadHistory() {
    if (H) return Promise.resolve(H);
    const src = window.MRFINK_HISTORY ? Promise.resolve(window.MRFINK_HISTORY) : fetch("data/history.json").then((r) => r.json());
    return src.then((raw) => {
      H = {};
      for (const [t, h] of Object.entries(raw)) H[t] = decodeHistory(h);
      return H;
    }).catch(() => (H = {}));
  }
  // Emerging names outside the main data file have their own file (data/co/<slug>.json), fetched
  // when the company page opens: profile, ownership, fundamentals, price history and intraday.
  const HL = {};
  const histOf = (t) => (H && H[t]) || HL[t] || null;
  const coLoads = {};
  function loadCompany(slug) {
    if (!coLoads[slug]) {
      coLoads[slug] = fetch(`data/co/${slug}.json`, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      }).then(({ security: s, history: h, quote: q }) => {
        D.securities[s.cusip] = { ...s, lite: true };
        if (h && h.c && h.c.length) HL[s.ticker] = decodeHistory(h);
        if (q) {
          const cur = Q[s.ticker] || (Q[s.ticker] = {});
          for (const [k, v] of Object.entries(q)) if (cur[k] == null || (k === "intraday" && !(cur.intraday || []).length)) cur[k] = v;
        }
        return true;
      }).catch(() => { delete coLoads[slug]; return false; });
    }
    return coLoads[slug];
  }
  // Finnhub's free tier streams at most 50 symbols per connection, so only what is on screen is
  // subscribed; navigating swaps the set. Opening quotes come over REST (60 calls a minute).
  const WS_LIMIT = 50;
  let rt = null;
  /** Symbols with a live price on screen, most visible first: page subject, price strip, table. */
  function wantedSymbols() {
    const list = [];
    if (state.page === "company") { const s = bySlug(state.slug); if (s) list.push(s.ticker); }
    const tableRows = state.page === "emerging" ? emergingSorted() : state.page === "watch" ? watchItems() : view().rows;
    const tk = (r) => emSec(r).ticker;
    list.push(...tableRows.slice(0, 12).map(tk));  // the price strip
    if (state.page !== "company") list.push(...tableRows.map(tk));
    return [...new Set(list)].slice(0, WS_LIMIT);
  }
  // One queue for opening quotes, one call every 1.1 s (Finnhub free tier: 60 a minute). Symbols that
  // leave the screen before their turn are dropped.
  const restQueue = [];
  let restTimer = null;
  function pumpRest() {
    restTimer = null;
    while (restQueue.length && !rt.subs.has(restQueue[0])) rt.quoted.delete(restQueue.shift());
    const t = restQueue.shift();
    if (!t) return;
    fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(t)}&token=${encodeURIComponent(rt.key)}`)
      .then((r) => r.json()).then((q) => { if (q && q.c) setQuote(t, { price: q.c, prevClose: q.pc, dayHigh: q.h, dayLow: q.l, time: q.t }); })
      .catch(() => rt.quoted.delete(t));
    if (restQueue.length) restTimer = setTimeout(pumpRest, 1100);
  }
  function syncSubscriptions() {
    if (!rt || !rt.ws || rt.ws.readyState !== 1) return;
    const want = new Set(wantedSymbols());
    for (const t of [...rt.subs]) if (!want.has(t)) { rt.ws.send(JSON.stringify({ type: "unsubscribe", symbol: t })); rt.subs.delete(t); }
    const fresh = [];
    for (const t of want) if (!rt.subs.has(t)) { rt.ws.send(JSON.stringify({ type: "subscribe", symbol: t })); rt.subs.add(t); if (!rt.quoted.has(t)) fresh.push(t); }
    for (const t of fresh) { rt.quoted.add(t); restQueue.push(t); }
    if (fresh.length && !restTimer) restTimer = setTimeout(pumpRest, 0);
  }
  function startRealtime(key) {
    priceMode = "realtime";
    rt = { key, ws: null, subs: new Set(), quoted: new Set() };
    let backoff = 2000;
    (function connect() {
      try { rt.ws = new WebSocket(`wss://ws.finnhub.io?token=${encodeURIComponent(key)}`); } catch (e) { return; }
      rt.subs = new Set();
      rt.ws.onopen = () => { backoff = 2000; syncSubscriptions(); };
      rt.ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          if (m.type === "trade") for (const tr of m.data || []) setQuote(tr.s, { price: tr.p, time: Math.floor(tr.t / 1000) }, true);
        } catch (e) { /* ignore malformed frames */ }
      };
      rt.ws.onclose = () => { setTimeout(connect, backoff); backoff = Math.min(60000, backoff * 2); };
    })();
  }
  async function pollQuotes() {
    try {
      const r = await fetch("data/quotes.json?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      for (const [t, q] of Object.entries(data.quotes || {})) setQuote(t, q);
    } catch (e) { /* keep last prices */ }
  }

  // ---------- tooltip / toast ----------
  function showTip(html, x, y) {
    const t = $("tip");
    t.innerHTML = html;
    t.hidden = false;
    const r = t.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > innerHeight - 8) top = y - r.height - 14;
    t.style.left = Math.max(8, left) + "px";
    t.style.top = Math.max(8, top) + "px";
  }
  const hideTip = () => { $("tip").hidden = true; };
  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 6000);
  }

  // ---------- charts ----------
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function ticks(min, max, count = 4) {
    const span = max - min || Math.abs(max) || 1;
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const lo = Math.floor(min / step) * step;
    const out = [];
    for (let v = lo; v <= max + step * 0.999; v += step) out.push(+v.toPrecision(12));
    return out;
  }
  let gradId = 0;

  /**
   * Line chart with crosshair. series: [{name, color, values}]. With one series it draws the
   * Google-style area and a dotted reference line at the first value of the range.
   */
  function lineChart(host, { series, dates, height = 280, fmt = usd, axisFmt = axisUsd, ref, signedAxis = false,
    xLabel = (i) => qshort(dates[i]), tipTitle = (i) => `<strong>${qlabel(dates[i])}</strong> <span class="muted">${dateL(dates[i])}</span>` }) {
    host.innerHTML = "";
    const W = Math.max(280, host.clientWidth || 640);
    const H = height;
    const m = { t: 12, r: 4, b: 28, l: 4 };
    const all = series.flatMap((s) => s.values.filter((v) => v != null));
    if (!all.length) return;
    if (ref != null) all.push(ref);
    let lo = Math.min(...all), hi = Math.max(...all);
    const pad = (hi - lo) * 0.08 || hi * 0.05 || 1;
    lo = signedAxis ? lo - pad : Math.max(0, lo - pad); hi += pad;
    const tk = ticks(lo, hi);
    lo = tk[0]; hi = tk[tk.length - 1];
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": series.map((s) => s.name).join(", ") + " chart" }, host);
    const n = dates.length;
    const axisW = Math.max(...tk.map((t) => axisFmt(t).length)) * 7 + 12;
    const plotR = W - m.r - axisW;
    const x = (i) => m.l + (n === 1 ? 0 : (i / (n - 1)) * (plotR - m.l));
    const y = (v) => H - m.b - ((v - lo) / (hi - lo || 1)) * (H - m.t - m.b);
    const ax = el("g", { class: "axis" }, svg);
    tk.forEach((t) => {
      el("line", { x1: m.l, x2: plotR, y1: y(t), y2: y(t), class: "gridline" }, ax);
      el("text", { x: W - m.r, y: y(t) + 4, "text-anchor": "end" }, ax).textContent = axisFmt(t);
    });
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((plotR - m.l) / 72))));
    for (let i = n - 1; i >= 0; i -= every) {
      el("text", { x: x(i), y: H - 8, "text-anchor": i === n - 1 ? "end" : "middle" }, ax).textContent = xLabel(i);
    }
    if (series.length === 1 || (signedAxis && ref != null)) {
      const first = ref != null ? ref : series[0].values.find((v) => v != null);
      el("line", { x1: m.l, x2: plotR, y1: y(first), y2: y(first), class: "refline" }, svg);
    }
    series.forEach((s) => {
      let d = "";
      let firstI = -1, lastI = -1;
      s.values.forEach((v, i) => {
        if (v == null) return;
        if (firstI < 0) firstI = i;
        lastI = i;
        d += (d && s.values[i - 1] != null ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1);
      });
      if (!d) return;
      if (series.length === 1) {
        const id = "g" + ++gradId;
        const g = el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, el("defs", {}, svg));
        el("stop", { offset: "0%", "stop-color": s.color, "stop-opacity": 0.24 }, g);
        el("stop", { offset: "100%", "stop-color": s.color, "stop-opacity": 0 }, g);
        el("path", { d: d + `L${x(lastI)},${H - m.b}L${x(firstI)},${H - m.b}Z`, fill: `url(#${id})`, stroke: "none" }, svg);
      }
      el("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
    });
    const hl = el("line", { class: "hover-line", y1: m.t, y2: H - m.b, visibility: "hidden" }, svg);
    const dots = series.map((s) => el("circle", { r: 4.5, fill: s.color, stroke: "var(--surface)", "stroke-width": 2, visibility: "hidden" }, svg));
    const hit = el("rect", { x: 0, y: 0, width: plotR, height: H - m.b, fill: "transparent" }, svg);
    hit.addEventListener("pointermove", (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / (plotR - m.l)) * (n - 1))));
      hl.setAttribute("x1", x(i)); hl.setAttribute("x2", x(i)); hl.setAttribute("visibility", "visible");
      let rows = "";
      series.forEach((s, k) => {
        const v = s.values[i];
        if (v == null) { dots[k].setAttribute("visibility", "hidden"); return; }
        dots[k].setAttribute("cx", x(i)); dots[k].setAttribute("cy", y(v)); dots[k].setAttribute("visibility", "visible");
        rows += `<div class="row"><span>${series.length > 1 ? `<i style="background:${s.color}"></i>` : ""}${esc(s.name)}</span><b>${fmt(v)}</b></div>`;
      });
      showTip(`${tipTitle(i)}${rows}`, ev.clientX, ev.clientY);
    });
    hit.addEventListener("pointerleave", () => { hl.setAttribute("visibility", "hidden"); dots.forEach((d) => d.setAttribute("visibility", "hidden")); hideTip(); });
  }

  /** Grouped bars: revenue and net income per fiscal quarter. */
  function finChart(host, quarters) {
    host.innerHTML = "";
    const W = Math.max(260, host.clientWidth || 500);
    const H = 220;
    const m = { t: 10, r: 4, b: 26, l: 4 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": "Quarterly revenue and net income" }, host);
    const vals = quarters.flatMap((q) => [q.revenue, q.netIncome]).filter((v) => v != null);
    const tk = ticks(Math.min(0, ...vals), Math.max(...vals), 3);
    const lo = tk[0], hi = tk[tk.length - 1];
    const axisW = Math.max(...tk.map((t) => axisUsd(t).length)) * 7 + 12;
    const plotR = W - m.r - axisW;
    const y = (v) => H - m.b - ((v - lo) / (hi - lo || 1)) * (H - m.t - m.b);
    const ax = el("g", { class: "axis" }, svg);
    tk.forEach((t) => {
      el("line", { x1: m.l, x2: plotR, y1: y(t), y2: y(t), class: "gridline" }, ax);
      el("text", { x: W - m.r, y: y(t) + 4, "text-anchor": "end" }, ax).textContent = axisUsd(t);
    });
    const n = quarters.length;
    const slot = (plotR - m.l) / n;
    const bw = Math.max(3, Math.min(16, (slot - 8) / 2));
    const every = Math.ceil(n / Math.max(2, Math.floor((plotR - m.l) / 64)));
    quarters.forEach((q, i) => {
      const cx = m.l + slot * i + slot / 2;
      const g = el("g", {}, svg);
      el("rect", { x: cx - slot / 2, y: m.t, width: slot, height: H - m.t - m.b, fill: "transparent" }, g);
      [[q.revenue, "var(--accent)", -1], [q.netIncome, "var(--vg)", 1]].forEach(([v, c, side]) => {
        if (v == null) return;
        const y0 = y(0), y1 = y(v);
        el("rect", { x: side < 0 ? cx - bw - 1 : cx + 1, y: Math.min(y0, y1), width: bw, height: Math.max(1, Math.abs(y1 - y0)), rx: 2, fill: c }, g);
      });
      if ((n - 1 - i) % every === 0) el("text", { x: cx, y: H - 8, "text-anchor": "middle" }, ax).textContent = monthL(q.end);
      g.addEventListener("pointermove", (ev) => showTip(
        `<strong>Quarter ended ${dateL(q.end)}</strong>
         <div class="row"><span><i style="background:var(--accent)"></i>Revenue</span><b>${usd(q.revenue)}</b></div>
         <div class="row"><span><i style="background:var(--vg)"></i>Net income</span><b>${usd(q.netIncome)}</b></div>
         <div class="row"><span>Net margin</span><b>${q.netIncome == null ? "—" : pct(q.netIncome / q.revenue, 1, false)}</b></div>`, ev.clientX, ev.clientY));
      g.addEventListener("pointerleave", hideTip);
    });
  }

  function spark(values, color) {
    const v = values.filter((x) => x != null);
    if (v.length < 2) return "";
    const w = 84, h = 28, n = values.length;
    const max = Math.max(...v), min = Math.min(...v);
    const x = (i) => 1 + (i / (n - 1)) * (w - 4);
    const y = (val) => h - 3 - ((val - min) / (max - min || 1)) * (h - 6);
    let d = "";
    values.forEach((val, i) => { if (val != null) d += (d ? "L" : "M") + x(i).toFixed(1) + "," + y(val).toFixed(1); });
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  }

  // ---------- header ----------
  function renderTape() {
    const rows = (state.page === "emerging" ? emergingSorted() : state.page === "watch" && watch.length ? watchItems() : view().rows).slice(0, 12);
    $("tape").innerHTML = rows.map((r) => {
      const s = emSec(r);
      return `<a class="tape-item" href="#t-${slugOf(s.ticker)}"><span class="tape-t">${esc(s.ticker)}</span>${live("px", s.ticker)}${live("pill", s.ticker)}</a>`;
    }).join("");
  }
  function renderChips() {
    const watchChip = `<a class="chip chip-watch" href="#watchlist" ${state.page === "watch" ? 'aria-current="page"' : ""}><span class="star" aria-hidden="true">★</span>Watchlist <small>${watch.length || ""}</small></a>`;
    $("chips").innerHTML = watchChip + VIEWS.map((id) => {
      const t = D.views[id].totals;
      const sw = id === "big3" ? "background:conic-gradient(var(--blk) 0 33%, var(--vg) 0 66%, var(--ss) 0)" : `background:${mColor(id)}`;
      const cur = state.view === id;
      return `<a class="chip" href="#${id}" ${cur && state.page === "home" ? 'aria-current="page"' : ""}><span class="sw" style="${sw}"></span>${MGR_NAME[id]} <small>${usd(t[t.length - 1])}</small></a>`;
    }).join("") + (D.emerging ? `<a class="chip chip-em" href="#emerging" ${state.page === "emerging" ? 'aria-current="page"' : ""}><span class="sw em-sw"></span>Emerging <small>${emergingRows().length} small caps</small></a>` : "");
  }

  function renderLive() {
    const box = $("live");
    const live = HOSTED && status;
    const checked = (status && status.checkedAt) || D.meta.generatedAt;
    const age = (Date.now() - d0(checked).getTime()) / 60000;
    box.classList.toggle("on", !!live && age < 45);
    box.classList.toggle("stale", !!live && age >= 45);
    $("live-text").textContent = live
      ? `${age < 45 ? "Live" : "Delayed"} · SEC checked ${ago(checked)}`
      : `Snapshot · SEC data ${dateL(checked.slice(0, 10))}`;
    box.title = live ? "EDGAR is re-read on a schedule; the page updates itself when a manager or company files." : "A saved copy of the data. The hosted version updates itself from EDGAR.";
    document.querySelectorAll("[data-checked]").forEach((n) => { n.textContent = `checked ${ago(checked)}`; });
  }

  // ---------- search ----------
  function setupSearch() {
    const q = $("q"), box = $("suggest");
    let sel = -1;
    function results() {
      const t = q.value.trim().toLowerCase();
      const held = (s) => { const v = holder(s.cusip, "big3"); return v ? lastOf(v)[1] : 0; };
      const list = Object.values(D.securities).map((s) => ({ s, held: held(s) }))
        .concat(emergingAll().filter((r) => !D.securities[r.cusip]).map((r) => ({ s: r, held: r.value })))
        .filter(({ s }) => !t || s.ticker.toLowerCase().startsWith(t) || niceName(s.name).toLowerCase().includes(t));
      list.sort((a, b) => b.held - a.held);
      return list.slice(0, 8);
    }
    function draw() {
      const r = results();
      box.innerHTML = r.length
        ? r.map(({ s, held }, i) => `<a href="#t-${slugOf(s.ticker)}" role="option" aria-selected="${i === sel}">${tkChip(s)}<span class="nm">${esc(niceName(s.name))}</span><span class="muted">${held ? usd(held) + " held" : ""}</span></a>`).join("")
        : `<div class="empty">No holding matches “${esc(q.value)}”. Mr. Fink covers the Big Three’s largest company holdings.</div>`;
      box.hidden = false;
      q.setAttribute("aria-expanded", "true");
    }
    function close() { box.hidden = true; sel = -1; q.setAttribute("aria-expanded", "false"); }
    q.addEventListener("focus", draw);
    q.addEventListener("input", () => { sel = -1; draw(); });
    q.addEventListener("keydown", (e) => {
      const r = results();
      if (e.key === "ArrowDown") { sel = Math.min(r.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === "Enter") { const pick = r[Math.max(0, sel)]; if (pick) { location.hash = "t-" + slugOf(pick.s.ticker); q.value = ""; close(); q.blur(); } }
      else if (e.key === "Escape") { close(); q.blur(); }
    });
    box.addEventListener("click", () => { q.value = ""; close(); });
    document.addEventListener("click", (e) => { if (!e.target.closest(".search")) close(); });
  }

  // ---------- rail cards ----------
  function feedTitle(e) {
    if (e.kind === "13f") return [`${MGR_NAME[e.manager]} ${e.form.startsWith("13F-NT") ? "notice: reported by affiliates" : "holdings for " + qlabel(e.period)}`, e.entity];
    if (e.kind === "13g") return [`${MGR_NAME[e.manager]} owns ${pct(e.percent, 2, false)} of ${e.tickers[0]}`, `${e.entity} · ${e.form.includes("13D") ? "13D, active stake" : "as of " + dateL(e.eventDate)}`];
    if (e.kind === "8k") return [`${e.tickers.join(" / ")}: ${(e.labels || []).join(", ") || "current report"}`, `${niceName(e.entity)} · ${e.form}`];
    if (e.kind === "nport") return [`${e.fund} portfolio as of ${dateL(e.period)}`, `${e.entity}${e.netAssets ? " · " + usd(e.netAssets) + " net assets" : ""}`];
    return [`${e.tickers.join(" / ")} ${e.form.startsWith("10-K") ? "annual report" : "quarterly report"}`, `${niceName(e.entity)} · period ended ${dateL(e.period)}`];
  }
  function feedCard(ticker = null) {
    let items = D.feed || [];
    if (ticker) {
      // Names outside the feed carry their own recent filings (data/co/); merged without duplicates.
      const own = (bySlug(slugOf(ticker)) || {}).filings || [];
      const seen = new Set();
      items = items.filter((e) => (e.tickers || []).includes(ticker)).concat(own)
        .filter((e) => !seen.has(e.accession) && seen.add(e.accession))
        .sort((a, b) => (a.accepted < b.accepted ? 1 : -1));
    }
    else if (state.feedTab !== "all") items = items.filter((e) => e.kind === state.feedTab);
    const shown = items.slice(0, state.feedMore ? 30 : 7);
    const badge = (e) => `<span class="badge ${e.kind === "13f" || e.kind === "nport" ? "f13f" : e.kind === "13g" || (e.kind === "8k" && e.key) ? "f13g" : "frep"}">${esc(e.form.replace("SCHEDULE ", "").replace("SC ", "").replace("NPORT-P", "N-PORT"))}</span>`;
    const rows = shown.map((e) => {
      const [a, b] = feedTitle(e);
      return `<a href="${e.url}" target="_blank" rel="noopener">${badge(e)}<span class="nm"><b>${esc(a)}</b><small>${esc(b)}</small></span><span class="rt muted">${ago(e.accepted)}</span></a>`;
    }).join("") || `<div class="item"><span></span><span class="nm"><small>No filings in the past year.</small></span><span></span></div>`;
    const tabs = ticker ? "" : `<div class="tabs" role="group" aria-label="Filing type">${[["all", "All"], ["13f", "13F"], ["13g", "13G/D"], ["nport", "N-PORT"], ["8k", "8-K"], ["report", "10-Q/K"]].map(([k, l]) => `<button type="button" class="tab" data-feed="${k}" aria-pressed="${state.feedTab === k}">${l}</button>`).join("")}</div>`;
    return `<section class="card" aria-labelledby="feed-h">
      <div class="card-head"><h2 id="feed-h">${ticker ? "Recent filings" : "Latest SEC filings"}</h2><span class="feed-meta" data-checked></span></div>
      ${tabs}<div class="list wrap">${rows}</div>
      ${items.length > 7 ? `<button type="button" class="more" data-more>${state.feedMore ? "Show fewer" : `Show ${Math.min(30, items.length) - 7} more`}</button>` : ""}
    </section>`;
  }
  function wireCommon(root) {
    root.querySelectorAll("[data-feed]").forEach((b) => b.addEventListener("click", () => { state.feedTab = b.dataset.feed; state.feedMore = false; render(); }));
    root.querySelectorAll("[data-more]").forEach((b) => b.addEventListener("click", () => { state.feedMore = !state.feedMore; render(); }));
    root.querySelectorAll("[data-range]").forEach((b) => b.addEventListener("click", () => { state.range = b.dataset.range; render(); }));
  }
  function nextDeadline() {
    const [y, m] = D.meta.latest.split("-").map(Number);
    const end = new Date(Date.UTC(y, m + 3, 0));
    return { period: end.toISOString().slice(0, 10), due: new Date(end.getTime() + 45 * 86400000).toISOString().slice(0, 10) };
  }
  const pxRangeBar = (extra = "") => `<div class="rangebar"><div class="ranges" role="group" aria-label="Price range">${PX_RANGES.map(([k]) => `<button type="button" class="range" data-pxrange="${k}" aria-pressed="${state.pxRange === k}">${k}</button>`).join("")}</div>${extra}</div>`;
  const rangeBar = (extra = "") => `<div class="rangebar"><div class="ranges" role="group" aria-label="Time range">${RANGES.map(([k]) => `<button type="button" class="range" data-range="${k}" aria-pressed="${state.range === k}">${k}</button>`).join("")}</div>${extra}</div>`;

  // ---------- home ----------
  function stats(v) {
    const rows = v.rows;
    const total = v.totals[v.totals.length - 1];
    const top = rows.reduce((a, r) => a + r.value, 0);
    const flow = rows.reduce((a, r) => a + (r.qoq ? r.qoq.trade : 0), 0);
    const move = rows.reduce((a, r) => a + (r.qoq ? r.qoq.priceEffect : 0), 0);
    const added = rows.filter((r) => r.qoq && ["added", "new"].includes(r.qoq.status)).length;
    const trimmed = rows.filter((r) => r.qoq && ["trimmed", "exited"].includes(r.qoq.status)).length;
    const stakes = rows.map((r) => r.ownership).filter((x) => x != null).sort((a, b) => a - b);
    return { total, top, flow, move, added, trimmed, median: stakes.length ? stakes[Math.floor(stakes.length / 2)] : null };
  }

  // ---------- 13F season: a new quarter arriving manager by manager ----------
  function seasonBanner(v) {
    const Qs = D.meta.quarters || {};
    const lines = MGRS.map((id) => {
      const q = Qs[id];
      if (!q) return null;
      const early = D.views[id].early;
      if (early) return { id, text: `<b>${MGR_NAME[id]}</b> filed ${early.label} on ${dateL(early.filed)}`, done: true };
      if (q.progress) return { id, text: `<b>${MGR_NAME[id]}</b> ${q.progress.filed.length} of ${q.progress.filed.length + q.progress.pending.length} filing entities so far`, done: false };
      return null;
    }).filter(Boolean);
    if (!lines.length) return "";
    const nextQ = (D.views[lines[0].id].early || {}).label || qlabel(Qs[lines[0].id].progress.period);
    if (state.view === "big3") {
      return `<div class="season"><span><b>${nextQ} 13F season:</b> ${lines.map((l) => `<a href="#${l.id}">${l.text}</a>`).join(" · ")}. The tables stay at ${qlabel(D.meta.latest)} until all three have filed, so every view compares the same quarter.</span></div>`;
    }
    const mine = lines.find((l) => l.id === state.view);
    if (!mine) return "";
    const q = Qs[state.view];
    if (v.early) {
      return `<div class="season"><span>${mine.text}. The main table stays at ${qlabel(D.meta.latest)} until the other managers file.</span><button type="button" class="btn primary" id="toggle-early">${state.early ? "Hide" : "Show"} ${v.early.label} holdings</button></div>`;
    }
    return `<div class="season"><span>${mine.text} for ${qlabel(q.progress.period)}. It moves to the new quarter when every entity has reported${q.progress.pending.length ? ` (waiting for ${esc(q.progress.pending.slice(0, 3).join(", "))}${q.progress.pending.length > 3 ? "…" : ""})` : ""}.</span></div>`;
  }
  /** Largest net buys or sells across the whole book (pipeline/movers.py), linked where a page exists. */
  function wholeBookMoves(v) {
    const list = v.moves[state.movers].slice(0, state.movesMore ? 25 : 8);
    if (!list.length) return '<div class="item"><span></span><span class="nm"><small>None this quarter.</small></span><span></span></div>';
    return list.map((r) => {
      const sl = slugOf(r.ticker);
      const href = bySlug(sl) || emergingAll().some((x) => x.ticker === r.ticker) ? `#t-${sl}` : null;
      const tag = r.status === "new" ? '<span class="act new">New</span>' : r.status === "exited" ? '<span class="act out">Sold out</span>'
        : r.status === "converted" ? '<span class="act" title="Net of the listing it replaced (for example ADR to ordinary shares)">Listing change</span>' : pill(r.dSharesPct, { sm: true });
      const inner = `${tkChip(r)}<span class="nm"><b>${esc(niceName(r.name))}</b><small>${numS(r.dShares)} shares</small></span><span class="rt"><b class="${r.flow >= 0 ? "txt-up" : "txt-down"}">${usdS(r.flow)}</b>${tag}</span>`;
      return href ? `<a href="${href}">${inner}</a>` : `<div class="item">${inner}</div>`;
    }).join("");
  }
  function earlySection(v) {
    const e = v.early;
    const t0 = v.totals[v.totals.length - 1];
    const link = (r) => { const sl = slugOf(r.ticker); return bySlug(sl) || emergingAll().some((x) => x.ticker === r.ticker) ? `#t-${sl}` : null; };
    const body = e.rows.map((r) => {
      const href = link(r);
      const mv = r.prevRank ? r.prevRank - r.rank : null;
      const rk = `${r.rank}${mv == null ? '<small class="txt-up">new</small>' : mv > 0 ? `<small class="txt-up">▲${mv}</small>` : mv < 0 ? `<small class="txt-down">▼${-mv}</small>` : ""}`;
      const co = `${tkChip(r)}<span class="co-nm"><b>${esc(niceName(r.name))}</b></span>`;
      return `<tr><td><span class="rk">${rk}</span></td><td class="l fz fz-em">${href ? `<a class="co" href="${href}">${co}</a>` : `<span class="co">${co}</span>`}</td>
        <td><b class="v">${usd(r.value)}</b></td><td>${r.prevValue == null ? "—" : usd(r.prevValue)}</td>
        <td>${r.dSharesPct == null ? '<span class="act new">New</span>' : pill(r.dSharesPct, { sm: true })}${r.split ? ` <small class="muted" title="Share counts adjusted for a ${r.split >= 1 ? r.split + "-for-1 split" : "1-for-" + Math.round(1 / r.split) + " reverse split"}">split-adj.</small>` : ""}</td></tr>`;
    }).join("");
    return `<section class="section early" aria-labelledby="early-h">
      <div class="section-head"><div><h2 id="early-h">${esc(v.name)} ${e.label}: top ${e.rows.length}</h2>
        <p class="note">Filed ${dateL(e.filed)} · book ${usd(e.total)} (${pill(e.total / t0 - 1, { sm: true })} vs ${qlabel(D.meta.latest)}) · ${e.positions.toLocaleString("en-US")} securities · changes against ${esc(v.name)}’s own ${qlabel(D.meta.latest)} filing</p></div></div>
      <div class="table-scroll"><table class="tbl"><thead><tr><th scope="col">#</th><th scope="col" class="l fz fz-em">Company</th><th scope="col">${e.label} value</th><th scope="col">${qlabel(D.meta.latest)} value</th><th scope="col">Shares QoQ</th></tr></thead><tbody>${body}</tbody></table></div>
      <p class="foot">Sources: ${e.sources.map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${esc(x.entity)} ${esc(x.form)}</a>`).join(", ")}</p>
    </section>`;
  }

  function renderHome() {
    const v = view();
    const s = stats(v);
    const per = D.meta.periods;
    const n = per.length;
    const i0 = rangeStart(n);
    const t0 = v.totals[i0], t1 = v.totals[n - 1];
    const lastFiled = v.sources.map((x) => x.filed).sort().pop();
    const nd = nextDeadline();
    const daysToDue = Math.ceil((d0(nd.due) - Date.now()) / 86400000);
    const toggles = state.view === "big3"
      ? `<div class="toggles" role="group" aria-label="Chart series">${[["combined", "Combined"], ["managers", "By manager"]].map(([k, l]) => `<button type="button" class="chip" data-home-mode="${k}" aria-pressed="${state.homeMode === k}">${l}</button>`).join("")}</div>`
      : "";
    const movers = v.rows.filter((r) => r.qoq && (state.movers === "bought" ? r.qoq.trade > 0 : r.qoq.trade < 0))
      .sort((a, b) => (state.movers === "bought" ? b.qoq.trade - a.qoq.trade : a.qoq.trade - b.qoq.trade)).slice(0, 6);

    $("app").innerHTML = `
      <div class="main">
        <div class="hero">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="#big3">Managers</a><span aria-hidden="true">›</span><span>${esc(MGR_NAME[state.view])}</span></nav>
          <h1>${state.view === "big3" ? "BlackRock, Vanguard &amp; State Street" : esc(v.name)}</h1>
          <p class="hero-sub">13F reported equity holdings · ${v.positions.toLocaleString("en-US")} securities</p>
          <div class="figure">
            <span class="figure-value">${usd(t1)}</span>
            ${pill(t1 / t0 - 1)}
            <span class="figure-chg ${t1 >= t0 ? "txt-up" : "txt-down"}">${usdS(t1 - t0)}</span>
            <span class="muted">${rangeLabel()}</span>
          </div>
          <p class="figure-note">Holdings as of ${dateL(D.meta.latest)} · last filed ${dateL(lastFiled)}</p>
        </div>
        ${seasonBanner(v)}
        ${v.early && state.early ? earlySection(v) : ""}
        <div class="chart-block">
          ${rangeBar(toggles)}
          ${state.view === "big3" && state.homeMode === "managers" ? `<div class="legend">${MGRS.map((id) => `<span><i style="background:${mColor(id)}"></i>${MGR_NAME[id]}</span>`).join("")}</div>` : ""}
          <div class="chart" id="home-chart"></div>
          <div class="bridge"><span>Top ${D.meta.topN}, last quarter:</span><span>net buying <b class="${s.flow >= 0 ? "txt-up" : "txt-down"}">${usdS(s.flow)}</b></span><span>price moves <b class="${s.move >= 0 ? "txt-up" : "txt-down"}">${usdS(s.move)}</b></span><span>${s.added} added, ${s.trimmed} trimmed</span></div>
          <div class="bridge"><span>Top ${D.meta.topN} at today’s prices:</span><span data-live="mtm" data-t="">${mtm()}</span></div>
        </div>
        <section class="section" aria-labelledby="hold-h">
          <div class="section-head">
            <div><h2 id="hold-h">Top ${D.meta.topN} company holdings</h2><p class="note">Operating companies only (ETFs and funds excluded), ranked by market value on ${dateL(D.meta.latest)}</p></div>
            <div class="tools"><label class="filter"><span class="sr">Filter holdings</span><input id="filter" type="search" placeholder="Filter by ticker, name, sector" value="${esc(state.filter)}"></label><span class="count" id="count"></span>${exportBtn("export-home")}</div>
          </div>
          <div class="tabs" role="group" aria-label="Table view">${[["overview", "Overview"], ["analytics", "Analytics"], ["fundamentals", "Fundamentals"]].map(([k, l]) => `<button type="button" class="tab" data-tab="${k}" aria-pressed="${state.tab === k}">${l}</button>`).join("")}</div>
          <div class="table-scroll"><table class="tbl" id="tbl"></table></div>
          <p class="foot" id="foot"></p>
        </section>
        ${aboutSection()}
      </div>
      <aside class="rail" aria-label="Highlights">
        ${feedCard()}
        <section class="card" aria-labelledby="ks-h">
          <div class="card-head"><h2 id="ks-h">Key stats</h2></div>
          <dl class="kv">
            <div><dt>13F book value</dt><dd>${usd(s.total)}</dd></div>
            <div><dt>Quarter change</dt><dd>${signed(s.total / v.totals[n - 2] - 1)}</dd></div>
            <div><dt>Top ${D.meta.topN} value</dt><dd>${usd(s.top)}</dd></div>
            <div><dt>Top ${D.meta.topN} share of book</dt><dd>${pct(s.top / s.total, 1, false)}</dd></div>
            <div><dt>Median stake, top ${D.meta.topN}</dt><dd>${pct(s.median, 1, false)}</dd></div>
            <div><dt>Securities reported</dt><dd>${v.positions.toLocaleString("en-US")}</dd></div>
            <div><dt>Report date</dt><dd>${dateL(D.meta.latest)}</dd></div>
            <div><dt>Next 13F (${qlabel(nd.period)})</dt><dd>${daysToDue > 0 ? `due ${dateL(nd.due)}, in ${daysToDue} days` : "due now, watching EDGAR"}</dd></div>
          </dl>
        </section>
        <section class="card" aria-labelledby="mv-h">
          <div class="card-head"><h2 id="mv-h">Biggest moves last quarter</h2><span class="feed-meta">${v.moves ? `all ${v.positions.toLocaleString("en-US")} securities` : `top ${D.meta.topN}`}</span></div>
          <div class="tabs" role="group" aria-label="Direction">${[["bought", "Bought"], ["sold", "Sold"]].map(([k, l]) => `<button type="button" class="tab" data-movers="${k}" aria-pressed="${state.movers === k}">${l}</button>`).join("")}</div>
          <div class="list">${v.moves ? wholeBookMoves(v) : movers.map((r) => { const c = sec(r.cusip); return `<a href="#t-${slugOf(c.ticker)}">${tkChip(c)}<span class="nm"><b>${esc(niceName(c.name))}</b><small>${numS(r.qoq.dShares)} shares</small></span><span class="rt"><b class="${r.qoq.trade >= 0 ? "txt-up" : "txt-down"}">${usdS(r.qoq.trade)}</b>${pill(r.qoq.dSharesPct, { sm: true })}</span></a>`; }).join("") || '<div class="item"><span></span><span class="nm"><small>None this quarter.</small></span><span></span></div>'}</div>
          ${v.moves && state.movers === "sold" && (v.moves.gone || []).length ? `<p class="foot mv-gone">Not counted as sales: ${v.moves.gone.map((r) => `<b>${esc(r.ticker)}</b>`).join(", ")} left every Big Three book (acquired or delisted).</p>` : ""}
          ${v.moves ? `<button type="button" class="more" data-moves-more>${state.movesMore ? "Show fewer" : `Show top ${v.moves[state.movers].length}`}</button>` : ""}
        </section>
        <section class="card" aria-labelledby="cmp-h">
          <div class="card-head"><h2 id="cmp-h">Compare managers</h2></div>
          <div class="list">${MGRS.map((id) => { const t = D.views[id].totals; return `<a href="#${id}">${dot(id)}<span class="nm"><b>${MGR_NAME[id]}</b><small>${D.views[id].positions.toLocaleString("en-US")} securities</small></span><span class="rt"><b>${usd(t[t.length - 1])}</b>${pill(t[t.length - 1] / t[t.length - 2] - 1, { sm: true })}</span></a>`; }).join("")}</div>
        </section>
      </aside>`;

    const dates = per.slice(i0);
    const series = state.view === "big3" && state.homeMode === "managers"
      ? MGRS.map((id) => ({ name: MGR_NAME[id], color: mColor(id), values: D.views[id].totals.slice(i0) }))
      : [{ name: "13F book value", color: t1 >= t0 ? "var(--pos-line)" : "var(--neg-line)", values: v.totals.slice(i0) }];
    lineChart($("home-chart"), { series, dates, height: 300 });
    renderTable();

    const app = $("app");
    wireCommon(app);
    app.querySelectorAll("[data-home-mode]").forEach((b) => b.addEventListener("click", () => { state.homeMode = b.dataset.homeMode; render(); }));
    app.querySelectorAll("[data-movers]").forEach((b) => b.addEventListener("click", () => { state.movers = b.dataset.movers; render(); }));
    app.querySelector("[data-moves-more]")?.addEventListener("click", () => { state.movesMore = !state.movesMore; render(); });
    app.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
      state.tab = b.dataset.tab;
      state.sort = { key: "rank", dir: 1 };
      app.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      try { localStorage.setItem("mrfink.tab", state.tab); } catch (e) { /* storage unavailable */ }
      renderTable();
    }));
    $("filter").addEventListener("input", (e) => { state.filter = e.target.value; renderTable(); });
    $("export-home").addEventListener("click", exportHome);
    $("toggle-early")?.addEventListener("click", () => { state.early = !state.early; render(); if (state.early) $("early-h")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }

  function heatClass(values, v) {
    const sorted = values.filter((x) => x != null).sort((a, b) => a - b);
    if (sorted.length < 4) return "heat";
    const p = sorted.findIndex((x) => x >= v) / (sorted.length - 1);
    const lvl = Math.min(4, Math.floor(p * 5));
    return lvl ? "heat heat-" + lvl : "heat";
  }

  function columns() {
    const big3 = state.view === "big3";
    const total = view().totals[D.meta.periods.length - 1];
    const f = (r) => sec(r.cusip).fundamentals || {};
    const head = [
      { key: "rank", label: "#", cls: "fz fz-0", get: (r) => r.rank, render: (r) => {
        const d = r.prevRank ? r.prevRank - r.rank : null;
        const mv = d == null ? '<small class="txt-up">new</small>' : d > 0 ? `<small class="txt-up" title="Up ${d} places">▲${d}</small>` : d < 0 ? `<small class="txt-down" title="Down ${-d} places">▼${-d}</small>` : "";
        return `<span class="rk">${r.rank}${mv}</span>`;
      } },
      { key: "ticker", label: "Company", cls: "l fz fz-1", get: (r) => sec(r.cusip).ticker, render: (r) => {
        const s = sec(r.cusip);
        const cls = /CL(ASS)?\s*[A-C]\b|CAP STK CL/i.test(s.classTitle) ? " · " + esc(s.classTitle.replace(/^CAP STK /, "").replace(/^CL/, "Class")) : "";
        return `<a class="co" href="#t-${slugOf(s.ticker)}">${tkChip(s)}<span class="co-nm"><b>${esc(niceName(s.name))}</b><small>${esc(s.sector || "")}${cls}</small></span></a>`;
      } },
      { key: "value", label: "Value", get: (r) => r.value, render: (r) => `<b class="v">${usd(r.value)}</b>` },
    ];
    if (state.tab === "overview") {
      const tk = (r) => sec(r.cusip).ticker;
      head.splice(2, 0,
        { key: "px", label: "Price", get: (r) => pxOf(tk(r)), render: (r) => live("px", tk(r)) },
        { key: "day", label: "Today", get: (r) => dayChg(tk(r)), render: (r) => live("pill", tk(r)) });
      head[4].label = "13F value";
      const maxW = Math.max(...view().rows.map((r) => r.value));
      return [...head,
        { key: "weight", label: "% of book", get: (r) => r.value / total, render: (r) => `${pct(r.value / total, 2, false)}<span class="wbar"><i style="width:${(r.value / maxW) * 100}%"></i></span>` },
        { key: "own", label: big3 ? "Combined stake" : "Stake", get: (r) => r.ownership, render: (r) => (r.ownership == null ? '<span class="na">n/a</span>' : pct(r.ownership, 1, false)) },
        { key: "qoq", label: "QoQ shares", get: (r) => r.qoq && r.qoq.dSharesPct, render: (r) => (r.qoq ? (r.qoq.status === "new" ? '<span class="act new">New</span>' : pill(r.qoq.dSharesPct, { sm: true })) : "—") },
        { key: "flow", label: "QoQ net flow", get: (r) => r.qoq && r.qoq.trade, render: (r) => (r.qoq ? signed(r.qoq.trade, usdS, 5e5) : "—") },
        ...(big3 ? [{ key: "mix", label: "By manager", sortable: false, render: (r) => `<span class="mix" data-mix="${r.cusip}" aria-label="${MGRS.map((id) => `${MGR_NAME[id]} ${usd(r.byManager[id].value)}`).join(", ")}">${MGRS.map((id) => `<i style="width:${(r.byManager[id].value / r.value) * 100}%;background:${mColor(id)}"></i>`).join("")}</span>` }] : []),
        ...(big3 ? [] : [{ key: "trend", label: "Value, 3Y", sortable: false, render: (r) => spark((holder(r.cusip, state.view)?.series || []).slice(-13).map((x) => x[1]), r.yoy && r.yoy.dValuePct < 0 ? "var(--neg-line)" : "var(--pos-line)") }]),
      ];
    }
    if (state.tab === "analytics") {
      return [...head,
        { key: "act", group: "q", label: "Action", sep: true, get: (r) => r.qoq && r.qoq.dSharesPct, render: (r) => (r.qoq ? `<span class="act ${r.qoq.status}">${r.qoq.status[0].toUpperCase() + r.qoq.status.slice(1)}</span>` : "—") },
        { key: "qSh", group: "q", label: "Δ shares %", get: (r) => r.qoq && r.qoq.dSharesPct, render: (r) => (r.qoq ? signed(r.qoq.dSharesPct) : "—") },
        { key: "qShN", group: "q", label: "Δ shares", get: (r) => r.qoq && r.qoq.dShares, render: (r) => (r.qoq ? signed(r.qoq.dShares, numS, 0.5) : "—") },
        { key: "qFlow", group: "q", label: "Net flow", get: (r) => r.qoq && r.qoq.trade, render: (r) => (r.qoq ? signed(r.qoq.trade, usdS, 5e5) : "—") },
        { key: "qPx", group: "q", label: "Price", get: (r) => r.qoq && r.qoq.priceChg, render: (r) => (r.qoq ? signed(r.qoq.priceChg) : "—") },
        { key: "ySh", group: "y", label: "Δ shares %", sep: true, get: (r) => r.yoy && r.yoy.dSharesPct, render: (r) => (r.yoy ? signed(r.yoy.dSharesPct) : "—") },
        { key: "yVal", group: "y", label: "Δ value", get: (r) => r.yoy && r.yoy.dValuePct, render: (r) => (r.yoy ? signed(r.yoy.dValuePct) : "—") },
        { key: "yPx", group: "y", label: "Price return", get: (r) => r.yoy && r.yoy.priceChg, render: (r) => (r.yoy ? signed(r.yoy.priceChg) : "—") },
        { key: "iP", group: "i", label: "From", sep: true, get: (r) => r.inception.period, render: (r) => `${qshort(r.inception.period)}${r.inception.atWindowStart ? "<sup>*</sup>" : ""}` },
        { key: "iSh", group: "i", label: "Δ shares %", get: (r) => r.inception.dSharesPct, render: (r) => signed(r.inception.dSharesPct) },
        { key: "iPx", group: "i", label: "Price return", get: (r) => r.inception.priceReturn, render: (r) => signed(r.inception.priceReturn) },
        { key: "iC", group: "i", label: "Price CAGR", get: (r) => r.inception.cagr, render: (r) => signed(r.inception.cagr) },
      ];
    }
    const rows = view().rows;
    const all = (k) => rows.map((r) => f(r)[k]);
    const heat = (k, sgn) => (r) => { const v = f(r)[k]; return v == null ? '<span class="na">n.m.</span>' : `<span class="${heatClass(all(k), v)}">${pct(v, 1, sgn)}</span>`; };
    return [...head,
      { key: "mcap", label: "Market cap", get: (r) => f(r).marketCap, render: (r) => (f(r).marketCap ? usd(f(r).marketCap) : '<span class="na">n/a</span>') },
      { key: "rev", label: "Revenue TTM", sep: true, get: (r) => f(r).revenueTTM, render: (r) => usd(f(r).revenueTTM) },
      { key: "revG", label: "Rev. growth", get: (r) => f(r).revenueGrowth, render: heat("revenueGrowth", true) },
      { key: "epsG", label: "EPS growth", get: (r) => f(r).epsGrowth, render: heat("epsGrowth", true) },
      { key: "gm", label: "Gross margin", sep: true, get: (r) => f(r).grossMargin, render: heat("grossMargin", false) },
      { key: "om", label: "Op. margin", get: (r) => f(r).operatingMargin, render: heat("operatingMargin", false) },
      { key: "nm", label: "Net margin", get: (r) => f(r).netMargin, render: heat("netMargin", false) },
      { key: "roe", label: "ROE", get: (r) => f(r).roe, render: heat("roe", false) },
      { key: "pe", label: "P/E", sep: true, get: (r) => f(r).pe, render: (r) => mult(f(r).pe) },
      { key: "ps", label: "P/S", get: (r) => f(r).ps, render: (r) => mult(f(r).ps) },
      { key: "fcfy", label: "FCF yield", get: (r) => f(r).fcfYield, render: (r) => (f(r).fcfYield == null ? '<span class="na">—</span>' : pct(f(r).fcfYield, 1, false)) },
      { key: "asof", label: "Results to", get: (r) => f(r).asOf, render: (r) => `<span class="muted">${f(r).asOf ? dateL(f(r).asOf) : "—"}</span>` },
    ];
  }

  /** The holdings table's rows as shown: filtered and sorted. */
  function homeSorted() {
    const cols = columns();
    const q = state.filter.trim().toLowerCase();
    const rows = view().rows.filter((r) => {
      if (!q) return true;
      const s = sec(r.cusip);
      return [s.ticker, niceName(s.name), s.sector, s.industry].some((x) => (x || "").toLowerCase().includes(q));
    });
    const col = cols.find((c) => c.key === state.sort.key) || cols[0];
    return rows.slice().sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * state.sort.dir;
    });
  }
  function renderTable() {
    const cols = columns();
    const v = view();
    const rows = homeSorted();
    const groups = { q: "Quarter over quarter", y: "Year over year", i: "Since first held" };
    let grp = "";
    if (cols.some((c) => c.group)) {
      const cells = [];
      for (let i = 0; i < cols.length;) {
        const g = cols[i].group;
        let span = 1;
        while (g && i + span < cols.length && cols[i + span].group === g) span++;
        cells.push(g ? `<th colspan="${span}" class="sep" scope="colgroup"><span>${groups[g]}</span></th>` : `<th class="blank ${cols[i].cls || ""}"></th>`);
        i += span;
      }
      grp = `<tr class="grp">${cells.join("")}</tr>`;
    }
    const thead = `<thead>${grp}<tr>${cols.map((c) => {
      const sorted = state.sort.key === c.key;
      const aria = sorted ? ` aria-sort="${state.sort.dir > 0 ? "ascending" : "descending"}"` : "";
      const inner = c.sortable === false ? c.label : `<button type="button" data-sort="${c.key}">${c.label}${sorted ? (state.sort.dir > 0 ? " ↑" : " ↓") : ""}</button>`;
      return `<th scope="col" class="${c.cls || ""}${c.sep ? " sep" : ""}"${aria}>${inner}</th>`;
    }).join("")}</tr></thead>`;
    const tbody = !rows.length ? `<tbody><tr><td colspan="${cols.length}" class="l na" style="height:64px">No holding matches “${esc(state.filter)}”.</td></tr></tbody>` : `<tbody>${rows.map((r) => `<tr data-slug="${slugOf(sec(r.cusip).ticker)}">${cols.map((c) => `<td class="${c.cls || ""}${c.sep ? " sep" : ""}">${c.render(r)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    const t = $("tbl");
    t.classList.toggle("grouped", !!grp);
    t.innerHTML = thead + tbody;
    t.style.minWidth = state.tab === "overview" ? "1040px" : "1240px";
    $("count").textContent = q ? `${rows.length} of ${v.rows.length} holdings` : `${v.rows.length} holdings`;
    $("foot").innerHTML = {
      overview: "Stake is shares held ÷ shares outstanding (all share classes, as-converted). QoQ net flow is the change in shares valued at the quarter-end price. Select a company for its full page.",
      analytics: "Added or trimmed means the share count moved by more than 0.5%. For index funds that mostly reflects fund flows and index changes rather than stock picking. Share counts are split-adjusted. Price return is the change in the quarter-end price implied by the filings (value ÷ shares) and excludes dividends and spin-offs. <sup>*</sup> Already held when tracking starts in Q1 2017, so the first purchase was earlier.",
      fundamentals: `Trailing twelve months from 10-K and 10-Q XBRL data. Shading ranks each metric within this list (darker is higher). P/E, P/S and FCF yield use the ${qlabel(D.meta.latest)} quarter-end price against results for periods ending by then. n.m. means not meaningful: a loss-making base, or a bank or insurer where the ratio does not apply.`,
    }[state.tab];
    t.querySelectorAll("[data-sort]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.sort;
      state.sort = state.sort.key === k ? { key: k, dir: -state.sort.dir } : { key: k, dir: ["rank", "ticker", "pe", "ps", "iP"].includes(k) ? 1 : -1 };
      renderTable();
      t.querySelector(`[data-sort="${k}"]`)?.focus();
    }));
    t.querySelectorAll("tbody tr").forEach((tr) => tr.addEventListener("click", (e) => { if (!e.target.closest("a")) location.hash = "t-" + tr.dataset.slug; }));
    t.querySelectorAll("[data-mix]").forEach((m) => {
      m.addEventListener("pointermove", (ev) => {
        const r = v.rows.find((x) => x.cusip === m.dataset.mix);
        showTip(MGRS.map((id) => `<div class="row"><span><i style="background:${mColor(id)}"></i>${MGR_NAME[id]}</span><b>${usd(r.byManager[id].value)}</b></div>`).join(""), ev.clientX, ev.clientY);
      });
      m.addEventListener("pointerleave", hideTip);
    });
  }

  function aboutSection() {
    return `<section class="section" aria-labelledby="about-h">
      <h2 id="about-h">About this data</h2>
      <ul class="notes">
        <li>Every Form 13F-HR from BlackRock (2 registrants), Vanguard (11 advisers; Vanguard Group has reported through affiliates since Q1 2026) and State Street, Q1 2017 to ${qlabel(D.meta.latest)}, read directly from SEC EDGAR. Restatements replace the original filing and new-holdings amendments add to it. Options and bonds are excluded.</li>
        <li>Stock splits and CUSIP changes are detected from the filings and adjusted, so share counts compare across time. Funds and ETFs are identified with OpenFIGI and excluded.</li>
        <li>Fundamentals come from the XBRL data companies file with their 10-Q and 10-K. Schedule 13G stakes come from the managers’ ownership filings, which arrive between 13F reports.</li>
        <li>The hosted version re-reads EDGAR every 5 minutes and refreshes this page when a new 13F, 13G, 10-Q or 10-K appears. 13F reports lag the quarter by up to 45 days and cover US-listed long positions only. Not investment advice.</li>
      </ul>
      <p class="foot">${qlabel(D.meta.latest)} filings: ${view().sources.map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${esc(x.entity)}</a>`).join(" · ")}</p>
    </section>`;
  }

  // ---------- emerging ----------
  const PATTERNS = {
    steady: ["Steady accumulation", "At least three of the last four quarters each added 0.75 points or more"],
    step: ["Step-up", "One quarter added most of the gain (2+ points), typical of an index addition"],
    new: ["New position", "First held within the last year: IPO, spin-off or index entry"],
    rising: ["Rising", "Stake higher than a year ago, without a clear pattern"],
  };
  const FLAGS = {
    "pending-deal": ["Deal pending", "Merger, tender or going-private filing in the last 9 months: the price may be pinned to a deal"],
    "reverse-split": ["Reverse split", "Reverse split in the last year, often a sign of distress"],
    dilution: ["Share count +30%", "Shares outstanding grew more than 30% in a year"],
    "foreign-filer": ["Foreign filer", "Files 20-F/40-F; fewer disclosures"],
    "new-listing": ["Listed < 2 yrs", "Short public history"],
    "price-mismatch": ["Check data", "The managers' filings disagree on the quarter-end price"],
    thin: ["Thin trading", "Under $1M traded per day on average"],
    "approx-shares": ["Approx. shares", "Share count taken from the cover page or a neighbouring quarter, not the balance sheet"],
  };
  const emergingAll = () => (D.emerging ? D.emerging.rows : []);
  /** Identity for an Emerging row: the full security record when profiled, else the row itself. */
  const emSec = (r) => D.securities[r.cusip] || r;
  const emLink = (r) => `#t-${slugOf(r.ticker)}`;
  const edgarLink = (cik) => `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&owner=include&count=40`;
  const liveFlags = (r) => {
    const q = Q[r.ticker];
    return r.flags.concat(q && q.avgDollarVolume != null && q.avgDollarVolume < 1e6 ? ["thin"] : []);
  };
  function emergingRows() {
    const f = state.em;
    return emergingAll().filter((r) => {
      const t = r.ticker;
      const p = pxOf(t) || r.price;
      const mcap = r.sharesOutstanding * p;
      const flags = liveFlags(r);
      return p >= f.pmin && p <= f.pmax && mcap <= f.mcap
        && (f.pattern === "all" || r.pattern === f.pattern)
        && !(f.hideDeals && flags.includes("pending-deal"))
        && !(f.hideThin && flags.includes("thin"))
        && !(f.allThree && r.breadth < 3);
    });
  }
  const pp = (x, signed = true) => (x == null ? "—" : (signed && x > 0 ? "+" : "") + (x * 100).toFixed(x * 100 >= 10 || x * 100 <= -10 ? 1 : 2) + " pp");

  const EM_SORT = {
    ticker: (r) => r.ticker,
    px: (r) => pxOf(r.ticker) || r.price,
    day: (r) => dayChg(r.ticker),
    mcap: (r) => r.sharesOutstanding * (pxOf(r.ticker) || r.price),
    stake: (r) => r.stake,
    stakeChangeQoQ: (r) => r.stakeChangeQoQ,
    stakeChangeYoY: (r) => r.stakeChangeYoY,
    breadth: (r) => r.breadth,
    flowYoY: (r) => r.flowYoY,
    pattern: (r) => r.pattern,
    rev: (r) => (emSec(r).fundamentals || {}).revenueGrowth,
    ins: (r) => (r.insiders ? r.insiders.bought - r.insiders.sold : null),
  };
  function emergingSorted() {
    const f = state.em;
    const get = EM_SORT[f.sort] || EM_SORT.stakeChangeYoY;
    return emergingRows().slice().sort((a, b) => {
      const x = get(a), y = get(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * f.dir;
    });
  }

  /** Median price change since the 13F filing deadline, this list against the Big Three top 50. */
  function trackRecord() {
    if (!H) return '<span class="muted">Loading the track record since the last 13F deadline…</span>';
    const [y, m, d] = D.emerging.asOf.split("-").map(Number);
    const deadline = Date.UTC(y, m - 1, d) + 45 * 86400000;
    const change = (t) => {
      const h = H[t];
      const now = pxOf(t);
      if (!h || !now) return null;
      const i = h.ms.findIndex((ms) => ms >= deadline);
      return i < 0 ? null : now / h.c[i] - 1;
    };
    const median = (xs) => { const v = xs.filter((x) => x != null).sort((a, b) => a - b); return v.length ? [v[Math.floor(v.length / 2)], v.length] : [null, 0]; };
    const [mine, n] = median(emergingRows().map((r) => change(r.ticker)));
    const [big, nb] = median(D.views.big3.rows.map((r) => change(sec(r.cusip).ticker)));
    if (!n) return "";
    return `<b>Track record.</b> Since the last 13F deadline (${dateL(new Date(deadline).toISOString().slice(0, 10))}), the median stock on this list moved ${signed(mine)} (${n} with price history), against ${signed(big)} for the Big Three top ${nb}. One period is not a backtest, but it is the honest test of following these filings.`;
  }

  // ---------- backtest of the screen (pipeline/backtest.py, data/backtest.json) ----------
  let BT = null, btLoad = null;
  function loadBacktest() {
    if (!btLoad) btLoad = fetch("data/backtest.json").then((r) => (r.ok ? r.json() : null)).then((d) => (BT = d)).catch(() => null);
    return btLoad;
  }
  function backtestSection() {
    if (!BT) return `<h2 id="bt-h">Has this screen worked?</h2><p class="foot">Loading the backtest…</p>`;
    const s = BT.summary, c = BT.cohorts;
    const g = s.growth3;
    const last = (k) => (g[k] && g[k].length ? g[k][g[k].length - 1] : null);
    const money = (x) => (x == null ? "—" : "$" + x.toFixed(2));
    const pc1 = (x) => (x == null ? "—" : (x >= 0 ? "+" : "") + (x * 100).toFixed(1) + "%");
    const first = c[0], end = c[g.screen.length - 1];
    const rows = [
      ["S&amp;P 500 (SPY)", "spy", "var(--muted)"], ["Russell 2000 (IWM)", "iwm", "var(--ss)"], ["This screen", "screen", "var(--accent)"],
      ["All three managers buying", "allThree", "var(--vg)"], ["All small caps, no signal", "universe", "var(--line-strong)"], ["Top 25 by stake gain", "top25", "var(--neg-line)"],
    ].filter((r) => g[r[1]] && g[r[1]].length);
    return `<div class="section-head"><div><h2 id="bt-h">Has this screen worked?</h2>
        <p class="note">Backtest ${qlabel(first.period)}–${qlabel(end.period)}: each quarter’s list bought at the first quarter end after its 13F was public, equal weight, rebalanced quarterly</p></div></div>
      <div class="bt-grid">
        <div class="chart" id="bt-chart"></div>
        <div class="list bt-legend">${rows.map(([l, k, col]) => `<div class="item"><span class="sw" style="background:${col}"></span><span class="nm"><b>${l}</b></span><span class="rt"><b>${money(last(k))}</b></span></div>`).join("")}</div>
      </div>
      <p class="bt-verdict"><b>Verdict:</b> $1 in the screen became ${money(last("screen"))}, against ${money(last("universe"))} for all small caps that passed the same price and size filters, and ${money(last("spy"))} for the S&amp;P 500. Over 12-month holds the screen averaged ${pc1(s.avg12)} a year against ${pc1(s.avgUniverse12)} for the small-cap universe and beat it in ${Math.round(s.beatUniverse12 * 100)}% of ${s.cohorts12} quarters: no reliable edge. The strongest version (top 25 by stake gain) did worst, consistent with stocks giving back gains after index inclusion.</p>
      <details class="bt-method"><summary>How it was tested</summary><p>${esc(BT.method).replace(/\n- /g, "<br>• ").replace(/\n/g, " ")}</p></details>`;
  }
  function drawBacktest() {
    const host = $("bt-chart");
    if (!host || !BT) return;
    const c = BT.cohorts, g = BT.summary.growth3, n = g.screen.length;
    const dates = c.slice(0, n).map((x) => x.entry);
    const y = new Date(dates[n - 1]); y.setUTCMonth(y.getUTCMonth() + 3);
    dates.push(y.toISOString().slice(0, 10));
    const ser = (k, name, color) => ({ name, color, values: [1, ...g[k].slice(0, n)] });
    lineChart(host, {
      series: [ser("spy", "S&P 500", "var(--muted)"), ser("iwm", "Russell 2000", "var(--ss)"), ser("universe", "All small caps", "var(--line-strong)"),
        ser("allThree", "All three buying", "var(--vg)"), ser("top25", "Top 25", "var(--neg-line)"), ser("screen", "This screen", "var(--accent)")],
      dates, height: 260, fmt: (v) => "$" + v.toFixed(2), axisFmt: (v) => "$" + v.toFixed(1), xLabel: (i) => dates[i].slice(0, 4),
      tipTitle: (i) => `<strong>${dateL(dates[i])}</strong>`,
    });
  }

  function renderEmerging() {
    if (!BT) loadBacktest().then(() => { const el = $("bt"); if (el && state.page === "emerging") { el.innerHTML = backtestSection(); drawBacktest(); } });
    if (!H) loadHistory().then(() => { const el = $("em-track"); if (el && state.page === "emerging") el.innerHTML = trackRecord(); });
    const E = D.emerging;
    const f = state.em;
    const rows = emergingRows();
    const diag = E.diagnostics || {};
    const sorted = emergingSorted();
    const mgrDots = (r) => MGRS.map((id) => {
      const m = r.managers[id];
      const up = m && m.stake - (m.stakeYearAgo || 0) > 0.001;
      return `<span class="mdot ${up ? "" : "off"}" style="background:${mColor(id)}" title="${MGR_NAME[id]}: ${m ? pct(m.stake, 2, false) + " now, " + (m.stakeYearAgo == null ? "not held" : pct(m.stakeYearAgo, 2, false)) + " a year ago" : "not held"}"></span>`;
    }).join("");
    const body = sorted.slice(0, f.limit).map((r) => {
      const s = emSec(r);
      const fund = s.fundamentals || {};
      const flags = liveFlags(r);
      return `<tr data-slug="${slugOf(s.ticker)}">
        <td class="l fz fz-em"><a class="co" href="${emLink(r)}">${tkChip(s)}<span class="co-nm"><b>${esc(niceName(s.name))}</b><small>${esc(s.industry || s.sector || "")}</small></span></a></td>
        <td>${live("px", s.ticker)}</td><td>${live("pill", s.ticker)}</td>
        <td>${live("val", s.ticker, r.sharesOutstanding)}</td>
        <td class="sep"><b class="v">${pct(r.stake, 1, false)}</b></td>
        <td>${signed(r.stakeChangeQoQ, pp, 0.0005)}</td>
        <td>${signed(r.stakeChangeYoY, pp, 0.0005)}</td>
        <td class="c">${mgrDots(r)}</td>
        <td>${signed(r.flowYoY, usdS, 5e5)}</td>
        <td class="sep"><span class="pat pat-${r.pattern}" title="${esc(PATTERNS[r.pattern][1])}">${PATTERNS[r.pattern][0]}</span></td>
        <td>${fund.revenueGrowth == null ? '<span class="na">n.m.</span>' : signed(fund.revenueGrowth)}</td>
        <td>${insNet(r)}</td>
        <td>${spark(r.stakeHistory, "var(--accent)")}</td>
        <td class="l">${flags.map((k) => `<span class="flag" title="${esc(FLAGS[k][1])}">${FLAGS[k][0]}</span>`).join(" ") || '<span class="na">—</span>'}</td>
      </tr>`;
    }).join("");
    const th = (key, label, cls = "") => `<th scope="col" class="${cls}"${f.sort === key ? ` aria-sort="${f.dir > 0 ? "ascending" : "descending"}"` : ""}><button type="button" data-emsort="${key}">${label}${f.sort === key ? (f.dir > 0 ? " ↑" : " ↓") : ""}</button></th>`;
    // Tab counts reflect every other filter, so they add up to the rows shown under "All".
    const unpatterned = (() => { const keep = f.pattern; f.pattern = "all"; const r = emergingRows(); f.pattern = keep; return r; })();
    const counts = Object.keys(PATTERNS).map((k) => [k, unpatterned.filter((r) => r.pattern === k).length]);

    $("app").innerHTML = `
      <div class="main">
        <div class="hero">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="#big3">Screens</a><span aria-hidden="true">›</span><span>Emerging</span></nav>
          <h1>Emerging holdings</h1>
          <p class="hero-sub">Small companies trading at $${f.pmin}–$${f.pmax} where BlackRock, Vanguard and State Street together own a growing share of the company</p>
          <div class="figure"><span class="figure-value">${rows.length}</span><span class="muted">companies match · 13F data as of ${dateL(E.asOf)}</span></div>
        </div>
        <details class="callout" ${innerWidth > 640 ? "open" : ""}>
          <summary><b>How to read this list</b><span class="muted"> · and its track record</span></summary>
          An index fund owns about the same share of every company in its index, so differences in the Big Three’s stake come from index membership, share issuance and corporate events, not from a view on the company. Most gains here are one-quarter step-ups at the June Russell reconstitution, and those additions are announced in May, months before the 13F shows them. Treat this as a map of index money flowing into small caps, not as a buy list: the backtest below finds no reliable edge from buying it.
          <div id="em-track">${trackRecord()}</div>
        </details>
        <div class="filters" role="group" aria-label="Screen filters">
          <label>Price <input id="em-pmin" type="number" min="0" step="1" value="${f.pmin}"> – <input id="em-pmax" type="number" min="1" step="1" value="${f.pmax}"></label>
          <label>Market cap <select id="em-mcap">${[[5e8, "under $500M"], [1e9, "under $1B"], [3e9, "under $3B"], [5e9, "under $5B"], [1e10, "under $10B"]].map(([v, l]) => `<option value="${v}" ${f.mcap === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          <label class="chk"><input id="em-deals" type="checkbox" ${f.hideDeals ? "checked" : ""}> Hide pending deals</label>
          <label class="chk"><input id="em-thin" type="checkbox" ${f.hideThin ? "checked" : ""}> Hide thin trading</label>
          <label class="chk"><input id="em-three" type="checkbox" ${f.allThree ? "checked" : ""}> All three buying</label>
        </div>
        <div class="tabs" role="group" aria-label="Pattern">${[["all", `All <small>${unpatterned.length}</small>`], ...counts.map(([k, n]) => [k, `${PATTERNS[k][0]} <small>${n}</small>`])].map(([k, l]) => `<button type="button" class="tab" data-pattern="${k}" aria-pressed="${f.pattern === k}">${l}</button>`).join("")}</div>
        <div class="tools em-tools">${exportBtn("export-em")}</div>
        <div class="table-scroll"><table class="tbl em-tbl">
          <thead><tr>${th("ticker", "Company", "l fz fz-em")}${th("px", "Price")}${th("day", "Today")}${th("mcap", "Market cap")}${th("stake", "Big Three stake", "sep")}${th("stakeChangeQoQ", "Δ stake QoQ")}${th("stakeChangeYoY", "Δ stake YoY")}${th("breadth", "Buying", "c")}${th("flowYoY", "Net buying YoY")}${th("pattern", "Pattern", "sep")}${th("rev", "Rev. growth")}${th("ins", "Insiders 90d")}<th scope="col">Stake, 2Y</th><th scope="col" class="l">Flags</th></tr></thead>
          <tbody>${body || `<tr><td colspan="14" class="l na" style="height:80px">No company matches these filters. Widen the price range or market cap.</td></tr>`}</tbody>
        </table></div>
        ${sorted.length > f.limit ? `<button type="button" class="more" id="em-more" style="border:1px solid var(--line);border-radius:var(--radius)">Show all ${sorted.length} companies</button>` : ""}
        <p class="foot">Stake = combined shares held by the three managers ÷ shares outstanding at the quarter end (SEC XBRL balance sheet), so offerings and splits do not count as buying. pp = percentage points. “Buying” shows which managers raised their own stake over the year. Net buying is the change in shares valued at the quarter-end price. Prices and market caps are live. 13F reports lag the quarter by up to 45 days. Not investment advice.</p>
        <section class="section bt" aria-labelledby="bt-h" id="bt">${backtestSection()}</section>
      </div>
      <aside class="rail" aria-label="About the screen">
        <section class="card" aria-labelledby="fun-h">
          <div class="card-head"><h2 id="fun-h">How the screen narrows</h2></div>
          <dl class="kv">
            <div><dt>Securities held</dt><dd>${(diag.held || 0).toLocaleString("en-US")}</dd></div>
            <div><dt>Low price, growing position</dt><dd>${(diag.prefilter || 0).toLocaleString("en-US")}</dd></div>
            <div><dt>Operating companies</dt><dd>${(diag.companies || 0).toLocaleString("en-US")}</dd></div>
            <div><dt>No share count (left out)</dt><dd>${(diag.noSharesOutstanding || 0).toLocaleString("en-US")}</dd></div>
            <div><dt>History not linkable (left out)</dt><dd>${(diag.unlinkedHistory || 0).toLocaleString("en-US")}</dd></div>
            <div><dt>Passed: stake up ≥ ${(D.emerging.params.min_stake_change * 100).toFixed(0)} pp in a year</dt><dd>${(diag.passed || 0).toLocaleString("en-US")}</dd></div>
            <div><dt>Matching your filters</dt><dd>${rows.length}</dd></div>
          </dl>
        </section>
        <section class="card" aria-labelledby="pat-h">
          <div class="card-head"><h2 id="pat-h">Patterns</h2></div>
          <div class="list prose">${Object.entries(PATTERNS).map(([k, [l, d]]) => `<div class="item"><span class="pat pat-${k}">${l}</span><span class="nm"><small>${esc(d)}</small></span><span></span></div>`).join("")}</div>
        </section>
        <section class="card" aria-labelledby="top-em-h">
          <div class="card-head"><h2 id="top-em-h">Largest stake gains</h2></div>
          <div class="list">${rows.slice().sort((a, b) => b.stakeChangeYoY - a.stakeChangeYoY).slice(0, 6).map((r) => { const o = emSec(r); return `<a href="${emLink(r)}">${tkChip(o)}<span class="nm"><b>${esc(niceName(o.name))}</b><small>${pct(r.stake, 1, false)} owned by the Big Three</small></span><span class="rt"><b class="txt-up">${pp(r.stakeChangeYoY)}</b><small class="muted">a year</small></span></a>`; }).join("")}</div>
        </section>
      </aside>`;

    const app = $("app");
    const num0 = (id) => parseFloat($(id).value);
    const setRange = () => {
      const a = Math.max(0, isNaN(num0("em-pmin")) ? 0 : num0("em-pmin"));
      const b = Math.max(0, isNaN(num0("em-pmax")) ? 30 : num0("em-pmax"));
      [f.pmin, f.pmax] = a <= b ? [a, b] : [b, a];
      render();
    };
    $("em-pmin").addEventListener("change", setRange);
    $("em-pmax").addEventListener("change", setRange);
    $("em-mcap").addEventListener("change", (e) => { f.mcap = +e.target.value; render(); });
    $("em-deals").addEventListener("change", (e) => { f.hideDeals = e.target.checked; render(); });
    $("em-thin").addEventListener("change", (e) => { f.hideThin = e.target.checked; render(); });
    $("em-three").addEventListener("change", (e) => { f.allThree = e.target.checked; render(); });
    app.querySelectorAll("[data-pattern]").forEach((b) => b.addEventListener("click", () => { f.pattern = b.dataset.pattern; f.limit = 100; render(); }));
    $("em-more")?.addEventListener("click", () => { f.limit = Infinity; render(); });
    $("export-em").addEventListener("click", exportEmerging);
    drawBacktest();
    app.querySelectorAll("[data-emsort]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.emsort;
      f.dir = f.sort === k ? -f.dir : k === "ticker" ? 1 : -1;
      f.sort = k;
      render();
    }));
    app.querySelectorAll(".em-tbl tbody tr[data-slug]").forEach((tr) => tr.addEventListener("click", (e) => { if (!e.target.closest("a")) location.hash = "t-" + tr.dataset.slug; }));
  }

  // ---------- company ----------
  function renderCompany() {
    const s = bySlug(state.slug);
    if (!s) {
      const slug = state.slug;
      const row = emergingAll().find((r) => slugOf(r.ticker) === slug);
      if (row) {
        $("app").innerHTML = `<div class="main"><p class="empty-state">Loading ${esc(row.ticker)}…</p></div>`;
        loadCompany(slug).then((ok) => {
          if (state.page !== "company" || state.slug !== slug) return;
          if (ok && bySlug(slug)) { render(); return; }
          delete coLoads[slug];
          $("app").innerHTML = `<div class="main"><p class="empty-state">The page for ${esc(niceName(row.name))} could not be loaded. <a href="${edgarLink(row.cik)}" target="_blank" rel="noopener">Open it on SEC EDGAR</a> or <a href="#emerging">go back to Emerging</a>.</p></div>`;
        });
        return;
      }
      $("app").innerHTML = `<div class="main"><p class="empty-state">That company isn’t among the Big Three’s largest holdings. <a href="#${state.view}">Back to holdings</a></p></div>`;
      return;
    }
    const c = s.cusip;
    const f = s.fundamentals || {};
    const per = D.meta.periods;
    const n = per.length;
    const siblings = Object.values(D.securities).filter((o) => o.cik && o.cik === s.cik && o.cusip !== c);
    const latestG = MGRS.map((id) => (s.stakes13g || []).find((g) => g.manager === id && g.percent > 0)).filter(Boolean);
    const fin = !!f.financialsNote;
    const q = f.quarterly || [];
    const lq = q[q.length - 1], yq = q.length >= 5 ? q[q.length - 5] : null;
    const yoy = (a, b) => (a != null && b ? a / b - 1 : null);

    const ownRow = (label, mark, h, extra = "") => {
      if (!h) return `<tr><td class="l">${mark}${label}</td><td colspan="8" class="na l">Not held</td></tr>`;
      const cur = lastOf(h);
      return `<tr${extra}><td class="l">${mark}${label}</td><td>${usd(cur[1])}</td><td>${live("val", s.ticker, cur[0])}</td><td>${num(cur[0])}</td><td>${h.ownership == null ? "n/a" : pct(h.ownership, 2, false)}</td><td>${h.rank ? "#" + h.rank : "—"}</td><td>${h.qoq ? pill(h.qoq.dSharesPct, { sm: true }) : "—"}</td><td>${h.yoy ? pill(h.yoy.dSharesPct, { sm: true }) : "—"}</td><td>${signed(h.inception.dSharesPct)} <span class="muted">from ${qshort(h.inception.period)}</span></td></tr>`;
    };
    const notes = [];
    (s.splits || []).forEach((sp) => notes.push(sp.ratio >= 1
      ? `${sp.ratio}-for-1 split in ${qlabel(sp.period)}; earlier share counts are multiplied by ${sp.ratio}.`
      : `1-for-${Math.round(1 / sp.ratio)} reverse split in ${qlabel(sp.period)}; earlier share counts are divided by ${Math.round(1 / sp.ratio)}.`));
    (s.predecessors || []).forEach((p) => notes.push(`CUSIP changed from ${p.cusip} after ${qlabel(p.until)}; both lines are joined into one history.`));
    if (siblings.length) notes.push(`${niceName(s.name)} has more than one listed share class (${[s, ...siblings].map((x) => x.ticker).join(", ")}). 13F filings report each separately; stakes here are measured against all classes combined.`);
    if (s.fundamentalsCik) notes.push(`Fundamentals use the predecessor registrant (CIK ${+s.fundamentalsCik}) until the new holding company has a full year of its own reports.`);
    if (f.available && !f.marketCap) notes.push("Shares outstanding are reported only per share class in XBRL, so market cap, stake and P/E are not computed.");
    notes.push("Returns are price-only: dividends and spin-offs are not included.");
    const fye = s.fiscalYearEnd ? new Date(Date.UTC(2000, +s.fiscalYearEnd.slice(0, 2) - 1, +s.fiscalYearEnd.slice(2))).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "—";
    const b3 = holder(c, "big3");

    $("app").innerHTML = `
      <div class="main">
        <div class="hero">
          ${coNav(s)}
          <nav class="crumbs" aria-label="Breadcrumb"><span>${esc(s.ticker)}${s.exchange ? " • " + esc(s.exchange.toUpperCase()) : ""}</span></nav>
          <h1>${esc(niceName(s.name))} ${tkChip(s)}<span class="co-acts"><button type="button" class="follow" data-follow="${esc(s.ticker)}" aria-pressed="${isWatched(s.ticker)}">${isWatched(s.ticker) ? "★ Following" : "☆ Follow"}</button><button type="button" class="follow" id="co-alerts" aria-expanded="false" aria-controls="alert-panel">🔔 Alerts</button></span></h1>
          <div class="alert-panel" id="alert-panel" hidden>${alertPanel(s)}</div>
          <p class="hero-sub">${esc(s.sector || "")}${s.industry ? " · " + esc(s.industry) : ""}</p>
          <div class="figure" id="co-figure">${coFigure(s)}</div>
          <p class="figure-note">${live("stamp", s.ticker)} · 13F quarter-end price ${price(s.price)} on ${dateL(D.meta.latest)}</p>
        </div>
        <div class="chart-block">
          ${(state.coMode === "price" ? pxRangeBar : rangeBar)(`<div class="toggles" role="group" aria-label="Chart metric">${[["price", "Price"], ["shares", "Shares held"], ["value", "Value held"]].map(([k, l]) => `<button type="button" class="chip" data-co-mode="${k}" aria-pressed="${state.coMode === k}">${l}</button>`).join("")}${state.coMode === "price" && s.ticker !== "SPY" ? `<button type="button" class="chip cmp" data-cmp aria-pressed="${state.cmp}">vs S&amp;P 500</button>` : ""}</div>`)}
          ${state.coMode !== "price" ? `<div class="legend">${MGRS.filter((id) => holder(c, id)).map((id) => `<span><i style="background:${mColor(id)}"></i>${MGR_NAME[id]}</span>`).join("")}</div>` : ""}
          <div class="chart" id="co-chart"></div>
          ${state.coMode !== "price" && (s.splits || []).length ? `<p class="figure-note">Share counts split-adjusted for ${(s.splits || []).map((sp) => (sp.ratio >= 1 ? `${sp.ratio}:1` : `1:${Math.round(1 / sp.ratio)}`) + " in " + qlabel(sp.period)).join(" and ")}.</p>` : ""}
        </div>
        ${emergingSection(s)}
        ${fundsSection(s)}
        ${insidersSection(s)}
        <section class="section" aria-labelledby="own-h">
          <div class="section-head"><h2 id="own-h">Big Three ownership</h2><span class="note">${qlabel(D.meta.latest)} 13F filings</span></div>
          <div class="table-scroll flat"><table class="own-table">
            <thead><tr><th class="l" scope="col">Manager</th><th scope="col">13F value</th><th scope="col">Value today</th><th scope="col">Shares</th><th scope="col">Stake</th><th scope="col">Rank</th><th scope="col">QoQ shares</th><th scope="col">YoY shares</th><th scope="col">Since first held</th></tr></thead>
            <tbody>${MGRS.map((id) => ownRow(MGR_NAME[id], dot(id), holder(c, id))).join("")}${ownRow("Big Three", "", b3, ' class="total"')}</tbody>
          </table></div>
          ${latestG.length ? `<div class="g13"><b>Latest Schedule 13G stakes</b>${latestG.map((g) => `<span>${dot(g.manager)}${esc(g.reporter)}: <b>${pct(g.percent, 2, false)}</b> of the class as of ${dateL(g.eventDate)} · <a href="${g.url}" target="_blank" rel="noopener">filed ${dateL(g.filed)}</a></span>`).join("")}</div>` : ""}
        </section>
        ${f.available ? `<section class="section" aria-labelledby="fin-h">
          <div class="section-head"><h2 id="fin-h">Financials</h2><span class="note">From SEC XBRL filings</span></div>
          <div class="fin">
            <div class="fin-chart-wrap"><div class="legend"><span><i style="background:var(--accent)"></i>Revenue</span><span><i style="background:var(--vg)"></i>Net income</span></div><div class="chart" id="fin-chart"></div></div>
            <div>
              <table class="fin-table">
                <thead><tr><th class="l" scope="col">Quarter (USD)</th><th scope="col">${lq ? monthL(lq.end) : ""}</th><th scope="col">Y/Y change</th></tr></thead>
                <tbody>
                  <tr><td class="l">Revenue</td><td>${usd(lq?.revenue)}</td><td>${pill(yoy(lq?.revenue, yq?.revenue), { sm: true })}</td></tr>
                  <tr><td class="l">Net income</td><td>${usd(lq?.netIncome)}</td><td>${lq?.netIncome > 0 && yq?.netIncome > 0 ? pill(yoy(lq.netIncome, yq.netIncome), { sm: true }) : '<span class="na">n.m.</span>'}</td></tr>
                  <tr><td class="l">Net margin</td><td>${lq?.netIncome != null ? pct(lq.netIncome / lq.revenue, 1, false) : "—"}</td><td>${lq?.netIncome != null && yq?.netIncome != null ? signed(lq.netIncome / lq.revenue - yq.netIncome / yq.revenue, (x) => (x > 0 ? "+" : "") + (x * 100).toFixed(1) + " pts") : "—"}</td></tr>
                </tbody>
              </table>
              <table class="fin-table">
                <thead><tr><th class="l" scope="col">Trailing 12 months</th><th scope="col">${dateL(f.asOf)}</th><th scope="col">Y/Y change</th></tr></thead>
                <tbody>
                  <tr><td class="l">Revenue</td><td>${usd(f.revenueTTM)}</td><td>${pill(f.revenueGrowth, { sm: true })}</td></tr>
                  <tr><td class="l">Diluted EPS</td><td>${f.epsTTM == null ? "—" : "$" + f.epsTTM.toFixed(2)}</td><td>${f.epsGrowth == null ? '<span class="na">n.m.</span>' : pill(f.epsGrowth, { sm: true })}</td></tr>
                  ${fin ? "" : `<tr><td class="l">Free cash flow</td><td>${usd(f.fcfTTM)}</td><td class="muted">${f.fcfMargin == null ? "" : pct(f.fcfMargin, 1, false) + " margin"}</td></tr>`}
                  ${fin ? "" : `<tr><td class="l">Gross margin</td><td>${pct(f.grossMargin, 1, false)}</td><td></td></tr><tr><td class="l">Operating margin</td><td>${pct(f.operatingMargin, 1, false)}</td><td></td></tr>`}
                  <tr><td class="l">Return on equity</td><td>${pct(f.roe, 1, false)}</td><td></td></tr>
                </tbody>
              </table>
            </div>
          </div>
          ${fin ? '<p class="foot">Bank or insurer: gross margin, free cash flow and leverage are not comparable with industrial companies and are left out.</p>' : ""}
        </section>` : `<section class="section"><h2>Financials</h2><p class="foot">${esc(f.reason || "No XBRL fundamentals found for this issuer.")}</p></section>`}
        <section class="section" aria-labelledby="notes-h">
          <h2 id="notes-h">Notes</h2>
          <ul class="notes">${notes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          ${s.cik ? `<p class="foot"><a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${s.cik}&owner=include&count=40" target="_blank" rel="noopener">All ${esc(s.ticker)} filings on EDGAR</a></p>` : ""}
        </section>
      </div>
      <aside class="rail" aria-label="Key stats">
        <section class="card" aria-labelledby="cks-h">
          <div class="card-head"><h2 id="cks-h">Key stats</h2></div>
          <dl class="kv">
            <div><dt>Previous close</dt><dd>${price(Q[s.ticker]?.prevClose)}</dd></div>
            <div class="kv-range"><dt>Day range</dt><dd>${live("dayr", s.ticker)}</dd></div>
            <div class="kv-range"><dt>52-week range</dt><dd>${live("yearr", s.ticker)}</dd></div>
            <div><dt>Volume</dt><dd>${Q[s.ticker]?.volume ? num(Q[s.ticker].volume) : "—"}</dd></div>
            <div><dt>Market cap</dt><dd>${live("mcap", s.ticker)}</dd></div>
            <div><dt>P/E ratio</dt><dd>${live("pe", s.ticker)}</dd></div>
            <div><dt>Price / sales</dt><dd>${mult(f.ps)}</dd></div>
            ${fin ? "" : `<div><dt>FCF yield</dt><dd>${f.fcfYield == null ? "—" : pct(f.fcfYield, 1, false)}</dd></div>`}
            <div><dt>Revenue (TTM)</dt><dd>${usd(f.revenueTTM)}</dd></div>
            <div><dt>Net margin</dt><dd>${pct(f.netMargin, 1, false)}</dd></div>
            ${fin ? "" : `<div><dt>Net cash</dt><dd>${f.netCash == null ? "—" : usdS(f.netCash)}</dd></div>`}
            <div><dt>Big Three stake</dt><dd>${b3?.ownership == null ? "n/a" : pct(b3.ownership, 1, false)}</dd></div>
            <div><dt>Shares outstanding</dt><dd>${f.sharesOutstanding ? num(f.sharesOutstanding) : "n/a"}</dd></div>
            <div><dt>Fiscal year end</dt><dd>${fye}</dd></div>
            <div><dt>CUSIP</dt><dd>${esc(c)}</dd></div>
          </dl>
        </section>
        ${feedCard(s.ticker)}
        <section class="card" aria-labelledby="sim-h">
          <div class="card-head"><h2 id="sim-h">More ${esc(s.sector || "holdings")}</h2></div>
          <div class="list">${view().rows.filter((r) => sec(r.cusip).sector === s.sector && r.cusip !== c).slice(0, 5).map((r) => { const o = sec(r.cusip); return `<a href="#t-${slugOf(o.ticker)}">${tkChip(o)}<span class="nm"><b>${esc(niceName(o.name))}</b><small>${usd(r.value)} held by ${esc(MGR_NAME[state.view])}</small></span><span class="rt">${r.qoq ? pill(r.qoq.dSharesPct, { sm: true }) : ""}</span></a>`; }).join("") || '<div class="item"><span></span><span class="nm"><small>No other top-${D.meta.topN} holdings in this sector.</small></span><span></span></div>'}</div>
        </section>
      </aside>`;

    drawCoChart(s);
    if (f.available && q.length) finChart($("fin-chart"), q);
    const app = $("app");
    wireCommon(app);
    app.querySelectorAll("[data-co-mode]").forEach((b) => b.addEventListener("click", () => { state.coMode = b.dataset.coMode; render(); }));
    $("co-alerts").addEventListener("click", (e) => {
      const p = $("alert-panel");
      p.hidden = !p.hidden;
      e.currentTarget.setAttribute("aria-expanded", String(!p.hidden));
    });
    wireCopy($("alert-panel"));
    app.querySelector("[data-cmp]")?.addEventListener("click", () => {
      state.cmp = !state.cmp;
      try { localStorage.setItem("mrfink.cmp", state.cmp ? "1" : "0"); } catch (e) { /* storage unavailable */ }
      render();
    });
    app.querySelectorAll("[data-pxrange]").forEach((b) => b.addEventListener("click", () => { state.pxRange = b.dataset.pxrange; render(); }));
    if (!H && !s.lite) loadHistory().then(() => { if (state.page === "company" && state.coMode === "price") { $("co-figure").innerHTML = coFigure(s); drawCoChart(s); } });
  }

  /** Open-market insider trades from Form 4 over the last 90 days. */
  function insidersSection(s) {
    const ins = s.insiders;
    if (!ins) return "";
    const net = ins.bought - ins.sold;
    const rows = ins.trades.map((t) => `<tr>
        <td class="l">${dateL(t.date)}</td><td class="l"><b>${esc(t.name)}</b><small class="muted"> ${esc(t.role)}</small></td>
        <td><span class="act ${t.code === "P" ? "new" : "out"}">${t.code === "P" ? "Bought" : "Sold"}</span>${t.plan ? ' <small class="muted" title="Pre-arranged trading plan (Rule 10b5-1)">plan</small>' : ""}</td>
        <td>${num(t.shares)}</td><td>${price(t.price)}</td><td><b>${usd(t.value)}</b></td><td><a href="${t.url}" target="_blank" rel="noopener">Form 4</a></td></tr>`).join("");
    return `<section class="section" aria-labelledby="ins-h">
      <div class="section-head"><h2 id="ins-h">Insider trades</h2><span class="note">Form 4 · last ${ins.days} days</span></div>
      <div class="ins-sum">
        <span>Bought <b class="txt-up">${ins.bought ? usd(ins.bought) : "none"}</b> <small class="muted">${ins.buys} trade${ins.buys === 1 ? "" : "s"}, ${ins.buyers} insider${ins.buyers === 1 ? "" : "s"}</small></span>
        <span>Sold <b class="txt-down">${ins.sold ? usd(ins.sold) : "none"}</b> <small class="muted">${ins.sells} trade${ins.sells === 1 ? "" : "s"}</small></span>
        <span>Net <b class="${net >= 0 ? "txt-up" : "txt-down"}">${usdS(net)}</b></span>
      </div>
      ${rows ? `<div class="table-scroll flat"><table class="own-table"><thead><tr><th class="l" scope="col">Date</th><th class="l" scope="col">Insider</th><th scope="col">Trade</th><th scope="col">Shares</th><th scope="col">Price</th><th scope="col">Value</th><th scope="col"><span class="sr">Filing</span></th></tr></thead><tbody>${rows}</tbody></table></div>`
        : `<p class="foot">No open-market purchases or sales by officers, directors or 10% owners in the last ${ins.days} days.</p>`}
      <p class="foot">Open-market purchases and sales only; stock awards, option exercises, tax withholding and gifts are left out.${ins.pending ? ` ${ins.pending} recent Form 4 filings are still being read and will appear after the next refreshes.` : ""}</p>
    </section>`;
  }
  function fundsSection(s) {
    const funds = s.funds || [];
    if (!funds.length) return "";
    const rows = funds.map((f) => {
      const chg = f.prevShares ? f.shares / f.prevShares - 1 : null;
      return `<tr><td class="l fund-cell">${dot(f.manager)}<b>${esc(f.fund)}</b> <span class="muted fund-name">${esc(f.name)}</span></td><td>${dateL(f.period)}</td><td>${num(f.shares)}</td><td>${usd(f.value)}</td><td>${f.weight < 0.0001 ? "<0.01%" : pct(f.weight, 2, false)}</td><td>${f.prevShares ? pill(chg, { sm: true }) : '<span class="act new">New</span>'}</td><td>${live("val", s.ticker, f.shares)}</td></tr>`;
    }).join("");
    return `<section class="section" aria-labelledby="funds-h">
      <div class="section-head"><h2 id="funds-h">Held in these index funds</h2><span class="note">Form N-PORT, fund by fund</span></div>
      <div class="table-scroll flat"><table class="own-table">
        <thead><tr><th class="l" scope="col">Fund</th><th scope="col">As of</th><th scope="col">Shares</th><th scope="col">Value</th><th scope="col">% of fund</th><th scope="col">vs prior report</th><th scope="col">Value today</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="foot">Flagship index funds of each manager (S&amp;P 500, total market, mid and small cap, Russell 2000). Funds report each quarter-end month about 60 days later; dates differ by fiscal calendar. “vs prior report” compares shares with the fund’s previous public N-PORT.</p>
    </section>`;
  }

  function emergingSection(s) {
    const r = emergingAll().find((x) => x.cusip === s.cusip);
    if (!r) return "";
    const flags = liveFlags(r);
    return `<section class="section callout em-why" aria-labelledby="emw-h">
      <h2 id="emw-h">Why it is on the Emerging list</h2>
      <p>The Big Three own <b>${pct(r.stake, 2, false)}</b> of ${esc(s.ticker)}, ${signed(r.stakeChangeYoY, pp, 0.0005)} over the year and ${signed(r.stakeChangeQoQ, pp, 0.0005)} last quarter. Pattern: <span class="pat pat-${r.pattern}">${PATTERNS[r.pattern][0]}</span> ${esc(PATTERNS[r.pattern][1].toLowerCase())}.</p>
      <div class="legend">${r.stakePeriods.map((p, i) => `<span>${qshort(p)} <b>${r.stakeHistory[i] == null ? "—" : pct(r.stakeHistory[i], 1, false)}</b></span>`).join("")}</div>
      ${flags.length ? `<p>${flags.map((k) => `<span class="flag">${FLAGS[k][0]}</span> ${esc(FLAGS[k][1])}`).join("<br>")}</p>` : ""}
    </section>`;
  }

  /** Price points for the selected range: intraday for 1D/5D, daily closes otherwise, live price appended. */
  function pricePoints(t) {
    const q = Q[t] || {};
    const r = state.pxRange;
    if (r === "1D" || r === "5D") {
      let pts = (q.intraday || []).slice();
      if (r === "1D" && pts.length) {
        const lastDay = dayNY(pts[pts.length - 1][0]);
        pts = pts.filter(([ts]) => dayNY(ts) === lastDay);
      }
      return { pts: pts.map(([ts, p]) => [ts * 1000, p]), base: r === "1D" ? q.prevClose : pts.length ? pts[0][1] : null, intraday: true };
    }
    const h = histOf(t);
    if (!h) return { pts: [], base: null };
    const now = Date.now();
    const start = r === "YTD" ? Date.UTC(new Date().getUTCFullYear(), 0, 1) : r === "Max" ? 0 : now - PX_RANGES.find(([k]) => k === r)[1] * 86400000;
    const pts = [];
    h.ms.forEach((ms, i) => { if (ms >= start) pts.push([ms, h.c[i]]); });
    if (q.price && q.time && (!pts.length || q.time * 1000 - pts[pts.length - 1][0] > 12 * 3600000)) pts.push([q.time * 1000, q.price]);
    else if (q.price && pts.length) pts[pts.length - 1][1] = q.price;
    return { pts, base: pts.length ? pts[0][1] : null };
  }
  function coFigure(s) {
    const t = s.ticker;
    const label = { "1D": "today", "5D": "past 5 days", "1M": "past month", "6M": "past 6 months", YTD: "year to date", "1Y": "past year", "5Y": "past 5 years", Max: "past 10 years" }[state.pxRange];
    if (!pxOf(t)) return `<span class="figure-value">${price(s.price)}</span><span class="muted">13F quarter-end price</span>`;
    if (state.pxRange === "1D" || state.coMode !== "price") return `<span class="figure-value">${live("px", t)}</span>${live("pillLg", t)}<span class="figure-chg">${live("chgabs", t)}</span><span class="muted">today</span>`;
    const { base } = pricePoints(t);
    const p = pxOf(t);
    if (!base) return `<span class="figure-value">${live("px", t)}</span>${live("pillLg", t)}<span class="muted">today</span>`;
    return `<span class="figure-value">${live("px", t)}</span>${pill(p / base - 1)}<span class="figure-chg ${p >= base ? "txt-up" : "txt-down"}">${p >= base ? "+" : "-"}${price(Math.abs(p - base)).slice(1)}</span><span class="muted">${label}</span>`;
  }
  function drawCoChart(s) {
    const host = $("co-chart");
    if (!host) return;
    lastChartDraw = Date.now();
    const c = s.cusip;
    const per = D.meta.periods;
    if (state.coMode === "price") {
      const intradayRange = ["1D", "5D"].includes(state.pxRange);
      const hasDay = () => Q[s.ticker] && Q[s.ticker].intraday && Q[s.ticker].intraday.length;
      if (intradayRange && !hasDay()) {
        if (s.lite) { host.innerHTML = '<p class="empty-state">Intraday prices for this company are not available yet. Choose 1M or longer.</p>'; return; }
        host.innerHTML = '<p class="empty-state">Loading today’s prices…</p>';
        loadIntraday().then(() => {
          if (bySlug(state.slug) !== s || state.coMode !== "price") return;
          if (hasDay()) drawCoChart(s);
          else if ($("co-chart")) $("co-chart").innerHTML = '<p class="empty-state">Intraday prices are not available. Choose 1M or longer.</p>';
        });
        return;
      }
      const { pts, base, intraday } = pricePoints(s.ticker);
      if (pts.length < 2) { host.innerHTML = `<p class="empty-state">${H || histOf(s.ticker) ? "No price history for this range." : "Loading price history…"}</p>`; return; }
      if (state.cmp && s.ticker !== "SPY") {
        // The S&P 500 series lives in history.json / quotes.json; fetch them the first time.
        const need = intraday ? !(Q.SPY && Q.SPY.intraday && Q.SPY.intraday.length) : !(H && H.SPY);
        if (need) {
          (intraday ? loadIntraday() : loadHistory()).then(() => { if (bySlug(state.slug) === s && state.cmp) drawCoChart(s); });
          if (!(intraday ? Q.SPY && Q.SPY.intraday : H)) { host.innerHTML = '<p class="empty-state">Loading the S&amp;P 500…</p>'; return; }
        }
        drawCompare(host, s, pts, intraday);
        return;
      }
      const last = pts[pts.length - 1][1];
      const fmtX = intraday
        ? (state.pxRange === "1D" ? (i) => timeNY(pts[i][0] / 1000) : (i) => dayNY(pts[i][0] / 1000))
        : (i) => new Date(pts[i][0]).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(" ", " ’");
      const tip = intraday
        ? (i) => `<strong>${dayNY(pts[i][0] / 1000)}, ${timeNY(pts[i][0] / 1000)} ET</strong>`
        : (i) => `<strong>${dateL(new Date(pts[i][0]).toISOString().slice(0, 10))}</strong>`;
      lineChart(host, {
        series: [{ name: "Price", color: last >= base ? "var(--pos-line)" : "var(--neg-line)", values: pts.map((p) => p[1]) }],
        dates: pts.map((p) => p[0]), height: 280, fmt: price, axisFmt: (v) => "$" + trim(compact(v)), ref: base, xLabel: fmtX, tipTitle: tip,
      });
      return;
    }
    const i0 = rangeStart(per.length);
    const k = state.coMode === "shares" ? 0 : 1;
    const series = MGRS.filter((id) => holder(c, id)).map((id) => ({ name: MGR_NAME[id], color: mColor(id), values: holder(c, id).series.slice(i0).map((x) => (x[0] ? x[k] : null)) }));
    lineChart(host, { series, dates: per.slice(i0), height: 280, fmt: k ? usd : (v) => num(v) + " shares", axisFmt: k ? axisUsd : axisNum });
  }

  // ---------- alerts for one company ----------
  const companyTopic = (t) => (D.meta.notify && D.meta.notify.companyPrefix ? D.meta.notify.companyPrefix + slugOf(t).replace(/^-+|-+$/g, "") : null);
  function alertPanel(s) {
    const topic = companyTopic(s.ticker);
    const server = ((D.meta.notify && D.meta.notify.server) || "https://ntfy.sh").replace(/\/$/, "");
    const on = isWatched(s.ticker);
    return `<div class="ap-row"><div><b>On your phone, even when the site is closed</b>
        <p>Every SEC filing by ${esc(s.ticker)} (8-K, 10-Q/10-K, Big Three 13G/13D) is pushed to its own channel. In the free ntfy app (<a href="https://apps.apple.com/app/ntfy/id1625396347" target="_blank" rel="noopener">iPhone</a> · <a href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" target="_blank" rel="noopener">Android</a>) tap +, then paste the channel name.</p></div>
        ${topic ? `<div class="np-sub"><code>${esc(topic)}</code><button type="button" class="btn" data-copy="${esc(topic)}">Copy</button><a class="btn" href="${esc(server)}/${esc(topic)}" target="_blank" rel="noopener">Open</a></div>` : '<p class="muted">Phone channels are not set up for this site.</p>'}</div>
      <div class="ap-row"><div><b>In this browser</b>
        <p>${on ? `${esc(s.ticker)} is in your watchlist, so its new filings show as browser notifications while Mr. Fink is open${nprefs.browser ? "" : " once browser notifications are on (bell, top right)"}.` : `Follow ${esc(s.ticker)} to get a browser notification for each of its filings while Mr. Fink is open.`}</p></div>
        ${on ? "" : `<button type="button" class="btn primary" data-follow="${esc(s.ticker)}" aria-pressed="false">☆ Follow ${esc(s.ticker)}</button>`}</div>`;
  }
  /** Watched companies outside the main feed: check their own file for new filings every 5 minutes. */
  let watchCheckAt = 0;
  async function checkWatchFilings() {
    if (Date.now() - watchCheckAt < 5 * 60000 || !watch.length) return;
    watchCheckAt = Date.now();
    let seen = {};
    try { seen = JSON.parse(localStorage.getItem("mrfink.watchSeen") || "{}"); } catch (e) { seen = {}; }
    const tracked = new Set(Object.values(D.securities).filter((x) => !x.lite).map((x) => x.ticker));
    const fresh = [];
    for (const t of watch.filter((x) => !tracked.has(x) && emergingAll().some((r) => r.ticker === x))) {
      try {
        const r = await fetch(`data/co/${slugOf(t)}.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) continue;
        const { security } = await r.json();
        const acc = (security.filings || []).map((e) => e.accession);
        if (seen[t]) fresh.push(...(security.filings || []).filter((e) => !seen[t].includes(e.accession)));
        seen[t] = acc;
        if (D.securities[security.cusip]) D.securities[security.cusip].filings = security.filings;
      } catch (e) { /* try again next time */ }
    }
    try { localStorage.setItem("mrfink.watchSeen", JSON.stringify(seen)); } catch (e) { /* storage unavailable */ }
    if (fresh.length) { browserNotify(fresh, true); toast(`New filing: ${feedTitle(fresh[0])[0]}`); }
  }

  // ---------- export ----------
  /** Download rows as a CSV file that opens in Excel. cols: [header, value(row)]; numbers stay numbers. */
  function downloadCSV(name, cols, rows) {
    const cell = (v) => {
      if (v == null || (typeof v === "number" && !isFinite(v))) return "";
      if (typeof v === "number") return String(Math.round(v * 1e6) / 1e6);
      const t = String(v);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const lines = [cols.map((c) => cell(c[0])).join(",")].concat(rows.map((r) => cols.map((c) => cell(c[1](r))).join(",")));
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mr-fink-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast(`Downloaded ${rows.length} rows`);
  }
  const pc = (x) => (x == null ? null : x * 100);  // fractions as percent numbers
  const mcapOf = (t, so) => { const p = pxOf(t); return p && so ? p * so : null; };
  function exportHome() {
    const v = view();
    const total = v.totals[D.meta.periods.length - 1];
    const S = (r) => sec(r.cusip), F = (r) => S(r).fundamentals || {};
    downloadCSV(`${state.view}-top-${v.rows.length}`, [
      ["Rank", (r) => r.rank], ["Ticker", (r) => S(r).ticker], ["Company", (r) => niceName(S(r).name)], ["Sector", (r) => S(r).sector], ["Industry", (r) => S(r).industry],
      ["Price ($)", (r) => pxOf(S(r).ticker)], ["Today (%)", (r) => pc(dayChg(S(r).ticker))], ["Market cap ($)", (r) => mcapOf(S(r).ticker, F(r).sharesOutstanding)],
      [`13F value ${D.meta.latest} ($)`, (r) => r.value], ["Shares held", (r) => r.shares], ["% of book", (r) => pc(r.value / total)], ["Stake (%)", (r) => pc(r.ownership)],
      ["QoQ shares (%)", (r) => pc(r.qoq && r.qoq.dSharesPct)], ["QoQ net flow ($)", (r) => r.qoq && r.qoq.trade],
      ["YoY shares (%)", (r) => pc(r.yoy && r.yoy.dSharesPct)], ["YoY net flow ($)", (r) => r.yoy && r.yoy.trade],
      ["Since first held, shares (%)", (r) => pc(r.inception && r.inception.dSharesPct)], ["First held", (r) => r.inception && r.inception.period],
      ["Revenue TTM ($)", (r) => F(r).revenueTTM], ["Revenue growth (%)", (r) => pc(F(r).revenueGrowth)], ["Net margin (%)", (r) => pc(F(r).netMargin)],
      ["P/E", (r) => { const p = pxOf(S(r).ticker), e = F(r).epsTTM; return p && e > 0 ? p / e : null; }],
    ], homeSorted());
  }
  function exportEmerging() {
    const S = (r) => emSec(r);
    downloadCSV("emerging", [
      ["Ticker", (r) => r.ticker], ["Company", (r) => niceName(S(r).name)], ["Sector", (r) => S(r).sector], ["Industry", (r) => S(r).industry],
      ["Price ($)", (r) => pxOf(r.ticker) || r.price], ["Today (%)", (r) => pc(dayChg(r.ticker))], ["Market cap ($)", (r) => mcapOf(r.ticker, r.sharesOutstanding) || r.marketCap],
      ["Big Three stake (%)", (r) => pc(r.stake)], ["Stake change QoQ (pp)", (r) => pc(r.stakeChangeQoQ)], ["Stake change YoY (pp)", (r) => pc(r.stakeChangeYoY)],
      ["Managers buying", (r) => r.breadth], ["Net buying YoY ($)", (r) => r.flowYoY], ["Pattern", (r) => PATTERNS[r.pattern][0]],
      ["Revenue growth (%)", (r) => pc((S(r).fundamentals || {}).revenueGrowth)],
      ["Insiders bought 90d ($)", (r) => r.insiders && r.insiders.bought], ["Insiders sold 90d ($)", (r) => r.insiders && r.insiders.sold],
      ["Flags", (r) => liveFlags(r).map((k) => FLAGS[k][0]).join("; ")],
    ], emergingSorted());
  }
  function exportWatch() {
    downloadCSV("watchlist", [
      ["Ticker", (s) => s.ticker], ["Company", (s) => niceName(s.name)], ["Price ($)", (s) => pxOf(s.ticker)], ["Today (%)", (s) => pc(dayChg(s.ticker))],
      ["Market cap ($)", (s) => mcapOf(s.ticker, ((s.fundamentals || {}).sharesOutstanding) || emShares(s.ticker))],
      ["Since 13F (%)", (s) => { const p = pxOf(s.ticker); return p && s.price ? pc(p / s.price - 1) : null; }],
    ], watchItems().map((r) => anySec(r.cusip)));
  }
  const exportBtn = (id) => `<button type="button" class="btn export" id="${id}"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20h14v-2H5v2zm7-18-5.5 5.5 1.42 1.42L11 5.83V16h2V5.83l3.08 3.09 1.42-1.42L12 2z" transform="rotate(180 12 11)"/></svg>Export to Excel</button>`;

  // ---------- watchlist page ----------
  /** Followed companies, as rows with a cusip (full record when loaded, else the Emerging row). */
  function watchItems() {
    return watch.map((t) => {
      const s = bySlug(slugOf(t)) || emergingAll().find((r) => r.ticker === t);
      return s || null;
    }).filter(Boolean);
  }
  const anySec = (c) => D.securities[c] || emergingAll().find((r) => r.cusip === c);
  /** Net insider buying, last 90 days: from the full record, else the Emerging row's summary. */
  function insNet(s) {
    const ins = s.insiders || (emergingAll().find((r) => r.cusip === s.cusip) || {}).insiders;
    if (!ins || (!ins.bought && !ins.sold)) return '<span class="na">—</span>';
    const net = ins.bought - ins.sold;
    return `<span class="${net >= 0 ? "txt-up" : "txt-down"}" title="Bought ${usd(ins.bought)} · sold ${usd(ins.sold)}">${usdS(net)}</span>`;
  }
  function renderWatch() {
    const items = watchItems().map((r) => anySec(r.cusip));
    const stake = (s) => { const h = D.securities[s.cusip] && holder(s.cusip, "big3"); const r = emergingAll().find((x) => x.cusip === s.cusip); return h && h.ownership != null ? h.ownership : r ? r.stake : null; };
    const since = (s) => { const p = pxOf(s.ticker); return p && s.price ? p / s.price - 1 : null; };
    const body = items.map((s) => `<tr data-slug="${slugOf(s.ticker)}">
        <td class="l fz fz-em"><a class="co" href="#t-${slugOf(s.ticker)}">${tkChip(s)}<span class="co-nm"><b>${esc(niceName(s.name))}</b><small>${esc(s.industry || s.sector || "")}</small></span></a></td>
        <td>${live("px", s.ticker)}</td><td>${live("pill", s.ticker)}</td><td>${live("mcap", s.ticker)}</td>
        <td class="sep">${stake(s) == null ? '<span class="na">n/a</span>' : pct(stake(s), 1, false)}</td>
        <td>${since(s) == null ? "—" : pill(since(s), { sm: true })}</td>
        <td>${insNet(s)}</td>
        <td><button type="button" class="btn" data-unwatch="${esc(s.ticker)}" aria-label="Remove ${esc(s.ticker)}">Remove</button></td>
      </tr>`).join("");
    $("app").innerHTML = `<div class="main">
        <div class="hero">
          <h1>Watchlist</h1>
          <p class="hero-sub">Companies you follow, with live prices. Kept in this browser.</p>
        </div>
        ${items.length ? `<div class="tools em-tools">${exportBtn("export-watch")}</div>` : ""}
        ${items.length ? `<div class="table-scroll"><table class="tbl">
          <thead><tr><th class="l fz fz-em" scope="col">Company</th><th scope="col">Price</th><th scope="col">Today</th><th scope="col">Market cap</th><th scope="col" class="sep">Big Three stake</th><th scope="col">Since 13F</th><th scope="col" title="Open-market insider buying minus selling, last 90 days (Form 4)">Insiders 90d</th><th scope="col"><span class="sr">Remove</span></th></tr></thead>
          <tbody>${body}</tbody></table></div>
          <p class="foot">Since 13F is the price change from the quarter-end price in the latest 13F (${dateL(D.meta.latest)}). Each company page has a 🔔 Alerts button for its phone channel.</p>
          ${watchFilings(items)}`
        : `<p class="empty-state">No companies yet. Open any company and tap <b>☆ Follow</b> to keep it here with a live price.</p>`}
      </div>`;
    $("app").querySelectorAll("tbody tr[data-slug]").forEach((tr) => tr.addEventListener("click", (e) => { if (!e.target.closest("a, button")) location.hash = "t-" + tr.dataset.slug; }));
    $("export-watch")?.addEventListener("click", exportWatch);
  }
  /** Latest filings by followed companies: the feed, plus the own filings of pages opened from data/co/. */
  function watchFilings(items) {
    const set = new Set(items.map((s) => s.ticker));
    const seen = new Set();
    const ev = (D.feed || []).filter((e) => (e.tickers || []).some((t) => set.has(t)))
      .concat(items.flatMap((s) => s.filings || []))
      .filter((e) => !seen.has(e.accession) && seen.add(e.accession))
      .sort((a, b) => (a.accepted < b.accepted ? 1 : -1)).slice(0, 12);
    if (!ev.length) return "";
    return `<section class="section" aria-labelledby="wf-h"><div class="section-head"><h2 id="wf-h">Latest filings from your watchlist</h2></div>
      <div class="list wrap">${ev.map((e) => { const [a, b] = feedTitle(e); return `<a href="${e.url}" target="_blank" rel="noopener"><span class="badge frep">${esc(e.form.replace("SCHEDULE ", "").replace("SC ", ""))}</span><span class="nm"><b>${esc(a)}</b><small>${esc(b)}</small></span><span class="rt muted">${ago(e.accepted)}</span></a>`; }).join("")}</div></section>`;
  }

  // ---------- company navigation: back to the list, previous / next in it ----------
  function originList() {
    if (state.from === "emerging") return { hash: "emerging", label: "Emerging", tickers: emergingSorted().slice(0, state.em.limit).map((r) => r.ticker) };
    if (state.from === "watch") return { hash: "watchlist", label: "Watchlist", tickers: watch.slice() };
    return { hash: state.view, label: MGR_NAME[state.view], tickers: homeSorted().map((r) => sec(r.cusip).ticker) };
  }
  function coNav(s) {
    const L = originList();
    const i = L.tickers.indexOf(s.ticker);
    const link = (t, dir) => t ? `<a class="pn" href="#t-${slugOf(t)}" data-replace aria-label="${dir === -1 ? "Previous" : "Next"}: ${esc(t)}">${dir === -1 ? "‹ " + esc(t) : esc(t) + " ›"}</a>` : `<span class="pn off">${dir === -1 ? "‹" : "›"}</span>`;
    return `<div class="co-nav">
      <a class="back" href="#${L.hash}" data-back><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>${esc(L.label)}</a>
      ${i >= 0 ? `<span class="pns">${link(L.tickers[i - 1], -1)}<small>${i + 1} of ${L.tickers.length}</small>${link(L.tickers[i + 1], 1)}</span>` : ""}
    </div>`;
  }
  // Back returns to the list where it was left (scroll position), not to its top.
  const scrollMem = {};
  let arrivedFromList = false;

  /** Price change of the company against the S&P 500 (SPY) over the selected range, both from 0%. */
  function drawCompare(host, s, pts, intraday) {
    const ref = pricePoints("SPY").pts;
    const key = (ms) => (intraday ? ms : Math.floor(ms / 86400000));
    const spy = [];
    let j = 0, last = null;
    for (const [ms] of pts) {
      while (j < ref.length && key(ref[j][0]) <= key(ms)) last = ref[j++][1];
      spy.push(last);
    }
    // 1D measures from the previous close, like the price figure; longer ranges from the first point.
    const oneDay = state.pxRange === "1D";
    const b0 = (oneDay && Q[s.ticker] && Q[s.ticker].prevClose) || pts[0][1];
    const s0 = (oneDay && Q.SPY && Q.SPY.prevClose) || spy.find((v) => v != null);
    if (!s0) { host.innerHTML = '<p class="empty-state">No S&amp;P 500 prices for this range.</p>'; return; }
    const mine = pts.map((p) => p[1] / b0 - 1);
    const idx = spy.map((v) => (v == null ? null : v / s0 - 1));
    const fmtX = intraday
      ? (state.pxRange === "1D" ? (i) => timeNY(pts[i][0] / 1000) : (i) => dayNY(pts[i][0] / 1000))
      : (i) => new Date(pts[i][0]).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(" ", " ’");
    const tip = intraday
      ? (i) => `<strong>${dayNY(pts[i][0] / 1000)}, ${timeNY(pts[i][0] / 1000)} ET</strong>`
      : (i) => `<strong>${dateL(new Date(pts[i][0]).toISOString().slice(0, 10))}</strong>`;
    const pctFmt = (v) => (v == null ? "—" : (v >= 0 ? "+" : "") + (v * 100).toFixed(Math.abs(v) < 0.1 ? 2 : 1) + "%");
    lineChart(host, {
      series: [{ name: s.ticker, color: "var(--accent)", values: mine }, { name: "S&P 500", color: "var(--muted)", values: idx }],
      dates: pts.map((p) => p[0]), height: 280, fmt: pctFmt, axisFmt: (v) => Math.round(v * 100) + "%", ref: 0, signedAxis: true, xLabel: fmtX, tipTitle: tip,
    });
    const a = mine[mine.length - 1], b = idx[idx.length - 1];
    const note = document.createElement("p");
    note.className = "cmp-note";
    note.innerHTML = `<span><i style="background:var(--accent)"></i>${esc(s.ticker)} <b class="${a >= 0 ? "txt-up" : "txt-down"}">${pctFmt(a)}</b></span><span><i style="background:var(--muted)"></i>S&amp;P 500 <b class="${b >= 0 ? "txt-up" : "txt-down"}">${pctFmt(b)}</b></span><span class="muted">${a - b >= 0 ? "Ahead of" : "Behind"} the index by ${(Math.abs(a - b) * 100).toFixed(1)} points</span>`;
    host.appendChild(note);
  }

  // ---------- routing ----------
  function render() {
    hideTip();
    renderChips();
    renderTape();
    if (state.page === "company") renderCompany();
    else if (state.page === "emerging") renderEmerging();
    else if (state.page === "watch") renderWatch();
    else renderHome();
    syncSubscriptions();
    renderLive();
  }
  const pageKey = () => (state.page === "home" ? "home:" + state.view : state.page === "company" ? "co:" + state.slug : state.page);
  function route() {
    const h = decodeURIComponent(location.hash.replace("#", ""));
    const before = state.page + state.slug;
    const leaving = pageKey();
    if (state.page !== "company") scrollMem[leaving] = window.scrollY;
    if (h.startsWith("t-")) {
      if (state.page !== "company") { state.from = state.page; arrivedFromList = true; }
      state.page = "company";
      state.slug = h.slice(2);
    } else if (h === "emerging" && D.emerging) {
      state.page = "emerging";
      state.slug = null;
    } else if (h === "watchlist") {
      state.page = "watch";
      state.slug = null;
    } else {
      state.page = "home";
      state.slug = null;
      if (VIEWS.includes(h) && h !== state.view) { state.view = h; state.sort = { key: "rank", dir: 1 }; }
    }
    render();
    if (before === state.page + state.slug) return;
    const back = leaving.startsWith("co:") && state.page !== "company" ? scrollMem[pageKey()] : null;
    window.scrollTo(0, back || 0);
    if (state.page !== "company") arrivedFromList = false;
  }

  // ---------- live updates ----------
  // ---------- notifications ----------
  // Two ways to be told about new filings: browser notifications while the site is open in a tab,
  // or the free ntfy app, subscribed to the public channel of each filing type (works when closed).
  const NKINDS = [
    ["13f", "13F holdings", "BlackRock, Vanguard or State Street files its quarterly holdings"],
    ["13g", "13G / 13D stakes", "A manager reports owning more than 5% of a tracked company"],
    ["8k", "Material 8-K events", "Deals, bankruptcy, delisting, financings or executive changes at tracked companies"],
    ["report", "10-Q / 10-K", "A tracked company files its quarterly or annual report"],
    ["nport", "Fund holdings (N-PORT)", "A flagship index fund (IWM, VTI, SPSM…) publishes its portfolio"],
  ];
  const nprefs = (() => {
    try { return JSON.parse(localStorage.getItem("mrfink.notify") || "null"); } catch (e) { return null; }
  })() || { kinds: ["13f", "13g", "8k"], browser: false };
  const saveN = () => { try { localStorage.setItem("mrfink.notify", JSON.stringify(nprefs)); } catch (e) { /* storage unavailable */ } };
  const canNotify = () => "Notification" in window;
  function browserNotify(events, watchedOnly = false) {
    if (!nprefs.browser || !canNotify() || Notification.permission !== "granted") return;
    const watched = (e) => (e.tickers || []).some(isWatched);
    events.filter((e) => watched(e) || (!watchedOnly && nprefs.kinds.includes(e.kind) && (e.kind !== "8k" || e.key))).slice(0, 5).forEach((e) => {
      const [title, body] = feedTitle(e);
      try {
        const n = new Notification(title, { body, tag: e.accession });
        n.onclick = () => {
          window.focus();
          const t = (e.tickers || [])[0];
          if (t && bySlug(slugOf(t))) location.hash = "t-" + slugOf(t);
          else location.hash = e.manager || "big3";
        };
      } catch (err) { /* some mobile browsers only notify from a service worker */ }
    });
  }
  function wireCopy(root) {
    root.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => {
      const v = b.dataset.copy;
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast(`Copied ${v}`), () => {
        const code = b.parentElement.querySelector("code");
        const r = document.createRange(); r.selectNodeContents(code); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        toast("Press copy to copy the selected channel name.");
      });
    }));
  }
  // ---------- install as an app ----------
  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; if (!$("npanel").hidden) renderNotifyPanel(); });
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function installSection() {
    if (standalone()) return `<section class="np-sec"><h3>App</h3><p>Mr. Fink is installed on this device.</p></section>`;
    const how = installPrompt
      ? `<div><button type="button" class="btn primary" id="np-install">Install Mr. Fink</button></div>`
      : isIOS()
        ? `<p>In Safari, tap <b>Share</b> (the square with an arrow), then <b>Add to Home Screen</b>. Once installed, the bell's browser notifications also work on iPhone while the app is open.</p>`
        : `<p>In Chrome or Edge, open the browser menu and choose <b>Install app</b> (or <b>Add to Home screen</b> on Android).</p>`;
    return `<section class="np-sec"><h3>Install as an app</h3><p>An icon on your home screen, full screen without the browser bar, and the last data available offline.</p>${how}</section>`;
  }
  function renderNotifyPanel() {
    const topics = (D.meta.notify && D.meta.notify.topics) || {};
    const server = (D.meta.notify && D.meta.notify.server) || "https://ntfy.sh";
    const perm = canNotify() ? Notification.permission : "unsupported";
    const browserState = perm === "unsupported" ? "This browser cannot show notifications."
      : perm === "denied" ? "Notifications are blocked for this site in your browser settings."
      : nprefs.browser && perm === "granted" ? "On. You will be notified while Mr. Fink is open in a tab." : "Off.";
    const chosen = NKINDS.filter(([k]) => nprefs.kinds.includes(k) && topics[k]);
    $("npanel").innerHTML = `
      <div class="np-head"><h2 id="np-h">Notifications</h2><button type="button" class="btn" id="np-close">Close</button></div>
      <section class="np-sec">
        <h3>Notify me about</h3>
        ${NKINDS.map(([k, l, d]) => `<label class="np-kind"><input type="checkbox" data-nkind="${k}" ${nprefs.kinds.includes(k) ? "checked" : ""}><span>${l}</span><small>${d}</small></label>`).join("")}
      </section>
      <section class="np-sec">
        <h3>In this browser</h3>
        <p>No install. Works while the site is open in a tab, on desktop and Android.</p>
        <div><button type="button" class="btn ${nprefs.browser && perm === "granted" ? "" : "primary"}" id="np-browser" ${perm === "unsupported" || perm === "denied" ? "disabled" : ""}>${nprefs.browser && perm === "granted" ? "Turn off" : "Turn on browser notifications"}</button>
        ${nprefs.browser && perm === "granted" ? '<button type="button" class="btn" id="np-test">Send a test</button>' : ""}</div>
        <p class="np-status">${esc(browserState)}</p>
      </section>
      <section class="np-sec">
        <h3>On your phone, even when the site is closed</h3>
        <p>1. Install the free ntfy app, no account needed: <a href="https://apps.apple.com/app/ntfy/id1625396347" target="_blank" rel="noopener">iPhone</a> · <a href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" target="_blank" rel="noopener">Android</a></p>
        <p>2. Subscribe to the channels you want. In the app tap +, then paste the channel name, or open the link on your phone.</p>
        ${chosen.length ? chosen.map(([k, l]) => `<div class="np-sub"><span><b>${l}</b><br><code>${esc(topics[k])}</code></span><button type="button" class="btn" data-copy="${esc(topics[k])}">Copy</button><a class="btn" href="${esc(server.replace(/\/$/, ""))}/${esc(topics[k])}" target="_blank" rel="noopener">Open</a></div>`).join("") : '<p class="np-status">Pick at least one filing type above.</p>'}
        <p class="np-status">Channels carry public SEC filings only. Anyone can subscribe to them.</p>
      </section>
      ${installSection()}`;
    $("np-close").addEventListener("click", closeNotify);
    $("npanel").querySelectorAll("[data-nkind]").forEach((c) => c.addEventListener("change", () => {
      nprefs.kinds = NKINDS.map(([k]) => k).filter((k) => $("npanel").querySelector(`[data-nkind="${k}"]`).checked);
      saveN();
      renderNotifyPanel();
    }));
    $("np-browser")?.addEventListener("click", async () => {
      if (nprefs.browser && Notification.permission === "granted") { nprefs.browser = false; saveN(); renderNotifyPanel(); return; }
      const res = await Notification.requestPermission();
      nprefs.browser = res === "granted";
      saveN();
      renderNotifyPanel();
      if (nprefs.browser) toast("Browser notifications are on.");
    });
    $("np-test")?.addEventListener("click", () => {
      try { new Notification("Mr. Fink notifications are on", { body: "You will hear about new SEC filings while this site is open." }); }
      catch (e) { toast("This browser shows notifications only from installed apps."); }
    });
    wireCopy($("npanel"));
    $("np-install")?.addEventListener("click", async () => {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      installPrompt = null;
      if (outcome === "accepted") toast("Mr. Fink is installed.");
      renderNotifyPanel();
    });
    $("bell-dot").hidden = !(nprefs.browser && perm === "granted");
  }
  function openNotify() {
    renderNotifyPanel();
    // Open just under the bell, which sits on a second header row on phones.
    const top = Math.round($("bell").getBoundingClientRect().bottom + 8);
    Object.assign($("npanel").style, { top: top + "px", maxHeight: `calc(100vh - ${top + 16}px)` });
    $("npanel").hidden = false;
    $("bell").setAttribute("aria-expanded", "true");
    $("np-close").focus();
  }
  function closeNotify() {
    $("npanel").hidden = true;
    $("bell").setAttribute("aria-expanded", "false");
    $("bell").focus();
  }
  function setupNotify() {
    $("bell").addEventListener("click", () => ($("npanel").hidden ? openNotify() : closeNotify()));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("npanel").hidden) closeNotify(); });
    document.addEventListener("click", (e) => { if (!$("npanel").hidden && !e.target.closest("#npanel, #bell")) closeNotify(); });
    $("bell-dot").hidden = !(nprefs.browser && canNotify() && Notification.permission === "granted");
  }

  async function poll() {
    try {
      const r = await fetch("data/status.json?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return;
      status = await r.json();
      if (status.fingerprint && status.fingerprint !== D.meta.fingerprint) {
        const known = new Set((D.feed || []).map((e) => e.accession));
        const fresh = await (await fetch("data/dashboard.json?t=" + Date.now(), { cache: "no-store" })).json();
        const added = (fresh.feed || []).filter((x) => !known.has(x.accession));
        const e = added[0];
        // Company pages opened from data/co/ are not in the main file: keep them across the reload.
        for (const [c, sec0] of Object.entries(D.securities)) if (sec0.lite && !fresh.securities[c]) fresh.securities[c] = sec0;
        D = fresh;
        emSO = null;
        render();
        toast(e ? `New SEC filing: ${feedTitle(e)[0]}. Data updated.` : "Updated with the latest SEC data.");
        browserNotify(added);
      } else {
        renderLive();
      }
      checkWatchFilings();
    } catch (e) { /* offline or opened from disk: keep the snapshot */ }
  }

  function boot(data) {
    D = data;
    Q = JSON.parse(JSON.stringify((D.quotes && D.quotes.quotes) || {}));
    try { const t = localStorage.getItem("mrfink.tab"); if (["overview", "analytics", "fundamentals"].includes(t)) state.tab = t; } catch (e) { /* storage unavailable */ }
    setupSearch();
    setupNotify();
    window.addEventListener("hashchange", route);
    if (HOSTED && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { /* offline mode unavailable */ });
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-back], [data-replace], [data-follow], [data-unwatch]");
      if (!a) return;
      if (a.matches("[data-back]")) {
        // Opened from the list in this tab: go back in history, so the list keeps its place.
        if (arrivedFromList) { e.preventDefault(); history.back(); }
      } else if (a.matches("[data-replace]")) {
        // Previous / next replace the history entry, so Back still returns to the list.
        e.preventDefault();
        location.replace(a.getAttribute("href"));
      } else {
        e.preventDefault();
        const t = a.dataset.follow || a.dataset.unwatch;
        toggleWatch(t);
        if (a.matches("[data-follow]")) {
          document.querySelectorAll(".co-acts [data-follow]").forEach((b) => { b.setAttribute("aria-pressed", isWatched(t)); b.textContent = isWatched(t) ? "★ Following" : "☆ Follow"; });
          const panel = $("alert-panel"), s0 = bySlug(state.slug);
          if (panel && s0) { panel.innerHTML = alertPanel(s0); wireCopy(panel); }
          renderChips();
        } else render();
      }
    });
    let rt, lastW = innerWidth;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth !== lastW) { lastW = innerWidth; render(); } }, 150); });
    route();
    if (HOSTED) {
      poll();
      setInterval(poll, POLL_MS);
      fetch("data/config.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((cfg) => {
        if (cfg && cfg.finnhubKey) startRealtime(cfg.finnhubKey);
        else { priceMode = "delayed"; setInterval(pollQuotes, POLL_MS); }
        flush();
      });
    }
    setInterval(() => { document.querySelectorAll('[data-live="stamp"]').forEach((n) => { n.innerHTML = liveVal("stamp", n.dataset.t); }); }, 30_000);
    setInterval(renderLive, 30_000);
  }

  if (window.MRFINK_DATA) boot(window.MRFINK_DATA);
  else fetch("data/dashboard.json", { cache: "no-store" }).then((r) => r.json()).then(boot).catch((e) => {
    $("app").innerHTML = `<p class="empty-state">Could not load data/dashboard.json (${esc(e.message)}). Run <code>python -m pipeline.build</code>, then serve the web folder.</p>`;
  });
})();
