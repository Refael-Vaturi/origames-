
# תוכנית עבודה מפורטת — סבב עיצוב + תיקונים + AI Admin

## חלק 1 — מערכת עיצוב חדשה (Cyber Mint / Space Grotesk / Bento)

### 1.1 טוקנים גלובליים (`src/index.css` + `tailwind.config.ts`)
- להגדיר את פלטת **Cyber Mint** כ־HSL בלבד:
  - `--background: 222 47% 11%` (‎#0F172A)
  - `--foreground: 138 76% 97%` (‎#F0FDF4)
  - `--primary: 160 84% 39%` (‎#10B981 ירוק מנטה)
  - `--primary-foreground: 222 47% 11%`
  - `--accent: 189 94% 43%` (‎#06B6D4 ציאן)
  - `--muted / --card / --border / --ring` בגוונים כהים עם רמז ירקרק
- להוסיף טוקנים סמנטיים חדשים:
  - `--gradient-hero`, `--gradient-tactical`, `--gradient-scan`
  - `--shadow-glow`, `--shadow-tactical`, `--shadow-bento`
  - `--radar-pulse`, `--scanline`
- ב־`tailwind.config.ts`:
  - `fontFamily.display = ['Space Grotesk', ...]`, `fontFamily.sans = ['DM Sans', ...]`
  - להוסיף `boxShadow`, `backgroundImage`, ו־`animation/keyframes` חדשים: `radar-sweep`, `scanline`, `bento-tilt`, `glow-pulse`
- להוסיף `<link>` ל־Google Fonts (Space Grotesk + DM Sans) ב־`index.html`

### 1.2 מסך Portal (`src/pages/Portal.tsx` + קומפוננטות משנה)
- Layout מסוג **Bento Grid** בסגנון Tactical HUD:
  - כרטיס Hero גדול עם המשחק הנוכחי / פיצ'ר, רקע גרדיאנט + סריקת radar
  - טייל Quick Play (רשימת 5 המשחקים) — כרטיסים ריבועיים עם hover‑lift וזוהר
  - טייל סטטיסטיקות (קרדיטים, רמה, חברים)
  - טייל התראות / קמפיינים חדשים
  - טייל פרופיל + כפתור הגדרות (הגלגל המונפש נשמר)
- Micro‑interactions: tilt קל, glow, ספינרים בעדינות; לכבד `prefers-reduced-motion`
- כל הצבעים דרך הטוקנים בלבד (בלי `text-white`/`bg-black`)

### 1.3 מסך Iron Dome תפריט (`src/pages/IronDome.tsx` phase='menu')
- **Kinetic Command Matrix**: bento עם 3 CTA ראשיים (Campaign / Survival / World)
- כרטיסים משניים: Rules, Leaderboard, Store, Perks
- באנר "התחבר כדי לשמור התקדמות" למשתמש אורח
- אנימציית radar‑sweep + scanline ברקע, פולסים על ה‑CTA
- ניקוי כל צבעי hex/tailwind ישירים והמרתם לטוקנים

### 1.4 בדיקות ויזואליות
- להריץ Playwright על `/` ו־`/iron-dome`, לצלם, לוודא שאין רגרסיות RTL ושאין contrast issues

---

## חלק 2 — תיקון "פתיחת שלבים מהאדמין ל‑Iron Dome Campaign"

### 2.1 האבחון הנוכחי
- באדמין `unlockLevel` מעדכן ב־DB: `campaignMaxLevel`, `admin_max_level`, `unlocked_levels`
- בקליינט `loadProgress` קורא רק את `iron_dome_progress.max_level` ← ולכן לא רואה את מה שהאדמין פתח אם הערך גבוה מ‑max_level
- אין subscription realtime — צריך רענון ידני

### 2.2 שינויים
1. **`loadProgress`** (ב־`IronDome.tsx` או בהוק `useIronDomeProgress`):
   - לקרוא גם את `admin_max_level` ו־`unlocked_levels`
   - `effectiveMax = GREATEST(max_level, admin_max_level, MAX(unlocked_levels))`
   - להזרים את זה ל־state של Campaign selector
2. **Realtime**:
   - להוסיף `supabase.channel('iron_dome_progress:'+userId).on('postgres_changes', ...)` שמעדכן את ה‑state מיידית כשהאדמין משנה
3. **Level Select UI**:
   - כפתור שלב נעול ↔ פתוח לפי `effectiveMax`
   - קליק על שלב פתוח → קופץ ישר אליו בלי לחייב מעבר סדרתי מהשלב 1
4. **Admin unlock action**:
   - לוודא שה־RPC/`update` כותב את שלושת השדות באטומיות (טרנזקציה יחידה או RPC ייעודי `admin_unlock_level(user_id, level)`)
   - ליצור אם חסר: פונקציה `security definer` שמוודאת שהמשתמש הוא admin לפי `has_role`

### 2.3 בדיקה
- Playwright: להתחבר כאדמין → לפתוח שלב 15 למשתמש X → להתחבר כ־X → לפתוח Iron Dome → לוודא ששלב 15 זמין ושלחיצה מעלה ישר את השלב

---

## חלק 3 — תיקון הקלטות באדמין

### 3.1 בעיה
- אין טבלה `game_recordings` בכלל בסכמה
- באדמין קיים UI שקורא אליה ← קורס/מציג ריק

### 3.2 מיגרציה חדשה
טבלה `public.game_recordings` עם:
- `user_id uuid → auth.users`, `game_type text`, `level int`, `duration_ms int`
- `events jsonb` (או `storage_path text` אם נעדיף Storage)
- `score int`, `metadata jsonb`
- `created_at`, `updated_at`
- `GRANT SELECT, INSERT ON ... TO authenticated`, `GRANT ALL TO service_role`
- RLS:
  - insert/select self: `auth.uid() = user_id`
  - select כל: `has_role(auth.uid(),'admin')`
- אינדקסים: `(user_id, created_at DESC)`, `(game_type, level)`
- טריגר `updated_at`

### 3.3 קליינט
- הוק חדש `useGameRecordings` לרשימה + נגן
- באדמין: טאב Recordings — פילטרים (משתמש/משחק/שלב), הפעלה, מחיקה
- ב־Iron Dome: לרשום events (spawn/interception/hit) לתוך buffer ולשמור בסוף הריצה

---

## חלק 4 — מודול "AI Admin" עם Gemini

### 4.1 מסך חדש `src/pages/AdminAI.tsx` (מוגן ב־`has_role='admin'`)
- שדה API Key של Gemini + כפתור Save (נשמר דרך edge function שכותב ל‑secrets — לא ב־DB גלוי; חלופה: טבלה `admin_settings` מוצפנת אך עדיפות ל‑secret)
- אזור פרומפט חופשי: "מה לשנות באתר"
- כפתור **Preview** ו־**Apply**
- לוג היסטוריית שינויים

### 4.2 Edge function `gemini-admin-edit`
- קלט: `prompt`, קונטקסט (רשימת קבצים רלוונטיים / snippet)
- קורא ל־Gemini 2.x עם system prompt שמחייב פלט JSON של Patch: מערך של `{file, find, replace}` או diff
- מחזיר את ה־patch לקליינט
- ב־Apply: פונקציה שמריצה כתיבה בפועל — **⚠️ שים לב**: קוד ריצה לא יכול לערוך את קבצי הפרויקט בפרוד. פתרון מעשי:
  - שלב 1: להציג את ה‑diff המוצע + הוראות להעתקה ידנית (או שילוב עם GitHub API אם המשתמש יחבר repo)
  - שלב 2 (מומלץ): להשתמש ב‑GitHub connector — ה‑function פותחת PR אוטומטי עם ה‑patch
- בקרות בטיחות: whitelist של תיקיות (`src/`, `supabase/functions/`), חסימת מסלולים רגישים (`src/integrations/supabase/*`, `.env`)

### 4.3 סוד
- Gemini key: להשתמש ב־`add_secret` (`GEMINI_API_KEY`) ← המשתמש יזין דרך הטופס המאובטח
- אין לאחסן את המפתח ב‑DB בשום מקרה

### 4.4 איטרציות ("תעבור על זה כמה פעמים שיעבוד")
- לאחר בנייה: הרצת סנאריו לדוגמה ("שנה את כותרת הפורטל ל‑X") — לוודא שהפלט תקין, שה‑diff מיושם, שאין שגיאות build
- לתקן פרומפט/סכימת JSON עד יציבות

---

## חלק 5 — סדר ביצוע מוצע
1. עיצוב (חלק 1) — טוקנים → Portal → Iron Dome menu → בדיקות
2. תיקון פתיחת שלבים (חלק 2)
3. מיגרציית `game_recordings` + UI (חלק 3)
4. AdminAI + Gemini (חלק 4)
5. סבב QA כולל ב‑Playwright + פרסום

---

## חלק 6 — סיכונים ונקודות שדורשות אישור
- **AI Admin שעורך קוד בפרוד**: לא אפשרי ישירות ללא GitHub. צריך להחליט: (א) diff לצפייה בלבד, (ב) PR אוטומטי דרך GitHub connector, (ג) הזרקת שינויים ל‑DB בלבד (למשל טקסטים/הגדרות דינמיות). ממליץ ב'.
- **אחסון מפתח Gemini**: secret בלבד, לא DB.
- **הקלטות**: `jsonb` מספיק לרוב, אבל אם מריצים ארוך → Storage bucket.

מוכן — אשר ואתחיל בחלק 1.
