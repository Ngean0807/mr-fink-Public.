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
  const HE_M = { BlackRock: "בלקרוק", Vanguard: "ואנגארד", "State Street": "סטייט סטריט" };
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
    // portfolio X-ray
    "Portfolio X-ray": "רנטגן לתיק",
    "My portfolio": "התיק שלי",
    "X-ray": "רנטגן",
    "Who owns what you own: the Big Three’s stake in each of your companies, what they did last quarter and whether it was passive. Your holdings stay in this browser.": "מי מחזיק את מה שאתם מחזיקים: החלק של שלוש הגדולות בכל אחת מהחברות שלכם, מה הן עשו ברבעון האחרון והאם זה היה פסיבי. האחזקות שלכם נשמרות רק בדפדפן הזה.",
    "Your holdings": "האחזקות שלכם",
    "one per line: ticker and number of shares, or paste a broker’s CSV export": "אחת בכל שורה: סימול ומספר מניות, או הדביקו קובץ CSV שייצאתם מהברוקר",
    "Update": "עדכון",
    "Import a CSV file": "ייבוא קובץ CSV",
    "Follow all for alerts": "מעקב אחרי כולן לקבלת התראות",
    "Clear": "ניקוי",
    "Add your holdings above to see who owns them.": "הוסיפו את האחזקות שלכם למעלה כדי לראות מי מחזיק בהן.",
    "at the latest price": "לפי המחיר האחרון",
    "Big Three stake, average": "החלק של שלוש הגדולות, בממוצע",
    "weighted by your holdings": "משוקלל לפי האחזקות שלכם",
    "of the companies you hold": "בחברות שאתם מחזיקים",
    "Crowded holdings": "אחזקות צפופות",
    "the Big Three own 25% or more": "שלוש הגדולות מחזיקות 25% או יותר",
    "Active moves last quarter": "מהלכים אקטיביים ברבעון האחרון",
    "bought or sold apart from index flows": "קנו או מכרו מעבר לזרימה למדדים",
    "Shares": "מניות",
    "Big Three stake": "החלק של שלוש הגדולות",
    "What it means": "מה זה אומר",
    "Not among the Big Three’s positions of $50M or more": "לא בין האחזקות של שלוש הגדולות ששוות 50 מיליון דולר ומעלה",
    "Last quarter’s changes followed index-fund flows: passive": "השינויים ברבעון האחרון היו לפי הזרימה לקרנות המחקות: פסיבי",
    "Already following every company Trintel covers": "כבר במעקב אחרי כל החברות ש-Trintel מכסה",
    // famous investors
    "Famous investors": "משקיעים מפורסמים",
    "& activists": "ואקטיביסטים",
    "Famous investors and activists": "משקיעים מפורסמים ואקטיביסטים",
    "What several of them bought": "מה כמה מהם קנו",
    "Companies at least two of these managers added to in their latest 13F": "חברות שלפחות שניים מהמנהלים האלה הגדילו בדוח ה-13F האחרון",
    "Managers buying": "מנהלים שקנו",
    "Bought together": "קנו יחד",
    "Who": "מי",
    "Activist stakes (Schedule 13D)": "אחזקות של אקטיביסטים (דוח 13D)",
    "A 13D is filed within days of crossing 5% of a company with intent to influence it; an amendment means the stake or the plan changed": "דוח 13D מוגש תוך ימים ממעבר של 5% בחברה, כשיש כוונה להשפיע עליה; תיקון אומר שהאחזקה או התוכנית השתנו",
    "Amended its stake": "עדכנו את האחזקה",
    "New 5%+ stake": "אחזקה חדשה של 5% ומעלה",
    "The managers": "המנהלים",
    "Manager": "מנהל",
    "Style": "סגנון",
    "13F book": "תיק ה-13F",
    "Quarter": "רבעון",
    "Largest holding": "האחזקה הגדולה",
    "Biggest buy": "הקנייה הגדולה",
    "Biggest sells": "המכירות הגדולות",
    "Largest holdings": "האחזקות הגדולות",
    "Bought": "קנו",
    "Sold": "מכרו",
    "Change in shares": "שינוי במניות",
    "% of book": "% מהתיק",
    "% of its book": "% מהתיק שלו",
    "Last quarter": "ברבעון האחרון",
    "None": "אין",
    "All famous investors": "כל המשקיעים המפורסמים",
    "Famous investors could not be loaded.": "לא הצלחנו לטעון את המשקיעים המפורסמים.",
    "From each manager’s latest Form 13F on SEC EDGAR, compared with the quarter before. Activist 13D filings from the managers’ own SEC filing history, last 12 months. Not investment advice.": "מדוח ה-13F האחרון של כל מנהל ב-SEC EDGAR, בהשוואה לרבעון שלפניו. דוחות 13D של אקטיביסטים מתוך היסטוריית הדיווחים של המנהלים עצמם, 12 החודשים האחרונים. לא ייעוץ השקעות.",
    "Value": "ערך",
    "Activist": "אקטיביסט",
    "Macro": "מאקרו",
    "Quality growth": "צמיחה איכותית",
    "Long term": "טווח ארוך",
    "Innovation growth": "צמיחה וחדשנות",
    "Tech growth": "צמיחת טכנולוגיה",
    "Long/short": "לונג/שורט",
    "Multi-strategy": "רב-אסטרטגי",
    "Quant": "כמותי",
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
  P("Crowded: the Big Three own {N} of the company", (m, v) => `צפופה: שלוש הגדולות מחזיקות ${v(m[1])} מהחברה`);
  P("(BlackRock|Vanguard|State Street) opened a new position", (m) => `${HE_M[m[1]]} פתחה פוזיציה חדשה`);
  P("(BlackRock|Vanguard|State Street) bought more than its index-fund flows \\({N}\\)", (m, v) => `${HE_M[m[1]]} קנתה יותר מהזרימה לקרנות המחקות שלה (${v(m[2])})`);
  P("(BlackRock|Vanguard|State Street) sold \\({N}\\)", (m, v) => `${HE_M[m[1]]} מכרה (${v(m[2])})`);
  P("(BlackRock|Vanguard|State Street) added less than its index-fund flows \\({N}\\)", (m, v) => `${HE_M[m[1]]} הוסיפה פחות מהזרימה לקרנות המחקות שלה (${v(m[2])})`);
  P("Last quarter, by manager", () => "ברבעון האחרון, לפי מנהלת");
  P("{N} holdings saved in this browser", (m, v) => `${v(m[1])} אחזקות נשמרו בדפדפן הזה`);
  P("{N} holdings imported", (m, v) => `${v(m[1])} אחזקות יובאו`);
  P("{N} companies added to your watchlist", (m, v) => `${v(m[1])} חברות נוספו לרשימת המעקב`);
  P("From the managers’ 13F filings for {Q}\\. Stake = shares the three hold ÷ the shares outstanding the company last reported\\. Passive or active compares each change in shares with the same manager’s change across its whole book \\(its index funds’ flows\\)\\. Not investment advice\\.", (m, v) =>
    `מדוחות ה-13F של המנהלות ל-${v(m[1])}. החלק = המניות ששלושתן מחזיקות ÷ מספר המניות האחרון שהחברה דיווחה. פסיבי או אקטיבי משווה כל שינוי במספר המניות לשינוי של אותה מנהלת בכל התיק שלה (הזרימה לקרנות המחקות שלה). לא ייעוץ השקעות.`);
  P("{N} well-known managers whose moves are decisions, not index flows: what they hold, what they bought and sold last quarter, and the stakes activists take to push for change\\.", (m, v) =>
    `${v(m[1])} מנהלים מוכרים שהמהלכים שלהם הם החלטות, לא זרימה למדדים: מה הם מחזיקים, מה קנו ומכרו ברבעון האחרון, והאחזקות שאקטיביסטים לוקחים כדי לדחוף לשינוי.`);
  P("Biggest buys in {Q}", (m, v) => `הקניות הגדולות ב${v(m[1])}`);
  P("in {N} US-listed positions, 13F for {Q} \\(filed {D}\\)", (m, v) => `ב-${v(m[1])} אחזקות שנסחרות בארה״ב, דוח 13F ל${v(m[2])} (הוגש ב-${v(m[3])})`);
  P("From (.+)’s Form 13F on SEC EDGAR \\(US-listed stocks and options are reported; options are left out\\), compared with {Q}\\. A 13F is filed up to 45 days after the quarter ends\\.", (m, v) =>
    `מדוח ה-13F של ${m[1]} ב-SEC EDGAR (מדווחים מניות ואופציות שנסחרות בארה״ב; האופציות לא נכללות כאן), בהשוואה ל${v(m[2])}. דוח 13F מוגש עד 45 יום אחרי סוף הרבעון.`);
  P("(.+): (13D amendment|new 13D stake), {D}", (m, v) => `${m[1]}: ${m[2] === "13D amendment" ? "עדכון 13D" : "אחזקת 13D חדשה"}, ${v(m[3])}`);
  P("Loading {X}…", (m) => `טוען…`);
  P("Money flows: an ETF that takes in money buys more of everything it holds in the same proportion, so the share count of most holdings moves by the same ratio\\. Trintel takes that ratio as the day’s flow; what moves differently is a change in the fund’s mix \\(index additions and removals, rebalances, corporate actions\\)\\. iShares \\(BlackRock\\) and Vanguard do not publish a daily holdings file that can be downloaded, so their funds are tracked monthly from N-PORT filings on the ETFs page\\. Source: State Street, checked {X}\\.", (m, v) =>
    `כסף נכנס ויוצא: תעודת סל שמקבלת כסף קונה עוד מכל מה שהיא מחזיקה באותו יחס, אז מספר המניות של רוב האחזקות זז באותו יחס. Trintel מתייחס ליחס הזה ככסף שנכנס או יצא באותו יום; מה שזז אחרת הוא שינוי בהרכב הקרן (הוספות והוצאות מהמדד, איזון מחדש, אירועים תאגידיים). iShares (בלקרוק) וואנגארד לא מפרסמות קובץ אחזקות יומי שאפשר להוריד, אז הקרנות שלהן מתעדכנות פעם בחודש מדוחות N-PORT בעמוד תעודות הסל. מקור: סטייט סטריט, נבדק ${v(m[1])}.`);
})();
