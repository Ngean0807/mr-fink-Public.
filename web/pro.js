/* Trintel pro pages: daily SPDR trades, and the pages added on top of the 13F dashboard.
   Uses the helpers app.js exposes on window.TRINTEL; English text, translated by i18n.js. */
(() => {
  const T = window.TRINTEL;
  if (!T) return;
  const { $, esc, usd, usdS, pct, signed, dateL, ago, tkChip, slugOf } = T;
  const load = {};
  /** One shared fetch per data file; re-renders the given pages when it lands. */
  function data(name, pages) {
    if (!load[name]) {
      load[name] = { d: undefined, p: fetch(`data/${name}.json`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null) };
      load[name].p.then((d) => { load[name].d = d; T.rerender(pages); });
    }
    return load[name].d;
  }
  const loading = (what) => `<p class="empty-state">Loading ${what}…</p>`;
  const coLink = (t, name) => {
    const s = t && T.secByTicker(t);
    const chip = s ? tkChip(s) : `<span class="tk">${esc(t || "—")}</span>`;
    const inner = `${chip}<span class="co-nm"><b>${esc(T.niceName(name || (s && s.name) || t || ""))}</b></span>`;
    return s ? `<a class="co" href="#t-${slugOf(t)}">${inner}</a>` : `<span class="co">${inner}</span>`;
  };
  const bars = (vals) => {
    const max = Math.max(1, ...vals.map((v) => Math.abs(v || 0)));
    return `<span class="mini-bars" aria-hidden="true">${vals.map((v) => `<i class="${(v || 0) >= 0 ? "up" : "down"}" style="height:${Math.max(2, Math.round((Math.abs(v || 0) / max) * 22))}px"></i>`).join("")}</span>`;
  };

  // ---------- shared: ownership of any listed company (pipeline/owners.py) and what it means ----------
  const MG = ["blackrock", "vanguard", "statestreet"];
  /** {n, v, s, q, m} for a ticker: the dashboard's own data first, then the ownership index. */
  function ownerOf(t, idx) {
    const r = idx && idx.rows && idx.rows[t];
    const s = T.secByTicker(t);
    const h = s && T.D.securities[s.cusip] ? T.holder(s.cusip, "big3") : null;
    if (!r && !h) return null;
    const out = r ? { ...r } : { n: s.name, v: h.series[h.series.length - 1][1], s: null, q: null, m: {} };
    if (h && h.ownership != null) out.s = h.ownership;
    if (h && h.qoq && h.qoq.dSharesPct != null) out.q = h.qoq.dSharesPct;
    if (s) out.sec = s;
    return out;
  }
  /** Plain-language reading of one company's last quarter, as short sentences. */
  function interpret(o) {
    if (!o) return [];
    const out = [];
    if (o.s != null && o.s >= 0.25) out.push(`Crowded: the Big Three own ${pct(o.s, 1, false)} of the company`);
    const m = o.m || {};
    const more = MG.filter((id) => m[id] && m[id][3] === "more"), less = MG.filter((id) => m[id] && m[id][3] === "less");
    const fresh = MG.filter((id) => m[id] && m[id][3] === "new");
    fresh.forEach((id) => out.push(`${T.MGR_NAME[id]} opened a new position`));
    more.forEach((id) => out.push(`${T.MGR_NAME[id]} bought more than its index-fund flows (${pct(m[id][2], 1)})`));
    less.forEach((id) => out.push(`${T.MGR_NAME[id]} ${m[id][2] < 0 ? "sold" : "added less than its index-fund flows"} (${pct(m[id][2], 1)})`));
    if (!more.length && !less.length && !fresh.length && MG.some((id) => m[id] && m[id][3] === "flows")) out.push("Last quarter’s changes followed index-fund flows: passive");
    return out;
  }
  T.ownerOf = ownerOf;
  T.interpret = interpret;

  // ---------- 4. Portfolio X-ray: who owns what you own ----------
  const PKEY = "mrfink.portfolio";
  let pf = [];
  try { pf = (JSON.parse(localStorage.getItem(PKEY) || "[]") || []).filter((x) => x && typeof x.t === "string"); } catch (e) { pf = []; }
  const savePf = () => { try { localStorage.setItem(PKEY, JSON.stringify(pf)); } catch (e) { /* storage unavailable */ } };
  function parsePf(text) {
    const rows = [];
    const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let head = null;
    for (const line of lines) {
      const cells = line.split(/[,;\t]/).map((c) => c.replace(/^"|"$/g, "").trim());
      if (!head && cells.length > 1 && cells.some((c) => /^(symbol|ticker)$/i.test(c))) {
        head = { t: cells.findIndex((c) => /^(symbol|ticker)$/i.test(c)), n: cells.findIndex((c) => /^(quantity|shares|qty|units|amount)$/i.test(c)) };
        continue;
      }
      let t, n;
      if (head) { t = cells[head.t]; n = head.n >= 0 ? cells[head.n] : ""; }
      else { const parts = line.split(/[\s,;\t]+/); t = parts[0]; n = parts[1]; }
      t = (t || "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
      const q = parseFloat(String(n || "").replace(/[,\s]/g, ""));
      if (t && /^[A-Z][A-Z0-9.\-]{0,9}$/.test(t)) rows.push({ t, n: isFinite(q) && q > 0 ? q : null });
    }
    const merged = {};
    rows.forEach((r) => { merged[r.t] = merged[r.t] ? { t: r.t, n: (merged[r.t].n || 0) + (r.n || 0) || null } : r; });
    return Object.values(merged);
  }
  function portfolioPage(app) {
    const idx = data("owners", ["portfolio", "today", "israel"]);
    const ready = idx !== undefined;
    const rows = pf.map((x) => {
      const o = ownerOf(x.t, idx);
      const totalSh = o && o.m ? MG.reduce((a, id) => a + ((o.m[id] && o.m[id][0]) || 0), 0) : 0;
      const px = T.pxOf(x.t) || (o && o.m && totalSh ? o.v / totalSh : null);
      return { ...x, o, px, val: px && x.n ? px * x.n : null };
    });
    const tv = rows.reduce((a, r) => a + (r.val || 0), 0);
    const withStake = rows.filter((r) => r.o && r.o.s != null);
    const wsum = withStake.reduce((a, r) => a + (r.val || 1), 0);
    const avgStake = withStake.length ? withStake.reduce((a, r) => a + r.o.s * (r.val || 1), 0) / wsum : null;
    const crowded = rows.filter((r) => r.o && r.o.s != null && r.o.s >= 0.25);
    const active = rows.filter((r) => r.o && r.o.m && MG.some((id) => r.o.m[id] && ["more", "less", "new"].includes(r.o.m[id][3])));
    const mgCell = (o, id) => {
      const x = o && o.m && o.m[id];
      if (!x) return '<span class="na">—</span>';
      return `${x[2] == null ? '<span class="act new">New</span>' : T.pill(x[2], { sm: true })}${T.styleTag(x[3] && x[2] != null ? { kind: x[3], excess: (1 + x[2]) / (1 + ((idx && idx.base && idx.base[id]) || 0)) - 1 } : null, idx && idx.base ? idx.base[id] : null)}`;
    };
    app.innerHTML = `<div class="main">
      <div class="hero">
        <h1>Portfolio X-ray</h1>
        <p class="hero-sub">Who owns what you own: the Big Three’s stake in each of your companies, what they did last quarter and whether it was passive. Your holdings stay in this browser.</p>
      </div>
      <section class="section pf-input" aria-labelledby="pf-in">
        <h2 id="pf-in" class="sr">Your holdings</h2>
        <label for="pf-text"><b>Your holdings</b> <span class="muted">one per line: ticker and number of shares, or paste a broker’s CSV export</span></label>
        <textarea id="pf-text" dir="ltr" rows="6" spellcheck="false" placeholder="AAPL 10&#10;NVDA 25&#10;TEVA 100">${esc(pf.map((x) => x.t + (x.n ? " " + x.n : "")).join("\n"))}</textarea>
        <div class="pf-acts"><button type="button" class="btn primary" id="pf-save">Update</button><label class="btn" for="pf-file">Import a CSV file</label><input type="file" id="pf-file" accept=".csv,.txt,text/csv" hidden>${pf.length ? '<button type="button" class="btn" id="pf-follow">Follow all for alerts</button><button type="button" class="btn" id="pf-clear">Clear</button>' : ""}</div>
      </section>
      ${!pf.length ? '<p class="empty-state">Add your holdings above to see who owns them.</p>' : !ready ? loading("ownership data") : `
      <div class="kpis pf-kpis">
        ${tv ? `<div class="kpi"><span>Your holdings</span><b>${usd(tv)}</b><small>at the latest price</small></div>` : ""}
        <div class="kpi"><span>Big Three stake, average</span><b>${avgStake == null ? "—" : pct(avgStake, 1, false)}</b><small>${tv ? "weighted by your holdings" : "of the companies you hold"}</small></div>
        <div class="kpi"><span>Crowded holdings</span><b>${crowded.length}</b><small>the Big Three own 25% or more</small></div>
        <div class="kpi"><span>Active moves last quarter</span><b>${active.length}</b><small>bought or sold apart from index flows</small></div>
      </div>
      <div class="table-scroll"><table class="tbl pf-tbl">
        <thead><tr><th class="l" scope="col">Company</th><th scope="col">Shares</th><th scope="col">Value</th><th scope="col">Big Three stake</th><th class="l" scope="col">Last quarter, by manager</th><th class="l" scope="col">What it means</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td class="l">${r.o ? coLink(r.t, r.o.n) : `<span class="co"><span class="tk">${esc(r.t)}</span><span class="co-nm"><small>Not among the Big Three’s positions of $50M or more</small></span></span>`}</td>
          <td>${r.n ? r.n.toLocaleString("en-US") : "—"}</td><td>${usd(r.val)}</td><td>${r.o && r.o.s != null ? pct(r.o.s, 1, false) : '<span class="na">n/a</span>'}</td>
          <td class="l pf-mg">${r.o && r.o.m && Object.keys(r.o.m).length ? MG.filter((id) => r.o.m[id]).map((id) => `<span>${T.dot(id)}${mgCell(r.o, id)}</span>`).join("") : '<span class="na">—</span>'}</td>
          <td class="l pf-why">${interpret(r.o).map((x) => `<span>${esc(x)}</span>`).join("") || '<span class="muted">—</span>'}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="foot">From the managers’ 13F filings for ${T.qlabel((idx && idx.asOf) || T.D.meta.latest)}. Stake = shares the three hold ÷ the shares outstanding the company last reported. Passive or active compares each change in shares with the same manager’s change across its whole book (its index funds’ flows). Not investment advice.</p>`}
    </div>`;
    $("pf-save").addEventListener("click", () => { pf = parsePf($("pf-text").value); savePf(); T.render(); T.toast(`${pf.length} holdings saved in this browser`); });
    $("pf-file").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      f.text().then((txt) => { pf = parsePf(txt); savePf(); T.render(); T.toast(`${pf.length} holdings imported`); });
    });
    $("pf-clear")?.addEventListener("click", () => { pf = []; savePf(); T.render(); });
    $("pf-follow")?.addEventListener("click", () => { let k = 0; pf.forEach((x) => { if (!T.isWatched(x.t) && T.secByTicker(x.t)) { T.toggleWatch(x.t); k++; } }); T.toast(k ? `${k} companies added to your watchlist` : "Already following every company Trintel covers"); });
  }
  T.page("portfolio", { match: (h) => h === "portfolio", render: portfolioPage });
  T.chip(() => `<a class="chip" href="#portfolio" ${T.state.page === "portfolio" ? 'aria-current="page"' : ""}><span class="sw" style="background:var(--accent)"></span>My portfolio <small>X-ray</small></a>`);

  // ---------- 2. Daily: State Street's SPDR funds, day by day (pipeline/daily.py) ----------
  const kindOf = (x) => (x.add ? "Added to the fund" : x.drop ? "Removed from the fund" : "Weight changed");
  function dailyPage(app) {
    const d = data("daily", ["daily", "company"]);
    if (d === undefined) { app.innerHTML = `<div class="main">${loading("daily trades")}</div>`; return; }
    if (!d) { app.innerHTML = `<div class="main"><p class="empty-state">Daily trades could not be loaded.</p></div>`; return; }
    const done = d.funds.filter((f) => !f.pending && f.asOf === d.asOf);
    const flow = done.reduce((a, f) => a + (f.flowUsd || 0), 0);
    const mixRows = d.funds.filter((f) => !f.pending && f.asOf === d.asOf).flatMap((f) => [
      ...(f.adds || []).map((x) => ({ ...x, f: f.t, add: true, v: x.usd })),
      ...(f.drops || []).map((x) => ({ ...x, f: f.t, drop: true, v: x.usd })),
      ...(f.mix || []).map((x) => ({ ...x, f: f.t, v: x.mix })),
    ]).filter((x) => x.v != null).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 25);
    const stocks = (d.stocks || []).slice(0, 25);
    const why = (x) => (Math.abs(x.mix) > Math.abs(x.usd) * 0.5 && Math.abs(x.mix) >= 1e6 ? "Change in the fund’s mix" : "Money in or out of the funds");
    app.innerHTML = `<div class="main">
      <div class="hero">
        <h1>Daily trades: State Street’s SPDR ETFs</h1>
        <p class="hero-sub">${d.asOf ? `What ${done.length} SPDR funds bought and sold on ${dateL(d.asOf)}, from the holdings file each fund publishes every business day.` : "From the holdings file each SPDR fund publishes every business day."}</p>
        ${d.asOf ? `<div class="figure"><span class="figure-value ${flow >= 0 ? "txt-up" : "txt-down"}">${usdS(flow)}</span><span class="muted">net money in or out of these funds on ${dateL(d.asOf)}</span></div>` : ""}
      </div>
      ${!d.asOf ? `<p class="empty-state">The holdings of ${d.funds.length} SPDR funds are stored (files of ${dateL((d.funds[0] || {}).asOf)}). The first day-to-day comparison appears when the next business day’s files come out.</p>` : `
      <section class="section" aria-labelledby="dl-st">
        <div class="section-head"><div><h2 id="dl-st">Biggest buys and sells, all SPDR funds together</h2><p class="note">Net shares bought or sold on ${dateL(d.asOf)}, valued at that day’s price</p></div></div>
        <div class="table-scroll"><table class="tbl"><thead><tr><th class="l" scope="col">Company</th><th scope="col">Bought or sold</th><th scope="col">Not from money flows</th><th class="l" scope="col">Mostly</th></tr></thead>
        <tbody>${stocks.map((x) => `<tr><td class="l">${coLink(x.t, x.n)}</td><td>${signed(x.usd, usdS)}</td><td>${signed(x.mix, usdS)}</td><td class="l muted">${why(x)}</td></tr>`).join("")}</tbody></table></div>
      </section>
      <section class="section" aria-labelledby="dl-mix">
        <div class="section-head"><div><h2 id="dl-mix">Changes in the funds’ mix</h2><p class="note">Additions, removals and weight changes, after taking out money coming in or going out</p></div></div>
        ${mixRows.length ? `<div class="table-scroll"><table class="tbl"><thead><tr><th class="l" scope="col">Company</th><th scope="col">Fund</th><th scope="col">Value</th><th class="l" scope="col">What changed</th></tr></thead>
        <tbody>${mixRows.map((x) => `<tr><td class="l">${coLink(x.t, x.n)}</td><td>${esc(x.f)}</td><td>${signed(x.v, usdS)}</td><td class="l">${kindOf(x)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="foot">No change in any fund’s mix on ${dateL(d.asOf)}: every trade followed money in or out.</p>`}
      </section>`}
      <section class="section" aria-labelledby="dl-f">
        <div class="section-head"><div><h2 id="dl-f">The funds</h2><p class="note">Money in or out each business day (bars: last 20 days)</p></div></div>
        <div class="table-scroll"><table class="tbl"><thead><tr><th class="l" scope="col">Fund</th><th scope="col">Size</th><th scope="col">Latest day</th><th scope="col">Money in or out</th><th scope="col">Of the fund</th><th scope="col">Last 20 days</th></tr></thead>
        <tbody>${d.funds.map((f) => { const h = (d.history[f.t] || []).slice(-20); return `<tr><td class="l"><a class="co" href="#etfs/${esc(f.t)}"><span class="tk" style="background:var(--ss)">${esc(f.t)}</span><span class="co-nm"><b>${esc(f.name)}</b><small>${esc(f.cat)}</small></span></a></td><td>${usd(f.value)}</td><td>${dateL(f.asOf)}</td><td>${f.pending ? '<span class="na">—</span>' : signed(f.flowUsd, usdS)}</td><td>${f.pending ? '<span class="na">—</span>' : signed(f.flowPct)}</td><td>${h.length ? bars(h.map((x) => x[1])) : ""}</td></tr>`; }).join("")}</tbody></table></div>
        <p class="foot">Money flows: an ETF that takes in money buys more of everything it holds in the same proportion, so the share count of most holdings moves by the same ratio. Trintel takes that ratio as the day’s flow; what moves differently is a change in the fund’s mix (index additions and removals, rebalances, corporate actions). iShares (BlackRock) and Vanguard do not publish a daily holdings file that can be downloaded, so their funds are tracked monthly from N-PORT filings on the ETFs page. Source: State Street, checked ${ago(d.checkedAt)}.</p>
      </section>
    </div>`;
  }
  T.page("daily", { match: (h) => h === "daily", render: dailyPage });
  T.chip(() => `<a class="chip" href="#daily" ${T.state.page === "daily" ? 'aria-current="page"' : ""}><span class="sw" style="background:var(--ss)"></span>Daily <small>SPDR trades</small></a>`);
  T.company((s) => {
    const d = data("daily", ["daily", "company"]);
    const rows = d && d.byTicker && d.byTicker[s.ticker];
    if (!rows || !rows.length) return "";
    return `<section class="section" aria-labelledby="co-daily">
      <div class="section-head"><h2 id="co-daily">State Street’s SPDR funds, day by day</h2><a class="note" href="#daily">All daily trades</a></div>
      <div class="table-scroll flat"><table class="own-table"><thead><tr><th class="l" scope="col">Day</th><th scope="col">Bought or sold</th><th scope="col">Not from money flows</th></tr></thead>
      <tbody>${rows.slice().reverse().map(([day, u, m]) => `<tr><td class="l">${dateL(day)}</td><td>${signed(u, usdS)}</td><td>${signed(m, usdS)}</td></tr>`).join("")}</tbody></table></div>
    </section>`;
  });
})();
