/* Hebrew for TriQ: fixed texts, patterns for texts with values in them, industries, insider
 * roles and 8-K event types. Used only in Hebrew mode (i18n.js). Keys are the exact English the
 * site shows; a text with no entry stays in English, never blank. Simple, everyday Hebrew. */
(function () {
  "use strict";

  // ---------- fixed texts ----------
  const dict = {
    // header, navigation
    "TriQ": "TriQ",
    "Holdings": "אחזקות",
    "TriQ home": "מסך הבית של TriQ",
    "Search holdings": "חיפוש אחזקות",
    "Search holdings by ticker or company": "חיפוש (באנגלית)",
    "Notifications": "התראות",
    "Managers": "מנהלות ההשקעות",
    "Largest holdings, live prices": "האחזקות הגדולות, מחירים עכשיו",
    "Loading": "טוען",
    "Live": "בזמן אמת",
    "Delayed": "בעיכוב",
    "just now": "עכשיו",
    "today": "היום",
    "EDGAR is re-read on a schedule; the page updates itself when a manager or company files.": "האתר בודק את מאגר הדיווחים של ה-SEC כל כמה דקות, והעמוד מתעדכן לבד כשמנהלת השקעות או חברה מדווחות.",
    "A saved copy of the data. The hosted version updates itself from EDGAR.": "עותק שמור של הנתונים. הגרסה שבאתר מתעדכנת לבד מה-SEC.",
    "Watchlist": "רשימת מעקב",
    "Emerging": "צומחות",
    "ETFs": "קרנות סל",
    "iShares · Vanguard · SPDR": "iShares · Vanguard · SPDR",
    "Breadcrumb": "ניווט",
    "Highlights": "עיקרי הדברים",
    "BlackRock, Vanguard & State Street": "בלקרוק, ואנגארד וסטייט סטריט",
    "Big Three": "שלוש הגדולות",
    "up": "עלייה",
    "down": "ירידה",

    // home: chart and figures
    "past year": "בשנה האחרונה",
    "past 3 years": "ב-3 השנים האחרונות",
    "past 5 years": "ב-5 השנים האחרונות",
    "Max": "הכול",
    "1Y": "שנה",
    "3Y": "3 שנים",
    "5Y": "5 שנים",
    "1D": "יום",
    "5D": "שבוע",
    "1M": "חודש",
    "6M": "חצי שנה",
    "Combined": "ביחד",
    "By manager": "לפי מנהלת",
    "Chart series": "מה מוצג בגרף",
    "Time range": "טווח זמן",
    "Price range": "טווח זמן",
    "net buying": "קניות פחות מכירות",
    "price moves": "שינוי מחירים",
    "13F book value": "שווי התיק לפי 13F",
    "13F book value chart": "גרף שווי התיק לפי 13F",
    "Filter holdings": "סינון אחזקות",
    "Filter by ticker, name, sector": "סינון לפי סימול, שם או ענף (באנגלית)",
    "Export to Excel": "ייצוא לאקסל",
    "Table view": "תצוגת הטבלה",
    "Overview": "סקירה",
    "Analytics": "ניתוח",
    "Fundamentals": "דוחות כספיים",
    "Key stats": "נתונים עיקריים",
    "Quarter change": "שינוי ברבעון",
    "Securities reported": "ניירות ערך שדווחו",
    "Report date": "תאריך הדוח",
    "due now, watching EDGAR": "צריך להגיע עכשיו, אנחנו בודקים",
    "Biggest moves last quarter": "הקניות והמכירות הגדולות ברבעון האחרון",
    "Direction": "כיוון",
    "Bought": "קנו",
    "Sold": "מכרו",
    "New": "חדש",
    "new": "חדש",
    "Sold out": "מכרו הכול",
    "Listing change": "החלפת רישום",
    "Net of the listing it replaced (for example ADR to ordinary shares)": "אחרי קיזוז נייר הערך שהוחלף (למשל מעבר מ-ADR למניה רגילה)",
    "None this quarter.": "אין ברבעון הזה.",
    "Net flow = change in shares × quarter-end price. Splits are adjusted, listing changes and spin-offs are netted into one line, shares received in a stock merger or spin-off are not counted as buying, and companies that left every Big Three book (acquired, delisted) are not counted as sales.":
      "קניות פחות מכירות = השינוי במספר המניות × המחיר בסוף הרבעון. פיצולי מניות מתוקנים, החלפות רישום ופיצולי חברות מאוחדים לשורה אחת, מניות שהתקבלו במיזוג במניות או בפיצול חברה לא נספרות כקנייה, וחברות שיצאו מהתיק של כל שלוש הגדולות (נרכשו או נמחקו מהמסחר) לא נספרות כמכירה.",
    "Not counted as buying, shares received rather than bought:": "לא נספרות כקנייה, מניות שהתקבלו ולא נקנו:",
    "SPDR, Vanguard and iShares sector funds": "קרנות הענפים של SPDR, Vanguard ו-iShares",
    "latest reports": "הדוחות האחרונים",
    "the quarter’s flow ÷ the funds’ latest reported net assets": "התזרים ברבעון ÷ הנכסים האחרונים שהקרנות דיווחו",
    "Flow = money investors put into a fund minus what they took out (shares created and dividends reinvested, minus shares redeemed), as the fund reports it month by month on Form N-PORT, added up over the same calendar quarter for every fund. Hover a number for the money in and out. Vanguard figures cover the whole fund, including its mutual fund share classes.":
      "תזרים = הכסף שמשקיעים הכניסו לקרן פחות מה שהוציאו (יחידות שנוצרו ודיבידנדים שהושקעו מחדש, פחות יחידות שנפדו), כפי שכל קרן מדווחת חודש אחרי חודש בדוח N-PORT, מחובר על פני אותו רבעון קלנדרי לכל הקרנות. העבירו את העכבר על מספר כדי לראות כמה נכנס וכמה יצא. בוואנגארד המספרים כוללים את כל הקרן, גם את גרסאות קרן הנאמנות שלה.",
    "Not counted as sales:": "לא נספרות כמכירה:",
    "left every Big Three book (acquired or delisted).": "יצאו מהתיק של כל שלוש הגדולות (נרכשו או נמחקו מהמסחר).",
    "Show fewer": "פחות",
    "Compare managers": "השוואה בין המנהלות",
    "Latest SEC filings": "הדיווחים האחרונים ל-SEC",
    "Notification settings": "הגדרות התראות",
    "Unread": "לא נקראו",
    "Mark all as read": "סימון הכול כנקרא",
    "Earlier": "קודמות",
    "Show": "הצגה",
    "You’re all caught up.": "אין התראות שלא נקראו.",
    "No recent filings from your watchlist.": "אין דיווחים אחרונים מחברות ברשימת המעקב.",
    "Follow companies (☆ on a company page) to get every one of their filings here.": "עקבו אחרי חברות (☆ בעמוד החברה) כדי לקבל כאן כל דיווח שלהן.",
    "No notifications yet.": "עוד אין התראות.",
    "Get these on this device, even when TriQ is closed.": "קבלו אותן במכשיר הזה, גם כש-TriQ סגור.",
    "Turn on": "הפעלה",
    "Companies in your watchlist always notify you, whatever the filing type.": "על חברות ברשימת המעקב תקבלו תמיד התראה, מכל סוג דיווח.",
    "Where": "איפה",
    "Push notifications": "התראות פוש",
    "On iPhone, install TriQ first (below), open it from the home screen, then turn this on.": "באייפון, קודם התקינו את TriQ (למטה), פתחו אותה ממסך הבית, ואז הפעילו כאן.",
    "Blocked in your browser settings for this site.": "חסום בהגדרות הדפדפן לאתר הזה.",
    "On this device, even when TriQ is closed.": "במכשיר הזה, גם כש-TriQ סגור.",
    "While TriQ is open": "כש-TriQ פתוח",
    "A notification from this tab, on desktop and Android.": "התראה מהלשונית הזו, במחשב ובאנדרואיד.",
    "Installed on this device.": "מותקנת במכשיר הזה.",
    "Install the app": "התקנת האפליקציה",
    "An icon on your home screen, full screen, the last data offline.": "סמל במסך הבית, מסך מלא, והנתונים האחרונים גם בלי רשת.",
    "In Safari: Share, then Add to Home Screen.": "ב-Safari: שיתוף ואז הוספה למסך הבית.",
    "In Chrome or Edge: the browser menu, then Install app.": "ב-Chrome או Edge: תפריט הדפדפן ואז התקנת אפליקציה.",
    "Install": "התקנה",
    "Open the filing on SEC EDGAR": "פתיחת הדיווח ב-SEC EDGAR",
    "Back": "חזרה",
    "News": "חדשות",
    "Market news": "חדשות השוק",
    "Company release": "הודעת החברה",
    "Loading news…": "טוען חדשות…",
    "Recent filings": "דיווחים אחרונים",
    "Filing type": "סוג הדיווח",
    "All": "הכול",
    "13G/D": "13G/D",
    "No filings in the past year.": "אין דיווחים בשנה האחרונה.",
    "current report": "דיווח מיידי",
    "13D, active stake": "13D, אחזקה עם כוונה להשפיע",
    "notice: reported by affiliates": "הודעה: דווח על ידי חברות קשורות",

    // holdings table
    "Company": "חברה",
    "Class": "סוג מניה",
    "Value": "שווי",
    "Price": "מחיר",
    "Today": "היום",
    "13F value": "שווי לפי 13F",
    "% of book": "% מהתיק",
    "Combined stake": "חלק הגדולות בחברה",
    "Stake": "חלק מהחברה",
    "QoQ shares": "שינוי במניות ברבעון",
    "QoQ net flow": "קניות פחות מכירות ברבעון",
    "Value, 3Y": "שווי ב-3 שנים",
    "Action": "פעולה",
    "Δ shares %": "שינוי במניות %",
    "Δ shares": "שינוי במניות",
    "Net flow": "קניות פחות מכירות",
    "Δ value": "שינוי בשווי",
    "Price return": "שינוי במחיר",
    "From": "מאז",
    "Price CAGR": "תשואה שנתית ממוצעת",
    "Added": "הגדילו",
    "Trimmed": "הקטינו",
    "Unchanged": "ללא שינוי",
    "added": "הגדילו",
    "trimmed": "הקטינו",
    "unchanged": "ללא שינוי",
    "exited": "יצאו",
    "Market cap": "שווי שוק",
    "Revenue TTM": "הכנסות ב-12 חודשים",
    "Rev. growth": "צמיחה בהכנסות",
    "EPS growth": "צמיחה ברווח למניה",
    "Gross margin": "שיעור רווח גולמי",
    "Op. margin": "שיעור רווח תפעולי",
    "Net margin": "שיעור רווח נקי",
    "P/E": "מכפיל רווח",
    "P/S": "מכפיל מכירות",
    "FCF yield": "תשואת תזרים חופשי",
    "Results to": "דוחות עד",
    "Quarter over quarter": "מול הרבעון הקודם",
    "Year over year": "מול השנה הקודמת",
    "Since first held": "מאז הקנייה הראשונה",
    "n.m.": "לא רלוונטי",
    "n/a": "אין נתון",
    "split-adj.": "מתוקן",
    "Stake is shares held ÷ shares outstanding (all share classes, as-converted). QoQ net flow is the change in shares valued at the quarter-end price. Select a company for its full page.":
      "חלק מהחברה = המניות שהן מחזיקות ÷ כל המניות של החברה (כל סוגי המניות). קניות פחות מכירות ברבעון = השינוי במספר המניות כפול המחיר בסוף הרבעון. לחצו על חברה כדי לראות את העמוד שלה.",
    "Already held when tracking starts in Q1 2017, so the first purchase was earlier.": "כבר הוחזקה כשהמעקב התחיל ברבעון 1 2017, אז הקנייה הראשונה הייתה לפני כן.",

    // about
    "About this data": "על הנתונים",
    "Wikimedia Commons": "Wikimedia Commons",
    "CC BY 4.0": "CC BY 4.0",
    ", cropped.": ", חתוך.",

    // company page
    "★ Following": "★ במעקב",
    "☆ Follow": "☆ הוספה למעקב",
    "🔔 Alerts": "🔔 התראות",
    "Shares held": "מניות בידיהן",
    "Value held": "שווי האחזקה",
    "Chart metric": "מה מוצג בגרף",
    "Price chart": "גרף מחיר",
    "vs S&P 500": "מול S&P 500",
    "13F quarter-end price": "מחיר סוף רבעון לפי 13F",
    "Held in these index funds": "מוחזקת בקרנות המדד האלה",
    "Form N-PORT, fund by fund": "לפי דוח האחזקות הרבעוני של כל קרן (N-PORT)",
    "Fund": "קרן",
    "As of": "תאריך",
    "Shares": "מניות",
    "% of fund": "% מהקרן",
    "vs prior report": "שינוי",
    "Value today": "שווי היום",
    "Insider trades": "עסקאות של בעלי עניין",
    "none": "אין",
    "Net": "קניות פחות מכירות:",
    "Date": "תאריך",
    "Insider": "בעל עניין",
    "Trade": "עסקה",
    "Filing": "דיווח",
    "plan": "תוכנית",
    "Pre-arranged trading plan (Rule 10b5-1)": "תוכנית מסחר שנקבעה מראש (כלל 10b5-1)",
    "Open-market purchases and sales only; stock awards, option exercises, tax withholding and gifts are left out.":
      "רק קניות ומכירות בבורסה. מניות שקיבלו כשכר, מימוש אופציות, ניכוי מס ומתנות לא נכללים.",
    "Big Three ownership": "האחזקה של שלוש הגדולות",
    "Manager": "מנהלת",
    "Rank": "דירוג",
    "YoY shares": "שינוי במניות בשנה",
    "Not held": "לא מחזיקה",
    "Latest Schedule 13G stakes": "דיווחי האחזקה האחרונים (13G)",
    "From SEC XBRL filings": "מהדוחות הכספיים שהוגשו ל-SEC",
    "Financials": "פיננסים",
    "Quarter (USD)": "רבעון (בדולרים)",
    "Revenue": "הכנסות",
    "Net income": "רווח נקי",
    "Y/Y change": "שינוי מול שנה קודמת",
    "Diluted EPS": "רווח למניה (מדולל)",
    "Free cash flow": "תזרים מזומנים חופשי",
    "Operating margin": "שיעור רווח תפעולי",
    "Return on equity": "תשואה על ההון",
    "Notes": "הערות",
    "Returns are price-only: dividends and spin-offs are not included.": "התשואות הן לפי המחיר בלבד, בלי דיבידנדים ובלי פיצולי חברה.",
    "Bank or insurer: gross margin, free cash flow and leverage are not comparable with industrial companies and are left out.":
      "בנק או חברת ביטוח: רווח גולמי, תזרים מזומנים חופשי ומינוף לא דומים לחברות רגילות, ולכן לא מוצגים.",
    "No XBRL fundamentals found for this issuer.": "לא נמצאו דוחות כספיים לחברה הזו.",
    "Shares outstanding are reported only per share class in XBRL, so market cap, stake and P/E are not computed.":
      "מספר המניות מדווח רק לכל סוג מניה בנפרד, ולכן שווי השוק, שיעור האחזקה ומכפיל הרווח לא מחושבים.",
    "Previous close": "סגירה קודמת",
    "Day range": "טווח היום",
    "52-week range": "טווח 52 שבועות",
    "Volume": "מחזור (מניות)",
    "P/E ratio": "מכפיל רווח",
    "Price / sales": "מכפיל מכירות",
    "Revenue (TTM)": "הכנסות (12 חודשים)",
    "Net cash": "מזומן נטו",
    "Shares outstanding": "מספר המניות",
    "Fiscal year end": "סוף שנת הכספים",
    "CUSIP": "CUSIP",
    "Trailing 12 months": "12 החודשים האחרונים",
    "Quarterly revenue and net income": "הכנסות ורווח נקי לפי רבעון",
    "Industry": "תחום",
    "Sector": "ענף",
    "Back to holdings": "חזרה לאחזקות",
    "That company isn’t among the Big Three’s largest holdings.": "החברה הזו לא נמצאת בין האחזקות הגדולות של שלוש הגדולות.",
    "Why it is on the Emerging list": "למה היא ברשימת הצומחות",
    "The Big Three own": "שלוש הגדולות מחזיקות",
    "over the year and": "בשנה האחרונה, כולל",
    "last quarter. Pattern:": "ברבעון האחרון. סוג העלייה:",
    "Not enough quarterly history to build trailing-twelve-month figures.": "אין מספיק רבעונים כדי לחשב נתונים של 12 חודשים.",
    "No US-GAAP revenue facts (foreign filer or non-standard taxonomy).": "אין נתוני הכנסות בפורמט האמריקאי (חברה זרה או דיווח בפורמט אחר).",
    "Intraday prices for this company are not available yet. Choose 1M or longer.": "אין עדיין מחירים לאורך היום לחברה הזו. בחרו חודש או יותר.",
    "Loading today’s prices…": "טוען את המחירים של היום…",
    "Intraday prices are not available. Choose 1M or longer.": "אין מחירים לאורך היום. בחרו חודש או יותר.",
    "No price history for this range.": "אין מחירים לטווח הזה.",
    "Loading price history…": "טוען היסטוריית מחירים…",
    "past 5 days": "ב-5 הימים האחרונים",
    "past month": "בחודש האחרון",
    "past 6 months": "בחצי השנה האחרונה",
    "past 10 years": "ב-10 השנים האחרונות",
    "year to date": "מתחילת השנה",
    "On your phone, even when the site is closed": "בטלפון, גם כשהאתר סגור",
    "iPhone": "iPhone",
    "Android": "Android",
    ") tap +, then paste the channel name.": ") לחצו על +, והדביקו את שם הערוץ.",
    "Copy": "העתקה",
    "Copied": "הועתק",
    "In this browser": "בדפדפן הזה",
    "Previous": "הקודמת",
    "Next": "הבאה",
    "No market price available": "אין מחיר מהבורסה",
    "Real-time": "בזמן אמת",
    "Delayed up to 5 min": "בעיכוב של עד 5 דקות",
    "Remove": "הסרה",
    "Shares QoQ": "שינוי במניות ברבעון",
    "Sources:": "מקורות:",
    "Open it on SEC EDGAR": "לפתוח אותו ב-SEC",
    "or": "או",
    "go back to Emerging": "לחזור לצומחות",
    "English": "English",
    // analytics
    "Analytics": "ניתוחים",
    "charts": "גרפים",
    "Analytics view": "תצוגת הניתוח",
    "Sections": "אזורים",
    "Executive brief": "תקציר מנהלים",
    "Sector flows (ETFs)": "תזרימים לענפים (קרנות סל)",
    "Peers": "השוואה למתחרים",
    "The 13F portfolio is": "תיק ה-13F שווה",
    "on the quarter.": "ברבעון.",
    "and prices added": "והמחירים הוסיפו",
    "Most buying went into": "רוב הקניות הלכו לענף",
    "the least buying was in": "והכי מעט קניות היו בענף",
    "the most selling was in": "והכי הרבה מכירות היו בענף",
    "Largest single buy:": "הקנייה הגדולה ביותר:",
    "Largest single sale:": "המכירה הגדולה ביותר:",
    "The top 10 holdings are": "10 האחזקות הגדולות הן",
    "Through their sector ETFs, the most money went into": "דרך קרנות הסל הענפיות שלהן, הכי הרבה כסף נכנס לענף",
    "and the most came out of": "והכי הרבה יצא מענף",
    "and the least into": "והכי מעט נכנס לענף",
    "Banks: the Big Three own": "בנקים: שלוש הגדולות מחזיקות",
    "of": "מ-",
    "Where the 13F buying went": "לאן הלכו הקניות (13F)",
    "Where ETF money went": "לאן הלך הכסף בקרנות הסל",
    "flows into the Big Three’s sector ETFs": "כסף שנכנס לקרנות הסל הענפיות של שלוש הגדולות",
    "Money into sector ETFs": "כסף שנכנס לקרנות סל ענפיות",
    "SPDR + Vanguard + iShares sector funds, last reported quarter": "קרנות הענפים של SPDR, Vanguard ו-iShares, ברבעון האחרון שדווח",
    "Flow as % of fund assets": "התזרים כאחוז מנכסי הקרנות",
    "a quarter’s flow ÷ assets at the start": "תזרים של רבעון ÷ הנכסים בתחילתו",
    "Sector flows, fund by fund": "תזרימים לפי ענף, קרן אחרי קרן",
    "estimated from each fund’s last two N-PORT reports": "הערכה לפי שני דוחות ה-N-PORT האחרונים של כל קרן",
    "Total flow": "סך התזרים",
    "% of assets": "% מהנכסים",
    "Flow = net assets now − net assets a report earlier × the fund’s price change between the two dates, so market moves are taken out and what is left is money investors put in or took out. Vanguard figures cover the whole fund, including its mutual fund share classes. Funds report on their own fiscal quarters, so periods can differ by a month or two (hover a number for its dates). Distributions are not separated, so a flow can be understated by about a quarter’s dividend.":
      "תזרים = הנכסים עכשיו פחות הנכסים בדוח הקודם כפול השינוי במחיר הקרן בין שני התאריכים. כך שינויי השוק יוצאים מהחישוב, ומה שנשאר הוא כסף שמשקיעים הכניסו או הוציאו. בוואנגארד המספרים כוללים את כל הקרן, גם את גרסאות קרן הנאמנות שלה. כל קרן מדווחת לפי הרבעונים שלה, אז התקופות יכולות להיות שונות בחודש או חודשיים (העבירו את העכבר על מספר כדי לראות את התאריכים). חלוקות דיבידנד לא מופרדות, אז התזרים יכול להיות נמוך מהאמיתי בערך בדיבידנד של רבעון.",
    "Net buying last quarter": "קניות פחות מכירות ברבעון האחרון",
    "Big Three combined, Δ shares × quarter-end price": "שלוש הגדולות ביחד, שינוי במניות × מחיר בסוף הרבעון",
    "Largest US banks": "הבנקים הגדולים בארה״ב",
    "prices live": "מחירים עכשיו",
    "Bank": "בנק",
    "Stake = shares held ÷ shares outstanding. Market cap and P/E use the live price with the latest reported shares and earnings. The first row is highlighted for comparison.": "חלק מהחברה = המניות שהן מחזיקות ÷ כל המניות של החברה. שווי השוק ומכפיל הרווח לפי המחיר עכשיו ומספר המניות והרווח האחרונים שדווחו. השורה הראשונה מודגשת להשוואה.",
    "No peer data yet.": "עוד אין נתוני השוואה.",
    "go back to Analytics": "לחזור לניתוחים",
    "no maximum": "בלי מקסימום",
    "ETF data could not be loaded.": "לא הצלחנו לטעון את נתוני קרנות הסל.",
    "Try again": "לנסות שוב",
    "No fund matches. Try a ticker such as VTI or a word from the name.": "אין קרן שמתאימה. נסו סימול כמו VTI או מילה מהשם (באנגלית).",
    "ETF": "קרן סל",
    "Activity": "פעילות",
    "Sectors": "ענפים",
    "13F portfolio value": "שווי התיק לפי 13F",
    "Positions": "אחזקות",
    "Top 10 weight": "משקל 10 הגדולות",
    "Added / trimmed": "הגדילו / הקטינו",
    "Largest sector": "הענף הגדול",
    "securities in the filings": "ניירות ערך בדוחות",
    "of the whole portfolio": "מכל התיק",
    "Δ shares × quarter-end price": "שינוי במניות × מחיר בסוף הרבעון",
    "Technology": "טכנולוגיה",
    "Communications": "תקשורת",
    "Discretionary": "צריכה (לא חיונית)",
    "Staples": "צריכה בסיסית",
    "Sector mix": "התפלגות לפי ענף",
    "Other sectors": "ענפים אחרים",
    "Top 10 holdings": "10 האחזקות הגדולות",
    "Net buying": "קניות פחות מכירות",
    "Price effect": "השפעת המחיר",
    "Net buying = change in shares × quarter-end price. Price effect = the change in price on the shares held a quarter earlier.": "קניות פחות מכירות = השינוי במספר המניות × המחיר בסוף הרבעון. השפעת המחיר = השינוי במחיר על המניות שהוחזקו רבעון קודם.",
    "Largest buys": "הקניות הגדולות",
    "Largest sells": "המכירות הגדולות",
    "Position actions": "מה עשו עם האחזקות",
    "positions": "אחזקות",
    "Biggest share-count changes": "השינויים הגדולים במספר המניות",
    "Allocation by sector": "חלוקה לפי ענף",
    "sectors": "ענפים",
    "Net buying by sector": "קניות פחות מכירות לפי ענף",
    "last quarter": "ברבעון האחרון",
    "Sector table": "טבלת ענפים",
    "weights compare quarter-end values": "המשקלות לפי השווי בסוף כל רבעון",
    "Companies": "חברות",
    "Weight": "משקל",
    "Δ weight": "שינוי במשקל",
    "13F portfolio value by manager": "שווי התיק לפי 13F, לפי מנהלת",
    "Share of the Big Three": "החלק של כל אחת משלוש הגדולות",
    "combined": "ביחד",
    "Manager comparison": "השוואה בין המנהלות",
    "Latest filing": "הדוח האחרון",
    "Who owns the company": "מי מחזיק בחברה",
    "share of all shares outstanding": "חלק מכל המניות של החברה",
    "All other holders": "כל שאר המחזיקים",
    // notifications
    "Site health": "תקינות האתר",
    "TriQ stops updating or recovers, or a data check finds something to review (push only)": "TriQ מפסיק להתעדכן או חוזר לעבוד, או שבדיקת נתונים מצאה משהו לבדוק (רק בהתראות שמגיעות גם כשהאתר סגור)",
    "Turn on notifications": "הפעלת התראות",
    "Open": "פתיחה",
    "10-Q / 10-K": "דוחות רבעוניים ושנתיים (10-Q / 10-K)",
    ". Once installed, the bell's browser notifications also work on iPhone while the app is open.": ". אחרי ההתקנה, ההתראות של הפעמון יעבדו גם באייפון כשהאפליקציה פתוחה.",
    "No S&P 500 prices for this range.": "אין מחירים של מדד S&P 500 לטווח הזה.",
    "Phone channels are not set up for this site.": "ערוצי הטלפון לא הוגדרו באתר הזה.",

    // emerging
    "Screens": "סינונים",
    "Emerging holdings": "חברות קטנות צומחות",
    "How to read this list": "איך לקרוא את הרשימה",
    "· and its track record": "· ומה קרה בעבר",
    "An index fund owns about the same share of every company in its index, so differences in the Big Three’s stake come from index membership, share issuance and corporate events, not from a view on the company. Most gains here are one-quarter step-ups at the June Russell reconstitution, and those additions are announced in May, months before the 13F shows them. Treat this as a map of index money flowing into small caps, not as a buy list: the backtest below finds no reliable edge from buying it.":
      "קרן מדד מחזיקה בערך אותו אחוז בכל חברה שבמדד. לכן שינוי באחזקה של שלוש הגדולות נובע מכניסה למדד, מהנפקת מניות או מאירועים בחברה, ולא מדעה על החברה. רוב העליות כאן הן קפיצה ברבעון אחד, בעדכון מדד ראסל ביוני. את הכניסות האלה מפרסמים כבר במאי, חודשים לפני שדוח 13F מראה אותן. תסתכלו על הרשימה כמפה של כסף ממדדים שנכנס לחברות קטנות, לא כרשימת קנייה: הבדיקה ההיסטורית למטה לא מצאה יתרון קבוע בקנייה שלה.",
    "Track record.": "מה קרה בפועל.",
    "Loading the track record since the last 13F deadline…": "טוען מה קרה מאז המועד האחרון לדוח 13F…",
    "Has this screen worked?": "האם הסינון הזה עבד?",
    "Loading the backtest…": "טוען את הבדיקה ההיסטורית…",
    "Russell 2000 (IWM)": "ראסל 2000 (IWM)",
    "Russell 2000": "ראסל 2000",
    "This screen": "הסינון הזה",
    "All three managers buying": "כל שלוש המנהלות קונות",
    "All three buying": "שלושתן קונות",
    "All small caps, no signal": "כל החברות הקטנות, בלי סינון",
    "All small caps": "כל החברות הקטנות",
    "Top 25 by stake gain": "25 עם העלייה הגדולה בחלק מהחברה",
    "Top 25": "25 המובילות",
    "Verdict:": "השורה התחתונה:",
    "How it was tested": "איך זה נבדק",
    "Built only from what was knowable at the time, with no survivorship bias:": "נבנה רק ממה שהיה ידוע באותו זמן, כולל חברות שנעלמו בהמשך:",
    "Screen filters": "סינונים",
    "Company size": "גודל החברה",
    "All sizes": "כל הגדלים",
    "Minimum market cap": "שווי שוק מינימלי",
    "Maximum market cap": "שווי שוק מקסימלי",
    "no minimum": "בלי מינימום",
    "Hide pending deals": "הסתרת חברות בתהליך מיזוג",
    "Hide thin trading": "הסתרת חברות עם מסחר דליל",
    "All sectors": "כל הענפים",
    "Sort by": "מיון לפי",
    "Reverse the order": "היפוך הסדר",
    "High → low": "מהגבוה לנמוך",
    "Low → high": "מהנמוך לגבוה",
    "A → Z": "מ-A עד Z",
    "Z → A": "מ-Z עד A",
    "Reset filters": "איפוס הסינונים",
    "Big Three stake": "חלק הגדולות בחברה",
    "Today’s change": "השינוי היום",
    "Revenue growth": "צמיחה בהכנסות",
    "Managers buying": "מנהלות שקונות",
    "Ticker": "סימול",
    "Name": "שם",
    "Δ stake QoQ": "שינוי בחלק מהחברה, רבעון",
    "Δ stake YoY": "שינוי בחלק מהחברה, שנה",
    "Buying": "קונות",
    "Net buying YoY": "קניות פחות מכירות בשנה",
    "Pattern": "סוג העלייה",
    "Flags": "אזהרות",
    "No company matches these filters. Widen the price range or market cap.": "אין חברה שמתאימה לסינון. הרחיבו את טווח המחיר או את שווי השוק.",
    "How the screen narrows": "איך הרשימה מצטמצמת",
    "Securities held": "ניירות ערך בתיק",
    "Low price, growing position": "מחיר נמוך, אחזקה שגדלה",
    "Operating companies": "חברות פעילות",
    "No share count (left out)": "אין מספר מניות (הוצאו)",
    "History not linkable (left out)": "אין היסטוריה רציפה (הוצאו)",
    "Matching your filters": "מתאימות לסינון שלכם",
    "About the screen": "על הסינון",
    "Patterns": "סוגי עלייה",
    "Largest stake gains": "העליות הגדולות בחלק מהחברה",
    "Steady accumulation": "צבירה הדרגתית",
    "At least three of the last four quarters each added 0.75 points or more": "לפחות 3 מ-4 הרבעונים האחרונים הוסיפו כל אחד 0.75 נקודות או יותר",
    "Step-up": "קפיצה",
    "One quarter added most of the gain (2+ points), typical of an index addition": "רבעון אחד הביא את רוב העלייה (2 נקודות ומעלה), כמו שקורה בכניסה למדד",
    "New position": "אחזקה חדשה",
    "First held within the last year: IPO, spin-off or index entry": "התחילו להחזיק רק בשנה האחרונה: הנפקה, פיצול חברה או כניסה למדד",
    "Rising": "עולה",
    "Stake higher than a year ago, without a clear pattern": "האחזקה גבוהה יותר מלפני שנה, בלי דפוס ברור",
    "Deal pending": "עסקה בדרך",
    "Merger, tender or going-private filing in the last 9 months: the price may be pinned to a deal": "דיווח על מיזוג, הצעת רכש או מחיקה מהמסחר ב-9 החודשים האחרונים: המחיר אולי תקוע במחיר העסקה",
    "Reverse split": "איחוד מניות",
    "Reverse split in the last year, often a sign of distress": "איחוד מניות בשנה האחרונה, הרבה פעמים סימן לקשיים",
    "Shares outstanding grew more than 30% in a year": "מספר המניות גדל ביותר מ-30% בשנה",
    "Foreign filer": "חברה זרה",
    "Short public history": "נסחרת זמן קצר",
    "Check data": "נתונים לא עקביים",
    "The managers' filings disagree on the quarter-end price": "המנהלות דיווחו על מחירים שונים בסוף הרבעון",
    "Thin trading": "מסחר דליל",
    "Under $1M traded per day on average": "פחות ממיליון דולר ביום בממוצע",
    "Approx. shares": "מספר מניות משוער",
    "Share count taken from the cover page or a neighbouring quarter, not the balance sheet": "מספר המניות נלקח מעמוד השער של הדוח או מרבעון סמוך, לא מהמאזן",
    "Stake, 2Y": "חלק מהחברה ב-2 שנים",
    "Show all": "הכול",
    "Loading ETFs…": "טוען קרנות סל…",

    // watchlist
    "Since 13F": "מאז דוח 13F",
    "Companies you follow, with live prices. Kept in this browser.": "החברות שאתם עוקבים אחריהן, עם מחירים עכשיו. נשמר בדפדפן הזה.",
    "No companies yet. Open any company and tap": "עוד אין חברות. פתחו חברה ולחצו",
    "to keep it here with a live price.": "כדי לשמור אותה כאן עם המחיר שלה.",
    "Latest filings from your watchlist": "הדיווחים האחרונים מרשימת המעקב",
    "Open-market insider buying minus selling, last 90 days (Form 4)": "קניות פחות מכירות של בעלי עניין בבורסה, 90 הימים האחרונים (טופס 4)",
    "Downloaded": "הורד",

    // ETFs
    "ETFs from the Big Three": "קרנות הסל של שלוש הגדולות",
    "iShares (BlackRock), Vanguard and SPDR (State Street): the core funds, and each issuer’s fund for every sector": "iShares (בלקרוק), Vanguard (ואנגארד) ו-SPDR (סטייט סטריט): הקרנות העיקריות, וקרן של כל אחת לכל ענף",
    "Issuer": "גוף מנפיק",
    "iShares": "iShares",
    "SPDR": "SPDR",
    "Find a fund": "חיפוש קרן",
    "Find a fund: ticker, name, category": "חיפוש קרן: סימול או שם (באנגלית)",
    "Category": "סוג",
    "All categories": "כל הסוגים",
    "US large cap": "מניות גדולות בארה״ב",
    "US mid cap": "מניות בינוניות בארה״ב",
    "US small cap": "מניות קטנות בארה״ב",
    "US total market": "כל השוק בארה״ב",
    "US growth": "מניות צמיחה בארה״ב",
    "US value": "מניות ערך בארה״ב",
    "International developed": "מדינות מפותחות מחוץ לארה״ב",
    "International total": "כל העולם חוץ מארה״ב",
    "Emerging markets": "שווקים מתעוררים",
    "US bonds": "אג״ח בארה״ב",
    "International bonds": "אג״ח מחוץ לארה״ב",
    "US Treasuries": "אג״ח ממשלת ארה״ב",
    "US dividend": "מניות דיבידנד בארה״ב",
    "US low volatility": "מניות יציבות בארה״ב",
    "Gold": "זהב",
    "Fund size": "גודל הקרן",
    "1-year return": "תשואה בשנה",
    "Year to date": "מתחילת השנה",
    "YTD, price": "מתחילת השנה",
    "1 year, price": "שנה",
    "1-year chart": "גרף שנה",
    "Fund size (all classes)": "גודל הקרן",
    "Sector ETFs, side by side": "קרנות סל לפי ענף, זו לצד זו",
    "Order": "סדר",
    "A to Z": "לפי שם",
    "Best year first": "התשואה השנתית הגבוהה קודם",
    "Worst year first": "התשואה השנתית הנמוכה קודם",
    "Select Sector SPDR · Vanguard sector · iShares U.S. sector. Tap a fund for its full name and largest holdings. “Best year” ranks sectors by the three funds’ average 1-year return.":
      "קרנות הענפים של SPDR, Vanguard ו-iShares. לחצו על קרן כדי לראות את השם המלא שלה ואת האחזקות הגדולות. ״השנה הטובה ביותר״ מסדר את הענפים לפי התשואה הממוצעת של שלוש הקרנות בשנה האחרונה.",
    "Largest holdings": "האחזקות הגדולות",
    "Each bond is listed separately with its coupon and maturity. Cash collateral and money-market sweep vehicles are left out.": "כל אג״ח מופיעה בנפרד, עם הריבית ומועד הפירעון שלה. מזומן וקרנות כספיות לא נכללים.",
    "Holdings of one issuer are added together (for a bond fund, every bond of that issuer; for Alphabet, both share classes). Cash collateral and money-market sweep vehicles are left out.":
      "אחזקות של אותו גוף מחוברות יחד (בקרן אג״ח כל האג״ח של אותו גוף, ובאלפאבית שני סוגי המניות). מזומן וקרנות כספיות לא נכללים.",
    "Holds physical gold bullion (allocated bars in vaults in London), not securities.": "הקרן מחזיקה זהב פיזי (מטילים בכספות בלונדון), לא ניירות ערך.",
    "The fund’s own page (gold held, bar list)": "העמוד של הקרן (כמה זהב יש, רשימת המטילים)",
    "No N-PORT report found for this fund yet.": "עוד לא נמצא דוח אחזקות (N-PORT) לקרן הזו.",
    "Holdings are not available for this fund right now.": "האחזקות של הקרן הזו לא זמינות כרגע.",
    "State Street daily holdings": "האחזקות היומיות של סטייט סטריט",
    "N-PORT": "N\u2011PORT",

    // notifications panel
    "Close": "סגירה",
    "Notify me about": "שלחו לי התראה על",
    "13F holdings": "דוחות אחזקות 13F",
    "13G / 13D stakes": "דיווחי אחזקה 13G / 13D",
    "A manager reports owning more than 5% of a tracked company": "מנהלת השקעות מדווחת שהיא מחזיקה יותר מ-5% מחברה שבמעקב",
    "Material 8-K events": "דיווחים מיידיים חשובים (8-K)",
    "Deals, bankruptcy, delisting, financings or executive changes at tracked companies": "עסקאות, פשיטת רגל, מחיקה מהמסחר, גיוסי כסף או החלפת מנהלים בחברות שבמעקב",
    "Quarterly and annual reports": "דוחות רבעוניים ושנתיים",
    "A tracked company files its quarterly or annual report": "חברה שבמעקב מגישה דוח רבעוני או שנתי",
    "Fund holdings (N-PORT)": "אחזקות קרנות (N-PORT)",
    "No install. Works while the site is open in a tab, on desktop and Android.": "בלי התקנה. עובד כשהאתר פתוח בלשונית, במחשב ובאנדרואיד.",
    "Turn on browser notifications": "הפעלת התראות בדפדפן",
    "Notifications are blocked for this site in your browser settings.": "ההתראות לאתר הזה חסומות בהגדרות הדפדפן שלכם.",
    "Channels carry public SEC filings only. Anyone can subscribe to them.": "בערוצים יש רק דיווחים ציבוריים ל-SEC. כל אחד יכול להירשם אליהם.",
    "Install as an app": "התקנה כאפליקציה",
    "An icon on your home screen, full screen without the browser bar, and the last data available offline.": "אייקון במסך הבית, מסך מלא בלי שורת הדפדפן, והנתונים האחרונים זמינים גם בלי אינטרנט.",
    "In Chrome or Edge, open the browser menu and choose": "בכרום או באדג׳, פתחו את התפריט של הדפדפן ובחרו",
    "Install app": "Install app (התקנת אפליקציה)",
    "(or": "(או",
    "Add to Home screen": "Add to Home screen (הוספה למסך הבית)",
    "on Android).": "באנדרואיד).",
    "In Safari, tap": "בספארי, לחצו על",
    "Share": "Share (שיתוף)",
    "(the square with an arrow), then": "(הריבוע עם החץ), ואז",
    "Add to Home Screen": "Add to Home Screen (הוספה למסך הבית)",
    "Install TriQ": "התקנת TriQ",
    "App": "אפליקציה",
    "TriQ is installed on this device.": "TriQ מותקן במכשיר הזה.",
    "TriQ is installed.": "TriQ מותקן.",
    "Pick at least one filing type above.": "בחרו לפחות סוג דיווח אחד למעלה.",
    "1. Install the free ntfy app, no account needed:": "1. התקינו את האפליקציה החינמית ntfy, בלי צורך בחשבון:",
    "2. Subscribe to the channels you want. In the app tap +, then paste the channel name, or open the link on your phone.": "2. הירשמו לערוצים שאתם רוצים. באפליקציה לחצו על + והדביקו את שם הערוץ, או פתחו את הקישור בטלפון.",
    "Press copy to copy the selected channel name.": "לחצו על העתקה כדי להעתיק את שם הערוץ שבחרתם.",
    "This browser cannot show notifications.": "הדפדפן הזה לא יכול להציג התראות.",
    "On. You will be notified while TriQ is open in a tab.": "פועל. תקבלו התראה כש-TriQ פתוח בלשונית.",
    "Browser notifications are on.": "ההתראות בדפדפן פועלות.",
    "This browser shows notifications only from installed apps.": "הדפדפן הזה מציג התראות רק מאפליקציות מותקנות.",
    "Push notifications, even when the site is closed": "התראות גם כשהאתר סגור",
    "On iPhone, first install TriQ as an app (below), open it from the home screen, then turn push on here.": "באייפון, קודם התקינו את TriQ כאפליקציה (למטה), פתחו אותה ממסך הבית, ואז הפעילו כאן את ההתראות.",
    "This browser does not support push notifications.": "הדפדפן הזה לא תומך בהתראות.",
    "Send a test": "שליחת בדיקה",
    "Turn off": "כיבוי",
    "Turn on push notifications": "הפעלת התראות",
    "On for this device.": "פועל במכשיר הזה.",
    "Off.": "כבוי.",
    "No app to install. Uses the filing types above and every company in your watchlist.": "בלי אפליקציה. לפי סוגי הדיווח שלמעלה וכל החברות ברשימת המעקב שלכם.",
    "Push notifications are on.": "ההתראות פועלות.",
    "Notifications were not allowed.": "לא אישרתם התראות.",
    "Could not reach the push server. Try again later.": "אין חיבור לשרת ההתראות. נסו שוב מאוחר יותר.",
    "Test sent. It should arrive in a few seconds.": "הבדיקה נשלחה. היא אמורה להגיע בעוד כמה שניות.",
    "The push server did not accept the test.": "שרת ההתראות לא קיבל את הבדיקה.",
    "Could not reach the push server.": "אין חיבור לשרת ההתראות.",
    "Updated with the latest SEC data.": "עודכן עם הנתונים האחרונים מה-SEC.",
    "Notification": "התראה",
  };

  // ---------- industries (SEC SIC descriptions) ----------
  const industries = {
    "Accident & Health Insurance": "ביטוח תאונות ובריאות",
    "Agricultural Services": "שירותי חקלאות",
    "Air Transportation, Nonscheduled": "תעופה, טיסות שכר",
    "Air Transportation, Scheduled": "תעופה, טיסות סדירות",
    "Air-Cond & Warm Air Heatg Equip & Comm & Indl Refrig Equip": "ציוד מיזוג, חימום וקירור",
    "Aircraft": "מטוסים",
    "Aircraft Engines & Engine Parts": "מנועי מטוסים וחלקים",
    "Aircraft Parts & Auxiliary Equipment, Nec": "חלקי מטוסים וציוד עזר",
    "Beverages": "משקאות",
    "Biological Products, (No Diagnostic Substances)": "מוצרים ביולוגיים (ביוטכנולוגיה)",
    "Bituminous Coal & Lignite Surface Mining": "כריית פחם",
    "Blankbooks, Looseleaf Binders & Bookbindg & Relatd Work": "מחברות, קלסרים וכריכה",
    "Bottled & Canned Soft Drinks & Carbonated Waters": "משקאות קלים",
    "Cable & Other Pay Television Services": "טלוויזיה בכבלים ובתשלום",
    "Calculating & Accounting Machines (No Electronic Computers)": "מכונות חישוב ומשרד",
    "Chemicals & Allied Products": "כימיקלים",
    "Cigarettes": "סיגריות",
    "Commercial Printing": "דפוס מסחרי",
    "Communications Equipment, Nec": "ציוד תקשורת",
    "Communications Services, Nec": "שירותי תקשורת",
    "Computer & Office Equipment": "מחשבים וציוד משרדי",
    "Computer Communications Equipment": "ציוד תקשורת למחשבים",
    "Computer Peripheral Equipment, Nec": "ציוד היקפי למחשבים",
    "Computer Storage Devices": "התקני אחסון למחשבים",
    "Construction - Special Trade Contractors": "בנייה, קבלני מקצוע",
    "Construction Machinery & Equip": "מכונות בנייה",
    "Crude Petroleum & Natural Gas": "נפט וגז טבעי",
    "Cutlery, Handtools & General Hardware": "סכו״ם, כלי עבודה ופרזול",
    "Dairy Products": "מוצרי חלב",
    "Dental Equipment & Supplies": "ציוד שיניים",
    "Drawing & Insulating Of Nonferrous Wire": "כבלים וחוטי מתכת",
    "Drilling Oil & Gas Wells": "קידוח נפט וגז",
    "Electric Lighting & Wiring Equipment": "תאורה וחיווט חשמלי",
    "Electric Services": "חשמל",
    "Electrical Industrial Apparatus": "ציוד חשמלי לתעשייה",
    "Electromedical & Electrotherapeutic Apparatus": "מכשור רפואי אלקטרוני",
    "Electronic & Other Electrical Equipment (No Computer Equip)": "ציוד חשמלי ואלקטרוני",
    "Electronic Computers": "מחשבים",
    "Electronic Connectors": "מחברים אלקטרוניים",
    "Engines & Turbines": "מנועים וטורבינות",
    "Fabricated Structural Metal Products": "מבני מתכת",
    "Finance Services": "שירותים פיננסיים",
    "Fire, Marine & Casualty Insurance": "ביטוח רכוש וחבויות",
    "Food And Kindred Products": "מזון",
    "Footwear, (No Rubber)": "הנעלה",
    "General Industrial Machinery & Equipment": "מכונות וציוד לתעשייה",
    "General Industrial Machinery & Equipment, Nec": "מכונות וציוד לתעשייה",
    "Gold And Silver Ores": "כריית זהב וכסף",
    "Guided Missiles & Space Vehicles & Parts": "טילים וחלליות",
    "Heating Equipment, Except Electric & Warm Air Furnaces": "ציוד חימום",
    "Heavy Construction Other Than Bldg Const - Contractors": "בנייה כבדה ותשתיות",
    "Hospital & Medical Service Plans": "ביטוח בריאות",
    "Hotels & Motels": "מלונות",
    "Hotels, Rooming Houses, Camps & Other Lodging Places": "מלונות ולינה",
    "Household Audio & Video Equipment": "מוצרי שמע ווידאו לבית",
    "Household Furniture": "רהיטים לבית",
    "In Vitro & In Vivo Diagnostic Substances": "חומרים לאבחון רפואי",
    "Industrial & Commercial Fans & Blowers & Air Purifing Equip": "מאווררים וטיהור אוויר",
    "Industrial Inorganic Chemicals": "כימיקלים אי-אורגניים",
    "Industrial Instruments For Measurement, Display, And Control": "מכשירי מדידה ובקרה לתעשייה",
    "Industrial Organic Chemicals": "כימיקלים אורגניים",
    "Instruments For Meas & Testing Of Electricity & Elec Signals": "מכשירי מדידה לחשמל",
    "Investment Advice": "ייעוץ השקעות",
    "Investors, Nec": "חברות השקעה",
    "Laboratory Analytical Instruments": "מכשירי מעבדה",
    "Lessors Of Real Property, Nec": "השכרת נכסים",
    "Life Insurance": "ביטוח חיים",
    "Loan Brokers": "תיווך הלוואות",
    "Machine Tools, Metal Cutting Types": "מכונות לחיתוך מתכת",
    "Manifold Business Forms": "טפסים עסקיים",
    "Measuring & Controlling Devices, Nec": "מכשירי מדידה ובקרה",
    "Metal Forgings & Stampings": "חישול והטבעת מתכת",
    "Metal Mining": "כריית מתכות",
    "Mineral Royalty Traders": "תמלוגים ממחצבים",
    "Mining & Quarrying Of Nonmetallic Minerals (No Fuels)": "כרייה וחציבה",
    "Misc Industrial & Commercial Machinery & Equipment": "מכונות וציוד לתעשייה",
    "Miscellaneous Chemical Products": "מוצרים כימיים",
    "Miscellaneous Electrical Machinery, Equipment & Supplies": "ציוד חשמלי",
    "Miscellaneous Fabricated Metal Products": "מוצרי מתכת",
    "Miscellaneous Metal Ores": "כריית מתכות",
    "Miscellaneous Plastics Products": "מוצרי פלסטיק",
    "Mortgage Bankers & Loan Correspondents": "משכנתאות",
    "Motor Vehicle Parts & Accessories": "חלקי רכב",
    "Motor Vehicles & Passenger Car Bodies": "רכבים",
    "Motorcycles, Bicycles & Parts": "אופנועים ואופניים",
    "National Commercial Banks": "בנקים",
    "Natural Gas Transmisison & Distribution": "הולכת גז טבעי",
    "Newspapers: Publishing Or Publishing & Printing": "עיתונים",
    "Office Furniture": "ריהוט משרדי",
    "Oil & Gas Field Machinery & Equipment": "ציוד לשדות נפט וגז",
    "Oil & Gas Field Services, Nec": "שירותים לשדות נפט וגז",
    "Ophthalmic Goods": "מוצרי עיניים ואופטיקה",
    "Optical Instruments & Lenses": "מכשירים אופטיים ועדשות",
    "Orthopedic, Prosthetic & Surgical Appliances & Supplies": "ציוד אורתופדי וכירורגי",
    "Paper Mills": "נייר",
    "Paperboard Containers & Boxes": "קרטון ואריזות",
    "Perfumes, Cosmetics & Other Toilet Preparations": "בשמים וקוסמטיקה",
    "Personal Credit Institutions": "אשראי צרכני",
    "Petroleum Refining": "זיקוק נפט",
    "Pharmaceutical Preparations": "תרופות",
    "Plastics Products, Nec": "מוצרי פלסטיק",
    "Plastics, Foil & Coated Paper Bags": "שקיות פלסטיק ונייר",
    "Pottery & Related Products": "קרמיקה",
    "Primary Smelting & Refining Of Nonferrous Metals": "התכה וזיקוק מתכות",
    "Printed Circuit Boards": "מעגלים מודפסים",
    "Pumps & Pumping Equipment": "משאבות",
    "Radio & Tv Broadcasting & Communications Equipment": "ציוד שידור ותקשורת",
    "Radio Broadcasting Stations": "תחנות רדיו",
    "Railroad Equipment": "ציוד רכבות",
    "Railroads, Line-Haul Operating": "רכבות משא",
    "Real Estate": "נדל״ן",
    "Real Estate Agents & Managers (For Others)": "תיווך וניהול נדל״ן",
    "Real Estate Investment Trusts": "קרנות ריט (נדל״ן)",
    "Refrigeration & Service Industry Machinery": "קירור ומכונות שירות",
    "Retail-Apparel & Accessory Stores": "קמעונאות, ביגוד ואביזרים",
    "Retail-Auto & Home Supply Stores": "קמעונאות, רכב ובית",
    "Retail-Catalog & Mail-Order Houses": "מכירות באינטרנט ובדואר",
    "Retail-Department Stores": "רשתות כלבו",
    "Retail-Eating Places": "מסעדות",
    "Retail-Eating & Drinking Places": "מסעדות ובתי קפה",
    "Retail-Family Clothing Stores": "חנויות בגדים",
    "Retail-Furniture Stores": "חנויות רהיטים",
    "Retail-Grocery Stores": "סופרמרקטים",
    "Retail-Jewelry Stores": "חנויות תכשיטים",
    "Retail-Lumber & Other Building Materials Dealers": "חנויות לחומרי בניין",
    "Retail-Miscellaneous Retail": "קמעונאות",
    "Retail-Miscellaneous Shopping Goods Stores": "קמעונאות",
    "Retail-Retail Stores, Nec": "קמעונאות",
    "Retail-Variety Stores": "חנויות כלבו וזול",
    "Savings Institution, Federally Chartered": "בנק חיסכון",
    "Savings Institutions, Not Federally Chartered": "בנק חיסכון",
    "Security Brokers, Dealers & Flotation Companies": "ברוקרים וחיתום",
    "Semiconductors & Related Devices": "שבבים (מוליכים למחצה)",
    "Services-Advertising Agencies": "פרסום",
    "Services-Amusement & Recreation Services": "בידור ופנאי",
    "Services-Business Services, Nec": "שירותים לעסקים",
    "Services-Commercial Physical & Biological Research": "מחקר מדעי",
    "Services-Computer Integrated Systems Design": "תכנון מערכות מחשב",
    "Services-Computer Processing & Data Preparation": "עיבוד נתונים",
    "Services-Computer Programming Services": "תכנות",
    "Services-Computer Programming, Data Processing, Etc.": "תוכנה ועיבוד נתונים",
    "Services-Detective, Guard & Armored Car Services": "שמירה ואבטחה",
    "Services-Educational Services": "חינוך",
    "Services-Equipment Rental & Leasing, Nec": "השכרת ציוד",
    "Services-General Medical & Surgical Hospitals, Nec": "בתי חולים",
    "Services-Health Services": "שירותי בריאות",
    "Services-Help Supply Services": "כוח אדם",
    "Services-Home Health Care Services": "טיפול רפואי בבית",
    "Services-Hospitals": "בתי חולים",
    "Services-Management Consulting Services": "ייעוץ ניהולי",
    "Services-Management Services": "שירותי ניהול",
    "Services-Medical Laboratories": "מעבדות רפואיות",
    "Services-Misc Health & Allied Services, Nec": "שירותי בריאות",
    "Services-Miscellaneous Amusement & Recreation": "בידור ופנאי",
    "Services-Miscellaneous Equipment Rental & Leasing": "השכרת ציוד",
    "Services-Motion Picture & Video Tape Production": "הפקת סרטים",
    "Services-Nursing & Personal Care Facilities": "בתי אבות וסיעוד",
    "Services-Offices & Clinics Of Doctors Of Medicine": "מרפאות",
    "Services-Personal Services": "שירותים אישיים",
    "Services-Prepackaged Software": "תוכנה",
    "Services-Specialty Outpatient Facilities, Nec": "מרפאות מומחים",
    "Services-Testing Laboratories": "מעבדות בדיקה",
    "Services-Video Tape Rental": "השכרת וידאו",
    "Short-Term Business Credit Institutions": "אשראי לעסקים",
    "Silver Ores": "כריית כסף",
    "Soap, Detergents, Cleang Preparations, Perfumes, Cosmetics": "סבון, חומרי ניקוי וקוסמטיקה",
    "Special Industry Machinery, Nec": "מכונות לתעשייה",
    "Sporting & Athletic Goods, Nec": "ציוד ספורט",
    "State Commercial Banks": "בנקים",
    "Steel Works, Blast Furnaces & Rolling & Finishing Mills": "פלדה",
    "Surety Insurance": "ביטוח ערבויות",
    "Surgical & Medical Instruments & Apparatus": "מכשור רפואי וכירורגי",
    "Telephone & Telegraph Apparatus": "ציוד טלפוניה",
    "Telephone Communications (No Radiotelephone)": "טלפוניה",
    "Tires & Inner Tubes": "צמיגים",
    "Totalizing Fluid Meters & Counting Devices": "מונים ומדי זרימה",
    "Transportation Services": "שירותי תחבורה",
    "Truck & Bus Bodies": "מרכבים למשאיות ואוטובוסים",
    "Trucking (No Local)": "הובלה במשאיות",
    "Watches, Clocks, Clockwork Operated Devices/Parts": "שעונים",
    "Water Supply": "מים",
    "Water, Sewer, Pipeline, Comm & Power Line Construction": "בניית תשתיות מים, צנרת וחשמל",
    "Wholesale-Computers & Peripheral Equipment & Software": "סיטונאות מחשבים ותוכנה",
    "Wholesale-Drugs, Proprietaries & Druggists' Sundries": "סיטונאות תרופות",
    "Wholesale-Industrial Machinery & Equipment": "סיטונאות מכונות",
    "Wholesale-Lumber & Other Construction Materials": "סיטונאות חומרי בניין",
    "Wholesale-Machinery, Equipment & Supplies": "סיטונאות ציוד",
    "Wholesale-Motor Vehicles & Motor Vehicle Parts & Supplies": "סיטונאות רכב וחלקים",
    "Wholesale-Petroleum & Petroleum Products (No Bulk Stations)": "סיטונאות דלק",
  };

  // ---------- sectors (also used inside other texts) ----------
  const sectors = {
    "Information Technology": "טכנולוגיה",
    "Communication Services": "תקשורת",
    "Consumer Discretionary": "צריכה (לא חיונית)",
    "Consumer Staples": "צריכה בסיסית",
    "Health Care": "בריאות",
    "Financials": "פיננסים",
    "Industrials": "תעשייה",
    "Energy": "אנרגיה",
    "Materials": "חומרי גלם",
    "Utilities": "תשתיות (חשמל, מים, גז)",
    "Real Estate": "נדל״ן",
    "Other": "אחר",
  };

  // ---------- 8-K event types ----------
  const events = {
    "material agreement": "הסכם מהותי",
    "agreement terminated": "הסכם בוטל",
    "bankruptcy": "פשיטת רגל",
    "acquisition or sale completed": "רכישה או מכירה הושלמה",
    "results of operations": "תוצאות כספיות",
    "new debt": "חוב חדש",
    "restructuring charges": "הוצאות ארגון מחדש",
    "impairment": "מחיקת שווי",
    "delisting notice": "הודעה על מחיקה מהמסחר",
    "unregistered share sale": "מכירת מניות פרטית",
    "shareholder rights changed": "שינוי בזכויות בעלי המניות",
    "auditor change": "החלפת רואה חשבון",
    "restatement: prior financials unreliable": "תיקון דוחות: דוחות קודמים לא אמינים",
    "change in control": "שינוי שליטה",
    "executive or director change": "שינוי בהנהלה או בדירקטוריון",
    "charter or bylaws amended": "שינוי בתקנון",
    "shareholder vote": "הצבעת בעלי מניות",
    "Reg FD disclosure": "פרסום מידע לציבור",
    "other event": "אירוע אחר",
    "exhibits": "נספחים",
  };
  const FORM = { "8-K": "דיווח מיידי 8-K", "10-Q": "דוח רבעוני 10-Q", "10-K": "דוח שנתי 10-K", "10-K405": "דוח שנתי 10-K" };
  const eventItem = (s) => { const m = /^item (\d\.\d\d)$/.exec(s); return m ? `סעיף ${m[1]}` : null; };

  // ---------- insider roles, word by word ----------
  const ROLE = {
    "director": "דירקטור", "dir": "דירקטור", "10% owner": "בעל 10% מהמניות",
    "ceo": "מנכ״ל", "chief executive officer": "מנכ״ל", "co-ceo": "מנכ״ל משותף", "co-chief executive officer": "מנכ״ל משותף",
    "cfo": "סמנכ״ל כספים", "chief financial officer": "סמנכ״ל כספים", "interim cfo": "סמנכ״ל כספים זמני",
    "coo": "סמנכ״ל תפעול", "chief operating officer": "סמנכ״ל תפעול",
    "cao": "חשב ראשי", "chief accounting officer": "חשב ראשי", "principal accounting officer": "חשב ראשי", "chief  accounting officer": "חשב ראשי",
    "clo": "יועץ משפטי ראשי", "chief legal officer": "יועץ משפטי ראשי", "deputy clo": "סגן יועץ משפטי ראשי",
    "cto": "סמנכ״ל טכנולוגיות", "chief technology officer": "סמנכ״ל טכנולוגיות",
    "cmo": "סמנכ״ל שיווק", "chief marketing officer": "סמנכ״ל שיווק", "chief medical officer": "מנהל רפואי ראשי",
    "chief scientific officer": "מדען ראשי", "chief strategy officer": "סמנכ״ל אסטרטגיה", "chief revenue officer": "סמנכ״ל הכנסות",
    "chief commercial officer": "סמנכ״ל מסחרי", "chief business officer": "סמנכ״ל פיתוח עסקי", "chief product officer": "סמנכ״ל מוצר",
    "chief human resources officer": "סמנכ״ל משאבי אנוש", "chro": "סמנכ״ל משאבי אנוש", "head of human resources": "ראש משאבי אנוש",
    "chief administrative officer": "סמנכ״ל מנהלה", "chief risk officer": "מנהל סיכונים ראשי", "chief credit officer": "מנהל אשראי ראשי",
    "chief development officer": "סמנכ״ל פיתוח", "chief discovery officer": "סמנכ״ל מחקר", "chief services officer": "סמנכ״ל שירותים",
    "chief of staff": "ראש מטה", "chief actuary": "אקטואר ראשי", "cco": "סמנכ״ל מסחרי", "cso": "סמנכ״ל אסטרטגיה", "cpo": "סמנכ״ל מוצר",
    "chairman": "יו״ר", "chairman of the board": "יו״ר הדירקטוריון", "executive chairman": "יו״ר פעיל",
    "founder": "מייסד", "president": "נשיא",
    "evp": "סגן נשיא ראשי", "executive vice president": "סגן נשיא ראשי", "sr. executive vice president": "סגן נשיא ראשי",
    "svp": "סגן נשיא בכיר", "senior vice president": "סגן נשיא בכיר", "senior vp": "סגן נשיא בכיר", "sr. vice president": "סגן נשיא בכיר", "sr. vp": "סגן נשיא בכיר",
    "vp": "סגן נשיא", "vice president": "סגן נשיא", "vice president finance": "סגן נשיא לכספים",
    "general counsel": "יועץ משפטי", "gc": "יועץ משפטי", "secretary": "מזכיר החברה", "corp secretary": "מזכיר החברה", "corp. secretary": "מזכיר החברה",
    "sec": "מזכיר החברה", "sec.": "מזכיר החברה", "secy": "מזכיר החברה", "secty": "מזכיר החברה", "corp sec": "מזכיר החברה", "corp. sec.": "מזכיר החברה",
    "treasurer": "גזבר", "controller": "חשב", "corp. controller": "חשב", "finance": "כספים", "operations": "תפעול",
    "see remarks": "ראו הערות בדיווח",
    "vice chairman": "סגן יו״ר", "vice chair": "סגן יו״ר", "chief information officer": "סמנכ״ל מערכות מידע", "cio": "סמנכ״ל מערכות מידע",
    "general manager": "מנהל כללי", "gm": "מנהל כללי", "chief people officer": "סמנכ״ל משאבי אנוש", "government affairs": "קשרי ממשל",
    "business development": "פיתוח עסקי", "chief investment officer": "מנהל השקעות ראשי", "chief compliance officer": "מנהל ציות ראשי",
    "chief information security officer": "מנהל אבטחת מידע ראשי", "chief digital officer": "סמנכ״ל דיגיטל", "chief communications officer": "סמנכ״ל תקשורת",
    "principal financial officer": "סמנכ״ל כספים", "principal executive officer": "מנכ״ל", "corporate affairs": "ענייני תאגיד",
    "chief customer officer": "סמנכ״ל לקוחות", "chief growth officer": "סמנכ״ל צמיחה", "chief innovation officer": "סמנכ״ל חדשנות",
    "chief transformation officer": "סמנכ״ל טרנספורמציה", "chief sustainability officer": "סמנכ״ל קיימות", "chief supply chain officer": "סמנכ״ל שרשרת אספקה",
    "chairman and ceo": "יו״ר ומנכ״ל", "accounting": "חשבונאות", "chief mining engineer": "מהנדס כרייה ראשי",
    "chief legal officer & secy": "יועץ משפטי ראשי, מזכיר החברה", "corp. controller": "חשב", "human resources": "משאבי אנוש", "global sales": "מכירות גלובליות", "sales": "מכירות",
  };
  function role(s) {
    let t = s.trim().replace(/\s+/g, " ");
    let former = false;
    if (/^former /i.test(t)) { former = true; t = t.slice(7); }
    const parts = t.split(/\s*,\s*(?:and\s+|&\s*)?|\s+&\s+|\s+and\s+|\s*\/\s*/i).filter(Boolean);
    if (!parts.length) return null;
    const out = [];
    let unknown = false;
    for (const p of parts) {
      let k = p.toLowerCase().replace(/\.$/, "");
      const pre = /^(svp|evp|sr\. vp|vp)\s*-\s*(.+)$/i.exec(p);
      if (pre) k = pre[2].toLowerCase();
      const h = ROLE[k] || ROLE[k + "."] || (/^interim /.test(k) && ROLE[k.slice(8)] ? ROLE[k.slice(8)] + " זמני" : null);
      const head = !h && /^(ceo|cfo|coo|president|evp|svp|vp)\b[\s-]*(.+)$/i.exec(p);
      if (head) { out.push(`${ROLE[head[1].toLowerCase()]} (${FSI}${head[2]}${PDI})`); continue; }
      if (!h) { if (!out.length) return null; unknown = true; continue; }  // must start like a title
      out.push(pre ? `${ROLE[pre[1].toLowerCase()]}, ${h}` : h);
    }
    if (!out.length) return null;
    let u = [...new Set(out)].join(", ") + (former ? " לשעבר" : "");
    // Part of the title is not in the list: the Hebrew we know, and the full title as filed.
    if (unknown) u += ` (${FSI}${s.trim()}${PDI})`;
    return u;
  }


  // ---------- texts with values in them ----------
  const N = "([+\\-−]?\\$?[+\\-−]?\\d[\\d,]*(?:\\.\\d+)?(?:[KMBT]|%)?)";
  const D = "((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{1,2}, \\d{4})";
  const Q = "(Q[1-4] (?:\\d{4}|’\\d\\d))";
  const X = "(.+?)";
  const T = "([A-Z][A-Z0-9.\\-]{0,9}(?: / [A-Z][A-Z0-9.\\-]{0,9})*)";  // ticker(s)
  const patterns = [];
  const P = (src, fn) => patterns.push([new RegExp("^" + src.replace(/\{N\}/g, N).replace(/\{D\}/g, D).replace(/\{Q\}/g, Q).replace(/\{X\}/g, X).replace(/\{T\}/g, T) + "$"), fn]);
  const plural = (n, one, many) => (String(n).replace(/[^\d.]/g, "") === "1" ? one : many);

  // time
  P("(\\d+) min ago", (m) => `לפני ${m[1]} דק׳`);
  P("(\\d+) h ago", (m) => (m[1] === "1" ? "לפני שעה" : `לפני ${m[1]} שעות`));
  P("(\\d+) d ago", (m) => (m[1] === "1" ? "אתמול" : `לפני ${m[1]} ימים`));
  P("(Live|Delayed) · SEC checked (.+)", (m, v) => `${m[1] === "Live" ? "בזמן אמת" : "בעיכוב"} · נבדק ${v(m[2])}`);
  P("Snapshot · SEC data {D}", (m, v) => `עותק שמור · נתוני SEC מ-${v(m[1])}`);
  P("checked (.+)", (m, v) => `נבדק ${v(m[1])}`);
  P("Saved copy · prices as of ((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{1,2}), (\\d{1,2}:\\d\\d [AP]M) ET", (m, v) => `עותק שמור · מחירים מ-${v(m[1])}, ${v(m[2])} שעון ניו יורק`);
  P("(Real-time|Delayed up to 5 min) · (\\d{1,2}:\\d\\d [AP]M) ET", (m, v) => `${v(m[1])} · ${v(m[2])} שעון ניו יורק`);
  P("At close · ((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{1,2}),? (\\d{1,2}:\\d\\d [AP]M) ET", (m, v) => `בסגירה · ${v(m[1])}, ${v(m[2])} שעון ניו יורק`);
  P("((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{1,2}),? (\\d{1,2}:\\d\\d [AP]M) ET", (m, v) => `${v(m[1])}, ${v(m[2])} שעון ניו יורק`);
  P("(\\d{1,2}:\\d\\d [AP]M) ET", (m, v) => `${v(m[1])} שעון ניו יורק`);

  // chips, home
  P("{N} small caps", (m, v) => `${v(m[1])} חברות קטנות`);
  P("13F reported equity holdings · ([\\d,]+) securities", (m, v) => `מניות שדווחו בדוח 13F · ${v(m[1])} ניירות ערך`);
  P("Holdings as of {D} · last filed {D}", (m, v) => `אחזקות נכון ל-${v(m[1])} · דווח לאחרונה ב-${v(m[2])}`);
  P("since {Q}", (m, v) => `מאז ${v(m[1])}`);
  P("Top (\\d+), last quarter:", (m) => `${m[1]} הגדולות, ברבעון האחרון:`);
  P("Top (\\d+) at today’s prices:", (m) => `${m[1]} הגדולות לפי המחירים של היום:`);
  P("{N} added, {N} trimmed", (m, v) => `ב-${v(m[1])} חברות הגדילו, ב-${v(m[2])} הקטינו`);
  P("vs {D}", (m, v) => `מול ${v(m[1])}`);
  P("vs {Q}", (m, v) => `מול ${v(m[1])}`);
  P("Top (\\d+) company holdings", (m) => `${m[1]} האחזקות הגדולות בחברות`);
  P("Operating companies only \\(ETFs and funds excluded\\), ranked by market value on {D}", (m, v) => `רק חברות פעילות (בלי קרנות סל וקרנות), לפי השווי ב-${v(m[1])}`);
  P("{N} of {N} holdings", (m, v) => `${v(m[1])} מתוך ${v(m[2])} אחזקות`);
  P("{N} holdings", (m, v) => `${v(m[1])} אחזקות`);
  P("Top (\\d+) value", (m) => `שווי ${m[1]} הגדולות`);
  P("Top (\\d+) share of book", (m) => `חלק ${m[1]} הגדולות מהתיק`);
  P("Median stake, top (\\d+)", (m) => `חלק טיפוסי מהחברה (חציון), ${m[1]} הגדולות`);
  P("Next 13F \\({Q}\\)", (m, v) => `דוח 13F הבא (${v(m[1])})`);
  P("due {D}, in (\\d+) days?", (m, v) => `עד ${v(m[1])}, ${m[2] === "1" ? "מחר" : `בעוד ${m[2]} ימים`}`);
  P("all ([\\d,]+) securities", (m, v) => `כל ${v(m[1])} ניירות הערך`);
  P("top (\\d+)", (m) => `${m[1]} הגדולות`);
  P("Show top (\\d+)", (m) => `הצגת ${m[1]} הראשונות`);
  P("Show (\\d+) more", (m) => `עוד ${m[1]}`);
  P("Notifications, (\\d+) new", (m) => `התראות, ${m[1]} חדשות`);
  P("([\\d,]+) securities", (m, v) => `${v(m[1])} ניירות ערך`);
  P("{N} shares", (m, v) => `${v(m[1])} מניות`);
  P("Up (\\d+) places?", (m) => (m[1] === "1" ? "עלתה מקום אחד" : `עלתה ${m[1]} מקומות`));
  P("Down (\\d+) places?", (m) => (m[1] === "1" ? "ירדה מקום אחד" : `ירדה ${m[1]} מקומות`));
  P("{N} held", (m, v) => `${v(m[1])} בידיהן`);
  P("{N} held by {X}", (m, v) => `${v(m[1])} בידי ${v(m[2])}`);
  P("BlackRock {N}, Vanguard {N}, State Street {N}", (m, v) => `בלקרוק ${v(m[1])}, ואנגארד ${v(m[2])}, סטייט סטריט ${v(m[3])}`);
  P("BlackRock, Vanguard, State Street chart", () => "גרף בלקרוק, ואנגארד, סטייט סטריט");
  P("{Q} filings:", (m, v) => `הדיווחים של ${v(m[1])}:`);
  P("{Q} 13F filings", (m, v) => `דוחות 13F של ${v(m[1])}`);
  P("{Q} value", (m, v) => `שווי ב-${v(m[1])}`);
  P("Added or trimmed means the share count moved by more than 0\\.5%\\. For index funds that mostly reflects fund flows and index changes rather than stock picking\\. Share counts are split-adjusted\\. Price return is the change in the quarter-end price implied by the filings \\(value ÷ shares\\) and excludes dividends and spin-offs\\.", () =>
    "״הגדילו״ או ״הקטינו״ = מספר המניות השתנה ביותר מ-0.5%. בקרנות מדד זה בעיקר כסף שנכנס או יצא מהקרן ושינויים במדד, לא בחירה של מניות. מספרי המניות מתוקנים לפיצולים. שינוי המחיר מחושב מהדוחות (שווי ÷ מניות) בסוף כל רבעון, בלי דיבידנדים ובלי פיצולי חברה.");
  P("Trailing twelve months from 10-K and 10-Q XBRL data\\. Shading ranks each metric within this list \\(darker is higher\\)\\. P/E, P/S and FCF yield use the {Q} quarter-end price against results for periods ending by then\\. n\\.m\\. means not meaningful: a loss-making base, or a bank or insurer where the ratio does not apply\\.", (m, v) =>
    `12 החודשים האחרונים, מהדוחות הכספיים (10-K ו-10-Q). הצבע מדרג כל נתון בתוך הרשימה (כהה יותר = גבוה יותר). מכפיל רווח, מכפיל מכירות ותשואת תזרים מחושבים לפי המחיר בסוף ${v(m[1])} מול הדוחות עד אז. ״לא רלוונטי״ = חברה בהפסד, או בנק או חברת ביטוח שהנתון לא מתאים להם.`);
  P("Every Form 13F-HR from BlackRock \\((\\d+) registrants\\), Vanguard \\((\\d+) advisers; (.+)", (m) => null);
  P("Stock splits and CUSIP changes are detected from the filings and adjusted, so share counts compare across time\\. Funds and ETFs are identified with OpenFIGI and excluded\\.", () =>
    "פיצולי מניות ושינויי CUSIP מזוהים מהדוחות ומתוקנים, כך שאפשר להשוות מספרי מניות לאורך זמן. קרנות וקרנות סל מזוהות בעזרת OpenFIGI ולא נכללות.");
  P("Fundamentals come from the XBRL data companies file with their 10-Q and 10-K\\. Schedule 13G stakes come from the managers’ ownership filings, which arrive between 13F reports\\.", () =>
    "הדוחות הכספיים נלקחים מהנתונים שהחברות מגישות עם הדוחות הרבעוניים והשנתיים (10-Q ו-10-K). דיווחי האחזקה (13G) מגיעים מהדיווחים של המנהלות, בין דוחות ה-13F.");
  P("The hosted version re-reads EDGAR every 5 minutes and refreshes this page when a new 13F, 13G, 10-Q or 10-K appears\\. 13F reports lag the quarter by up to 45 days and cover US-listed long positions only\\. Not investment advice\\.", () =>
    "האתר בודק את מאגר ה-SEC כל 5 דקות ומתעדכן כשמגיע דוח חדש (13F, 13G, 10-Q או 10-K). דוח 13F מגיע עד 45 יום אחרי סוף הרבעון, וכולל רק מניות שנסחרות בארה״ב. זו לא המלצה להשקעה.");
  P("TriQ is an independent project, not affiliated with BlackRock, Vanguard or State Street\\.", () =>
    "TriQ הוא פרויקט עצמאי, בלי קשר לבלקרוק, לוואנגארד או לסטייט סטריט.");

  // feed
  P("{T} (quarterly|annual) report", (m) => `דוח ${m[2] === "annual" ? "שנתי" : "רבעוני"} של ${FSI}${m[1]}${PDI}`);
  P("{X} · period ended {D}", (m, v) => `${v(m[1])} · לתקופה שהסתיימה ב-${v(m[2])}`);
  P("period ended {D}", (m, v) => `לתקופה שהסתיימה ב-${v(m[1])}`);
  P("(BlackRock|Vanguard|State Street) holdings for {Q}", (m, v) => `האחזקות של ${v(m[1])} ל-${v(m[2])}`);
  P("(BlackRock|Vanguard|State Street) notice: reported by affiliates", (m, v) => `${v(m[1])}: הודעה, דווח על ידי חברות קשורות`);
  P("(BlackRock|Vanguard|State Street) owns {N} of {T}", (m, v) => `${v(m[1])} מחזיקה ${v(m[2])} מ-${m[3]}`);
  P("{X} · as of {D}", (m, v) => `${v(m[1])} · נכון ל-${v(m[2])}`);
  P("as of {D}", (m, v) => `נכון ל-${v(m[1])}`);
  P("{T} portfolio as of {D}", (m, v) => `התיק של ${m[1]} נכון ל-${v(m[2])}`);
  P("{X} · {N} net assets", (m, v) => `${v(m[1])} · נכסים ${v(m[2])}`);
  P("{X} · ((?:\\d+-[KQ]|8-K)(?:/A)?|10-K405)", (m, v) => `${v(m[1])} · ${FORM[m[2].replace("/A", "")] || m[2]}${m[2].endsWith("/A") ? " (תיקון)" : ""}`);
  P("{T}: (.+)", (m, v) => {
    const parts = m[2].split(", ");
    const h = parts.map((p) => events[p] || eventItem(p));
    return h.every(Boolean) ? `${FSI}${m[1]}${PDI}: ${h.join(", ")}` : null;
  });

  // home: about list item with registrants (kept close to the English)
  P("Every Form 13F-HR from BlackRock \\((\\d+) registrants\\), Vanguard \\((\\d+) advisers; (.+)", () => null);

  // company page
  P("{T} • ([A-Za-z ]+)", (m) => `${m[1]} • ${m[2]}`);
  P("Every SEC filing by {T} \\(8-K, 10-Q/10-K, Big Three 13G/13D\\) is pushed to its own channel\\. In the free ntfy app \\(", (m) =>
    `כל דיווח ל-SEC של ${m[1]} (8-K, 10-Q/10-K, ודיווחי 13G/13D של שלוש הגדולות) נשלח לערוץ משלו. באפליקציה החינמית ntfy (`);
  P("Follow {T} to get a browser notification for each of its filings while TriQ is open\\.", (m) => `עקבו אחרי ${m[1]} כדי לקבל התראה בדפדפן על כל דיווח שלה, כש-TriQ פתוח.`);
  P("☆ Follow {T}", (m) => `☆ הוספה למעקב: ${m[1]}`);
  P("{T} is in your watchlist, so its new filings show as browser notifications while TriQ is open once browser notifications are on \\(bell, top right\\)\\.", (m) =>
    `${m[1]} ברשימת המעקב שלכם, אז הדיווחים החדשים שלה יופיעו כהתראות בדפדפן כש-TriQ פתוח, אחרי שתפעילו התראות בדפדפן (הפעמון, למעלה).`);
  P("{T} added to your watchlist", (m) => `${m[1]} נוספה לרשימת המעקב`);
  P("{T} removed from your watchlist", (m) => `${m[1]} הוסרה מרשימת המעקב`);
  P("Remove {T}", (m) => `הסרת ${m[1]}`);
  P("All {T} filings on EDGAR", (m) => `כל הדיווחים של ${m[1]} ב-SEC`);
  P("More (" + Object.keys(sectors).map((k) => k.replace(/ /g, "\\s")).join("|") + ")", (m, v) => `עוד בענף ${v(m[1])}`);
  P("No other top-(\\d+) holdings in this sector\\.", () => "אין עוד אחזקות גדולות בענף הזה.");
  P("No other top-\\$\\{D\\.meta\\.topN\\} holdings in this sector\\.", () => "אין עוד אחזקות גדולות בענף הזה.");
  P("Previous: {X}", (m, v) => `הקודמת: ${v(m[1])}`);
  P("Next: {X}", (m, v) => `הבאה: ${v(m[1])}`);
  P("‹ {T}", (m) => `${m[1]} ›`);
  P("{T} ›", (m) => `‹ ${m[1]}`);
  P("· 13F quarter-end price {N} on {D}", (m, v) => `· מחיר סוף רבעון לפי 13F: ${v(m[1])} ב-${v(m[2])}`);
  P("{N} of the way from low to high", (m, v) => `${v(m[1])} מהדרך בין הנמוך לגבוה`);
  P("Quarter ended {D}", (m, v) => `רבעון שהסתיים ב-${v(m[1])}`);
  P("{N} margin", (m, v) => `${v(m[1])} מההכנסות`);
  P("{N} pts", (m, v) => `${v(m[1])} נק׳ אחוז`);
  P("{N} pp", (m, v) => `${v(m[1])} נק׳ אחוז`);
  P("Form 4 · last (\\d+) days", (m) => `דיווחי בעלי עניין (טופס 4) · ${m[1]} הימים האחרונים`);
  P("Form 4", () => "טופס 4");
  const count = (n, one, many) => (n === "0" ? "" : n === "1" ? one : `${n} ${many}`);
  P("(\\d+) trades?, (\\d+) insiders?", (m) => (m[1] === "0" ? "" : `${count(m[1], "עסקה אחת", "עסקאות")}, ${count(m[2], "בעל עניין אחד", "בעלי עניין")}`));
  P("(\\d+) trades?", (m) => count(m[1], "עסקה אחת", "עסקאות"));
  P("{N} owner", (m, v) => `בעל ${v(m[1])} מהמניות`);
  P("Bought {N} · sold {N}", (m, v) => `קנו ${v(m[1])} · מכרו ${v(m[2])}`);
  P("No open-market purchases or sales by officers, directors or 10% owners in the last (\\d+) days\\.", (m) => `אין קניות או מכירות בבורסה של מנהלים, דירקטורים או בעלי 10% ב-${m[1]} הימים האחרונים.`);
  P("Open-market purchases and sales only; stock awards, option exercises, tax withholding and gifts are left out\\. (\\d+) recent Form 4 filings are still being read and will appear after the next refreshes\\.", (m) =>
    `רק קניות ומכירות בבורסה. מניות שקיבלו כשכר, מימוש אופציות, ניכוי מס ומתנות לא נכללים. ${m[1] === "1" ? "דיווח חדש אחד (טופס 4) עוד בקריאה, ויופיע" : m[1] + " דיווחים חדשים (טופס 4) עוד בקריאה, ויופיעו"} בעדכונים הבאים.`);
  P("(\\d+) recent Form 4 filings are still being read and will appear after the next refreshes\\.", (m) => `${m[1] === "1" ? "דיווח חדש אחד (טופס 4) עוד בקריאה, ויופיע" : m[1] + " דיווחים חדשים (טופס 4) עוד בקריאה, ויופיעו"} בעדכונים הבאים.`);
  P("{X}: {N} now, {N} a year ago", (m, v) => `${v(m[1])}: ${v(m[2])} היום, ${v(m[3])} לפני שנה`);
  P("{X}: {N} now, not held a year ago", (m, v) => `${v(m[1])}: ${v(m[2])} היום, לא החזיקה לפני שנה`);
  P("{N} owned by the Big Three", (m, v) => `${v(m[1])} בידי שלוש הגדולות`);
  P("of the class as of {D} ·", (m, v) => `ממניות הסוג הזה, נכון ל-${v(m[1])} ·`);
  P("of the class as of {D}", (m, v) => `ממניות הסוג הזה, נכון ל-${v(m[1])}`);
  P("filed {D}", (m, v) => `דווח ב-${v(m[1])}`);
  P("Filed {D}", (m, v) => `דווח ב-${v(m[1])}`);
  P("from {Q}", (m, v) => `מ-${v(m[1])}`);
  P("Share counts split-adjusted for (.+)\\.", (m, v) => {
    const kind = (r) => (/^1:/.test(r) ? "איחוד" : "פיצול");
    const parts = m[1].split(" and ").map((x) => /^(\d+:\d+) in (Q[1-4] \d{4})$/.exec(x));
    return parts.every(Boolean) ? `מספרי המניות מתוקנים ל${parts.map((p) => `${kind(p[1])} ${iso(p[1])} ב-${v(p[2])}`).join(" ול")}.` : null;
  });
  P("(\\d+)-for-1 split in {Q}; earlier share counts are multiplied by (\\d+)\\.", (m, v) => `פיצול מניות ${m[1]} ל-1 ב-${v(m[2])}. מספרי המניות לפני כן מוכפלים ב-${m[3]}.`);
  P("1-for-(\\d+) reverse split in {Q}; earlier share counts are divided by (\\d+)\\.", (m, v) => `איחוד מניות 1 ל-${m[1]} ב-${v(m[2])}. מספרי המניות לפני כן מחולקים ב-${m[3]}.`);
  P("CUSIP changed from (\\w+) after {Q}; both lines are joined into one history\\.", (m, v) => `ה-CUSIP השתנה מ-${m[1]} אחרי ${v(m[2])}, ושתי השורות חוברו להיסטוריה אחת.`);
  P("{X} has more than one listed share class \\((.+)\\)\\. 13F filings report each separately; stakes here are measured against all (.+)", () => null);
  P("Fundamentals use the predecessor registrant \\(CIK (\\d+)\\) until the new holding company has a full year of its own reports\\.", (m) => `הדוחות הכספיים לקוחים מהחברה הקודמת (CIK ${m[1]}) עד שלחברה החדשה תהיה שנה מלאה של דוחות.`);
  P("of {T},", (m) => `מ-${m[1]},`);
  P("first held within the last year: ipo, spin-off or index entry\\.", () => "התחילו להחזיק רק בשנה האחרונה: הנפקה, פיצול חברה או כניסה למדד.");
  P("one quarter added most of the gain \\(2\\+ points\\), typical of an index addition\\.", () => "רבעון אחד הביא את רוב העלייה (2 נקודות ומעלה), כמו שקורה בכניסה למדד.");
  P("at least three of the last four quarters each added 0\\.75 points or more\\.", () => "לפחות 3 מ-4 הרבעונים האחרונים הוסיפו כל אחד 0.75 נקודות או יותר.");
  P("stake higher than a year ago, without a clear pattern\\.", () => "האחזקה גבוהה יותר מלפני שנה, בלי דפוס ברור.");
  P("{X}:", (m, v) => (MGR_LIKE.test(m[1]) ? `${v(m[1])}:` : null));
  P("past (\\d+) (days|months|years)", (m) => `ב-${m[1]} ה${{ days: "ימים", months: "חודשים", years: "שנים" }[m[2]]} האחרונים`);
  P("The page for {X} isn’t available\\. (.+)", () => null);

  // emerging
  P("Small companies trading at {N}–{N} where BlackRock, Vanguard and State Street together own a growing share of the company", (m, v) =>
    `חברות קטנות שנסחרות ב-${v(m[1])} עד ${v(m[2])}, שבלקרוק, ואנגארד וסטייט סטריט מחזיקות בהן יחד חלק שהולך וגדל`);
  P("companies match · 13F data as of {D}", (m, v) => `חברות מתאימות · נתוני 13F נכון ל-${v(m[1])}`);
  P("Since the last 13F deadline \\({D}\\), the median stock on this list moved", (m, v) => `מאז המועד האחרון לדוח 13F (${v(m[1])}), המחיר של המניה החציונית ברשימה השתנה ב-`);
  P("\\((\\d+) with price history\\), against", (m) => `(${m[1]} מניות עם היסטוריית מחירים), מול`);
  P("for the Big Three top (\\d+)\\. One period is not a backtest, but it is the honest test of following these filings\\.", (m) => `ל-${m[1]} האחזקות הגדולות של שלוש הגדולות. תקופה אחת היא לא בדיקה היסטורית, אבל זו הבדיקה הכנה של מעקב אחרי הדוחות האלה.`);
  P("Micro · under {N}", (m, v) => `זעירות · עד ${v(m[1])}`);
  P("Small · {N}–{N}", (m, v) => `קטנות · ${v(m[1])} עד ${v(m[2])}`);
  P("Mid · {N}–{N}", (m, v) => `בינוניות · ${v(m[1])} עד ${v(m[2])}`);
  P("from {N}", (m, v) => `מ-${v(m[1])}`);
  P("up to {N}", (m, v) => `עד ${v(m[1])}`);
  P("up to {N} \\(all\\)", (m, v) => `עד ${v(m[1])} (הכול)`);
  P("Insiders bought \\((\\d+) days\\)", (m) => `בעלי עניין קנו (${m[1]} ימים)`);
  P("Δ Big Three stake, 1 year", () => "שינוי בחלק הגדולות בחברה, שנה");
  P("Δ Big Three stake, 1 quarter", () => "שינוי בחלק הגדולות בחברה, רבעון");
  P("Net buying, 1 year", () => "קניות פחות מכירות, שנה");
  P("Insider buying, (\\d+) days", (m) => `קניות בעלי עניין, ${m[1]} ימים`);
  P("Insiders (\\d+)d", (m) => `בעלי עניין, ${m[1]} יום`);
  P("Listed < (\\d+) yrs", (m) => `נסחרת פחות מ-${m[1]} שנים`);
  P("Share count \\+(\\d+)%", (m) => `מספר המניות ${iso("+" + m[1] + "%")}`);
  P("Files (.+); fewer disclosures", (m) => `חברה זרה: מדווחת בטפסים ${iso(m[1])}, ולכן מפרסמת פחות מידע`);
  P("Show all (\\d+) companies", (m) => `כל ${m[1]} החברות`);
  P("{N} of {N}", (m, v) => `${v(m[1])} מתוך ${v(m[2])}`);
  P("a year", () => "בשנה");
  P("Passed: stake up ≥ {N} pp in a year", (m, v) => `עברו: החלק בחברה עלה ב-${v(m[1])} נק׳ אחוז ומעלה בשנה`);
  P("Stake = combined shares held by the three managers ÷ shares outstanding at the quarter end \\(SEC XBRL balance sheet\\), so offerings and splits do not count as buying\\.(.*)", (m) => null);
  P("Backtest {Q}–{Q}: each quarter’s list bought at the first quarter end after its 13F was public, equal weight, rebalanced quarterly", (m, v) =>
    `בדיקה היסטורית ${v(m[1])} עד ${v(m[2])}: הרשימה של כל רבעון נקנתה בסוף הרבעון הראשון אחרי שדוח ה-13F פורסם, סכום שווה לכל מניה, ועדכון כל רבעון`);
  P("{X} ETFs from the Big Three:", (m, v) => `קרנות סל של שלוש הגדולות בענף ${v(m[1])}:`);
  P("Class ([A-Z0-9]{1,2})(?: ([A-Z0-9 ]+))?", (m) => `מניה מסוג ${m[1]}${m[2] ? " " + FSI + m[2] + PDI : ""}`);
  P("Sector: {X}", (m, v) => `ענף: ${v(m[1])}`);
  P("{X}: largest holdings", (m, v) => `${v(m[1])}: האחזקות הגדולות`);
  P("{N} funds · tap one for its largest holdings", (m, v) => `${v(m[1])} קרנות · לחצו על קרן כדי לראות את האחזקות הגדולות שלה`);
  P("as of {D} · {N} positions ·", (m, v) => `נכון ל-${v(m[1])} · ${v(m[2])} אחזקות ·`);
  P("\\({N} bonds combined\\)", (m, v) => `(${v(m[1])} אג״ח ביחד)`);
  P("\\({N} lines combined\\)", (m, v) => `(${v(m[1])} שורות ביחד)`);
  P("By issuer: (.+) {N} \\({N} bonds\\)\\. The largest individual bonds:", (m, v) => `לפי גוף מנפיק: ${m[1] === "United States of America" ? "ממשלת ארה״ב" : v(m[1])} ${v(m[2])} (${v(m[3])} אג״ח). האג״ח הגדולות:`);
  P("{X} · {N} fund size", (m, v) => `${v(m[1])} · גודל הקרן ${v(m[2])}`);
  P("(\\d+)-year return", (m) => (m[1] === "1" ? "תשואה בשנה" : `תשואה ב-${m[1]} שנים`));
  P("{X} ([↑↓])", (m, v) => { const t = { ROE: "תשואה על ההון" }[m[1]] || v(m[1]); return t.startsWith("\u2068") ? null : `${t} ${m[2]}`; });
  P("Fund size and holdings: (.+)", () => null);
  P("U\\.S\\. Treasury Bonds ([\\d.]+)% due (\\d{4}-\\d\\d-\\d\\d)", (m) => `אג״ח ממשלת ארה״ב, ריבית ${iso(m[1] + "%")}, פירעון ${iso(m[2].split("-").reverse().map(Number).join("."))}`);

  // watchlist
  P("Since 13F is the price change from the quarter-end price in the latest 13F \\({D}\\)\\. Each company page has a 🔔 Alerts button for its phone channel\\.", (m, v) =>
    `״מאז דוח 13F״ = השינוי במחיר מאז סוף הרבעון של דוח ה-13F האחרון (${v(m[1])}). בכל עמוד חברה יש כפתור 🔔 התראות לערוץ שלה בטלפון.`);
  P("No holding matches “(.+)”\\. TriQ covers the Big Three’s largest company holdings\\.", (m) => `אין אחזקה שמתאימה ל״${m[1]}״. TriQ מכסה את האחזקות הגדולות של שלוש הגדולות. שמות החברות כתובים באנגלית, למשל Apple.`);

  // notifications panel
  P("(BlackRock), Vanguard or State Street files its quarterly holdings", () => "בלקרוק, ואנגארד או סטייט סטריט מגישות את דוח האחזקות הרבעוני");
  P("BlackRock, Vanguard or State Street files its quarterly holdings", () => "בלקרוק, ואנגארד או סטייט סטריט מגישות את דוח האחזקות הרבעוני");
  P("A flagship index fund \\((.+)\\) publishes its portfolio", (m) => `קרן מדד מרכזית (${iso(m[1])}) מפרסמת את התיק שלה`);


  // long notes
  P("Every Form 13F-HR from BlackRock \\((\\d+) registrants\\), Vanguard \\((\\d+) advisers; Vanguard Group has reported through affiliates since {Q}\\) and State Street, {Q} to {Q}, read directly from SEC EDGAR\\. Restatements replace the original filing and new-holdings amendments add to it\\. Options and bonds are excluded\\.", (m, v) =>
    `דוח 13F הוא דוח שכל מנהלת השקעות גדולה בארה״ב מגישה כל רבעון לרשות ניירות הערך האמריקאית (SEC), עם רשימת המניות שהיא מחזיקה. כאן: כל דוחות ה-13F של בלקרוק (${m[1]} גופים מדווחים), ואנגארד (${m[2]} גופים; Vanguard Group מדווחת דרך חברות קשורות מאז ${v(m[3])}) וסטייט סטריט, מ-${v(m[4])} עד ${v(m[5])}, ישירות מה-SEC. דוח מתוקן מחליף את המקורי, ותיקון שמוסיף אחזקות מתווסף אליו. אופציות ואג״ח לא נכללים.`);
  P("Stake = combined shares held by the three managers ÷ shares outstanding at the quarter end \\(SEC XBRL balance sheet\\), so offerings and splits do not count as buying\\. pp = percentage points\\. “Buying” shows which managers raised their own stake over the year\\. Net buying is the change in shares valued at the quarter-end price\\. Prices and market caps are live\\. 13F reports lag the quarter by up to 45 days\\. Not investment advice\\.", () =>
    "חלק מהחברה = כל המניות ששלוש המנהלות מחזיקות ביחד ÷ כל המניות של החברה בסוף הרבעון (לפי המאזן), כך שהנפקות ופיצולים לא נספרים כקנייה. נק׳ = נקודות אחוז. ״קונות״ מראה אילו מנהלות הגדילו את האחזקה שלהן במשך השנה. קניות פחות מכירות = השינוי במספר המניות כפול המחיר בסוף הרבעון. המחירים ושווי השוק מתעדכנים עכשיו. דוח 13F מגיע עד 45 יום אחרי סוף הרבעון. זו לא המלצה להשקעה.");
  P("{N} in the screen became {N}, against {N} for all small caps that passed the same price and size filters, and {N} for the S&P 500\\. Over (\\d+)-month holds the screen averaged {N} a year against {N} for the small-cap universe and beat it in {N} of (\\d+) quarters: no reliable edge\\. The strongest version \\(top 25 by stake gain\\) did worst, consistent with stocks giving back gains after index inclusion\\.", (m, v) =>
    `${v(m[1])} שהושקעו בסינון הפכו ל-${v(m[2])}, מול ${v(m[3])} בכל החברות הקטנות שעברו את אותו סינון של מחיר וגודל, ו-${v(m[4])} ב-S&P 500. בהחזקה של ${m[5]} חודשים הסינון הניב בממוצע ${v(m[6])} בשנה, מול ${v(m[7])} בכל החברות הקטנות, והיה טוב יותר ב-${v(m[8])} מתוך ${m[9]} רבעונים: אין יתרון קבוע. הגרסה ״הכי חזקה״ (25 עם העלייה הגדולה באחזקה) הצליחה הכי פחות, כמו שקורה כשמניות מאבדות את העלייה אחרי כניסה למדד.`);
  P("Flagship index funds of each manager \\(S&P 500, total market, mid and small cap, Russell 2000\\)\\. Funds report each quarter-end month about 60 days later; dates differ by fiscal calendar\\. “vs prior report” compares shares with the fund’s previous public N-PORT\\.", () =>
    "קרנות המדד המרכזיות של כל מנהלת (S&P 500, כל השוק, חברות בינוניות וקטנות, ראסל 2000). הקרנות מדווחות על כל רבעון בערך 60 יום אחרי, והתאריכים שונים לפי שנת הכספים של כל קרן. ״מול הדוח הקודם״ משווה את מספר המניות לדוח הציבורי הקודם של הקרן.");
  P("Fund size and holdings: each fund’s latest Form N-PORT on SEC EDGAR \\(the whole fund, all share classes; published quarterly with a delay of about 60 days\\)\\. Prices and returns: Yahoo Finance; returns are price returns, so distributions are not included \\(for a bond fund such as TLT the total return is noticeably higher\\)\\. Fund size is the whole fund across all share classes \\(for VTI, the Vanguard Total Stock Market Index Fund including its mutual fund classes\\)\\. SPY and MDY are unit trusts that do not file N-PORT: their holdings come from State Street’s daily holdings file\\. GLD holds gold bullion\\. The iShares communication fund \\(IYZ\\) covers telecom only\\. Not investment advice\\.", () =>
    "גודל הקרן והאחזקות: מדוח N-PORT האחרון של כל קרן ב-SEC (כל הקרן, כל סוגי היחידות; מתפרסם כל רבעון, בערך 60 יום אחרי). מחירים ותשואות: Yahoo Finance. התשואות הן לפי המחיר בלבד, בלי חלוקות לבעלי היחידות (בקרן אג״ח כמו TLT התשואה המלאה גבוהה יותר). גודל הקרן כולל את כל סוגי היחידות (ב-VTI זו כל קרן Vanguard Total Stock Market, כולל הגרסאות שלה שהן קרנות נאמנות). SPY ו-MDY הן נאמנויות שלא מגישות N-PORT, ולכן האחזקות שלהן מגיעות מהקובץ היומי של סטייט סטריט. GLD מחזיקה מטילי זהב. קרן התקשורת של iShares (IYZ) כוללת רק חברות טלפוניה. זו לא המלצה להשקעה.");
  P("{X} has more than one listed share class \\((.+)\\)\\. 13F filings report each separately; stakes here are measured against all classes combined\\.", (m, v) =>
    `ל-${v(m[1])} יש יותר מסוג מניה אחד בבורסה (${m[2]}). דוחות 13F מדווחים על כל סוג בנפרד, ושיעור האחזקה כאן מחושב מול כל הסוגים ביחד.`);
  P("The page for {X} could not be loaded\\.", (m, v) => `לא הצלחנו לטעון את העמוד של ${v(m[1])}.`);
  P("• Universe and prices come from the historical 13F filings themselves \\(value / shares\\), so companies that were later acquired, delisted or went bankrupt are included\\.", () =>
    "• רשימת החברות והמחירים נלקחו מדוחות ה-13F של אותה תקופה (שווי ÷ מניות), כך שגם חברות שנרכשו, נמחקו מהמסחר או פשטו רגל אחר כך נכללות.");
  P("• Shares outstanding come from the SEC XBRL frame for that quarter, matched to the 13F issuer name, so the stake is measured as the live screen measures it\\.", () =>
    "• מספר המניות של כל חברה נלקח מנתוני ה-SEC לאותו רבעון, לפי שם החברה בדוח 13F, כך שהאחזקה מחושבת בדיוק כמו בסינון של היום.");
  P("• A quarter's 13F is public 45 days after the quarter end\\. The portfolio is bought at the next quarter end \\(the first price after the data is public\\) and held 3 or 12 months, equal weight\\.", () =>
    "• דוח 13F של רבעון מתפרסם 45 יום אחרי סוף הרבעון. התיק נקנה בסוף הרבעון הבא (המחיר הראשון אחרי שהנתונים פורסמו) ומוחזק 3 או 12 חודשים, סכום שווה לכל מניה.");
  P("• A position that leaves every Big Three book before the exit \\(takeover, delisting\\) is valued at its last 13F price; takeover premiums and bankruptcy losses after that point are not counted\\.", () =>
    "• מניה שיצאה מהתיק של כל שלוש הגדולות לפני המכירה (נרכשה או נמחקה מהמסחר) מחושבת לפי המחיר האחרון שלה ב-13F. פרמיית רכישה או הפסד מפשיטת רגל אחרי זה לא נספרים.");
  P("• Benchmarks: the same small-cap universe without the stake test \\(isolates the signal from the small-cap effect\\), IWM and SPY price returns from Yahoo Finance\\.(?: Insider buying cannot be backtested: Form 4 data is collected for the last 90 days only\\.)?", (m) =>
    "• השוואה: אותן חברות קטנות בלי סינון האחזקה (כדי להפריד בין הסינון לבין ההשפעה של חברות קטנות), ותשואת המחיר של IWM ו-SPY מ-Yahoo Finance." + (m[0].includes("Insider") ? " אי אפשר לבדוק לאחור קניות של בעלי עניין: נתוני טופס 4 נאספים רק ל-90 הימים האחרונים." : ""));
  P("S&P 500 \\(SPY\\)", () => "מדד S&P 500 (SPY)");
  P("(?:{T}|S&P 500|13F book value|13F portfolio value|Revenue|Net income|Shares held|Value held|Price)(?:,? (?:{T}|S&P 500|Russell 2000|All small caps|All three buying|Top 25|This screen|BlackRock|Vanguard|State Street))* chart", () => "גרף");

  // 13F season (only shown while the managers file a new quarter)
  P("{Q} 13F season:", (m, v) => `עונת דוחות 13F של ${v(m[1])}:`);
  P("filed {Q} on {D}", (m, v) => `הגישה את הדוח של ${v(m[1])} ב-${v(m[2])}`);
  P("{N} of {N} filing entities so far", (m, v) => `${v(m[1])} מתוך ${v(m[2])} החברות המדווחות שלה כבר דיווחו`);
  P("filed {Q} on {D}\\. The main table stays at {Q} until the other managers file\\.", (m, v) => `הגישה את הדוח של ${v(m[1])} ב-${v(m[2])}. הטבלה הראשית נשארת על ${v(m[3])} עד שהמנהלות האחרות יגישו.`);
  P("{N} of {N} filing entities so far for {Q}\\. It moves to the new quarter when every entity has reported(?: \\(waiting for (.+)\\))?\\.", (m, v) =>
    `${v(m[1])} מתוך ${v(m[2])} החברות המדווחות שלה כבר דיווחו על ${v(m[3])}. התצוגה תעבור לרבעון החדש כשכל הגופים ידווחו${m[4] ? ` (מחכים ל-${FSI}${m[4]}${PDI})` : ""}.`);
  P("\\. The tables stay at {Q} until all three have filed, so every view compares the same quarter\\.", (m, v) => `. הטבלאות נשארות על ${v(m[1])} עד ששלושתן יגישו, כדי שכל התצוגות ישוו את אותו רבעון.`);
  P("\\. The main table stays at {Q} until the other managers file\\.", (m, v) => `. הטבלה הראשית נשארת על ${v(m[1])} עד שהמנהלות האחרות יגישו.`);
  P("(Show|Hide) {Q} holdings", (m, v) => `${m[1] === "Show" ? "הצגת" : "הסתרת"} האחזקות של ${v(m[2])}`);
  P("for {Q}\\. It moves to the new quarter when every entity has reported(?: \\(waiting for (.+)\\))?\\.", (m, v) => `ל-${v(m[1])}. התצוגה תעבור לרבעון החדש כשכל הגופים ידווחו${m[2] ? ` (מחכים ל-${m[2]})` : ""}.`);
  P("{X} {Q}: top (\\d+)", (m, v) => `${v(m[1])} ${v(m[2])}: ${m[3]} הגדולות`);
  P("Filed {D} · book {N} \\(", (m, v) => `הוגש ב-${v(m[1])} · התיק ${v(m[2])} (`);
  P("vs {Q}\\) · ([\\d,]+) securities · changes against (.+)’s own {Q} filing", (m, v) => `מול ${v(m[1])}) · ${v(m[2])} ניירות ערך · השינויים מול הדוח של ${v(m[3])} עצמה ל-${v(m[4])}`);
  P("Share counts adjusted for a (\\d+)-for-1 split", (m) => `מספר המניות מתוקן לפיצול ${m[1]} ל-1`);
  P("Share counts adjusted for a 1-for-(\\d+) reverse split", (m) => `מספר המניות מתוקן לאיחוד 1 ל-${m[1]}`);


  P("No holding matches “(.+)”\\.", (m) => `אין אחזקה שמתאימה ל״${m[1]}״. שמות החברות כתובים באנגלית, למשל Apple.`);
  P("Downloaded (\\d+) rows", (m) => `הקובץ הורד: ${m[1] === "1" ? "שורה אחת" : m[1] + " שורות"}`);
  P("Copied (.+)", (m) => `הועתק: ${iso(m[1])}`);
  P("Loading {T}…", (m) => `טוען את ${m[1]}…`);
  P("Loading the S&P 500…", () => "טוען את מדד S&P 500…");
  P("Could not load data/dashboard\\.json \\((.+)\\)\\. Run", (m) => `לא הצלחנו לטעון את הנתונים (${m[1]}). הריצו`);
  P(", then serve the web folder\\.", () => ", ואז הגישו את תיקיית web.");
  // analytics
  P("\\({N}\\)([.;,]?)", (m, v) => `(${v(m[1])})${m[2]}`);
  P(", {N} on the quarter\\.", (m, v) => `, ${v(m[1])} ברבעון.`);
  P("In the top (\\d+), (estimated )?net buying added", (m) => `ב-${m[1]} הגדולות, הקניות פחות המכירות${m[2] ? " (הערכה)" : ""} הוסיפו`);
  P("Within the top (\\d+), most buying went into", (m) => `בתוך ${m[1]} הגדולות, רוב הקניות הלכו לענף`);
  P("in the merger with {X}", (m, v) => `במיזוג עם ${v(m[1])}`);
  P("spun off from {X}", (m, v) => `שפוצלה מ-${v(m[1])}`);
  P("(?:In {Q}, t|T)hrough (their|its (iShares|Vanguard|SPDR)) sector ETFs, the most money went into", (m, v) =>
    `${m[1] ? `ב-${v(m[1])}, ` : ""}דרך קרנות הסל הענפיות ${m[2] === "their" ? "שלהן" : `שלה (${m[3]})`}, הכי הרבה כסף נכנס לענף`);
  P("Banks: (BlackRock|Vanguard|State Street) owns", (m, v) => `בנקים: ${v(m[1])} מחזיקה`);
  P("(iShares|Vanguard|SPDR) sector funds", (m) => `קרנות הענפים של ${m[1]}`);
  P("{Q}, as reported by each fund", (m, v) => `${v(m[1])}, כפי שכל קרן דיווחה`);
  P("The ETF figures are for {Q}, the latest quarter every fund has reported; the 13F column is for {Q}\\.", (m, v) => `נתוני קרנות הסל הם ל-${v(m[1])}, הרבעון האחרון שכל הקרנות כבר דיווחו עליו; עמודת ה-13F היא ל-${v(m[2])}.`);
  P("In {N}", (m, v) => `נכנסו ${v(m[1])}`);
  P("out {N}", (m, v) => `יצאו ${v(m[1])}`);
  P("(BlackRock|Vanguard|State Street) stake", (m, v) => `החלק של ${v(m[1])} בחברה`);
  P("(BlackRock|Vanguard|State Street), Δ shares × quarter-end price", (m, v) => `${v(m[1])}, שינוי במניות × מחיר בסוף הרבעון`);
  P("Stake = shares held at the end of {Q} ÷ the latest shares outstanding the company reported\\. QoQ and YoY are the (Big Three’s combined|BlackRock’s|Vanguard’s|State Street’s) changes in shares\\. Market cap and P/E use the live price with the latest reported shares and earnings\\. The first row is highlighted for comparison\\.", (m, v) => {
    const who = { "Big Three’s combined": "של שלוש הגדולות ביחד", "BlackRock’s": "של בלקרוק", "Vanguard’s": "של ואנגארד", "State Street’s": "של סטייט סטריט" }[m[2]];
    return `חלק בחברה = המניות שהוחזקו בסוף ${v(m[1])} ÷ מספר המניות האחרון שהחברה דיווחה. השינוי ברבעון ובשנה הוא השינוי במספר המניות ${who}. שווי השוק ומכפיל הרווח לפי המחיר עכשיו ומספר המניות והרווח האחרונים שדווחו. השורה הראשונה מודגשת להשוואה.`;
  });
  P("of the portfolio, against {N} a quarter earlier\\.", (m, v) => `מהתיק, מול ${v(m[1])} רבעון קודם.`);
  P(", against a median of {N} for the (\\d+) largest US banks;", (m, v) => `, מול חציון של ${v(m[1])} ב-${m[2]} הבנקים הגדולים בארה״ב;`);
  P("last quarter (they|it) (bought|sold) {N} of it\\.", (m, v) => `ברבעון האחרון ${m[1] === "they" ? "הן" : "היא"} ${m[2] === "bought" ? (m[1] === "they" ? "קנו" : "קנתה") : (m[1] === "they" ? "מכרו" : "מכרה")} ממנה ב-${v(m[3])}.`);
  P("{Q} 13F", (m, v) => `דוח 13F של ${v(m[1])}`);
  P("net buying by sector, top (\\d+)", (m) => `קניות פחות מכירות לפי ענף, ${m[1]} הגדולות`);
  P("13F net buying, top (\\d+)", (m) => `קניות פחות מכירות לפי 13F, ${m[1]} הגדולות`);
  P("median {N}", (m, v) => `חציון ${v(m[1])}`);
  P("since {D}", (m, v) => `מאז ${v(m[1])}`);
  P("{D} to {D}", (m, v) => `${v(m[1])} עד ${v(m[2])}`);
  P("13F for {Q} · quarter ended {D}", (m, v) => `דוח 13F של ${v(m[1])} · הרבעון הסתיים ב-${v(m[2])}`);
  P("Net buying, top (\\d+)", (m) => `קניות פחות מכירות, ${m[1]} הגדולות`);
  P("of the top (\\d+)", (m) => `מתוך ${m[1]} הגדולות`);
  P("{N} of the top (\\d+)", (m, v) => `${v(m[1])} מתוך ${m[2]} הגדולות`);
  P("{Q} to {Q}, every reported position", (m, v) => `${v(m[1])} עד ${v(m[2])}, כל האחזקות שדווחו`);
  P("{Q} to {Q}", (m, v) => `${v(m[1])} עד ${v(m[2])}`);
  P("top (\\d+) holdings by market value", (m) => `${m[1]} האחזקות הגדולות, לפי שווי`);
  P("top (\\d+) holdings", (m) => `${m[1]} האחזקות הגדולות`);
  P("{N} of the portfolio", (m, v) => `${v(m[1])} מהתיק`);
  P("What moved the top (\\d+) last quarter", (m) => `מה הזיז את ${m[1]} הגדולות ברבעון האחרון`);
  P("Value {Q}", (m, v) => `שווי ${v(m[1])}`);
  P("Weight {Q}", (m, v) => `משקל ${v(m[1])}`);
  P("net (buying|selling) last quarter", (m) => (m[1] === "buying" ? "קניות ברבעון האחרון" : "מכירות ברבעון האחרון"));
  P("whole portfolio, ([\\d,]+) securities", (m, v) => `כל התיק, ${v(m[1])} ניירות ערך`);
  P("top (\\d+), shares vs the previous quarter", (m) => `${m[1]} הגדולות, מניות מול הרבעון הקודם`);
  P("(\\d+) names", (m) => `${m[1]} חברות`);
  P("\\+(\\d+) filers", (m) => `ועוד ${m[1]} גופים מדווחים`);
  P("From the managers’ Form 13F filings on SEC EDGAR \\(options positions are left out\\), the same data as the rest of TriQ, updated with every new filing\\. Top (\\d+) = the (\\d+) largest company holdings; ETFs and funds are left out\\. Sector ETF flows come from each fund’s Form N-PORT\\. Not investment advice\\.", (m) =>
    `מדוחות ה-13F שהמנהלות מגישות ל-SEC (בלי פוזיציות אופציות), אותם נתונים כמו בשאר TriQ, ומתעדכן עם כל דוח חדש. ${m[1]} הגדולות = ${m[2]} האחזקות הגדולות בחברות, בלי קרנות סל וקרנות. התזרימים לקרנות הסל הענפיות לקוחים מדוח N-PORT של כל קרן. זו לא המלצה להשקעה.`);
  P("{X}: {N}", (m, v) => { const t = v(m[1]); return t.startsWith("⁨") ? null : `${t}: ${v(m[2])}`; });
  // notifications for one company
  P("Notifications for {T}", (m) => `התראות על ${m[1]}`);
  P("Follow {T} to get a TriQ notification for each of its SEC filings \\(8-K, 10-Q/10-K, Big Three 13G/13D\\)\\.", (m) => `הוסיפו את ${m[1]} למעקב כדי לקבל מ-TriQ התראה על כל דיווח שלה ל-SEC (8-K, 10-Q/10-K ודיווחי 13G/13D של שלוש הגדולות).`);
  P("{T} is in your watchlist: TriQ notifies you of each new filing, even when the site is closed\\.", (m) => `${m[1]} ברשימת המעקב: TriQ ישלח לכם התראה על כל דיווח חדש, גם כשהאתר סגור.`);
  P("{T} is in your watchlist: new filings show as notifications while TriQ is open\\. Turn on push notifications to get them with the site closed\\.", (m) => `${m[1]} ברשימת המעקב: דיווחים חדשים יופיעו כהתראות כש-TriQ פתוח. הפעילו התראות כדי לקבל אותן גם כשהאתר סגור.`);
  P("{T} is in your watchlist\\. Turn on notifications to hear about each new filing\\.", (m) => `${m[1]} ברשימת המעקב. הפעילו התראות כדי לשמוע על כל דיווח חדש.`);
  P("New filing: (.+)", (m, v) => `דיווח חדש: ${v(m[1])}`);
  P("New SEC filing: (.+)\\. Data updated\\.", (m, v) => `דיווח חדש ל-SEC: ${v(m[1])}. הנתונים עודכנו.`);
  P("(Ahead of|Behind) the index by ([\\d.]+) points", (m) => `${m[1] === "Ahead of" ? "טוב מהמדד" : "חלש מהמדד"} ב-${iso(m[2])} נקודות אחוז`);

  const iso = (s) => "\u2066" + s + "\u2069";
  const FSI = "\u2068", PDI = "\u2069";
  const MGR_LIKE = /^(BlackRock|Vanguard|State Street)\b/;

  // all lookups with collapsed spaces
  const all = {};
  for (const src of [industries, sectors, events, dict]) for (const [k, h] of Object.entries(src)) all[k.replace(/\s+/g, " ").trim()] = h;

  const ctx = [
    [".ins-sum", { "Bought": "קניות:", "Sold": "מכירות:", "none": "אין" }],
    ["#fin-h", { "Financials": "תוצאות כספיות" }],
    [".range, .ranges, th, dt", { "YTD": "מתחילת השנה", "ROE": "תשואה על ההון" }],
    ["[data-etf-issuer]", { "Vanguard": "Vanguard" }],
    [".np-group", { "New": "חדשות" }],
    [".ni-dot", { "Unread": "לא נקראה" }],
    [".suggest", { "ETF": "קרן סל" }],
    [".own-table", { "Bought": "קנייה", "Sold": "מכירה", "plan": "לפי תוכנית" }],
    ["[data-feed]", { "13F": "אחזקות (13F)", "13G/D": "מעל 5% (13G/D)", "N-PORT": "קרנות (N\u2011PORT)", "8-K": "דיווח מיידי (8-K)", "10-Q/K": "דוחות כספיים (10-Q/K)" }],
  ];
  window.MRFINK_I18N = { dict: all, patterns, ctx, role, roleSel: ".own-table td.l > small", keep: () => true };
})();
