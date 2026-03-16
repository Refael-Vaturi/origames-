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

  // Home
  "home.startGlobal": { en: "Start Global Game", he: "התחל משחק עולמי" },
  "home.playFriends": { en: "Play with Friends", he: "שחק עם חברים" },
  "home.joinCode": { en: "Join with Code", he: "הצטרף עם קוד" },
  "home.tutorial": { en: "Tutorial", he: "אימון" },
  "home.onlineFriends": { en: "Online Friends", he: "חברים אונליין" },
  "home.invites": { en: "Invites", he: "הזמנות" },
  "home.settings": { en: "Settings", he: "הגדרות" },

  // Join
  "join.title": { en: "Join a Room", he: "הצטרף לחדר" },
  "join.placeholder": { en: "Enter room code...", he: "...הכנס קוד חדר" },
  "join.button": { en: "Join", he: "הצטרף" },
  "join.orLink": { en: "Or open an invite link", he: "או פתח קישור הזמנה" },
  "join.back": { en: "Back", he: "חזור" },

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
  "lobby.chat": { en: "Chat", he: "צ'אט" },
  "lobby.waiting": { en: "Waiting for players...", he: "...ממתין לשחקנים" },
  "lobby.settings": { en: "Game Settings", he: "הגדרות משחק" },

  // Game
  "game.yourSecret": { en: "This is your secret", he: "זה הסוד שלך" },
  "game.dontExpose": { en: "Don't expose yourself too early!", he: "!אל תיחשף מדי מוקדם" },
  "game.giveHint": { en: "Give a clever hint", he: "תן רמז חכם" },
  "game.whoIsDifferent": { en: "Who got something different?", he: "?מי לדעתך קיבל משהו שונה" },
  "game.reveal": { en: "The truth is revealed!", he: "!האמת נחשפת" },
  "game.wasFake": { en: "was the Fake!", he: "!היה ה-Fake" },
  "game.survived": { en: "The Fake survived!", he: "!ה-Fake שרד" },
  "game.round": { en: "Round", he: "סיבוב" },
  "game.score": { en: "Score", he: "ניקוד" },
  "game.vote": { en: "Vote", he: "הצבע" },
  "game.discuss": { en: "Discussion", he: "דיון" },
  "game.nextRound": { en: "Next Round", he: "סיבוב הבא" },
  "game.results": { en: "Results", he: "תוצאות" },
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
    [language]
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
