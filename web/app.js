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

  let D = null;
  let status = null;
  const state = {
    view: "big3", page: "home", slug: null, range: "5Y", homeMode: "combined", coMode: "price",
    tab: "overview", sort: { key: "rank", dir: 1 }, filter: "", feedTab: "all", feedMore: false, movers: "bought",
  };

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
  function lineChart(host, { series, dates, height = 280, fmt = usd, axisFmt = axisUsd }) {
    host.innerHTML = "";
    const W = Math.max(280, host.clientWidth || 640);
    const H = height;
    const m = { t: 12, r: 4, b: 28, l: 4 };
    const all = series.flatMap((s) => s.values.filter((v) => v != null));
    if (!all.length) return;
    let lo = Math.min(...all), hi = Math.max(...all);
    const pad = (hi - lo) * 0.08 || hi * 0.05 || 1;
    lo = Math.max(0, lo - pad); hi += pad;
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
      el("text", { x: x(i), y: H - 8, "text-anchor": i === n - 1 ? "end" : "middle" }, ax).textContent = qshort(dates[i]);
    }
    if (series.length === 1) {
      const first = series[0].values.find((v) => v != null);
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
      showTip(`<strong>${qlabel(dates[i])}</strong> <span class="muted">${dateL(dates[i])}</span>${rows}`, ev.clientX, ev.clientY);
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
  function renderChips() {
    $("chips").innerHTML = VIEWS.map((id) => {
      const t = D.views[id].totals;
      const sw = id === "big3" ? "background:conic-gradient(var(--blk) 0 33%, var(--vg) 0 66%, var(--ss) 0)" : `background:${mColor(id)}`;
      const cur = state.view === id;
      return `<a class="chip" href="#${id}" ${cur ? 'aria-current="page"' : ""}><span class="sw" style="${sw}"></span>${MGR_NAME[id]} <small>${usd(t[t.length - 1])}</small></a>`;
    }).join("");
  }

  function renderLive() {
    const box = $("live");
    const live = location.protocol.startsWith("http") && status;
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
      const list = Object.values(D.securities).map((s) => ({ s, v: holder(s.cusip, "big3") }))
        .filter(({ s }) => !t || s.ticker.toLowerCase().startsWith(t) || niceName(s.name).toLowerCase().includes(t));
      list.sort((a, b) => (b.v ? lastOf(b.v)[1] : 0) - (a.v ? lastOf(a.v)[1] : 0));
      return list.slice(0, 8);
    }
    function draw() {
      const r = results();
      box.innerHTML = r.length
        ? r.map(({ s, v }, i) => `<a href="#t-${slugOf(s.ticker)}" role="option" aria-selected="${i === sel}">${tkChip(s)}<span class="nm">${esc(niceName(s.name))}</span><span class="muted">${v ? usd(lastOf(v)[1]) + " held" : ""}</span></a>`).join("")
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
    if (e.kind === "13g") return [`${MGR_NAME[e.manager]} owns ${pct(e.percent, 2, false)} of ${e.tickers[0]}`, `${e.entity} · as of ${dateL(e.eventDate)}`];
    return [`${e.tickers.join(" / ")} ${e.form.startsWith("10-K") ? "annual report" : "quarterly report"}`, `${niceName(e.entity)} · period ended ${dateL(e.period)}`];
  }
  function feedCard(ticker = null) {
    let items = D.feed || [];
    if (ticker) items = items.filter((e) => (e.tickers || []).includes(ticker));
    else if (state.feedTab !== "all") items = items.filter((e) => e.kind === state.feedTab);
    const shown = items.slice(0, state.feedMore ? 30 : 7);
    const badge = (e) => `<span class="badge ${e.kind === "13f" ? "f13f" : e.kind === "13g" ? "f13g" : "frep"}">${esc(e.form.replace("SCHEDULE ", "").replace("SC ", ""))}</span>`;
    const rows = shown.map((e) => {
      const [a, b] = feedTitle(e);
      return `<a href="${e.url}" target="_blank" rel="noopener">${badge(e)}<span class="nm"><b>${esc(a)}</b><small>${esc(b)}</small></span><span class="rt muted">${ago(e.accepted)}</span></a>`;
    }).join("") || `<div class="item"><span></span><span class="nm"><small>No filings in the past year.</small></span><span></span></div>`;
    const tabs = ticker ? "" : `<div class="tabs" role="group" aria-label="Filing type">${[["all", "All"], ["13f", "13F"], ["13g", "13G stakes"], ["report", "10-Q / 10-K"]].map(([k, l]) => `<button type="button" class="tab" data-feed="${k}" aria-pressed="${state.feedTab === k}">${l}</button>`).join("")}</div>`;
    return `<section class="card" aria-labelledby="feed-h">
      <div class="card-head"><h2 id="feed-h">${ticker ? "Recent filings" : "Latest from SEC EDGAR"}</h2><span class="feed-meta" data-checked></span></div>
      ${tabs}<div class="list">${rows}</div>
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
        <div class="chart-block">
          ${rangeBar(toggles)}
          ${state.view === "big3" && state.homeMode === "managers" ? `<div class="legend">${MGRS.map((id) => `<span><i style="background:${mColor(id)}"></i>${MGR_NAME[id]}</span>`).join("")}</div>` : ""}
          <div class="chart" id="home-chart"></div>
          <div class="bridge"><span>Top 30, last quarter:</span><span>net buying <b class="${s.flow >= 0 ? "txt-up" : "txt-down"}">${usdS(s.flow)}</b></span><span>price moves <b class="${s.move >= 0 ? "txt-up" : "txt-down"}">${usdS(s.move)}</b></span><span>${s.added} added, ${s.trimmed} trimmed</span></div>
        </div>
        <section class="section" aria-labelledby="hold-h">
          <div class="section-head">
            <div><h2 id="hold-h">Top 30 company holdings</h2><p class="note">Operating companies only (ETFs and funds excluded), ranked by market value on ${dateL(D.meta.latest)}</p></div>
            <div class="tools"><label class="filter"><span class="sr">Filter holdings</span><input id="filter" type="search" placeholder="Filter by ticker, name, sector" value="${esc(state.filter)}"></label><span class="count" id="count"></span></div>
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
            <div><dt>Top 30 value</dt><dd>${usd(s.top)}</dd></div>
            <div><dt>Top 30 share of book</dt><dd>${pct(s.top / s.total, 1, false)}</dd></div>
            <div><dt>Median stake, top 30</dt><dd>${pct(s.median, 1, false)}</dd></div>
            <div><dt>Securities reported</dt><dd>${v.positions.toLocaleString("en-US")}</dd></div>
            <div><dt>Report date</dt><dd>${dateL(D.meta.latest)}</dd></div>
            <div><dt>Next 13F (${qlabel(nd.period)})</dt><dd>${daysToDue > 0 ? `due ${dateL(nd.due)}, in ${daysToDue} days` : "due now, watching EDGAR"}</dd></div>
          </dl>
        </section>
        <section class="card" aria-labelledby="mv-h">
          <div class="card-head"><h2 id="mv-h">Biggest moves last quarter</h2></div>
          <div class="tabs" role="group" aria-label="Direction">${[["bought", "Bought"], ["sold", "Sold"]].map(([k, l]) => `<button type="button" class="tab" data-movers="${k}" aria-pressed="${state.movers === k}">${l}</button>`).join("")}</div>
          <div class="list">${movers.map((r) => { const c = sec(r.cusip); return `<a href="#t-${slugOf(c.ticker)}">${tkChip(c)}<span class="nm"><b>${esc(niceName(c.name))}</b><small>${numS(r.qoq.dShares)} shares</small></span><span class="rt"><b class="${r.qoq.trade >= 0 ? "txt-up" : "txt-down"}">${usdS(r.qoq.trade)}</b>${pill(r.qoq.dSharesPct, { sm: true })}</span></a>`; }).join("") || '<div class="item"><span></span><span class="nm"><small>None this quarter.</small></span><span></span></div>'}</div>
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
    app.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
      state.tab = b.dataset.tab;
      state.sort = { key: "rank", dir: 1 };
      app.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      try { localStorage.setItem("mrfink.tab", state.tab); } catch (e) { /* storage unavailable */ }
      renderTable();
    }));
    $("filter").addEventListener("input", (e) => { state.filter = e.target.value; renderTable(); });
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
      const maxW = Math.max(...view().rows.map((r) => r.value));
      return [...head,
        { key: "weight", label: "% of book", get: (r) => r.value / total, render: (r) => `${pct(r.value / total, 2, false)}<span class="wbar"><i style="width:${(r.value / maxW) * 100}%"></i></span>` },
        { key: "shares", label: "Shares", get: (r) => r.shares, render: (r) => num(r.shares) },
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

  function renderTable() {
    const cols = columns();
    const v = view();
    const q = state.filter.trim().toLowerCase();
    let rows = v.rows.filter((r) => {
      if (!q) return true;
      const s = sec(r.cusip);
      return [s.ticker, niceName(s.name), s.sector, s.industry].some((x) => (x || "").toLowerCase().includes(q));
    });
    const col = cols.find((c) => c.key === state.sort.key) || cols[0];
    rows = rows.slice().sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * state.sort.dir;
    });
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
    const tbody = `<tbody>${rows.map((r) => `<tr data-slug="${slugOf(sec(r.cusip).ticker)}">${cols.map((c) => `<td class="${c.cls || ""}${c.sep ? " sep" : ""}">${c.render(r)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    const t = $("tbl");
    t.classList.toggle("grouped", !!grp);
    t.innerHTML = thead + tbody;
    t.style.minWidth = state.tab === "overview" ? "920px" : "1240px";
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
        <li>The hosted version re-reads EDGAR every 15 minutes and refreshes this page when a new 13F, 13G, 10-Q or 10-K appears. 13F reports lag the quarter by up to 45 days and cover US-listed long positions only. Not investment advice.</li>
      </ul>
      <p class="foot">${qlabel(D.meta.latest)} filings: ${view().sources.map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${esc(x.entity)}</a>`).join(" · ")}</p>
    </section>`;
  }

  // ---------- company ----------
  function renderCompany() {
    const s = bySlug(state.slug);
    if (!s) {
      $("app").innerHTML = `<div class="main"><p class="empty-state">That company isn’t among the Big Three’s largest holdings. <a href="#${state.view}">Back to holdings</a></p></div>`;
      return;
    }
    const c = s.cusip;
    const f = s.fundamentals || {};
    const per = D.meta.periods;
    const n = per.length;
    const i0 = rangeStart(n);
    const base = holder(c, "big3") || holder(c, MGRS.find((id) => holder(c, id)));
    const px = base.series.map((x) => (x[0] ? x[1] / x[0] : null));
    const p0 = px.slice(i0).find((v) => v != null), p1 = px[n - 1];
    const siblings = Object.values(D.securities).filter((o) => o.cik && o.cik === s.cik && o.cusip !== c);
    const latestG = MGRS.map((id) => (s.stakes13g || []).find((g) => g.manager === id && g.percent > 0)).filter(Boolean);
    const fin = !!f.financialsNote;
    const q = f.quarterly || [];
    const lq = q[q.length - 1], yq = q.length >= 5 ? q[q.length - 5] : null;
    const yoy = (a, b) => (a != null && b ? a / b - 1 : null);

    const ownRow = (label, mark, h, extra = "") => {
      if (!h) return `<tr><td class="l">${mark}${label}</td><td colspan="7" class="na l">Not held</td></tr>`;
      const cur = lastOf(h);
      return `<tr${extra}><td class="l">${mark}${label}</td><td>${usd(cur[1])}</td><td>${num(cur[0])}</td><td>${h.ownership == null ? "n/a" : pct(h.ownership, 2, false)}</td><td>${h.rank ? "#" + h.rank : "—"}</td><td>${h.qoq ? pill(h.qoq.dSharesPct, { sm: true }) : "—"}</td><td>${h.yoy ? pill(h.yoy.dSharesPct, { sm: true }) : "—"}</td><td>${signed(h.inception.dSharesPct)} <span class="muted">from ${qshort(h.inception.period)}</span></td></tr>`;
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
          <nav class="crumbs" aria-label="Breadcrumb"><a href="#${state.view}">${esc(MGR_NAME[state.view])}</a><span aria-hidden="true">›</span><span>${esc(s.ticker)}${s.exchange ? " • " + esc(s.exchange.toUpperCase()) : ""}</span></nav>
          <h1>${esc(niceName(s.name))} ${tkChip(s)}</h1>
          <p class="hero-sub">${esc(s.sector || "")}${s.industry ? " · " + esc(s.industry) : ""}</p>
          <div class="figure">
            <span class="figure-value">${price(p1)}</span>
            ${pill(p1 / p0 - 1)}
            <span class="figure-chg ${p1 >= p0 ? "txt-up" : "txt-down"}">${p1 - p0 >= 0 ? "+" : "-"}${price(Math.abs(p1 - p0))}</span>
            <span class="muted">${rangeLabel()}</span>
          </div>
          <p class="figure-note">Quarter-end price on ${dateL(D.meta.latest)}, implied by the 13F filings (value ÷ shares) and split-adjusted</p>
        </div>
        <div class="chart-block">
          ${rangeBar(`<div class="toggles" role="group" aria-label="Chart metric">${[["price", "Price"], ["shares", "Shares held"], ["value", "Value held"]].map(([k, l]) => `<button type="button" class="chip" data-co-mode="${k}" aria-pressed="${state.coMode === k}">${l}</button>`).join("")}</div>`)}
          ${state.coMode !== "price" ? `<div class="legend">${MGRS.filter((id) => holder(c, id)).map((id) => `<span><i style="background:${mColor(id)}"></i>${MGR_NAME[id]}</span>`).join("")}</div>` : ""}
          <div class="chart" id="co-chart"></div>
          ${(s.splits || []).length ? `<p class="figure-note">Split-adjusted for ${(s.splits || []).map((sp) => (sp.ratio >= 1 ? `${sp.ratio}:1` : `1:${Math.round(1 / sp.ratio)}`) + " in " + qlabel(sp.period)).join(" and ")}.</p>` : ""}
        </div>
        <section class="section" aria-labelledby="own-h">
          <div class="section-head"><h2 id="own-h">Big Three ownership</h2><span class="note">${qlabel(D.meta.latest)} 13F filings</span></div>
          <div class="table-scroll flat"><table class="own-table">
            <thead><tr><th class="l" scope="col">Manager</th><th scope="col">Value</th><th scope="col">Shares</th><th scope="col">Stake</th><th scope="col">Rank</th><th scope="col">QoQ shares</th><th scope="col">YoY shares</th><th scope="col">Since first held</th></tr></thead>
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
            <div><dt>Quarter-end price</dt><dd>${price(s.price)}</dd></div>
            <div><dt>Market cap</dt><dd>${f.marketCap ? usd(f.marketCap) : "n/a"}</dd></div>
            <div><dt>P/E ratio</dt><dd>${mult(f.pe)}</dd></div>
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
          <div class="list">${view().rows.filter((r) => sec(r.cusip).sector === s.sector && r.cusip !== c).slice(0, 5).map((r) => { const o = sec(r.cusip); return `<a href="#t-${slugOf(o.ticker)}">${tkChip(o)}<span class="nm"><b>${esc(niceName(o.name))}</b><small>${usd(r.value)} held by ${esc(MGR_NAME[state.view])}</small></span><span class="rt">${r.qoq ? pill(r.qoq.dSharesPct, { sm: true }) : ""}</span></a>`; }).join("") || '<div class="item"><span></span><span class="nm"><small>No other top-30 holdings in this sector.</small></span><span></span></div>'}</div>
        </section>
      </aside>`;

    const dates = per.slice(i0);
    let series, fmt = price, axisFmt = axisUsd;
    if (state.coMode === "price") {
      series = [{ name: "Price", color: p1 >= p0 ? "var(--pos-line)" : "var(--neg-line)", values: px.slice(i0) }];
    } else {
      const k = state.coMode === "shares" ? 0 : 1;
      series = MGRS.filter((id) => holder(c, id)).map((id) => ({ name: MGR_NAME[id], color: mColor(id), values: holder(c, id).series.slice(i0).map((x) => (x[0] ? x[k] : null)) }));
      fmt = k ? usd : (v) => num(v) + " shares";
      axisFmt = k ? axisUsd : axisNum;
    }
    lineChart($("co-chart"), { series, dates, height: 280, fmt, axisFmt });
    if (f.available && q.length) finChart($("fin-chart"), q);
    const app = $("app");
    wireCommon(app);
    app.querySelectorAll("[data-co-mode]").forEach((b) => b.addEventListener("click", () => { state.coMode = b.dataset.coMode; render(); }));
  }

  // ---------- routing ----------
  function render() {
    hideTip();
    renderChips();
    if (state.page === "company") renderCompany();
    else renderHome();
    renderLive();
  }
  function route() {
    const h = decodeURIComponent(location.hash.replace("#", ""));
    const before = state.page + state.slug;
    if (h.startsWith("t-")) {
      state.page = "company";
      state.slug = h.slice(2);
    } else {
      state.page = "home";
      state.slug = null;
      if (VIEWS.includes(h) && h !== state.view) { state.view = h; state.sort = { key: "rank", dir: 1 }; }
    }
    render();
    if (before !== state.page + state.slug) window.scrollTo(0, 0);
  }

  // ---------- live updates ----------
  async function poll() {
    try {
      const r = await fetch("data/status.json?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return;
      status = await r.json();
      if (status.fingerprint && status.fingerprint !== D.meta.fingerprint) {
        const known = new Set((D.feed || []).map((e) => e.accession));
        const fresh = await (await fetch("data/dashboard.json?t=" + Date.now(), { cache: "no-store" })).json();
        const e = (fresh.feed || []).find((x) => !known.has(x.accession));
        D = fresh;
        render();
        toast(e ? `New SEC filing: ${feedTitle(e)[0]}. Data updated.` : "Updated with the latest SEC data.");
      } else {
        renderLive();
      }
    } catch (e) { /* offline or opened from disk: keep the snapshot */ }
  }

  function boot(data) {
    D = data;
    try { const t = localStorage.getItem("mrfink.tab"); if (["overview", "analytics", "fundamentals"].includes(t)) state.tab = t; } catch (e) { /* storage unavailable */ }
    setupSearch();
    window.addEventListener("hashchange", route);
    let rt, lastW = innerWidth;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth !== lastW) { lastW = innerWidth; render(); } }, 150); });
    route();
    if (location.protocol.startsWith("http")) { poll(); setInterval(poll, POLL_MS); }
    setInterval(renderLive, 30_000);
  }

  if (window.MRFINK_DATA) boot(window.MRFINK_DATA);
  else fetch("data/dashboard.json", { cache: "no-store" }).then((r) => r.json()).then(boot).catch((e) => {
    $("app").innerHTML = `<p class="empty-state">Could not load data/dashboard.json (${esc(e.message)}). Run <code>python -m pipeline.build</code>, then serve the web folder.</p>`;
  });
})();
