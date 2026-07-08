# רה-דיזיין מלא – 15 משחקים בסגנון Cyber Neon Arcade

## המטרה
כל משחק יראה כמו מה שהוא באמת מייצג – לא מופשט, לא "חץ במקום אוטו". שדרוג gameplay-visuals + HUD בסטנדרט AAA mobile, עם פלטת Cyber Mint (#0F172A רקע, #10B981 primary neon, #06B6D4 accent, #F0FDF4 טקסט).

## עקרונות אחידים לכל המשחקים
- **HUD אחיד**: לוגו/שם משחק שמאל, ניקוד/שלב באמצע, כפתור pause/back ימין. גופן Space Grotesk לספרות, DM Sans לטקסט.
- **Juice**: screen shake בפגיעות, particles על כל פעולה משמעותית, glow-pulse על UI, trailing motion.
- **פלטה**: רקע כהה #0F172A עם gradient, אקסנטים ניאון #10B981/#06B6D4, סכנה #f43f5e.
- **Menu מחודש**: card עם live preview animation של המכניקה + best score + כפתור Start ניאוני.
- **Game Over**: overlay עם glassmorphism, סטטיסטיקה, כפתור Retry עם גלואינג.

## שינויים ספציפיים per-game

### 1. Velocity Drift (הכי דחוף – המשתמש ציין אותו)
- **החלף את החץ באוטו** – ספרייט אוטו מלמעלה (top-down) או פרספקטיבת נהג (chase cam) עם גלגלים, פנסים, זנב אור.
- **כביש**: 3 מסלולים עם קווים לבנים מקווקווים שנעים לאחור, שוליים ניאוניים, guardrails, גשרים.
- **סביבה**: עיר לילה עם בניינים ניאוניים דוהרים בצדדים, מנהרות, גשמי אור.
- **HUD**: מד מהירות עגול בפינה, מונה זמן, drift-meter מתמלא בפניות.
- **אפקטים**: skid marks, drift sparks כתומים, boost trail כחול, screen shake בהתנגשות.

### 2. Iron Dome
- שדרוג ה-launcher מ-triangle לספרייט מערכת יירוט אמיתי (base + turret + radar dish).
- טילי אויב עם lens flare + smoke trail; יירוטים = flash + shockwave.
- HUD בסגנון tactical: radar sweep, threat count, wave indicator, energy bar.

### 3. Rhythm Blade
- Blade אמיתי (חרב זוהרת) במקום פס, notes עם glow rings, hit rings expand.
- Combo counter גדול + streak trail, אפקט freeze-frame בפגיעה מושלמת.

### 4. Gravity Flip
- דמות רצה עם תנועה של רצה (לא ריבוע), gravity lines בהיפוך, particles כשהופכים.
- מכשולים כ-hazard tiles עם ניאון אדום; רקע פרלקס.

### 5. Cyber Shield
- מגן זוהר בפועל עם shield mesh, hex-grid רקע, אויבים כ-viruses/packets.
- HUD מסך CRT: uptime, threats blocked, integrity bar.

### 6. Wobble Race
- דמות עם רגליים מתנודדות (ragdoll suggestion), מסלול עם רמפות, קו סיום עם דגלים.
- Camera follow, dust particles ברגליים.

### 7. Rope Swing
- דמות מלאה במקום עיגול, חבל עם physics מוצג, canyon עם עומק (פרלקס).
- Successful landing = flash + fireworks.

### 8. Fruit Merge
- פירות עם gradient shading + rim light, מיכל זכוכית שקוף עם glow.
- Merge = burst particles + shockwave + score popup עולה למעלה.

### 9. Merge Tycoon
- בניינים תלת-מימדיים (2.5D isometric look), coins עם ספין, "level up" flash.
- Skyline רקע עם ניאון עיר, יום/לילה cycle.

### 10. Word Ladder
- אריחי Scrabble אמיתיים (עם צל, gradient, אות מודגשת), Rack למטה, ניקוד flying.
- קונפטי בהצלחה, shake באות שגויה.

### 11. Daily Trivia
- כרטיס שאלה מעוצב, טיימר טבעת מסתובבת, options ככפתורים גדולים עם hover glow.
- Correct = ירוק pulse + confetti, Wrong = אדום shake.

### 12. City Find
- שדרוג ה-globe/map עם ניאון borders, pin drop animation עם ripple.
- מד מרחק שמתעדכן חי, HUD מסך RADAR.

### 13. Color Identify
- פלטת צבעים כ-swatches עם shine, מד זמן מתמלא, streak counter.
- Correct = burst בצבע הנכון.

### 14. Clicker
- אובייקט מרכזי גדול עם pulse + click ripples, +N flying numbers, upgrade cards.
- Idle animations (float, glow).

### 15. Menu Art (glyphs) לכולם
- החלפת ה-MenuArt.tsx של כל משחק לגרסה שמראה בפועל את המכניקה (אוטו נוסע, טילים מתפוצצים, פירות מתמזגים...).

## הגישה הטכנית
- כל משחק משתמש ב-canvas render. עדכון בעיקר ב-`renderer.ts` (ציור ספרייטים במקום צורות פרימיטיביות) + `MenuArt.tsx` + מסך menu/gameover ב-`*Game.tsx`.
- **אין נגיעה ב-engine.ts/logic** – רק שכבת visuals ו-UI.
- שימוש ב-SVG paths + canvas 2D drawing (gradients, radial, shadow blur) במקום assets חיצוניים.
- Tokens חדשים ב-`index.css` (arcade-*) ואנימציות משותפות ב-tailwind.config.

## סדר ביצוע
1. Design tokens משותפים (arcade palette + animations) ב-index.css/tailwind
2. Velocity Drift (הבעיה הכי בולטת שהמשתמש ציין)
3. Iron Dome + Rhythm Blade + Cyber Shield (משחקי action)
4. Gravity Flip + Wobble Race + Rope Swing (משחקי platformer)
5. Fruit Merge + Merge Tycoon (משחקי merge)
6. Word Ladder + Daily Trivia + Color Identify (משחקי מוח)
7. City Find + Clicker + כל ה-MenuArts

## הערה
זה עבודה גדולה מאוד. אני מתחיל מ-**Velocity Drift** במלואו (הבעיה שציינת במפורש – "חץ במקום אוטו") ואז עובר משחק-משחק. אחרי כל 3-4 משחקים אחזור אליך לאישור לפני המשך.

## פירוט טכני
- קבצים לעדכון: `src/games/*/renderer.ts` (15), `src/games/*/MenuArt.tsx` (15), `src/games/*/{Name}Game.tsx` (15 – menu+gameover), `src/index.css`, `tailwind.config.ts`.
- אין שינויי DB, אין edge functions חדשים.
