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
    // Israel
    "Israel": "ישראל",
    "on Wall Street": "בוול סטריט",
    "Israeli companies on Wall Street": "חברות ישראליות בוול סטריט",
    "held by the Big Three in these companies": "ששלוש הגדולות מחזיקות בחברות האלה",
    "$ Dollars": "$ דולרים",
    "₪ Shekels": "₪ שקלים",
    "Field": "תחום",
    "Big Three hold": "שלוש הגדולות מחזיקות",
    "Stake": "חלק",
    "Below $50M held": "מתחת ל-50 מיליון דולר",
    "Ownership data is being added": "נתוני האחזקות בתהליך הוספה",
    "The Israeli companies could not be loaded.": "לא הצלחנו לטעון את החברות הישראליות.",
    "Pharma": "תרופות",
    "Cyber security": "סייבר",
    "Software": "תוכנה",
    "Autonomous driving": "נהיגה אוטונומית",
    "Defense": "ביטחון",
    "Chemicals": "כימיקלים",
    "Semiconductors": "שבבים",
    "E-commerce": "מסחר מקוון",
    "Solar energy": "אנרגיה סולארית",
    "Internet": "אינטרנט",
    "Medical devices": "מכשור רפואי",
    "Insurance": "ביטוח",
    "Shipping": "ספנות",
    "Digital forensics": "פורנזיקה דיגיטלית",
    "Renewable energy": "אנרגיה מתחדשת",
    "Gaming": "משחקים",
    "Communications": "תקשורת",
    "Telematics": "טלמטיקה",
    "Advertising": "פרסום",
    "Printing technology": "טכנולוגיית הדפסה",
    "Electric vehicles": "רכב חשמלי",
    "Networking": "תקשורת נתונים",
    // my day
    "My day": "היום שלי",
    "What changed today for the companies you follow or own, in one place, with what it means.": "מה השתנה היום בחברות שאתם עוקבים אחריהן או מחזיקים, במקום אחד, עם הסבר מה זה אומר.",
    "What happened": "מה קרה",
    "SEC filings, insiders, daily fund trades, activists, famous investors, news": "דיווחים ל-SEC, בעלי עניין, מסחר יומי של קרנות, אקטיביסטים, משקיעים מפורסמים, חדשות",
    "Your companies at a glance": "החברות שלכם במבט אחד",
    "Last quarter, from the Big Three’s 13F filings": "הרבעון האחרון, מדוחות ה-13F של שלוש הגדולות",
    "moving 3% or more today": "זזות היום ב-3% או יותר",
    "Nothing new for your companies yet.": "עדיין אין חדש בחברות שלכם.",
    "SEC filing": "דיווח ל-SEC",
    "Insider": "בעל עניין",
    "Daily trades": "מסחר יומי",
    "Famous investor": "משקיע מפורסם",
    "News": "חדשות",
    "pre-arranged plan (10b5-1)": "תוכנית מכירה מתוכננת מראש (10b5-1)",
    "Mostly a change in the funds’ mix, not money flows": "בעיקר שינוי בהרכב הקרנות, לא כסף שנכנס או יצא",
    "Mostly money flowing in or out of the funds": "בעיקר כסף שנכנס לקרנות או יצא מהן",
    // signals
    "Signals": "סיגנלים",
    "with track record": "עם תוצאות",
    "Signals, with their track record": "סיגנלים, עם התוצאות שלהם",
    "Five signals from the filings. Each one is recorded on the day it first appears, at that day’s price, and scored against the S&P 500 from then on. Nothing is back-filled or removed.": "חמישה סיגנלים מתוך הדיווחים. כל סיגנל נרשם ביום שהוא מופיע לראשונה, במחיר של אותו יום, ומושווה למדד S&P 500 מאז. שום דבר לא נוסף בדיעבד ושום דבר לא נמחק.",
    "Track record so far": "התוצאות עד עכשיו",
    "Return since each signal was issued, against SPY over the same days": "התשואה מאז שכל סיגנל ניתן, מול SPY באותם ימים",
    "Signal": "סיגנל",
    "Tracked since": "במעקב מאז",
    "Average return": "תשואה ממוצעת",
    "Versus the S&P 500": "מול S&P 500",
    "Beat the S&P 500": "ניצחו את S&P 500",
    "Why": "למה",
    "Since": "מאז",
    "Return since": "תשואה מאז",
    "None right now.": "אין כרגע.",
    "Signals could not be loaded.": "לא הצלחנו לטעון את הסיגנלים.",
    "Bought above index flows": "קנו מעבר לזרימה למדדים",
    "The Big Three bought clearly more than the money flowing into their index funds": "שלוש הגדולות קנו בבירור יותר מהכסף שנכנס לקרנות המחקות שלהן",
    "Famous investors agree": "משקיעים מפורסמים מסכימים",
    "Three or more famous investors bought it in their latest 13F": "שלושה משקיעים מפורסמים או יותר קנו אותה בדוח ה-13F האחרון",
    "New activist stake": "אחזקה אקטיביסטית חדשה",
    "A new Schedule 13D in the last 30 days: 5%+ with intent to push for change": "דוח 13D חדש ב-30 הימים האחרונים: 5% ומעלה עם כוונה לדחוף לשינוי",
    "Insiders buying": "בעלי עניין קונים",
    "Two or more insiders bought on the open market in the last 90 days": "שניים או יותר מבעלי העניין קנו בשוק הפתוח ב-90 הימים האחרונים",
    "Emerging small caps": "חברות קטנות צומחות",
    "The Emerging screen’s small caps with the largest stake gain over a year": "החברות הקטנות במסך הצומחות שבהן החלק של שלוש הגדולות גדל הכי הרבה בשנה",
    "The full backtest, on the Emerging page": "המבחן ההיסטורי המלא, בעמוד הצומחות",
    // proxy votes
    "Votes": "הצבעות",
    "proxy voting": "באסיפות",
    "How the Big Three vote": "איך שלוש הגדולות מצביעות",
    "Votes cast": "הצבעות",
    "Against management": "נגד ההנהלה",
    "Shareholder proposals": "הצעות של בעלי מניות",
    "Supported": "תמכו",
    "Support for shareholder proposals, by subject": "תמיכה בהצעות של בעלי מניות, לפי נושא",
    "Share of the proposals voted for": "החלק מההצעות שהצביעו בעדן",
    "Subject": "נושא",
    "Where they voted against management": "איפה הן הצביעו נגד ההנהלה",
    "Proposals where at least one of the three went against the board’s position, most agreement first": "הצעות שבהן לפחות אחת משלוש הלכה נגד עמדת הדירקטוריון, קודם אלה שכולן מסכימות עליהן",
    "Proposal": "הצעה",
    "Meeting": "אסיפה",
    "Shareholder proposal": "הצעה של בעלי מניות",
    "Company proposal": "הצעה של החברה",
    "(shareholder proposal)": "(הצעה של בעלי מניות)",
    "For": "בעד",
    "Against": "נגד",
    "Withheld": "נמנעו (דירקטור)",
    "Abstained": "נמנעו",
    "With management": "עם ההנהלה",
    "How the Big Three voted": "איך שלוש הגדולות הצביעו",
    "All proxy votes": "כל ההצבעות",
    "Proxy votes could not be loaded.": "לא הצלחנו לטעון את ההצבעות.",
    "Management backs its own proposals and opposes shareholders’; a vote is against management when it goes the other way (a withheld vote on a director counts as against). Source: the funds’ Form N-PX on SEC EDGAR. Each company page lists all of its votes.": "ההנהלה תומכת בהצעות שלה ומתנגדת להצעות של בעלי המניות; הצבעה נגד ההנהלה היא הצבעה בכיוון ההפוך (הימנעות בבחירת דירקטור נחשבת כנגד). מקור: דוחות N-PX של הקרנות ב-SEC EDGAR. בעמוד של כל חברה מופיעות כל ההצבעות שלה.",
    "Corporate Governance": "ממשל תאגידי",
    "Shareholder Rights And Defenses": "זכויות בעלי מניות והגנות",
    "Environment Or Climate": "סביבה או אקלים",
    "Human Rights Or Human Capital/Workforce": "זכויות אדם או הון אנושי",
    "Other Social Issues": "נושאים חברתיים אחרים",
    "Compensation": "שכר",
    "Diversity, Equity, And Inclusion": "גיוון, שוויון והכללה",
    "Director Elections": "בחירת דירקטורים",
    "Capital Structure": "מבנה הון",
    "Audit-Related": "ביקורת",
    "Section 14A Say-On-Pay Votes": "הצבעה על שכר בכירים",
    "Other": "אחר",
    // data
    "Data": "נתונים",
    "CSV · API": "CSV · API",
    "Data for spreadsheets and apps": "נתונים לגיליונות ולאפליקציות",
    "Everything Trintel shows is published as files you can pull into Google Sheets, Excel or your own code, refreshed with the site.": "כל מה ש-Trintel מציג מתפרסם כקבצים שאפשר למשוך ל-Google Sheets, לאקסל או לקוד שלכם, ומתעדכן יחד עם האתר.",
    "Spreadsheets (CSV)": "גיליונות (CSV)",
    "In Google Sheets, paste the formula into a cell; in Excel use Data, From Web, with the address": "ב-Google Sheets הדביקו את הנוסחה בתא; באקסל השתמשו ב'נתונים', 'מהאינטרנט', עם הכתובת",
    "File": "קובץ",
    "What is in it": "מה יש בו",
    "Google Sheets formula": "נוסחה ל-Google Sheets",
    "JSON API": "JSON API",
    "Plain HTTPS GET, no key, open to any website (CORS)": "בקשת HTTPS GET רגילה, בלי מפתח, פתוחה לכל אתר (CORS)",
    "Address": "כתובת",
    "Copy": "העתקה",
    "Formula copied": "הנוסחה הועתקה",
    "The data comes from public SEC filings and the sources named on each page. The files are updated every few minutes and their format can change; status.json says when they were last checked.": "הנתונים מגיעים מדיווחים פומביים ל-SEC ומהמקורות שמצוינים בכל עמוד. הקבצים מתעדכנים כל כמה דקות והפורמט שלהם יכול להשתנות; status.json מראה מתי הם נבדקו לאחרונה.",
    "Big Three combined: top 50 holdings, stake, last quarter’s change, passive or active": "שלוש הגדולות יחד: 50 האחזקות הגדולות, החלק בחברה, השינוי ברבעון האחרון, פסיבי או אקטיבי",
    "BlackRock’s top 50 holdings": "50 האחזקות הגדולות של בלקרוק",
    "Vanguard’s top 50 holdings": "50 האחזקות הגדולות של ואנגארד",
    "State Street’s top 50 holdings": "50 האחזקות הגדולות של סטייט סטריט",
    "Every Big Three position of $50M or more, by manager": "כל אחזקה של שלוש הגדולות ששווה 50 מיליון דולר ומעלה, לפי מנהלת",
    "Famous investors: holdings, buys and sells": "משקיעים מפורסמים: אחזקות, קניות ומכירות",
    "Activist 13D filings, last 12 months": "דוחות 13D של אקטיביסטים, 12 החודשים האחרונים",
    "SPDR funds’ daily trades by company": "המסחר היומי של קרנות SPDR לפי חברה",
    "SPDR funds: money in and out": "קרנות SPDR: כסף שנכנס ויוצא",
    "Every signal since it was issued, with its return": "כל סיגנל מאז שניתן, עם התשואה שלו",
    "Israeli companies on Wall Street": "חברות ישראליות בוול סטריט",
    "Everything on the main pages: managers, top holdings, company profiles, filings feed": "כל מה שבעמודים הראשיים: המנהלות, האחזקות הגדולות, פרופילי חברות, פיד הדיווחים",
    "Ownership index by ticker": "מדד בעלות לפי סימול",
    "SPDR daily trades": "המסחר היומי של SPDR",
    "Famous investors and activists": "משקיעים מפורסמים ואקטיביסטים",
    "Signals and their ledger": "הסיגנלים והרישום שלהם",
    "Proxy voting summary": "סיכום ההצבעות באסיפות",
    "One company’s proxy votes (any ticker)": "ההצבעות באסיפות של חברה אחת (כל סימול)",
    "Israeli companies": "חברות ישראליות",
    "Latest prices": "המחירים האחרונים",
    "When the data was last checked": "מתי הנתונים נבדקו לאחרונה",
    // weekly digest
    "Weekly digest": "סיכום שבועי",
    "The week’s most important changes, every Friday after the US close (push only)": "השינויים החשובים של השבוע, בכל יום שישי אחרי סגירת המסחר בארה״ב (רק בהתראות שמגיעות גם כשהאתר סגור)",
    "The week in short": "השבוע בקצרה",
    "A quiet week so far.": "שבוע שקט עד עכשיו.",
    "Get it every Friday as a push notification: turn on": "קבלו אותו בכל יום שישי כהתראה: הפעילו את",
    "under the bell.": "תחת הפעמון.",
    "Get it on Telegram": "קבלו אותו בטלגרם",
    "Big Three stake filings (13G/13D)": "דיווחי אחזקה של שלוש הגדולות (13G/13D)",
    "SPDR funds this week": "קרנות SPDR השבוע",
    "Net money in or out:": "כסף נטו שנכנס או יצא:",
    "Buy": "קנייה",
    "Sell": "מכירה",
    "Mostly a change in the funds’ mix": "בעיקר שינוי בהרכב הקרנות",
    "Mostly money flows": "בעיקר כסף שנכנס או יצא",
    "Activists": "אקטיביסטים",
    "Famous investors’ 13F filings": "דוחות 13F של משקיעים מפורסמים",
    "New signals": "סיגנלים חדשים",
    "Best signals so far": "הסיגנלים הטובים עד עכשיו",
    "Key company reports (8-K)": "דיווחים מהותיים של חברות (8-K)",
    "Signal": "סיגנל",
    "The weekly digest could not be loaded.": "לא הצלחנו לטעון את הסיכום השבועי.",
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
  P("{N} Israeli companies listed in the US: how much of each the Big Three hold, what they did last quarter, and which famous investors are in\\.", (m, v) =>
    `${v(m[1])} חברות ישראליות שנסחרות בארה״ב: כמה מכל אחת מחזיקות שלוש הגדולות, מה הן עשו ברבעון האחרון, ואילו משקיעים מפורסמים בפנים.`);
  P("Israeli-founded or Israel-headquartered companies with a US listing\\. Holdings from the Big Three’s 13F filings for {Q}; stake where the company reports its share count to the SEC \\(many Israeli companies file a 20-F and do not\\)\\. Prices from Yahoo Finance; shekel amounts at the latest dollar-shekel rate\\. Not investment advice\\.", (m, v) =>
    `חברות שנוסדו בישראל או שהמטה שלהן בישראל, ונסחרות בארה״ב. האחזקות מדוחות ה-13F של שלוש הגדולות ל${v(m[1])}; החלק מוצג כשהחברה מדווחת ל-SEC על מספר המניות שלה (חברות ישראליות רבות מגישות 20-F ולא מדווחות). המחירים מ-Yahoo Finance; סכומים בשקלים לפי שער הדולר האחרון. לא ייעוץ השקעות.`);
  P("\\$1 = ₪{N}", (m) => `$1 = ₪${m[1]}`);
  P("What changed for the {N} companies you follow or own, newest first, with what it means\\.", (m, v) => `מה השתנה ב-${v(m[1])} החברות שאתם עוקבים אחריהן או מחזיקים, מהחדש לישן, עם הסבר מה זה אומר.`);
  P("Follow companies \\(☆ Follow on any company page\\) or add your holdings in", () => "עקבו אחרי חברות (☆ מעקב בעמוד של כל חברה) או הוסיפו את האחזקות שלכם ב");
  P("and this page fills with what changed for them\\.", () => "והעמוד הזה יתמלא במה שהשתנה בהן.");
  P("{T}: (.+) (bought|sold) {N}", (m, v) => `${m[1]}: ${m[2]} ${m[3] === "bought" ? "קנה" : "מכר"} ב-${v(m[4])}`);
  P("{T}: State Street’s SPDR funds (bought|sold) {N}", (m, v) => `${m[1]}: קרנות SPDR של סטייט סטריט ${m[2] === "bought" ? "קנו" : "מכרו"} ב-${v(m[3])}`);
  P("{T}: (.+) (changed its activist stake|took an activist stake of 5% or more)", (m) => `${m[1]}: ${m[2]} ${m[3].startsWith("changed") ? "עדכנה את האחזקה האקטיביסטית שלה" : "לקחה אחזקה אקטיביסטית של 5% ומעלה"}`);
  P("{T}: (.+) (opened a position|sold out|bought more|sold some) \\(({N})\\)", (m, v) => `${m[1]}: ${m[2]} ${({ "opened a position": "פתחה פוזיציה", "sold out": "מכרה את כל האחזקה", "bought more": "קנתה עוד", "sold some": "מכרה חלק" })[m[3]]} (${v(m[4])})`);
  P("(The record is young: no signal is 30 days old yet, so these numbers say little for now\\. )?Prices from Yahoo Finance, before dividends and costs\\. Past results do not predict future ones; not investment advice\\.", (m) =>
    `${m[1] ? "הרשומה עדיין צעירה: אף סיגנל עוד לא בן 30 יום, אז המספרים האלה אומרים מעט בינתיים. " : ""}המחירים מ-Yahoo Finance, לפני דיבידנדים ועמלות. תוצאות עבר לא מנבאות את העתיד; לא ייעוץ השקעות.`);
  P("The Emerging screen, tested back to 2018:", () => "מסך הצומחות, נבדק אחורה עד 2018:");
  P("bought each quarter once the 13F data was public and held 12 months, it returned {N} a year on average, against {N} for the Russell 2000 \\(IWM\\), and beat it in {N} of {N} quarters\\.", (m, v) =>
    `בקנייה בכל רבעון אחרי שנתוני ה-13F פורסמו והחזקה ל-12 חודשים, התשואה הממוצעת הייתה ${v(m[1])} בשנה, מול ${v(m[2])} למדד ראסל 2000 (IWM), והוא ניצח את המדד ב-${v(m[3])} מתוך ${v(m[4])} רבעונים.`);
  P("vs {N} S&P", (m, v) => `מול ${v(m[1])} ל-S&P`);
  P("{N} managers: (.+)", (m, v) => `${v(m[1])} מנהלים: ${m[2]}`);
  P("(BlackRock|Vanguard|State Street) {N} above its flows", (m, v) => `${HE_M[m[1]]} ${v(m[2])} מעל הזרימה שלה`);
  P("{N} insiders bought {N}", (m, v) => `${v(m[1])} בעלי עניין קנו ב-${v(m[2])}`);
  P("Big Three stake {N}, {N} in a year", (m, v) => `החלק של שלוש הגדולות ${v(m[1])}, ${v(m[2])} בשנה`);
  P("(.+), filed {D}", (m, v) => `${m[1]}, הוגש ב-${v(m[2])}`);
  P("Every shareholder-meeting vote of each manager’s flagship S&P 500 fund \\((.+)\\), from Form N-PX for the year to {D}\\.", (m, v) =>
    `כל ההצבעות באסיפות בעלי המניות של קרן S&P 500 המרכזית של כל מנהלת (${m[1].replace("BlackRock", "בלקרוק").replace("Vanguard", "ואנגארד").replace("State Street", "סטייט סטריט")}), מדוחות N-PX לשנה שהסתיימה ב-${v(m[2])}.`);
  P("Shareholder meeting of {D}, through each manager’s flagship S&P 500 fund \\(Form N-PX\\)\\.", (m, v) => `אסיפת בעלי המניות מ-${v(m[1])}, דרך קרן S&P 500 המרכזית של כל מנהלת (דוח N-PX).`);
  P("(Shareholder|Company) proposal · (.+)", (m) => `${m[1] === "Shareholder" ? "הצעה של בעלי מניות" : "הצעה של החברה"} · ${I.dict[m[2]] || m[2]}`);
  P("of {N}", (m, v) => `מתוך ${v(m[1])}`);
  P("{D} – {D}( · this week so far)?", (m, v) => `${v(m[1])} – ${v(m[2])}${m[3] ? " · השבוע עד עכשיו" : ""}`);
  P("(BlackRock|Vanguard|State Street): {N} of {T}", (m, v) => `${HE_M[m[1]]}: ${v(m[2])} ב-${m[3]}`);
  P("{T}: {N}", (m, v) => `${m[1]}: ${v(m[2])}`);
  P("{Q} · biggest buy {T} \\(({N})\\)", (m, v) => `${v(m[1])} · הקנייה הגדולה ${m[2]} (${v(m[3])})`);
  P("(.+) · since {D} · S&P 500 {N}", (m, v) => `${I.dict[m[1]] || m[1]} · מאז ${v(m[2])} · S&P 500 ${v(m[3])}`);
  P("Loading {X}…", (m) => `טוען…`);
  P("Money flows: an ETF that takes in money buys more of everything it holds in the same proportion, so the share count of most holdings moves by the same ratio\\. Trintel takes that ratio as the day’s flow; what moves differently is a change in the fund’s mix \\(index additions and removals, rebalances, corporate actions\\)\\. iShares \\(BlackRock\\) and Vanguard do not publish a daily holdings file that can be downloaded, so their funds are tracked monthly from N-PORT filings on the ETFs page\\. Source: State Street, checked {X}\\.", (m, v) =>
    `כסף נכנס ויוצא: תעודת סל שמקבלת כסף קונה עוד מכל מה שהיא מחזיקה באותו יחס, אז מספר המניות של רוב האחזקות זז באותו יחס. Trintel מתייחס ליחס הזה ככסף שנכנס או יצא באותו יום; מה שזז אחרת הוא שינוי בהרכב הקרן (הוספות והוצאות מהמדד, איזון מחדש, אירועים תאגידיים). iShares (בלקרוק) וואנגארד לא מפרסמות קובץ אחזקות יומי שאפשר להוריד, אז הקרנות שלהן מתעדכנות פעם בחודש מדוחות N-PORT בעמוד תעודות הסל. מקור: סטייט סטריט, נבדק ${v(m[1])}.`);
})();
