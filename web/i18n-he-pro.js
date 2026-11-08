/* Hebrew for the pro pages (pro.js): added to the dictionary and patterns of i18n-he.js. */
(function () {
  "use strict";
  const I = window.MRFINK_I18N;
  if (!I) return;
  const N = "([+\\-−]?\\$?[+\\-−]?\\d[\\d,]*(?:\\.\\d+)?(?:[KMBT]|%)?)";
  const D = "((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{1,2}, \\d{4})";
  const Q = "(Q[1-4] (?:\\d{4}|’\\d\\d))";
  const X = "(.+?)";
  const T = "([A-Z][A-Z0-9.\\-]{0,9}(?: / [A-Z][A-Z0-9.\\-]{0,9})*)";
  const P = (src, fn) => I.patterns.unshift([new RegExp("^" + src.replace(/\{N\}/g, N).replace(/\{D\}/g, D).replace(/\{Q\}/g, Q).replace(/\{X\}/g, X).replace(/\{T\}/g, T) + "$"), fn]);

  Object.assign(I.dict, {
    // daily SPDR trades
    "Daily": "יומי",
    "SPDR trades": "מסחר SPDR",
    "Daily trades: State Street’s SPDR ETFs": "מסחר יומי: תעודות הסל SPDR של סטייט סטריט",
    "From the holdings file each SPDR fund publishes every business day.": "מקובץ האחזקות שכל קרן SPDR מפרסמת בכל יום מסחר.",
    "Biggest buys and sells, all SPDR funds together": "הקניות והמכירות הגדולות, כל קרנות SPDR יחד",
    "Company": "חברה",
    "Bought or sold": "קנו או מכרו",
    "Not from money flows": "לא בגלל כסף שנכנס או יצא",
    "Mostly": "בעיקר",
    "Change in the fund’s mix": "שינוי בהרכב הקרן",
    "Money in or out of the funds": "כסף שנכנס לקרנות או יצא מהן",
    "Changes in the funds’ mix": "שינויים בהרכב הקרנות",
    "Additions, removals and weight changes, after taking out money coming in or going out": "הוספות, הוצאות ושינויי משקל, אחרי שמנטרלים כסף שנכנס או יצא",
    "Fund": "קרן",
    "Value": "שווי",
    "What changed": "מה השתנה",
    "Added to the fund": "נוספה לקרן",
    "Removed from the fund": "הוצאה מהקרן",
    "Weight changed": "המשקל השתנה",
    "The funds": "הקרנות",
    "Money in or out each business day (bars: last 20 days)": "כסף שנכנס או יצא בכל יום מסחר (העמודות: 20 הימים האחרונים)",
    "Size": "גודל",
    "Latest day": "היום האחרון",
    "Money in or out": "כסף נכנס או יוצא",
    "Of the fund": "מהקרן",
    "Last 20 days": "20 הימים האחרונים",
    "State Street’s SPDR funds, day by day": "קרנות SPDR של סטייט סטריט, יום אחרי יום",
    "All daily trades": "כל המסחר היומי",
    "Day": "יום",
    "Daily trades could not be loaded.": "לא הצלחנו לטעון את המסחר היומי.",
    // passive or active
    "Passive or active": "פסיבי או אקטיבי",
    "With the flows": "פסיבי, עם הזרימה",
    "Above the flows": "מעל הזרימה",
    "Below the flows": "מתחת לזרימה",
  });

  P("What {N} SPDR funds bought and sold on {D}, from the holdings file each fund publishes every business day\\.", (m, v) =>
    `מה ${v(m[1])} קרנות SPDR קנו ומכרו ב-${v(m[2])}, מקובץ האחזקות שכל קרן מפרסמת בכל יום מסחר.`);
  P("net money in or out of these funds on {D}", (m, v) => `כסף נטו שנכנס לקרנות האלה או יצא מהן ב-${v(m[1])}`);
  P("Net shares bought or sold on {D}, valued at that day’s price", (m, v) => `מניות שנקנו או נמכרו נטו ב-${v(m[1])}, לפי המחיר באותו יום`);
  P("No change in any fund’s mix on {D}: every trade followed money in or out\\.", (m, v) => `ב-${v(m[1])} לא השתנה ההרכב של אף קרן: כל המסחר נבע מכסף שנכנס או יצא.`);
  P("The holdings of {N} SPDR funds are stored \\(files of {D}\\)\\. The first day-to-day comparison appears when the next business day’s files come out\\.", (m, v) =>
    `האחזקות של ${v(m[1])} קרנות SPDR נשמרו (קבצים מ-${v(m[2])}). ההשוואה הראשונה בין ימים תופיע כשיצאו הקבצים של יום המסחר הבא.`);
  P("Moved with the money flowing in or out of its index funds: shares changed about as much as across the whole book \\({N}\\)", (m, v) =>
    `זז יחד עם הכסף שנכנס לקרנות המחקות או יצא מהן: מספר המניות השתנה בערך כמו בכל התיק (${v(m[1])})`);
  P("Shares changed {N} points (more|less) than across the whole book \\({N}\\): an index weight change or an active decision", (m, v) =>
    `מספר המניות השתנה ב-${v(m[1])} נקודות ${m[2] === "more" ? "יותר" : "פחות"} מאשר בכל התיק (${v(m[3])}): שינוי משקל במדד או החלטה אקטיבית`);
  P("Loading {X}…", (m) => `טוען…`);
  P("Money flows: an ETF that takes in money buys more of everything it holds in the same proportion, so the share count of most holdings moves by the same ratio\\. Trintel takes that ratio as the day’s flow; what moves differently is a change in the fund’s mix \\(index additions and removals, rebalances, corporate actions\\)\\. iShares \\(BlackRock\\) and Vanguard do not publish a daily holdings file that can be downloaded, so their funds are tracked monthly from N-PORT filings on the ETFs page\\. Source: State Street, checked {X}\\.", (m, v) =>
    `כסף נכנס ויוצא: תעודת סל שמקבלת כסף קונה עוד מכל מה שהיא מחזיקה באותו יחס, אז מספר המניות של רוב האחזקות זז באותו יחס. Trintel מתייחס ליחס הזה ככסף שנכנס או יצא באותו יום; מה שזז אחרת הוא שינוי בהרכב הקרן (הוספות והוצאות מהמדד, איזון מחדש, אירועים תאגידיים). iShares (בלקרוק) וואנגארד לא מפרסמות קובץ אחזקות יומי שאפשר להוריד, אז הקרנות שלהן מתעדכנות פעם בחודש מדוחות N-PORT בעמוד תעודות הסל. מקור: סטייט סטריט, נבדק ${v(m[1])}.`);
})();
