// "Ask Trintel": questions in Hebrew or English, answered by Claude from the site's own data.
//
// POST /ask { question, lang, history? }  ->  { answer, tickers }
//
// Claude gets tools that read the small files the pipeline publishes for it (data/ask/, built by
// pipeline/askdata.py) and answers only from them. Needs the Worker secret ANTHROPIC_API_KEY;
// without it /ask answers 503 and the page says so. Cost is capped with daily limits per visitor
// and for the whole site (ASK_DAILY_PER_USER, ASK_DAILY_TOTAL; defaults below).
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";
const PER_USER = 15;
const TOTAL = 200;
const MAX_TURNS = 6;

const SYSTEM = `You are Trintel's research assistant. Trintel tracks what BlackRock, Vanguard and State Street (the "Big Three") own and trade, from their SEC filings, plus famous investors, activists, proxy votes and Israeli companies listed in the US.

Answer the user's question using only the data your tools return. Look things up before answering; do not rely on memory for holdings, prices or dates. If the data does not answer the question, say so plainly and say what Trintel does show.

How to read the data:
- 13F filings cover US-listed stocks only, are filed up to 45 days after each quarter, and show quarter-end holdings. Total assets under management (aum) is much larger than the 13F.
- "passiveOrActive" compares a manager's change in shares with its change across the whole book (its index-fund flows): "flows" = moved with index-fund money (passive), "more"/"less" = clearly above/below the flows (an index weight change or an active decision), "new" = new position.
- Stake = shares held / shares outstanding. Values are US dollars.
- SPDR daily data is State Street's ETFs day by day: "usd" is net bought or sold, "mix" the part not explained by money flowing in or out.

Style: answer in the user's language (Hebrew if they write Hebrew). Be short and concrete: lead with the answer, then 2-5 supporting facts with numbers and dates. Write tickers in Latin letters. Never give investment advice or tell the user to buy or sell; you may describe what the filings show. Plain text, no markdown tables.`;

