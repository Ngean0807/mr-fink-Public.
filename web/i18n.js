/* Mr. Fink: Hebrew / English language switch.
 *
 * English is the site's own text and is never changed. In Hebrew mode this file translates what
 * the app renders, as it appears on screen (text, tooltips, placeholders), and turns the page
 * right to left. Data, numbers, links, notifications and stored settings are untouched: only the
 * words a person reads are replaced. Company, fund and person names stay as filed, so a security
 * can be found at a broker exactly as written.
 */
(function () {
  "use strict";
  const KEY = "mrfink.lang";
  let lang = "en";
  try { lang = localStorage.getItem(KEY) === "he" ? "he" : "en"; } catch (e) { /* storage unavailable */ }
  window.MRFINK_LANG = lang;

  // ---------- the switch ----------
  function addToggle() {
    const bar = document.querySelector(".top-actions");
    if (!bar || document.getElementById("lang")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.id = "lang";
    b.className = "lang";
    b.setAttribute("translate", "no");
    b.textContent = lang === "he" ? "EN" : "עב";
    b.title = lang === "he" ? "English" : "עברית";
    b.setAttribute("aria-label", lang === "he" ? "Switch to English" : "החלפה לעברית");
    b.lang = lang === "he" ? "en" : "he";
    b.addEventListener("click", () => {
      try { localStorage.setItem(KEY, lang === "he" ? "en" : "he"); } catch (e) { /* storage unavailable */ }
      location.reload();
    });
    bar.insertBefore(b, bar.firstChild);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addToggle);
  else addToggle();
  if (lang !== "he") return;

  document.documentElement.lang = "he";
  document.documentElement.dir = "rtl";
  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap";
  document.head.appendChild(font);

  const I = window.MRFINK_I18N;  // dictionary and patterns (i18n-he.js)
  const LRI = "\u2066", RLI = "\u2067", FSI = "\u2068", PDI = "\u2069";
  const SVGNS = "http://www.w3.org/2000/svg";

  // ---------- value formatters ----------
  const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  const MON_HE = ["", "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];
  const UNIT = { K: "אלף", M: "מיליון", B: "מיליארד", T: "טריליון" };
  const iso = (s) => LRI + s + PDI;
  /** "$389B" -> "$389 מיליארד", "+17.4%" stays, isolated left to right so signs stay in place. */
  function num(s) {
    const m = /^([+\-−]?\$?[+\-−]?)(\d[\d,]*(?:\.\d+)?)([KMBT])$/.exec(s);
    if (m) return iso(m[1] + m[2]) + " " + UNIT[m[3]];
    return iso(s);
  }
  /** "Jun 30, 2026" -> "30.6.2026"; "Jun 30" -> "30.6"; "Jan ’24" -> "ינו׳ 24" */
  function date(s) {
    let m = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4})$/.exec(s);
    if (m) return iso(`${m[2]}.${MON[m[1]]}.${m[3]}`);
    m = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})$/.exec(s);
    if (m) return iso(`${m[2]}.${MON[m[1]]}`);
    m = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ’(\d\d)$/.exec(s);
    if (m) return `${MON_HE[MON[m[1]]]} ${m[2]}`;
    return null;
  }
  /** "Q2 2026" -> "רבעון 2 2026", "Q1 ’17" -> "רבעון 1 ’17" */
  function quarter(s) {
    const m = /^Q([1-4]) (\d{4}|’\d\d)$/.exec(s);
    return m ? `רבעון ${m[1]} ${iso(m[2])}` : null;
  }
  /** "4:00 PM" -> "16:00" */
  function clock(s) {
    const m = /^(\d{1,2}):(\d\d) (AM|PM)$/.exec(s);
    if (!m) return null;
    let h = +m[1] % 12;
    if (m[3] === "PM") h += 12;
    return iso(`${h}:${m[2]}`);
  }
  const MGR = { BlackRock: "בלקרוק", Vanguard: "ואנגארד", "State Street": "סטייט סטריט", "Big Three": "שלוש הגדולות" };
  const NUMRE = /^[+\-−]?\$?[+\-−]?\d[\d,]*(?:\.\d+)?(?:[KMBT]|%|×| pp| pts)?$/;

  /** Any one value inside a sentence: a number, date, quarter, manager or a phrase in the dictionary.
   *  Anything else (a company, fund or person name, a ticker) is kept as written. */
  function v(s) {
    if (s == null) return "";
    s = String(s);
    if (NUMRE.test(s)) {
      const pp = / (pp|pts)$/.exec(s);
      if (pp) return num(s.slice(0, -pp[0].length)) + " נק׳";
      return num(s);
    }
    const d = date(s) || quarter(s) || clock(s);
    if (d) return d;
    if (MGR[s]) return MGR[s];
    const t = tr(s, true);
    if (t != null) return t;
    return FSI + s + PDI;
  }

  // ---------- translation of one string ----------
  const cache = new Map();
  function tr(s, inner) {
    if (cache.has(s)) return cache.get(s);
    let out = null;
    if (Object.prototype.hasOwnProperty.call(I.dict, s)) out = I.dict[s];
    else if (NUMRE.test(s)) out = /[KMBT]$|pp$|pts$/.test(s) ? v(s) : null;
    else out = date(s) || quarter(s) || clock(s) || (MGR[s] && !inner ? MGR[s] : null);
    if (out == null) {
      for (const [re, fn] of I.patterns) {
        const m = re.exec(s);
        if (m) { out = fn(m, v, s); if (out != null) break; }
      }
    }
    if (out == null && s.includes(" · ")) {
      // "A · B · C": translate each part; names and tickers stay as they are.
      const parts = s.split(" · ");
      const done = parts.map((p) => (p === "" ? "" : tr(p, true) ?? (I.keep(p) ? FSI + p + PDI : null)));
      if (done.every((x) => x != null) && done.some((x, i) => x !== FSI + parts[i] + PDI)) out = done.join(" · ");
    }
    if (cache.size > 20000) cache.clear();
    cache.set(s, out);
    return out;
  }
  window.MRFINK_TR = (s) => tr(s);  // for the coverage check

  // ---------- applying it to the page ----------
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT)$/;
  const seen = new WeakMap();
  const LATIN = /[A-Za-z]/;
  function doText(n) {
    const val = n.nodeValue;
    if (!val || seen.get(n) === val || !LATIN.test(val)) return;
    const p = n.parentElement;
    if (!p || SKIP.test(p.tagName) || p.closest("[translate=no]")) { seen.set(n, val); return; }
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(val);
    const core = m[2].replace(/\s+/g, " ");
    let t = null;
    // A few words read differently depending on where they stand (I.ctx: [selector, {English: Hebrew}]).
    for (const [sel, map] of I.ctx || []) if (map[core] && p.closest(sel)) { t = map[core]; break; }
    if (t == null && core) t = tr(core);
    // Charts are drawn left to right: a Hebrew label inside one is kept together as a right-to-left unit.
    if (t != null && t !== core && p.namespaceURI === SVGNS && /[\u0590-\u05FF]/.test(t)) t = RLI + t + PDI;
    if (t != null && t !== core) n.nodeValue = m[1] + t + m[3];
    seen.set(n, n.nodeValue);
  }
  const ATTRS = ["title", "placeholder", "aria-label", "alt"];
  function doAttrs(el) {
    if (el.closest && el.closest("[translate=no]")) return;
    for (const a of ATTRS) {
      const val = el.getAttribute(a);
      if (!val || !LATIN.test(val)) continue;
      const t = tr(val.trim().replace(/\s+/g, " "));
      if (t != null && t !== val) el.setAttribute(a, t);
    }
  }
  function doTree(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || SKIP.test(root.tagName)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) doText(n);
    if (root.hasAttribute && ATTRS.some((a) => root.hasAttribute(a))) doAttrs(root);
    root.querySelectorAll("[title],[placeholder],[aria-label],[alt]").forEach(doAttrs);
  }
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") doText(m.target);
      else if (m.type === "attributes") doAttrs(m.target);
      else m.addedNodes.forEach(doTree);
    }
  });
  function start() {
    doTree(document.body);
    if (document.title && LATIN.test(document.title)) { const t = tr(document.title); if (t) document.title = t; }
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
