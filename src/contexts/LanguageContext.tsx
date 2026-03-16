import React, { createContext, useContext, useState, useCallback } from "react";

type Language = "en" | "he";

type Translations = {
  [key: string]: { en: string; he: string };
};

const translations: Translations = {
  // Welcome
  "welcome.tagline": { en: "Find the fake before it fools everyone!", he: "!מצא את המזויף לפני שהוא עובד על כולם" },
  "welcome.login": { en: "Login / Register", he: "התחבר / הירשם" },
  "welcome.guest": { en: "Continue as Guest", he: "המשך כאורח" },
  "welcome.joinCode": { en: "Join with Code", he: "הצטרף עם קוד" },

  // Auth
  "auth.login": { en: "Login", he: "התחברות" },
  "auth.register": { en: "Register", he: "הרשמה" },
  "auth.google": { en: "Continue with Google", he: "המשך עם Google" },
  "auth.apple": { en: "Continue with Apple", he: "המשך עם Apple" },
  "auth.or": { en: "or", he: "או" },
  "auth.error": { en: "Login failed", he: "ההתחברות נכשלה" },
  "auth.checkEmail": { en: "Check your email to confirm!", he: "!בדוק את האימייל שלך לאישור" },
  "auth.email": { en: "Email", he: "אימייל" },
  "auth.password": { en: "Password", he: "סיסמה" },
  "auth.displayName": { en: "Display Name", he: "שם תצוגה" },
  "auth.loginBtn": { en: "Login", he: "התחבר" },
  "auth.registerBtn": { en: "Create Account", he: "צור חשבון" },
  "auth.switchRegister": { en: "Don't have an account? Register", he: "אין לך חשבון? הירשם" },
  "auth.switchLogin": { en: "Already have an account? Login", he: "יש לך חשבון? התחבר" },
  "auth.emailNotConfirmed": { en: "Please confirm your email first", he: "קודם צריך לאשר את האימייל" },
  "auth.invalidCredentials": { en: "Invalid email or password", he: "אימייל או סיסמה שגויים" },

  // Profile
  "profile.title": { en: "Profile", he: "פרופיל" },
  "profile.displayName": { en: "Display Name", he: "שם תצוגה" },
  "profile.save": { en: "Save", he: "שמור" },
  "profile.gamesPlayed": { en: "Games Played", he: "משחקים ששוחקו" },
  "profile.wins": { en: "Wins", he: "ניצחונות" },
  "profile.caught": { en: "Fakes Caught", he: "Fakes שנתפסו" },
  "profile.survived": { en: "Survived", he: "שרדו" },

  // Settings
  "settings.title": { en: "Settings", he: "הגדרות" },
  "settings.language": { en: "Language", he: "שפה" },
  "settings.sound": { en: "Sound Effects", he: "אפקטי קול" },
  "settings.vibration": { en: "Vibration", he: "רטט" },
  "settings.darkMode": { en: "Dark Mode", he: "מצב כהה" },
  "settings.about": { en: "About Fake It Fast", he: "אודות Fake It Fast" },
  "settings.logout": { en: "Logout", he: "התנתק" },

  // Home
  "home.startGlobal": { en: "Start Global Game", he: "התחל משחק עולמי" },
  "home.playFriends": { en: "Play with Friends", he: "שחק עם חברים" },
  "home.joinCode": { en: "Join with Code", he: "הצטרף עם קוד" },
  "home.tutorial": { en: "Tutorial", he: "אימון" },
  "home.onlineFriends": { en: "Online Friends", he: "חברים אונליין" },
  "home.invites": { en: "Invites", he: "הזמנות" },
  "home.settings": { en: "Settings", he: "הגדרות" },
  "home.notifications": { en: "Notifications", he: "התראות" },

  // Join
  "join.title": { en: "Join a Room", he: "הצטרף לחדר" },
  "join.placeholder": { en: "Enter room code...", he: "...הכנס קוד חדר" },
  "join.button": { en: "Join", he: "הצטרף" },
  "join.autoFlow": { en: "Continue", he: "המשך" },
  "join.orLink": { en: "Or open an invite link", he: "או פתח קישור הזמנה" },
  "join.back": { en: "Back", he: "חזור" },
  "join.notFound": { en: "Room not found", he: "החדר לא נמצא" },
  "join.invalidCode": { en: "Enter a valid room code", he: "צריך להזין קוד חדר תקין" },
  "join.loginAndJoin": { en: "Login and join", he: "להתחבר ולהיכנס" },
  "join.registerAndJoin": { en: "Register and join", he: "להירשם ולהיכנס" },
  "join.playGuest": { en: "Play as guest", he: "לשחק כאורח" },
  "join.continueAsGuest": { en: "Continue as guest", he: "המשך כאורח" },
  "join.guestName": { en: "Guest name", he: "שם אורח" },
  "join.guestDefault": { en: "Guest", he: "אורח" },
  "join.authOrGuestRequired": { en: "Choose login or guest to enter", he: "צריך להתחבר או לבחור אורח כדי להיכנס" },

  // Create Room
  "create.title": { en: "Create Room", he: "צור חדר" },
  "create.roomName": { en: "Room Name", he: "שם החדר" },
  "create.rounds": { en: "Number of Rounds", he: "מספר סיבובים" },
  "create.responseTime": { en: "Response Time (sec)", he: "(שניות) זמן תגובה" },
  "create.discussionTime": { en: "Discussion Time (sec)", he: "(שניות) זמן דיון" },
  "create.voteTime": { en: "Vote Time (sec)", he: "(שניות) זמן הצבעה" },
  "create.maxPlayers": { en: "Max Players", he: "מספר שחקנים מקסימלי" },
  "create.private": { en: "Private Room", he: "חדר פרטי" },
  "create.button": { en: "Create Room", he: "צור חדר" },
  "create.back": { en: "Back", he: "חזור" },

  // Lobby
  "lobby.title": { en: "Lobby", he: "לובי" },
  "lobby.copyCode": { en: "Copy Code", he: "העתק קוד" },
  "lobby.copyLink": { en: "Copy Link", he: "העתק קישור" },
  "lobby.share": { en: "Share", he: "שתף" },
  "lobby.ready": { en: "Ready", he: "מוכן" },
  "lobby.notReady": { en: "Not Ready", he: "לא מוכן" },
  "lobby.startGame": { en: "Start Game", he: "התחל משחק" },
  "lobby.notAllReady": { en: "Not all players are ready", he: "לא כל השחקנים מוכנים" },
  "lobby.chat": { en: "Chat", he: "צ'אט" },
  "lobby.chatPlaceholder": { en: "Type a message...", he: "...כתוב הודעה" },
  "lobby.waiting": { en: "Waiting for players...", he: "...ממתין לשחקנים" },
  "lobby.settings": { en: "Game Settings", he: "הגדרות משחק" },
  "lobby.codeCopied": { en: "Room code copied!", he: "!קוד החדר הועתק" },
  "lobby.linkCopied": { en: "Invite link copied!", he: "!קישור ההזמנה הועתק" },
  "lobby.copyFailed": { en: "Failed to copy", he: "ההעתקה נכשלה" },

  // Matchmaking
  "matchmaking.searching": { en: "Searching", he: "מחפש" },
  "matchmaking.finding": { en: "Finding players around the world...", he: "...מחפש שחקנים ברחבי העולם" },
  "matchmaking.cancel": { en: "Cancel", he: "ביטול" },

  // Tutorial
  "tutorial.title": { en: "How to Play", he: "איך משחקים" },
  "tutorial.next": { en: "Next", he: "הבא" },
  "tutorial.done": { en: "Got It!", he: "!הבנתי" },
  "tutorial.step1Title": { en: "Get Your Secret Word", he: "קבל את המילה הסודית" },
  "tutorial.step1Desc": { en: "Everyone gets the same word — except the Fake, who gets a different one. Don't reveal too much!", he: "כולם מקבלים את אותה מילה — חוץ מה-Fake, שמקבל מילה שונה. אל תחשוף יותר מדי!" },
  "tutorial.step2Title": { en: "Give a Clever Hint", he: "תן רמז חכם" },
  "tutorial.step2Desc": { en: "Each player gives a short hint about their word. Be clever — too obvious and you help the Fake!", he: "כל שחקן נותן רמז קצר על המילה שלו. תהיה חכם — רמז ברור מדי עוזר ל-Fake!" },
  "tutorial.step3Title": { en: "Vote for the Fake", he: "הצבע נגד ה-Fake" },
  "tutorial.step3Desc": { en: "Discuss the hints and vote who you think got a different word. Catch the Fake to score points!", he: "דונו על הרמזים והצביעו מי לדעתכם קיבל מילה שונה. תפסו את ה-Fake כדי לצבור נקודות!" },
  "tutorial.step4Title": { en: "The Reveal!", he: "!החשיפה" },
  "tutorial.step4Desc": { en: "Find out who was the Fake! If caught, the majority scores. If not — the Fake wins bonus points!", he: "גלו מי היה ה-Fake! אם נתפס — הרוב מרוויח. אם לא — ה-Fake מקבל בונוס!" },

  // Game
  "game.yourSecret": { en: "This is your secret", he: "זה הסוד שלך" },
  "game.dontExpose": { en: "Don't expose yourself too early!", he: "!אל תיחשף מדי מוקדם" },
  "game.youAreFake": { en: "You are the Fake!", he: "!אתה ה-Fake" },
  "game.noWordForYou": { en: "You don't know the word!", he: "!אתה לא יודע מה המילה" },
  "game.fakeInstruction": { en: "Blend in! Give hints that don't reveal you don't know the word.", he: "!השתלב! תן רמזים שלא חושפים שאתה לא יודע את המילה" },
  "game.fakeHintTip": { en: "Be vague — don't get caught!", he: "!תהיה מעורפל — אל תיתפס" },
  "game.hintTip": { en: "Be specific but not too obvious!", he: "!תהיה ספציפי אבל לא מדי ברור" },
  "game.fakeHintPlaceholder": { en: "Bluff a hint...", he: "...בלוף רמז" },
  "game.giveHint": { en: "Give a clever hint", he: "תן רמז חכם" },
  "game.whoIsDifferent": { en: "Who got something different?", he: "?מי לדעתך קיבל משהו שונה" },
  "game.reveal": { en: "The truth is revealed!", he: "!האמת נחשפת" },
  "game.wasFake": { en: "was the Fake!", he: "!היה ה-Fake" },
  "game.survived": { en: "The Fake survived!", he: "!ה-Fake שרד" },
  "game.theWordWas": { en: "The word was", he: "המילה הייתה" },
  "game.youCaughtFake": { en: "You caught the Fake!", he: "!תפסת את ה-Fake" },
  "game.fakeSurvived": { en: "The Fake got away!", he: "!ה-Fake ברח" },
  "game.round": { en: "Round", he: "סיבוב" },
  "game.score": { en: "Score", he: "ניקוד" },
  "game.vote": { en: "Vote", he: "הצבע" },
  "game.discuss": { en: "Discussion", he: "דיון" },
  "game.nextRound": { en: "Next Round", he: "סיבוב הבא" },
  "game.results": { en: "Results", he: "תוצאות" },
  "game.waitingForPlayers": { en: "Waiting for all players...", he: "...ממתין לכל השחקנים" },
  "game.waitingForVotes": { en: "Waiting for all votes...", he: "...ממתין לכל ההצבעות" },
  "game.rematch": { en: "Rematch", he: "משחק חוזר" },
  "game.backToLobby": { en: "Back to Lobby", he: "חזרה ללובי" },
  "game.inviteFriends": { en: "Invite Friends", he: "הזמן חברים" },

  // General
  "general.language": { en: "עברית", he: "English" },
  "general.players": { en: "Players", he: "שחקנים" },
};

interface LanguageContextValue {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "en" ? "he" : "en"));
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[language];
    },
    [language],
  );

  const dir = language === "he" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, dir }}>
      <div dir={dir}>{children}</div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