const TOOLS = [
  { name: "overview", description: "The Big Three's total assets under management, 13F totals, top 25 holdings and last quarter's biggest buys and sells, for one view: big3 (combined), blackrock, vanguard or statestreet.",
    input_schema: { type: "object", properties: { view: { type: "string", enum: ["big3", "blackrock", "vanguard", "statestreet"] } }, required: ["view"], additionalProperties: false }, strict: true },
  { name: "company", description: "Everything Trintel has on one US-listed company by ticker: the Big Three's holdings by manager with last quarter's change and passive/active label, stake, sector, insider buying and selling (90 days), famous investors holding it, State Street's daily SPDR trades, and its latest proxy votes.",
    input_schema: { type: "object", properties: { ticker: { type: "string", description: "Ticker, e.g. AAPL, BRK.B, TEVA" } }, required: ["ticker"], additionalProperties: false }, strict: true },
  { name: "find_company", description: "Find tickers by company name or part of it (returns up to 10 matches). Use when the user names a company instead of giving its ticker.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false }, strict: true },
  { name: "famous_investors", description: "Famous investors and activists (Berkshire, Pershing Square, Icahn, Elliott, Bridgewater, ARK, Citadel and others): each one's largest holdings and last quarter's buys and sells, what several of them bought together, and activists' recent 13D stakes.",
    input_schema: { type: "object", properties: {}, additionalProperties: false }, strict: true },
  { name: "signals", description: "Trintel's current signals (bought above index flows, famous-investor consensus, new activist stakes, insider buying, emerging small caps) and each signal type's track record since issued.",
    input_schema: { type: "object", properties: {}, additionalProperties: false }, strict: true },
  { name: "proxy_votes", description: "How the Big Three voted at shareholder meetings (from Form N-PX): how often each voted against management, support for shareholder proposals, and contested votes.",
    input_schema: { type: "object", properties: {}, additionalProperties: false }, strict: true },
  { name: "israel", description: "Israeli companies listed in the US: price, how much the Big Three hold, stake, and the dollar-shekel rate.",
    input_schema: { type: "object", properties: {}, additionalProperties: false }, strict: true },
  { name: "spdr_daily", description: "State Street's SPDR ETFs day by day: the latest day's biggest net buys and sells across the funds and each fund's money in or out.",
    input_schema: { type: "object", properties: {}, additionalProperties: false }, strict: true },
];

async function getJSON(site, path) {
  const r = await fetch(site + "data/ask/" + path, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!r.ok) return null;
  return r.json();
}

async function runTool(site, name, input, cache) {
  if (!cache.index && name !== "company") cache.index = await getJSON(site, "index.json");
  const ix = cache.index;
  if (name === "company") {
    const t = String(input.ticker || "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
    const co = t && (await getJSON(site, `co/${t}.json`));
    return co || { error: `No Big Three position of $50M or more in ${t}, or unknown ticker. Try find_company.` };
  }
  if (!ix) return { error: "Data unavailable right now." };
  if (name === "overview") {
    const v = ix.views[input.view] || ix.views.big3;
    return { asOf: ix.asOf, aum: input.view === "big3" ? ix.aum : { [input.view]: ix.aum && ix.aum[input.view] }, view: input.view,
      fields: { top: "ticker, name, value, stake, qoqShares, qoqNetFlow, passiveOrActive", moves: "ticker, name, netFlow, sharesChange, status, passiveOrActive" }, ...v };
  }
  if (name === "find_company") {
    const q = String(input.query || "").toLowerCase();
    return ix.names.filter(([t, n]) => t.toLowerCase() === q || n.toLowerCase().includes(q)).slice(0, 10);
  }
  if (name === "famous_investors") return { fields: "top: ticker, name, value, pctOfBook; buys/sells: ticker, name, netFlow, status", managers: ix.famous, consensus: ix.consensus, activist13d: ix.activist13d };
  if (name === "signals") return ix.signals;
  if (name === "proxy_votes") return ix.votes;
  if (name === "israel") return { fields: "ticker, name, field, priceUsd, big3ValueUsd, big3Stake", usdils: ix.usdils, companies: ix.israel };
  if (name === "spdr_daily") return { fields: "stocks: ticker, name, netUsd, notFromFlowsUsd; funds: fund, date, flowUsd, flowPct", ...ix.spdrDaily };
  return { error: "unknown tool" };
}

/** Daily limits: per visitor (hashed IP) and for the whole site. Returns an error string or null. */
async function overLimit(env, request) {
  const day = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(day + ip));
  const who = [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  const kU = `ask:${day}:${who}`, kT = `ask:${day}:total`;
  const [u, t] = await Promise.all([env.PUSH.get(kU), env.PUSH.get(kT)]);
  if (Number(u || 0) >= Number(env.ASK_DAILY_PER_USER || PER_USER)) return "daily_user";
  if (Number(t || 0) >= Number(env.ASK_DAILY_TOTAL || TOTAL)) return "daily_total";
  await Promise.all([env.PUSH.put(kU, String(Number(u || 0) + 1), { expirationTtl: 172800 }), env.PUSH.put(kT, String(Number(t || 0) + 1), { expirationTtl: 172800 })]);
  return null;
}

export async function ask(request, env, body) {
  if (!env.ANTHROPIC_API_KEY) return { status: 503, body: { error: "not_configured" } };
  const question = String(body.question || "").trim().slice(0, 600);
  if (!question) return { status: 400, body: { error: "empty" } };
  const limit = await overLimit(env, request);
  if (limit) return { status: 429, body: { error: limit } };
  const site = env.SITE_URL.replace(/\/?$/, "/");
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const history = (Array.isArray(body.history) ? body.history : []).slice(-4)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  const messages = [...history, { role: "user", content: question }];
  const cache = {};
  const tickers = new Set();
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      cache_control: { type: "ephemeral" },
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });
    if (response.stop_reason === "refusal") return { status: 200, body: { answer: null, error: "refused" } };
    if (response.stop_reason !== "tool_use") {
      const answer = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      return { status: 200, body: { answer, tickers: [...tickers] } };
    }
    messages.push({ role: "assistant", content: response.content });
    const calls = response.content.filter((b) => b.type === "tool_use");
    const results = await Promise.all(calls.map(async (c) => {
      if (c.name === "company" && c.input && c.input.ticker) tickers.add(String(c.input.ticker).toUpperCase());
      let out;
      try { out = await runTool(site, c.name, c.input || {}, cache); } catch (e) { out = { error: "lookup failed" }; }
      return { type: "tool_result", tool_use_id: c.id, content: JSON.stringify(out).slice(0, 60000) };
    }));
    messages.push({ role: "user", content: results });
  }
  return { status: 200, body: { answer: null, error: "too_long" } };
}
