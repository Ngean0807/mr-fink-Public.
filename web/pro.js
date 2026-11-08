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
      <div class="table-scroll"><table class="tbl pro-tbl pf-tbl">
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

  // ---------- 1. My day: what changed for the companies I follow or own ----------
  function todayPage(app) {
    const mine = [...new Set([...T.watch, ...pf.map((x) => x.t)])];
    const idx = data("owners", ["today", "portfolio", "israel"]);
    const dl = data("daily", ["today", "daily", "company"]);
    const g = data("gurus", ["today", "gurus", "company"]);
    const news = data("news", ["today"]);
    if (!mine.length) {
      app.innerHTML = `<div class="main"><div class="hero"><h1>My day</h1><p class="hero-sub">What changed today for the companies you follow or own, in one place, with what it means.</p></div>
        <p class="empty-state">Follow companies (☆ Follow on any company page) or add your holdings in <a href="#portfolio">My portfolio</a>, and this page fills with what changed for them.</p></div>`;
      return;
    }
    const set = new Set(mine);
    const ev = [];
    const now = Date.now();
    // SEC filings
    (T.D.feed || []).filter((e) => (e.tickers || []).some((t) => set.has(t))).slice(0, 40).forEach((e) => {
      const [a, b] = T.feedTitle(e);
      ev.push({ at: e.accepted, t: (e.tickers || []).find((t) => set.has(t)), kind: "SEC filing", badge: e.form.replace("SCHEDULE ", "").replace("SC ", ""), title: a, sub: b, url: e.url });
    });
    // insider trades, last 30 days
    mine.forEach((t) => {
      const s = T.secByTicker(t);
      ((s && s.insiders && s.insiders.trades) || []).filter((x) => (x.code === "P" || x.code === "S") && now - Date.parse(x.date) < 30 * 864e5).slice(0, 4).forEach((x) => {
        ev.push({ at: x.date + "T12:00:00Z", t, kind: "Insider", badge: "Form 4", title: `${t}: ${x.name} ${x.code === "P" ? "bought" : "sold"} ${usd(x.value)}`, sub: `${x.role || "Insider"}${x.plan ? " · pre-arranged plan (10b5-1)" : ""}`, url: x.url, tone: x.code === "P" ? "up" : "down" });
      });
    });
    // SPDR funds day by day
    if (dl && dl.byTicker) mine.forEach((t) => (dl.byTicker[t] || []).slice(-2).forEach(([day, u, m]) => {
      ev.push({ at: day + "T21:00:00Z", t, kind: "Daily trades", badge: "SPDR", title: `${t}: State Street’s SPDR funds ${u >= 0 ? "bought" : "sold"} ${usd(Math.abs(u))}`, sub: Math.abs(m) >= Math.abs(u) * 0.5 && Math.abs(m) >= 1e6 ? "Mostly a change in the funds’ mix, not money flows" : "Mostly money flowing in or out of the funds", url: "#daily", tone: u >= 0 ? "up" : "down" });
    }));
    // activists and famous investors
    if (g) {
      g.d13.filter((x) => set.has(x.t)).forEach((x) => ev.push({ at: x.filed + "T12:00:00Z", t: x.t, kind: "Activist", badge: x.amend ? "13D/A" : "13D", title: `${x.t}: ${(g.managers.find((m) => m.id === x.g) || {}).name || x.g} ${x.amend ? "changed its activist stake" : "took an activist stake of 5% or more"}`, sub: T.niceName(x.name), url: x.url }));
      g.managers.forEach((m) => m.buys.concat(m.sells).filter((r) => set.has(r.t) && (r.st || Math.abs(r.f) > 5e7)).forEach((r) => ev.push({ at: (m.filed || m.period) + "T12:00:00Z", t: r.t, kind: "Famous investor", badge: "13F", title: `${r.t}: ${m.name} ${r.st === "new" ? "opened a position" : r.st === "exited" ? "sold out" : r.f > 0 ? "bought more" : "sold some"} (${usdS(r.f)})`, sub: `${m.person} · ${T.qlabel(m.period)}`, url: "#gurus/" + m.id, tone: r.f > 0 ? "up" : "down" })));
    }
    // headlines
    if (news && news.companies) mine.forEach((t) => ((news.companies[t] || {}).items || []).slice(0, 2).forEach((n) => ev.push({ at: new Date(n.t * 1000).toISOString(), t, kind: "News", badge: "News", title: n.h, sub: `${t} · ${n.s}`, url: n.u })));
    ev.sort((a, b) => (a.at < b.at ? 1 : -1));
    const glance = mine.map((t) => {
      const o = ownerOf(t, idx);
      const d = T.dayChg(t);
      return { t, o, d, lines: interpret(o) };
    });
    const movers = glance.filter((x) => x.d != null && Math.abs(x.d) >= 0.03);
    app.innerHTML = `<div class="main">
      <div class="hero"><h1>My day</h1><p class="hero-sub">What changed for the ${mine.length} companies you follow or own, newest first, with what it means.</p></div>
      ${movers.length ? `<div class="today-movers">${movers.map((x) => `<a href="#t-${slugOf(x.t)}"><b>${esc(x.t)}</b>${T.pill(x.d, { sm: true })}</a>`).join("")}<span class="muted">moving 3% or more today</span></div>` : ""}
      <section class="section" aria-labelledby="td-f"><div class="section-head"><h2 id="td-f">What happened</h2><span class="note">SEC filings, insiders, daily fund trades, activists, famous investors, news</span></div>
        ${ev.length ? `<div class="list wrap today-list">${ev.slice(0, 60).map((e) => `<a href="${esc(e.url)}"${e.url.startsWith("#") ? "" : ' target="_blank" rel="noopener"'}><span class="badge ${e.tone === "up" ? "tone-up" : e.tone === "down" ? "tone-down" : "frep"}">${esc(e.badge)}</span><span class="nm"><b>${esc(e.title)}</b><small>${esc(e.kind)} · ${esc(e.sub || "")}</small></span><span class="rt muted">${ago(e.at)}</span></a>`).join("")}</div>`
          : '<p class="foot">Nothing new for your companies yet.</p>'}
      </section>
      <section class="section" aria-labelledby="td-g"><div class="section-head"><h2 id="td-g">Your companies at a glance</h2><span class="note">Last quarter, from the Big Three’s 13F filings</span></div>
        <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Company</th><th scope="col">Price</th><th scope="col">Today</th><th scope="col">Big Three stake</th><th class="l" scope="col">What it means</th></tr></thead>
        <tbody>${glance.map((x) => `<tr><td class="l">${coLink(x.t, x.o && x.o.n)}</td><td>${T.live("px", x.t)}</td><td>${T.live("pill", x.t)}</td><td>${x.o && x.o.s != null ? pct(x.o.s, 1, false) : '<span class="na">n/a</span>'}</td><td class="l pf-why">${x.lines.map((l) => `<span>${esc(l)}</span>`).join("") || '<span class="muted">—</span>'}</td></tr>`).join("")}</tbody></table></div>
      </section>
    </div>`;
  }
  T.page("today", { match: (h) => h === "today", render: todayPage });
  T.chip(() => `<a class="chip chip-today" href="#today" ${T.state.page === "today" ? 'aria-current="page"' : ""}><span class="sw" style="background:var(--pos-line)"></span>My day</a>`, true);

  // ---------- 9. Signals, with every signal's score since the day it was issued (pipeline/signals.py) ----------
  const SIG = {
    active: ["Bought above index flows", "The Big Three bought clearly more than the money flowing into their index funds"],
    consensus: ["Famous investors agree", "Three or more famous investors bought it in their latest 13F"],
    activist: ["New activist stake", "A new Schedule 13D in the last 30 days: 5%+ with intent to push for change"],
    insiders: ["Insiders buying", "Two or more insiders bought on the open market in the last 90 days"],
    emerging: ["Emerging small caps", "The Emerging screen’s small caps with the largest stake gain over a year"],
  };
  function sigWhy(k, x, g) {
    const w = x.why || {};
    if (k === "active") return w.m.map(([m, e]) => `${T.MGR_NAME[m]} ${e != null ? pct(e, 1) + " above its flows" : ""}`).join(" · ");
    if (k === "consensus") return `${w.by.length} managers: ${w.by.map((id) => ((g && g.managers.find((m) => m.id === id)) || {}).name || id).join(", ")}`;
    if (k === "activist") return `${((g && g.managers.find((m) => m.id === w.g)) || {}).name || w.g}, filed ${dateL(w.filed)}`;
    if (k === "insiders") return `${w.buyers} insiders bought ${usd(w.bought)}`;
    if (k === "emerging") return `Big Three stake ${w.stake != null ? pct(w.stake, 1, false) : "—"}, ${w.yoy != null ? pct(w.yoy, 1) + " in a year" : ""}`;
    return "";
  }
  function signalsPage(app) {
    const d = data("signals", ["signals"]);
    const g = data("gurus", ["signals"]);
    const bt = data("backtest", ["signals"]);
    if (d === undefined) { app.innerHTML = `<div class="main">${loading("signals")}</div>`; return; }
    if (!d) { app.innerHTML = `<div class="main"><p class="empty-state">Signals could not be loaded.</p></div>`; return; }
    const led = new Map(d.ledger.map((x) => [x.key, x]));
    const ret = (x) => (x && x.r != null ? `${signed(x.r)} <small class="muted">vs ${signed(x.rs).replace(/<[^>]+>/g, "")} S&amp;P</small>` : "—");
    const bs = bt && bt.summary;
    app.innerHTML = `<div class="main">
      <div class="hero"><h1>Signals, with their track record</h1>
        <p class="hero-sub">Five signals from the filings. Each one is recorded on the day it first appears, at that day’s price, and scored against the S&amp;P 500 from then on. Nothing is back-filled or removed.</p></div>
      <section class="section" aria-labelledby="sg-r"><div class="section-head"><h2 id="sg-r">Track record so far</h2><span class="note">Return since each signal was issued, against SPY over the same days</span></div>
        <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Signal</th><th scope="col">Tracked since</th><th scope="col">Signals</th><th scope="col">Average return</th><th scope="col">Versus the S&amp;P 500</th><th scope="col">Beat the S&amp;P 500</th></tr></thead>
        <tbody>${Object.keys(SIG).map((k) => { const x = d.summary[k] || {}; return `<tr><td class="l"><b>${SIG[k][0]}</b></td><td>${x.since ? dateL(x.since) : "—"}</td><td>${x.n || 0}</td><td>${x.avg == null ? "—" : signed(x.avg)}</td><td>${x.avgVsSpy == null ? "—" : signed(x.avgVsSpy)}</td><td>${x.beat == null || !x.aged ? "—" : pct(x.beat, 0, false)}</td></tr>`; }).join("")}</tbody></table></div>
        <p class="foot">${Object.values(d.summary).every((x) => !x.aged) ? "The record is young: no signal is 30 days old yet, so these numbers say little for now. " : ""}Prices from Yahoo Finance, before dividends and costs. Past results do not predict future ones; not investment advice.</p>
        ${bs ? `<div class="bt-note"><b>The Emerging screen, tested back to 2018:</b> bought each quarter once the 13F data was public and held 12 months, it returned ${pct(bs.avg12, 1)} a year on average, against ${pct(bs.avgIwm12, 1)} for the Russell 2000 (IWM), and beat it in ${pct(bs.beatIwm12, 0, false)} of ${bs.cohorts12} quarters. <a href="#emerging">The full backtest, on the Emerging page</a></div>` : ""}
      </section>
      ${Object.keys(SIG).map((k) => `<section class="section" aria-labelledby="sg-${k}"><div class="section-head"><div><h2 id="sg-${k}">${SIG[k][0]}</h2><p class="note">${SIG[k][1]}</p></div></div>
        ${(d.current[k] || []).length ? `<div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Company</th><th class="l" scope="col">Why</th><th scope="col">Since</th><th scope="col">Return since</th></tr></thead>
        <tbody>${d.current[k].map((x) => { const l = led.get(x.key); return `<tr><td class="l">${coLink(x.t, x.n)}</td><td class="l wrapc">${esc(sigWhy(k, x, g))}</td><td>${l ? dateL(l.date) : "—"}</td><td>${ret(l)}</td></tr>`; }).join("")}</tbody></table></div>` : '<p class="foot">None right now.</p>'}
      </section>`).join("")}
    </div>`;
  }
  T.page("signals", { match: (h) => h === "signals", render: signalsPage });
  T.chip(() => `<a class="chip" href="#signals" ${T.state.page === "signals" ? 'aria-current="page"' : ""}><span class="sw" style="background:var(--neg-line)"></span>Signals <small>with track record</small></a>`);

  // ---------- 5. Famous investors and activists (pipeline/gurus.py) ----------
  let guruOpen = null;
  const chg = (r) => (r.st === "new" ? '<span class="act new">New</span>' : r.st === "exited" ? '<span class="act out">Sold out</span>' : r.d != null ? T.pill(r.d, { sm: true }) : "—");
  const gRow = (r, extra = "") => `<tr><td class="l">${r.t ? coLink(r.t, r.n) : `<span class="co"><span class="tk">—</span><span class="co-nm"><b>${esc(T.niceName(r.n))}</b></span></span>`}</td>${extra}</tr>`;
  function gurusPage(app) {
    const g = data("gurus", ["gurus", "company"]);
    if (g === undefined) { app.innerHTML = `<div class="main">${loading("famous investors")}</div>`; return; }
    if (!g) { app.innerHTML = `<div class="main"><p class="empty-state">Famous investors could not be loaded.</p></div>`; return; }
    const m = guruOpen && g.managers.find((x) => x.id === guruOpen);
    if (m) {
      app.innerHTML = `<div class="main">
        <div class="hero">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="#gurus">Famous investors</a><span aria-hidden="true">›</span><span>${esc(m.name)}</span></nav>
          <h1>${esc(m.name)}</h1>
          <p class="hero-sub">${esc(m.person)} · ${esc(m.style)}</p>
          <div class="figure"><span class="figure-value">${usd(m.total)}</span><span class="muted">in ${m.positions.toLocaleString("en-US")} US-listed positions, 13F for ${T.qlabel(m.period)} (filed ${dateL(m.filed)})</span></div>
        </div>
        <section class="section" aria-labelledby="gu-b"><div class="section-head"><h2 id="gu-b">Biggest buys in ${T.qlabel(m.period)}</h2></div>
          <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Company</th><th scope="col">Bought</th><th scope="col">Change in shares</th><th scope="col">% of book</th></tr></thead>
          <tbody>${m.buys.map((r) => gRow(r, `<td>${signed(r.f, usdS)}</td><td>${chg(r)}</td><td>${pct(r.w, 1, false)}</td>`)).join("") || '<tr><td colspan="4" class="na l">None</td></tr>'}</tbody></table></div></section>
        <section class="section" aria-labelledby="gu-s"><div class="section-head"><h2 id="gu-s">Biggest sells</h2></div>
          <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Company</th><th scope="col">Sold</th><th scope="col">Change in shares</th><th scope="col">% of book</th></tr></thead>
          <tbody>${m.sells.map((r) => gRow(r, `<td>${signed(r.f, usdS)}</td><td>${chg(r)}</td><td>${r.w ? pct(r.w, 1, false) : "—"}</td>`)).join("") || '<tr><td colspan="4" class="na l">None</td></tr>'}</tbody></table></div></section>
        <section class="section" aria-labelledby="gu-t"><div class="section-head"><h2 id="gu-t">Largest holdings</h2></div>
          <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Company</th><th scope="col">Value</th><th scope="col">% of book</th><th scope="col">Last quarter</th></tr></thead>
          <tbody>${m.top.map((r) => gRow(r, `<td>${usd(r.v)}</td><td>${pct(r.w, 1, false)}</td><td>${chg(r)}</td>`)).join("")}</tbody></table></div>
          <p class="foot">From ${esc(m.name)}’s Form 13F on SEC EDGAR (US-listed stocks and options are reported; options are left out), compared with ${m.prevPeriod ? T.qlabel(m.prevPeriod) : "the previous quarter"}. A 13F is filed up to 45 days after the quarter ends.</p></section>
      </div>`;
      return;
    }
    const D13 = Object.fromEntries(g.managers.map((x) => [x.id, x.name]));
    app.innerHTML = `<div class="main">
      <div class="hero">
        <h1>Famous investors and activists</h1>
        <p class="hero-sub">${g.managers.length} well-known managers whose moves are decisions, not index flows: what they hold, what they bought and sold last quarter, and the stakes activists take to push for change.</p>
      </div>
      <section class="section" aria-labelledby="gu-c"><div class="section-head"><div><h2 id="gu-c">What several of them bought</h2><p class="note">Companies at least two of these managers added to in their latest 13F</p></div></div>
        <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Company</th><th scope="col">Managers buying</th><th scope="col">Bought together</th><th class="l" scope="col">Who</th></tr></thead>
        <tbody>${g.consensus.map((c) => `<tr><td class="l">${coLink(c.t, c.n)}</td><td>${c.by.length}</td><td>${usdS(c.f)}</td><td class="l wrapc">${c.by.map((id) => `<a href="#gurus/${id}">${esc(D13[id])}</a>`).join(", ")}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="section" aria-labelledby="gu-d"><div class="section-head"><div><h2 id="gu-d">Activist stakes (Schedule 13D)</h2><p class="note">A 13D is filed within days of crossing 5% of a company with intent to influence it; an amendment means the stake or the plan changed</p></div></div>
        <div class="list wrap">${g.d13.slice(0, 20).map((d) => `<a href="${esc(d.url)}" target="_blank" rel="noopener"><span class="badge frep">${d.amend ? "13D/A" : "13D"}</span><span class="nm"><b>${esc(D13[d.g])} · ${esc(T.niceName(d.name))}${d.t ? ` (${esc(d.t)})` : ""}</b><small>${d.amend ? "Amended its stake" : "New 5%+ stake"} · ${dateL(d.filed)}</small></span><span class="rt muted">${ago(d.filed + "T12:00:00Z")}</span></a>`).join("")}</div></section>
      <section class="section" aria-labelledby="gu-m"><div class="section-head"><h2 id="gu-m">The managers</h2></div>
        <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Manager</th><th class="l" scope="col">Style</th><th scope="col">13F book</th><th scope="col">Quarter</th><th class="l" scope="col">Largest holding</th><th class="l" scope="col">Biggest buy</th></tr></thead>
        <tbody>${g.managers.map((x) => `<tr data-href="#gurus/${x.id}"><td class="l"><a href="#gurus/${x.id}"><b>${esc(x.name)}</b></a><br><small class="muted">${esc(x.person)}</small></td><td class="l">${esc(x.style)}</td><td>${usd(x.total)}</td><td>${T.qlabel(x.period)}</td><td class="l">${x.top[0] ? `${esc(x.top[0].t || T.niceName(x.top[0].n))} <span class="muted">${pct(x.top[0].w, 0, false)}</span>` : "—"}</td><td class="l">${x.buys[0] ? `${esc(x.buys[0].t || T.niceName(x.buys[0].n))} <span class="muted">${usdS(x.buys[0].f)}</span>` : "—"}</td></tr>`).join("")}</tbody></table></div>
        <p class="foot">From each manager’s latest Form 13F on SEC EDGAR, compared with the quarter before. Activist 13D filings from the managers’ own SEC filing history, last 12 months. Not investment advice.</p></section>
    </div>`;
    app.querySelectorAll("tr[data-href]").forEach((tr) => tr.addEventListener("click", (e) => { if (!e.target.closest("a")) location.hash = tr.dataset.href.slice(1); }));
  }
  T.page("gurus", { match: (h) => h === "gurus" || h.startsWith("gurus/"), onRoute: (h) => { guruOpen = h.startsWith("gurus/") ? h.slice(6) : null; }, render: gurusPage });
  T.chip(() => `<a class="chip" href="#gurus" ${T.state.page === "gurus" ? 'aria-current="page"' : ""}><span class="sw" style="background:var(--c-gold)"></span>Famous investors <small>& activists</small></a>`);
  T.company((s) => {
    const g = data("gurus", ["gurus", "company"]);
    if (!g) return "";
    const holds = g.managers.map((m) => ({ m, r: m.top.find((r) => r.t === s.ticker) || m.buys.find((r) => r.t === s.ticker) || m.sells.find((r) => r.t === s.ticker) })).filter((x) => x.r);
    const d = g.d13.filter((x) => x.t === s.ticker);
    if (!holds.length && !d.length) return "";
    return `<section class="section" aria-labelledby="co-gu">
      <div class="section-head"><h2 id="co-gu">Famous investors</h2><a class="note" href="#gurus">All famous investors</a></div>
      ${holds.length ? `<div class="table-scroll flat"><table class="own-table"><thead><tr><th class="l" scope="col">Manager</th><th scope="col">Value</th><th scope="col">% of its book</th><th scope="col">Last quarter</th></tr></thead>
      <tbody>${holds.map(({ m, r }) => `<tr><td class="l"><a href="#gurus/${m.id}">${esc(m.name)}</a> <small class="muted">${esc(m.person)}</small></td><td>${usd(r.v)}</td><td>${r.w ? pct(r.w, 1, false) : "—"}</td><td>${chg(r)}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${d.length ? `<p class="foot">${d.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(g.managers.find((m) => m.id === x.g)?.name || x.g)}: ${x.amend ? "13D amendment" : "new 13D stake"}, ${dateL(x.filed)}</a>`).join(" · ")}</p>` : ""}
    </section>`;
  });

  // ---------- 8. Israeli companies listed in the US, in dollars or shekels (pipeline/israel.py) ----------
  let ilsOn = (() => { try { return localStorage.getItem("mrfink.ils") === "1"; } catch (e) { return false; } })();
  function israelPage(app) {
    const d = data("israel", ["israel"]);
    if (d === undefined) { app.innerHTML = `<div class="main">${loading("Israeli companies")}</div>`; return; }
    if (!d) { app.innerHTML = `<div class="main"><p class="empty-state">The Israeli companies could not be loaded.</p></div>`; return; }
    const fx = d.usdils;
    const money = (v) => (v == null ? "—" : ilsOn && fx ? "₪" + T.num(v * fx) : usd(v));
    const price = (r) => { const p = T.pxOf(r.t) || r.price; return p == null ? "—" : ilsOn && fx ? "₪" + (p * fx).toFixed(2) : "$" + p.toFixed(2); };
    const day = (r) => { const p = T.pxOf(r.t) || r.price; return p && r.prev ? T.pill(p / r.prev - 1, { sm: true }) : "—"; };
    const G = (data("gurus", ["israel"]) || { managers: [] }).managers;
    const held = d.rows.filter((r) => r.own).reduce((a, r) => a + r.own.v, 0);
    const rows = d.rows.slice().sort((a, b) => ((b.own && b.own.v) || 0) - ((a.own && a.own.v) || 0));
    app.innerHTML = `<div class="main">
      <div class="hero">
        <h1>Israeli companies on Wall Street</h1>
        <p class="hero-sub">${d.rows.length} Israeli companies listed in the US: how much of each the Big Three hold, what they did last quarter, and which famous investors are in.</p>
        ${held ? `<div class="figure"><span class="figure-value">${money(held)}</span><span class="muted">held by the Big Three in these companies</span></div>` : ""}
        <div class="toggles" role="group" aria-label="Currency"><button type="button" class="chip" data-cur="usd" aria-pressed="${!ilsOn}">$ Dollars</button><button type="button" class="chip" data-cur="ils" aria-pressed="${ilsOn}">₪ Shekels</button>${fx ? `<span class="muted fx">$1 = ₪${fx.toFixed(3)}</span>` : ""}</div>
      </div>
      <div class="table-scroll"><table class="tbl pro-tbl">
        <thead><tr><th class="l" scope="col">Company</th><th class="l" scope="col">Field</th><th scope="col">Price</th><th scope="col">Today</th><th scope="col">Big Three hold</th><th scope="col">Stake</th><th class="l" scope="col">Last quarter</th><th class="l" scope="col">Famous investors</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td class="l">${coLink(r.t, r.n)}</td><td class="l">${esc(r.f)}</td><td>${price(r)}</td><td>${day(r)}</td><td>${r.own ? money(r.own.v) : '<span class="na">—</span>'}</td><td>${r.own && r.own.s != null ? pct(r.own.s, 1, false) : '<span class="na">n/a</span>'}</td>
          <td class="l pf-why">${r.own ? interpret(r.own).map((x) => `<span>${esc(x)}</span>`).join("") || (r.own.q != null ? T.pill(r.own.q, { sm: true }) : "—") : d.ownersPending ? '<span class="muted">Ownership data is being added</span>' : '<span class="muted">Below $50M held</span>'}</td>
          <td class="l wrapc">${r.famous.map((id) => { const m = G.find((x) => x.id === id); return m ? `<a href="#gurus/${id}">${esc(m.name)}</a>` : ""; }).join(", ") || "—"}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="foot">Israeli-founded or Israel-headquartered companies with a US listing. Holdings from the Big Three’s 13F filings for ${T.qlabel(T.D.meta.latest)}; stake where the company reports its share count to the SEC (many Israeli companies file a 20-F and do not). Prices from Yahoo Finance; shekel amounts at the latest dollar-shekel rate. Not investment advice.</p>
    </div>`;
    app.querySelectorAll("[data-cur]").forEach((b) => b.addEventListener("click", () => { ilsOn = b.dataset.cur === "ils"; try { localStorage.setItem("mrfink.ils", ilsOn ? "1" : "0"); } catch (e) { /* storage unavailable */ } T.render(); }));
  }
  T.page("israel", { match: (h) => h === "israel", render: israelPage });
  T.chip(() => `<a class="chip" href="#israel" ${T.state.page === "israel" ? 'aria-current="page"' : ""}><span class="sw il-sw"></span>Israel <small>on Wall Street</small></a>`);

  // ---------- 7. The weekly digest (pipeline/digest.py; sent by the push server on Friday evening) ----------
  let digestWeek = null, tgInfo;
  const HE_MGR = { blackrock: "בלקרוק", vanguard: "ואנגארד", statestreet: "סטייט סטריט" };
  const isHe = () => { try { return localStorage.getItem("mrfink.lang") === "he"; } catch (e) { return false; } };
  /** The digest's headlines as sentences (the push server writes the same ones). */
  function digestLines(issue, he) {
    const M = (m) => (he ? HE_MGR[m] : T.MGR_NAME[m]) || m;
    return issue.lines.map(([kind, x]) => {
      if (kind === "stake") return he ? `${M(x.m)} דיווחה על ${(x.pct * 100).toFixed(1)}% ב-${x.t}${x.n > 1 ? ` (ועוד ${x.n - 1} דיווחי אחזקה)` : ""}` : `${M(x.m)} reported ${(x.pct * 100).toFixed(1)}% of ${x.t}${x.n > 1 ? ` (and ${x.n - 1} more stake filings)` : ""}`;
      if (kind === "spdr") return he ? `קרנות SPDR: ${usdS(x.flow)} נטו השבוע${x.buy ? `, הקנייה הגדולה ${x.buy[0]} (${usdS(x.buy[1])})` : ""}` : `SPDR funds: ${usdS(x.flow)} net this week${x.buy ? `, biggest buy ${x.buy[0]} (${usdS(x.buy[1])})` : ""}`;
      if (kind === "d13") return he ? `${x.g}: ${x.amend ? "עדכון אחזקה אקטיביסטית" : "אחזקה אקטיביסטית חדשה"} ב-${x.t || x.n}` : `${x.g}: ${x.amend ? "changed its activist stake" : "new activist stake"} in ${x.t || x.n}`;
      if (kind === "g13f") return he ? `${x.g} הגישה 13F${x.buy && x.buy.t ? `, הקנייה הגדולה ${x.buy.t}` : ""}` : `${x.g} filed its 13F${x.buy && x.buy.t ? `, biggest buy ${x.buy.t}` : ""}`;
      if (kind === "signals") return he ? `${x.n} סיגנלים חדשים` : `${x.n} new signals`;
      if (kind === "reports") return he ? `${x.n} דיווחים מהותיים (8-K)${x.t.length ? `: ${x.t.join(", ")}` : ""}` : `${x.n} key 8-K reports${x.t.length ? `: ${x.t.join(", ")}` : ""}`;
      if (kind === "f13") return he ? `דוחות 13F חדשים: ${x.m.map(M).join(", ")}` : `New 13F filings: ${x.m.map(M).join(", ")}`;
      return "";
    }).filter(Boolean);
  }
  function digestPage(app) {
    const d = data("digest", ["digest"]);
    if (d === undefined) { app.innerHTML = `<div class="main">${loading("the weekly digest")}</div>`; return; }
    if (!d || !d.current) { app.innerHTML = `<div class="main"><p class="empty-state">The weekly digest could not be loaded.</p></div>`; return; }
    if (tgInfo === undefined && T.pushUrl) {
      tgInfo = null;
      fetch(T.pushUrl + "/health").then((r) => r.json()).then((h) => { tgInfo = h.telegram || false; T.rerender(["digest"]); }).catch(() => {});
    }
    const all = [d.current, ...(d.archive || [])];
    const issue = all.find((x) => x.week === digestWeek) || d.current;
    const he = isHe();
    const lines = digestLines(issue, he);
    const sec = (id, title, body) => (body ? `<section class="section" aria-labelledby="dg-${id}"><div class="section-head"><h2 id="dg-${id}">${title}</h2></div>${body}</section>` : "");
    const list = (rows) => (rows.length ? `<div class="list wrap">${rows.join("")}</div>` : "");
    const item = (href, badge, title, sub, ext) => `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}><span class="badge frep">${esc(badge)}</span><span class="nm"><b>${title}</b><small>${sub}</small></span><span></span></a>`;
    app.innerHTML = `<div class="main">
      <div class="hero"><h1>Weekly digest</h1>
        <p class="hero-sub">${dateL(issue.from)} – ${dateL(issue.to)}${issue === d.current && !issue.ready ? " · this week so far" : ""}</p>
        <div class="toggles dg-weeks" role="group" aria-label="Week">${all.slice(0, 8).map((x) => `<a class="chip" href="#digest/${x.week}" aria-pressed="${x.week === issue.week}">${dateL(x.from).replace(/, \d{4}$/, "")}</a>`).join("")}</div>
      </div>
      <section class="section dg-lines" aria-labelledby="dg-h"><h2 id="dg-h" class="sr">The week in short</h2>
        ${lines.length ? `<ul>${lines.map((l) => `<li translate="no">${esc(l)}</li>`).join("")}</ul>` : '<p class="foot">A quiet week so far.</p>'}
      </section>
      <div class="dg-get">${T.pushUrl ? `<span>Get it every Friday as a push notification: turn on <b>Weekly digest</b> under the bell.</span>` : ""}${tgInfo ? `<a class="btn" href="https://t.me/${typeof tgInfo === "string" ? esc(tgInfo) : ""}" target="_blank" rel="noopener">Get it on Telegram</a>` : ""}</div>
      ${sec("st", "Big Three stake filings (13G/13D)", list(issue.stakes.map((e) => item(`#t-${slugOf((e.tickers || [])[0] || "")}`, "13G", `${esc(T.MGR_NAME[e.manager] || "")}: ${pct(e.percent, 2, false)} of ${esc((e.tickers || [])[0] || "")}`, `${esc(e.entity)} · ${dateL(e.filed)}`))))}
      ${sec("sp", "SPDR funds this week", issue.spdrFlow == null ? "" : `<p class="foot">Net money in or out: <b>${usdS(issue.spdrFlow)}</b></p>${list([...issue.spdrBuys, ...issue.spdrSells].map(([t, u, m]) => item(`#t-${slugOf(t)}`, u >= 0 ? "Buy" : "Sell", `${esc(t)}: ${usdS(u)}`, Math.abs(m) >= Math.abs(u) * 0.5 ? "Mostly a change in the funds’ mix" : "Mostly money flows")))}`)}
      ${sec("ac", "Activists", list(issue.d13.map((x) => item(x.t ? `#t-${slugOf(x.t)}` : "#gurus", x.amend ? "13D/A" : "13D", `${esc(x.g)} · ${esc(x.t || T.niceName(x.n))}`, `${x.amend ? "Amended its stake" : "New 5%+ stake"} · ${dateL(x.filed)}`))))}
      ${sec("gf", "Famous investors’ 13F filings", list(issue.g13f.map((x) => item("#gurus", "13F", esc(x.g), `${T.qlabel(x.period)}${x.buy && x.buy.t ? ` · biggest buy ${esc(x.buy.t)} (${usdS(x.buy.f)})` : ""}`))))}
      ${sec("sg", "New signals", list(issue.newSignals.map((x) => item(`#t-${slugOf(x.t)}`, "Signal", esc(x.t), `${esc((SIG[x.kind] || [x.kind])[0])} · ${esc(T.niceName(x.n))}`))))}
      ${sec("bs", "Best signals so far", list(issue.best.map((x) => item("#signals", "Signal", `${esc(x.t)}: ${signed(x.r)}`, `${esc((SIG[x.kind] || [x.kind])[0])} · since ${dateL(x.date)} · S&amp;P 500 ${signed(x.rs).replace(/<[^>]+>/g, "")}`))))}
      ${sec("rp", "Key company reports (8-K)", list(issue.reports.map((e) => { const [a, b] = T.feedTitle(e); return item(e.url, "8-K", esc(a), esc(b || ""), true); })))}
    </div>`;
  }
  T.page("digest", { match: (h) => h === "digest" || h.startsWith("digest/"), onRoute: (h) => { digestWeek = h.startsWith("digest/") ? h.slice(7) : null; }, render: digestPage });
  T.chip(() => `<a class="chip" href="#digest" ${T.state.page === "digest" ? 'aria-current="page"' : ""}><span class="sw" style="background:var(--warn)"></span>Weekly digest</a>`);

  // ---------- 6. Ask Trintel: questions in Hebrew or English, answered by Claude from the data (worker/src/ask.js) ----------
  const askLog = [];  // this visit's questions and answers
  let askBusy = false, askState = null;  // null | "off"
  const EXAMPLES_HE = ["מה בלקרוק קנתה הכי הרבה ברבעון האחרון, ומה מזה אקטיבי?", "כמה מטבע (TEVA) מחזיקות שלוש הגדולות?", "על מה משקיעים מפורסמים מסכימים עכשיו?", "איך ואנגארד הצביעה על הצעות אקלים?"];
  const EXAMPLES_EN = ["What did BlackRock buy most last quarter, and what of it was active?", "How much of Nvidia do the Big Three own?", "What are famous investors agreeing on right now?", "How did Vanguard vote on climate proposals?"];
  function askPage(app) {
    const he = isHe();
    const examples = he ? EXAMPLES_HE : EXAMPLES_EN;
    app.innerHTML = `<div class="main ask">
      <div class="hero"><h1>Ask Trintel</h1>
        <p class="hero-sub">Ask about the Big Three, famous investors, any company or the signals, in Hebrew or English. Answers come from Trintel’s data only, with numbers and dates.</p></div>
      ${!T.pushUrl ? '<p class="empty-state">Ask works on the live site only.</p>' : askState === "off" ? '<p class="empty-state">Ask is not switched on yet.</p>' : `
      <div class="ask-log" aria-live="polite">${askLog.map((x) => `<div class="ask-q" translate="no">${esc(x.q)}</div><div class="ask-a${x.err ? " err" : ""}"${x.err ? "" : ' translate="no"'}>${x.a == null ? '<span class="muted">Thinking…</span>' : esc(x.a).replace(/\n/g, "<br>")}${(x.tickers || []).length ? `<div class="ask-links">${x.tickers.map((t) => (T.secByTicker(t) ? `<a href="#t-${slugOf(t)}">${esc(t)}</a>` : "")).join("")}</div>` : ""}</div>`).join("")}</div>
      ${askLog.length ? "" : `<div class="ask-ex">${examples.map((q) => `<button type="button" class="chip" data-ex="${esc(q)}" translate="no">${esc(q)}</button>`).join("")}</div>`}
      <form class="ask-form" id="ask-form"><textarea id="ask-q" rows="2" maxlength="600" placeholder="${he ? "שאלו שאלה…" : "Ask a question…"}" translate="no"></textarea><button type="submit" class="btn primary" ${askBusy ? "disabled" : ""}>Ask</button></form>
      <p class="foot">Answers are written by an AI model (Claude) from Trintel’s data and can be wrong; check the numbers on the pages it links. Not investment advice. A few questions a day per visitor.</p>`}
    </div>`;
    const form = $("ask-form");
    if (!form) return;
    const send = async (q) => {
      q = q.trim();
      if (!q || askBusy) return;
      askBusy = true;
      const entry = { q, a: null };
      askLog.push(entry);
      T.render();
      try {
        const r = await fetch(T.pushUrl + "/ask", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, lang: he ? "he" : "en", history: askLog.slice(0, -1).slice(-2).flatMap((x) => (x.a && !x.err ? [{ role: "user", content: x.q }, { role: "assistant", content: x.a }] : [])) }) });
        const d = await r.json().catch(() => ({}));
        if (d.error === "not_configured") { askState = "off"; askLog.pop(); }
        else if (d.answer) { entry.a = d.answer; entry.tickers = d.tickers; }
        else { entry.err = true; entry.a = d.error === "daily_user" ? "You have reached today’s question limit. Try again tomorrow." : d.error === "daily_total" ? "Ask has reached its limit for today. Try again tomorrow." : d.error === "refused" ? "This question cannot be answered here." : "Something went wrong. Try again in a minute."; }
      } catch (e) { entry.err = true; entry.a = "Something went wrong. Try again in a minute."; }
      askBusy = false;
      T.render();
      document.querySelector(".ask-log > :last-child")?.scrollIntoView({ block: "nearest" });
    };
    form.addEventListener("submit", (e) => { e.preventDefault(); send($("ask-q").value); });
    $("ask-q").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send($("ask-q").value); } });
    app.querySelectorAll("[data-ex]").forEach((b) => b.addEventListener("click", () => send(b.dataset.ex)));
  }
  T.page("ask", { match: (h) => h === "ask", render: askPage });
  T.chip(() => `<a class="chip" href="#ask" ${T.state.page === "ask" ? 'aria-current="page"' : ""}><span class="sw" style="background:var(--accent)"></span>Ask <small>in Hebrew or English</small></a>`, true);

  // ---------- 10. Pro tools: proxy votes (pipeline/votes.py), CSV for spreadsheets and the data API ----------
  const VOTE = { FOR: "For", AGAINST: "Against", WITHHOLD: "Withheld", ABSTAIN: "Abstained" };
  const voteTag = (v, it) => { if (!v) return '<span class="na">—</span>'; const w = v === (it.s === "Shareholder" ? "AGAINST" : "FOR"); return `<span class="vote ${w ? "with" : "against"}" title="${w ? "With management" : "Against management"}">${esc(VOTE[v] || v.toLowerCase())}</span>`; };
  function votesPage(app) {
    const d = data("votes", ["votes"]);
    if (d === undefined) { app.innerHTML = `<div class="main">${loading("proxy votes")}</div>`; return; }
    if (!d) { app.innerHTML = `<div class="main"><p class="empty-state">Proxy votes could not be loaded.</p></div>`; return; }
    const ms = Object.keys(d.summary);
    const cats = [...new Set(ms.flatMap((m) => Object.keys(d.summary[m].byCategory)))];
    app.innerHTML = `<div class="main">
      <div class="hero"><h1>How the Big Three vote</h1>
        <p class="hero-sub">Every shareholder-meeting vote of each manager’s flagship S&amp;P 500 fund (${ms.map((m) => `${T.MGR_NAME[m]}: ${esc(d.funds[m])}`).join(", ")}), from Form N-PX for the year to ${dateL(d.period)}.</p></div>
      <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Manager</th><th scope="col">Votes cast</th><th scope="col">Against management</th><th scope="col">Shareholder proposals</th><th scope="col">Supported</th></tr></thead>
        <tbody>${ms.map((m) => { const x = d.summary[m]; return `<tr><td class="l">${T.dot(m)}${T.MGR_NAME[m]}</td><td>${x.proposals.toLocaleString("en-US")}</td><td>${pct(x.againstMgmt, 1, false)}</td><td>${x.shareholder}</td><td>${pct(x.shareholderFor, 1, false)}</td></tr>`; }).join("")}</tbody></table></div>
      <section class="section" aria-labelledby="vt-c"><div class="section-head"><div><h2 id="vt-c">Support for shareholder proposals, by subject</h2><p class="note">Share of the proposals voted for</p></div></div>
        <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Subject</th>${ms.map((m) => `<th scope="col">${T.dot(m)}${T.MGR_NAME[m]}</th>`).join("")}</tr></thead>
        <tbody>${cats.map((c) => `<tr><td class="l">${esc(c)}</td>${ms.map((m) => { const x = d.summary[m].byCategory[c]; return `<td>${x ? `${pct(x[1], 0, false)} <small class="muted">of ${x[0]}</small>` : "—"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div></section>
      <section class="section" aria-labelledby="vt-a"><div class="section-head"><div><h2 id="vt-a">Where they voted against management</h2><p class="note">Proposals where at least one of the three went against the board’s position, most agreement first</p></div></div>
        <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Company</th><th class="l" scope="col">Proposal</th><th scope="col">Meeting</th>${ms.map((m) => `<th scope="col">${T.dot(m)}${T.MGR_NAME[m]}</th>`).join("")}</tr></thead>
        <tbody>${d.contested.slice(0, 80).map((it) => `<tr><td class="l">${coLink(it.t, it.n)}</td><td class="l wrapc">${esc(it.d)}<br><small class="muted">${it.s === "Shareholder" ? "Shareholder proposal" : "Company proposal"}${it.c ? " · " + esc(it.c) : ""}</small></td><td>${dateL(it.date)}</td>${ms.map((m) => `<td>${voteTag(it.v[m], it)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        <p class="foot">Management backs its own proposals and opposes shareholders’; a vote is against management when it goes the other way (a withheld vote on a director counts as against). Source: the funds’ Form N-PX on SEC EDGAR. Each company page lists all of its votes.</p></section>
    </div>`;
  }
  T.page("votes", { match: (h) => h === "votes", render: votesPage });
  T.chip(() => `<a class="chip" href="#votes" ${T.state.page === "votes" ? 'aria-current="page"' : ""}><span class="sw" style="background:var(--c-purple)"></span>Votes <small>proxy voting</small></a>`);
  const coVotes = {};
  T.company((s) => {
    const t = s.ticker;
    if (!(t in coVotes)) {
      coVotes[t] = undefined;
      fetch(`data/votes/${encodeURIComponent(t)}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((v) => { coVotes[t] = v; if (v) T.rerender(["company"]); });
      return "";
    }
    const v = coVotes[t];
    if (!v || !v.items.length) return "";
    const ms = ["blackrock", "vanguard", "statestreet"].filter((m) => v.items.some((it) => it.v[m]));
    const latest = v.items[0].date;
    const items = v.items.filter((it) => it.date === latest);
    return `<section class="section" aria-labelledby="co-vt">
      <div class="section-head"><h2 id="co-vt">How the Big Three voted</h2><a class="note" href="#votes">All proxy votes</a></div>
      <p class="foot">Shareholder meeting of ${dateL(latest)}, through each manager’s flagship S&amp;P 500 fund (Form N-PX).</p>
      <div class="table-scroll flat"><table class="own-table"><thead><tr><th class="l" scope="col">Proposal</th>${ms.map((m) => `<th scope="col">${T.dot(m)}${T.MGR_NAME[m]}</th>`).join("")}</tr></thead>
      <tbody>${items.map((it) => `<tr><td class="l wrapc">${esc(it.d)}${it.s === "Shareholder" ? ' <small class="muted">(shareholder proposal)</small>' : ""}</td>${ms.map((m) => `<td>${voteTag(it.v[m], it)}${it.k && it.k[m] ? ` <small class="muted">×${it.k[m]}</small>` : ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    </section>`;
  });

  // ---------- data for spreadsheets and other apps ----------
  const CSVS = [
    ["holdings-big3.csv", "Big Three combined: top 50 holdings, stake, last quarter’s change, passive or active"],
    ["holdings-blackrock.csv", "BlackRock’s top 50 holdings"], ["holdings-vanguard.csv", "Vanguard’s top 50 holdings"], ["holdings-statestreet.csv", "State Street’s top 50 holdings"],
    ["ownership.csv", "Every Big Three position of $50M or more, by manager"],
    ["famous-investors.csv", "Famous investors: holdings, buys and sells"], ["activist-13d.csv", "Activist 13D filings, last 12 months"],
    ["spdr-daily.csv", "SPDR funds’ daily trades by company"], ["spdr-funds.csv", "SPDR funds: money in and out"],
    ["signals.csv", "Every signal since it was issued, with its return"], ["israel.csv", "Israeli companies on Wall Street"],
  ];
  const JSONS = [
    ["dashboard.json", "Everything on the main pages: managers, top holdings, company profiles, filings feed"],
    ["owners.json", "Ownership index by ticker"], ["daily.json", "SPDR daily trades"], ["gurus.json", "Famous investors and activists"],
    ["signals.json", "Signals and their ledger"], ["votes.json", "Proxy voting summary"], ["votes/AAPL.json", "One company’s proxy votes (any ticker)"],
    ["israel.json", "Israeli companies"], ["quotes.json", "Latest prices"], ["status.json", "When the data was last checked"],
  ];
  function apiPage(app) {
    const base = location.href.split("#")[0].replace(/index\.html$/, "") + "data/";
    app.innerHTML = `<div class="main">
      <div class="hero"><h1>Data for spreadsheets and apps</h1>
        <p class="hero-sub">Everything Trintel shows is published as files you can pull into Google Sheets, Excel or your own code, refreshed with the site.</p></div>
      <section class="section" aria-labelledby="api-c"><div class="section-head"><div><h2 id="api-c">Spreadsheets (CSV)</h2><p class="note">In Google Sheets, paste the formula into a cell; in Excel use Data, From Web, with the address</p></div></div>
        <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">File</th><th class="l" scope="col">What is in it</th><th class="l" scope="col">Google Sheets formula</th></tr></thead>
        <tbody>${CSVS.map(([f, w]) => `<tr><td class="l"><a href="${esc(base + "csv/" + f)}" download>${esc(f)}</a></td><td class="l wrapc">${esc(w)}</td><td class="l"><code class="copy" data-copy="=IMPORTDATA(&quot;${esc(base + "csv/" + f)}&quot;)" title="Copy">=IMPORTDATA("…/${esc(f)}")</code></td></tr>`).join("")}</tbody></table></div></section>
      <section class="section" aria-labelledby="api-j"><div class="section-head"><div><h2 id="api-j">JSON API</h2><p class="note">Plain HTTPS GET, no key, open to any website (CORS)</p></div></div>
        <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Address</th><th class="l" scope="col">What is in it</th></tr></thead>
        <tbody>${JSONS.map(([f, w]) => `<tr><td class="l"><a href="${esc(base + f)}" target="_blank" rel="noopener"><code>${esc("data/" + f)}</code></a></td><td class="l wrapc">${esc(w)}</td></tr>`).join("")}</tbody></table></div>
        <pre class="api-ex" dir="ltr">fetch("${esc(base)}owners.json")
  .then((r) =&gt; r.json())
  .then((d) =&gt; console.log(d.rows["AAPL"]));</pre>
        <p class="foot">The data comes from public SEC filings and the sources named on each page. The files are updated every few minutes and their format can change; status.json says when they were last checked.</p></section>
    </div>`;
    app.querySelectorAll("[data-copy]").forEach((c) => c.addEventListener("click", () => { navigator.clipboard?.writeText(c.dataset.copy).then(() => T.toast("Formula copied"), () => {}); }));
  }
  T.page("api", { match: (h) => h === "api", render: apiPage });
  T.chip(() => `<a class="chip" href="#api" ${T.state.page === "api" ? 'aria-current="page"' : ""}><span class="sw" style="background:var(--muted)"></span>Data <small>CSV · API</small></a>`);

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
        <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Company</th><th scope="col">Bought or sold</th><th scope="col">Not from money flows</th><th class="l" scope="col">Mostly</th></tr></thead>
        <tbody>${stocks.map((x) => `<tr><td class="l">${coLink(x.t, x.n)}</td><td>${signed(x.usd, usdS)}</td><td>${signed(x.mix, usdS)}</td><td class="l muted">${why(x)}</td></tr>`).join("")}</tbody></table></div>
      </section>
      <section class="section" aria-labelledby="dl-mix">
        <div class="section-head"><div><h2 id="dl-mix">Changes in the funds’ mix</h2><p class="note">Additions, removals and weight changes, after taking out money coming in or going out</p></div></div>
        ${mixRows.length ? `<div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Company</th><th scope="col">Fund</th><th scope="col">Value</th><th class="l" scope="col">What changed</th></tr></thead>
        <tbody>${mixRows.map((x) => `<tr><td class="l">${coLink(x.t, x.n)}</td><td>${esc(x.f)}</td><td>${signed(x.v, usdS)}</td><td class="l">${kindOf(x)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="foot">No change in any fund’s mix on ${dateL(d.asOf)}: every trade followed money in or out.</p>`}
      </section>`}
      <section class="section" aria-labelledby="dl-f">
        <div class="section-head"><div><h2 id="dl-f">The funds</h2><p class="note">Money in or out each business day (bars: last 20 days)</p></div></div>
        <div class="table-scroll"><table class="tbl pro-tbl"><thead><tr><th class="l" scope="col">Fund</th><th scope="col">Size</th><th scope="col">Latest day</th><th scope="col">Money in or out</th><th scope="col">Of the fund</th><th scope="col">Last 20 days</th></tr></thead>
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
