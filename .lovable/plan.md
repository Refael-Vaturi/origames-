# Admin Panel ל-Iron Dome

## סקירה
הוספת פאנל ניהול מלא ב-`/admin` עם הרשאות מוגבלות לשני אימיילים, ניהול משתמשים, פעולות ממוקדות, נוכחות בזמן אמת, ויומן פעולות.

## אימיילים מורשים
- orivaturi22@gmail.com
- batatakara@gmail.com

---

## שלב 1 — מסד נתונים (Supabase Migration)

### עדכון `profiles`
הוספת עמודות חסרות:
- `email TEXT` (סנכרון מ-auth.users)
- `hearts INTEGER DEFAULT 0`
- `money INTEGER DEFAULT 0`
- `current_level INTEGER DEFAULT 1`
- `unlocked_levels INTEGER[] DEFAULT ARRAY[1]`
- `max_level INTEGER DEFAULT 1` (כבר קיים בטבלה אחרת — נשתמש בעמודה חדשה כאן)
- `country TEXT`

עדכון טריגר `handle_new_user` כדי לאכלס email + username ייחודי (email prefix + suffix אקראי בעת התנגשות).

### טבלה חדשה `admin_actions_log`
- `admin_email`, `action_type`, `target_user_id`, `target_username`, `amount`, `level_number`, `details JSONB`, `created_at`

### פונקציה `is_admin()`
```sql
SECURITY DEFINER, מחזירה TRUE אם auth.jwt()->>'email' IN (שני האימיילים)
```

### RLS Policies
- `profiles`: מדיניות חדשה — אדמינים יכולים SELECT/UPDATE על כל השורות (משתמש ב-`is_admin()`)
- `admin_actions_log`: רק אדמינים יכולים SELECT; אדמינים יכולים INSERT
- `iron_dome_progress`: אדמינים יכולים לקרוא/לעדכן הכל

### נוכחות בזמן אמת
שימוש ב-Supabase Realtime Presence (channel `online-players`) — לא נדרשת טבלה. אופציונלית ניצור `active_sessions` רק לסטטיסטיקות שיא יומי.

---

## שלב 2 — Route Guard ו-Hook

### `src/hooks/useIsAdmin.ts`
מחזיר boolean על בסיס `user.email` מול whitelist קבוע.

### `src/components/AdminGuard.tsx`
עוטף route — אם לא אדמין: toast "Access Denied" + ניווט ל-`/`.

### `AuthContext`
ודא שה-email זמין מ-`session.user.email`.

---

## שלב 3 — Layout של פאנל הניהול

### `src/pages/admin/AdminLayout.tsx`
- שימוש ב-shadcn `Sidebar` עם קישורים: Dashboard, Users, Live Players, Player Actions, Download, Logs
- Topbar עם email + Logout
- Outlet ל-route children

### רישום ב-`App.tsx`
```
/admin → AdminGuard → AdminLayout
  index → AdminDashboard
  /users → AdminUsers
  /player-actions → AdminPlayerActions
  /live → AdminLivePlayers
  /download → AdminDownload
  /logs → AdminLogs
```

קישור "Admin" ב-`PortalScreen` שמופיע רק לאדמינים.

---

## שלב 4 — Dashboard
כרטיסי סטטיסטיקה: סך משתמשים, מחוברים עכשיו, פעולות אחרונות, שיא יומי.

## שלב 5 — Users Management (`/admin/users`)
- טבלת shadcn עם מיון, חיפוש (username/name/email), pagination 50/דף
- פעולות לכל שורה: Give Hearts/Money + כפתורים מהירים, View Details (Dialog)
- Bulk Actions: Give X hearts/money to ALL — עם AlertDialog לאישור
- Export CSV
- כל פעולה: UPDATE profiles → INSERT admin_actions_log → toast → refetch (React Query)

## שלב 6 — ⭐ Player Actions (`/admin/player-actions`)
- **Player Selector**: shadcn Combobox/Command עם חיפוש live בטבלת `profiles`. תמיכה במילת מפתח `me` → המשתמש המחובר עם תג "(You)"
- **Selected Player Card**: avatar, username, hearts, money, current_level, max_level, רשימת unlocked_levels כ-badges
- **Give Resources**: input ל-Hearts/Money + מצבי Add/Set + כפתורים מהירים (50/100/500/1000)
- **Unlock Level**: 
  - Select של רמות 1..MAX (קבוע מהמשחק)
  - "Unlock This" / "Unlock Up To This" / "Unlock ALL" / "Lock Level" / "Reset Progress"
  - Grid ויזואלי של רמות (ירוק=פתוח, אפור=נעול)
- **Set Current Level**: dropdown לעדכון `current_level`

## שלב 7 — Live Players (`/admin/live`)
- Supabase Realtime Presence על channel `online-players`
- בכל טעינה של המשחק/פורטל — `track({user_id, username, email, country, current_level, connected_at})` + heartbeat כל 30s
- גילוי מדינה: `fetch('https://ipapi.co/json/')`
- מסך: מונה גדול, טבלה חיה (fade in/out), מפת עולם (`react-simple-maps`), נתוני 24h

## שלב 8 — Download App (`/admin/download`)
- כפתורי Build APK / IPA (placeholder עם הסבר)
- הוראות Capacitor שלב-אחר-שלב
- כפתור PWA Install (`beforeinstallprompt`)
- שדה גרסה ו-changelog

## שלב 9 — Admin Logs (`/admin/logs`)
- טבלה מלאה של `admin_actions_log` עם פילטרים (admin, action_type, טווח תאריכים) + Export CSV

---

## הערות טכניות
- TypeScript לכל הקבצים
- shadcn/ui + Tailwind בלבד (semantic tokens, ללא צבעים hardcoded)
- React Query לשליפות + invalidation אחרי mutations
- כל הפעולות הרגישות יוגנו על ידי RLS עם `is_admin()` — לא רק client-side
- אין שינוי בקוד המשחק הקיים מעבר להוספת presence tracking ב-PortalScreen + קישור Admin

## תלות חדשה
- `react-simple-maps` (למפת העולם החיה)

## סדר ביצוע
1. Migration (DB schema + RLS + טריגר)
2. AuthGuard + useIsAdmin
3. AdminLayout + routing + קישור Portal
4. Users page
5. Player Actions page
6. Live Players + presence tracking
7. Logs
8. Download
9. Dashboard

לאישורך — אתחיל עם המיגרציה ומשם אבנה את כל הדפים.