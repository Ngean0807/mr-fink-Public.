// Offline test of /ask: the Messages API and the site are replaced by stubs, so this checks the
// request the SDK sends (model, fallback beta, tools, caching) and the tool loop, at no cost.
//   cd worker && npm install && node test/ask.test.mjs [path to web/data]
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ask } from "../src/ask.js";

const DATA = process.argv[2] || path.resolve("../web/data");
const calls = [];
let turn = 0;
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.startsWith("https://api.anthropic.com/")) {
    const headers = new Headers(init.headers);
    calls.push({ url, beta: headers.get("anthropic-beta"), body: JSON.parse(init.body) });
    turn++;
    const msg = turn === 1
      ? { id: "m1", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "tool_use", stop_sequence: null,
          content: [{ type: "tool_use", id: "t1", name: "company", input: { ticker: "aapl" } }], usage: { input_tokens: 10, output_tokens: 5 } }
      : { id: "m2", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_sequence: null,
          content: [{ type: "text", text: "שלוש הגדולות מחזיקות 22.2% מ-AAPL." }], usage: { input_tokens: 10, output_tokens: 5 } };
    return new Response(JSON.stringify(msg), { status: 200, headers: { "content-type": "application/json", "request-id": "req_test" } });
  }
  const m = url.match(/\/data\/ask\/(.+)$/);
  if (m) {
    const f = path.join(DATA, "ask", m[1]);
    return fs.existsSync(f) ? new Response(fs.readFileSync(f), { status: 200 }) : new Response("not found", { status: 404 });
  }
  throw new Error("unexpected fetch " + url);
};

const kv = new Map();
const env = {
  ANTHROPIC_API_KEY: "test-key", SITE_URL: "https://example.test/site/",
  PUSH: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } },
};
const request = new Request("https://w.test/ask", { method: "POST", headers: { "CF-Connecting-IP": "1.2.3.4" } });

const r = await ask(request, env, { question: "כמה מאפל מחזיקות שלוש הגדולות?", lang: "he" });
assert.equal(r.status, 200);
assert.match(r.body.answer, /22\.2%/);
assert.deepEqual(r.body.tickers, ["AAPL"]);
assert.equal(calls.length, 2);
const first = calls[0];
assert.equal(first.body.model, "claude-opus-5-5");
assert.equal(first.body.fallbacks, "default");
assert.match(first.beta || "", /server-side-fallback-2026-07-01/);
assert.deepEqual(first.body.output_config, { effort: "low" });
assert.deepEqual(first.body.cache_control, { type: "ephemeral" });
assert.ok(first.body.tools.every((t) => t.strict === true && t.input_schema.additionalProperties === false));
assert.equal(first.body.tool_choice, undefined);
// the second request carries the tool result: the company file for AAPL
const second = calls[1].body.messages;
const result = second[second.length - 1].content[0];
assert.equal(result.type, "tool_result");
assert.equal(JSON.parse(result.content).ticker, "AAPL");

// limits: the 16th question of the day from the same visitor is refused
for (let i = 0; i < 14; i++) { turn = 1; await ask(request, env, { question: "q" }); }
const over = await ask(request, env, { question: "q" });
assert.equal(over.status, 429);
// no key: a clear 503
assert.equal((await ask(request, { ...env, ANTHROPIC_API_KEY: "" }, { question: "q" })).status, 503);
console.log("ask: ok");
