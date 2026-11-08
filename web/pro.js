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
