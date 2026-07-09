import type { Language } from "@/contexts/LanguageContext";

export const MAX_GUESSES = 6;

// Curated lists of common words, one length per language (kept single-list so
// players are never blocked by an overly strict dictionary check — each list
// doubles as both the daily-answer pool and the set of accepted guesses).
const WORDS_EN: string[] = [
  "ABOUT", "ABOVE", "ACTOR", "ADMIT", "ADULT", "AFTER", "AGAIN", "AGENT", "AGREE", "AHEAD",
  "ALARM", "ALBUM", "ALERT", "ALIKE", "ALIVE", "ALLOW", "ALONE", "ALONG", "ALTER", "AMONG",
  "ANGER", "ANGLE", "ANGRY", "APPLE", "APPLY", "ARENA", "ARGUE", "ARISE", "ARRAY", "ASIDE",
  "ASSET", "AUDIO", "AUDIT", "AVOID", "AWAKE", "AWARD", "AWARE", "BADLY", "BAKER", "BASIC",
  "BEACH", "BEGAN", "BEGIN", "BEING", "BELOW", "BENCH", "BIRTH", "BLACK", "BLAME", "BLANK",
  "BLAST", "BLEND", "BLIND", "BLOCK", "BLOOD", "BOARD", "BOOST", "BOOTH", "BOUND", "BRAIN",
  "BRAND", "BREAD", "BREAK", "BREED", "BRIEF", "BRING", "BROAD", "BROKE", "BROWN", "BUILD",
  "BUILT", "BUNCH", "BURST", "BUYER", "CABLE", "CALIF", "CARRY", "CATCH", "CAUSE", "CHAIN",
  "CHAIR", "CHART", "CHASE", "CHEAP", "CHECK", "CHEST", "CHIEF", "CHILD", "CHINA", "CHOSE",
  "CIVIL", "CLAIM", "CLASS", "CLEAN", "CLEAR", "CLICK", "CLIMB", "CLOCK", "CLOSE", "CLOUD",
  "COACH", "COAST", "COULD", "COUNT", "COURT", "COVER", "CRAFT", "CRASH", "CRAZY", "CREAM",
  "CRIME", "CROSS", "CROWD", "CROWN", "CRUDE", "CURVE", "CYCLE", "DAILY", "DANCE", "DATED",
  "DEALT", "DEATH", "DEBUT", "DELAY", "DEPTH", "DOING", "DOUBT", "DOZEN", "DRAFT", "DRAMA",
  "DRANK", "DRAWN", "DREAM", "DRESS", "DRILL", "DRINK", "DRIVE", "DROVE", "DYING", "EAGER",
  "EARLY", "EARTH", "EIGHT", "ELITE", "EMPTY", "ENEMY", "ENJOY", "ENTER", "ENTRY", "EQUAL",
  "ERROR", "EVENT", "EVERY", "EXACT", "EXIST", "EXTRA", "FAITH", "FALSE", "FAULT", "FIBER",
  "FIELD", "FIFTH", "FIFTY", "FIGHT", "FINAL", "FIRST", "FIXED", "FLASH", "FLEET", "FLOOR",
  "FLUID", "FOCUS", "FORCE", "FORTH", "FORTY", "FORUM", "FOUND", "FRAME", "FRANK", "FRAUD",
  "FRESH", "FRONT", "FRUIT", "FULLY", "FUNNY", "GIANT", "GIVEN", "GLASS", "GLOBE", "GOING",
  "GRACE", "GRADE", "GRAND", "GRANT", "GRASS", "GREAT", "GREEN", "GROSS", "GROUP", "GROWN",
  "GUARD", "GUESS", "GUEST", "GUIDE", "HAPPY", "HARSH", "HEART", "HEAVY", "HENCE", "HORSE",
  "HOTEL", "HOUSE", "HUMAN", "IDEAL", "IMAGE", "INDEX", "INNER", "INPUT", "ISSUE", "JOINT",
  "JUDGE", "KNOWN", "LABEL", "LARGE", "LASER", "LATER", "LAUGH", "LAYER", "LEARN", "LEAST",
  "LEAVE", "LEGAL", "LEVEL", "LIGHT", "LIMIT", "LINKS", "LIVES", "LOCAL", "LOOSE", "LOWER",
  "LUCKY", "LUNCH", "LYING", "MAGIC", "MAJOR", "MAKER", "MARCH", "MATCH", "MAYBE", "MAYOR",
  "MEANT", "MEDAL", "MEDIA", "MERGE", "METAL", "MIGHT", "MINOR", "MINUS", "MIXED", "MODEL",
  "MONEY", "MONTH", "MORAL", "MOTOR", "MOUNT", "MOUSE", "MOUTH", "MOVED", "MOVIE", "MUSIC",
  "NEEDS", "NERVE", "NEVER", "NEWLY", "NIGHT", "NOISE", "NORTH", "NOTED", "NOVEL", "NURSE",
  "OCCUR", "OCEAN", "OFFER", "OFTEN", "ORDER", "OTHER", "OUGHT", "OWNED", "OWNER", "PANEL",
  "PANIC", "PAPER", "PARTY", "PEACE", "PHASE", "PHONE", "PHOTO", "PIECE", "PILOT", "PITCH",
  "PLACE", "PLAIN", "PLANE", "PLANT", "PLATE", "POINT", "POUND", "POWER", "PRESS", "PRICE",
  "PRIDE", "PRIME", "PRINT", "PRIOR", "PRIZE", "PROOF", "PROUD", "PROVE", "QUEEN", "QUICK",
  "QUIET", "QUITE", "RADIO", "RAISE", "RANGE", "RAPID", "RATIO", "REACH", "READY", "REALM",
  "REBEL", "REFER", "RELAX", "REPLY", "RIGHT", "RIVAL", "RIVER", "ROBOT", "ROMAN", "ROUGH",
  "ROUND", "ROUTE", "ROYAL", "RURAL", "SADLY", "SAFER", "SAUCE", "SCALE", "SCENE", "SCOPE",
  "SCORE", "SENSE", "SERVE", "SEVEN", "SHALL", "SHAPE", "SHARE", "SHARP", "SHEET", "SHELF",
  "SHELL", "SHIFT", "SHINE", "SHIRT", "SHOCK", "SHOOT", "SHORT", "SHOWN", "SIGHT", "SIMPLE",
  "SINCE", "SIXTH", "SIXTY", "SKILL", "SLEEP", "SLIDE", "SMALL", "SMART", "SMILE", "SMITH",
  "SMOKE", "SOLID", "SOLVE", "SORRY", "SOUND", "SOUTH", "SPACE", "SPARE", "SPEAK", "SPEED",
  "SPEND", "SPENT", "SPLIT", "SPOKE", "SPORT", "STAFF", "STAGE", "STAKE", "STAND", "START",
  "STATE", "STEAM", "STEEL", "STEEP", "STEER", "STICK", "STILL", "STOCK", "STONE", "STOOD",
  "STORE", "STORM", "STORY", "STRIP", "STUCK", "STUDY", "STUFF", "STYLE", "SUGAR", "SUITE",
  "SUPER", "SWEET", "TABLE", "TAKEN", "TASTE", "TAXES", "TEACH", "THANK", "THEFT", "THEIR",
  "THEME", "THERE", "THESE", "THICK", "THING", "THINK", "THIRD", "THOSE", "THREE", "THREW",
  "THROW", "TIGHT", "TIMES", "TIRED", "TITLE", "TODAY", "TOPIC", "TOTAL", "TOUCH", "TOUGH",
  "TOWER", "TRACK", "TRADE", "TREAT", "TREND", "TRIAL", "TRIBE", "TRICK", "TRIED", "TRIES",
  "TRUCK", "TRULY", "TRUST", "TRUTH", "TWICE", "UNCLE", "UNDUE", "UNION", "UNITY", "UNTIL",
  "UPPER", "UPSET", "URBAN", "USAGE", "USUAL", "VALID", "VALUE", "VIDEO", "VIRUS", "VISIT",
  "VITAL", "VOCAL", "VOICE", "WASTE", "WATCH", "WATER", "WHEEL", "WHERE", "WHICH", "WHILE",
  "WHITE", "WHOLE", "WHOSE", "WOMAN", "WOMEN", "WORLD", "WORRY", "WORSE", "WORST", "WORTH",
  "WOULD", "WOUND", "WRITE", "WRONG", "WROTE", "YIELD", "YOUNG", "YOUTH", "GATOR",
];

// Curated common 5-letter Hebrew words. Final letter-forms (ך ם ן ף ץ) are used
// where they'd naturally fall at the end of the word.
const WORDS_HE: string[] = [
  "שולחן", "מדינה", "ילדים", "שמיים", "כתובת", "תמונה", "ספרים", "דרכים", "אנשים", "משפחה",
  "חברים", "מלחמה", "ילדות", "עברית", "תקווה", "מדרגה", "תשובה", "שאלות", "זכרון", "מחשבה",
  "תלמיד", "מורים", "שכונה", "דגלים", "מלכים", "כפרים", "לילות", "שקטים", "קטנים", "חדשים",
  "ישנים", "טובים", "חזקים", "חלשים", "שמחים", "דלתות", "קירות", "רצפות", "תקרות", "גינות",
  "פרחים", "פירות", "ירקות", "גבינה", "עוגות", "שתייה", "מסעדה", "רכבות", "דרכון", "תעודה",
  "חופשה", "עבודה", "פגישה", "ישיבה", "עמידה", "הליכה", "שחייה", "קפיצה", "נפילה", "עלייה",
  "ירידה", "כניסה", "יציאה", "פתיחה", "סגירה", "קריאה", "כתיבה", "ריקוד", "תחרות", "הצלחה",
  "עצבות", "אמונה", "שניות",
];

// Curated common 5-letter Spanish words. Kept accent-free (real, correctly
// unaccented words) so the standard QWERTY layout stays fully valid.
const WORDS_ES: string[] = [
  "PERRO", "GATOS", "CASAS", "MESAS", "LIBRO", "PLAYA", "NOCHE", "VERDE", "LARGO", "CORTO",
  "FUEGO", "AGUAS", "CIELO", "MUNDO", "VIDAS", "AMIGO", "NIEVE", "PLATO", "FRUTA", "LECHE",
  "COLOR", "DULCE", "FELIZ", "BARCO", "CALLE", "NARIZ", "BOCAS", "MANOS", "OREJA", "PELOS",
  "BARBA", "FALDA", "BOLSO", "RELOJ", "BANCO", "CAMPO", "MONTE", "VALLE", "COSTA", "ISLAS",
  "NORTE", "OESTE", "LADOS", "ABAJO", "CERCA", "LEJOS", "FUERA", "NUEVO", "VIEJO", "JOVEN",
  "SUCIO", "LENTO", "GORDO", "FLACO", "POBRE",
];

// Curated common 5-letter French words, also kept accent-free.
const WORDS_FR: string[] = [
  "CHIEN", "CHATS", "TABLE", "LIVRE", "PORTE", "PLAGE", "NUAGE", "ARBRE", "FLEUR", "VERTE",
  "GRAND", "PETIT", "NOIRE", "BLANC", "JAUNE", "ROUGE", "MONDE", "DOUCE", "CHAUD", "FROID",
  "CLAIR", "SALLE", "CHOSE", "PLACE", "ROUTE", "FORCE", "SPORT", "COURT", "LARGE", "DOUZE",
  "JEUNE", "VIEUX", "BEAUX", "FRAIS", "SUCRE", "PAINS", "POMME", "FRUIT", "TRAIN", "AVION",
  "CHAMP", "MONTS",
];

// Curated common 5-letter German words, kept free of umlauts/ß so the
// standard QWERTY layout stays fully valid.
const WORDS_DE: string[] = [
  "BLUME", "TISCH", "STUHL", "LICHT", "APFEL", "BIRNE", "TRAUM", "MONAT", "WOCHE", "JAHRE",
  "KATZE", "HUNDE", "PFERD", "VOGEL", "FISCH", "BLATT", "STEIN", "BERGE", "STADT", "VATER",
  "LEUTE", "PREIS", "MARKT", "LADEN", "REGEN", "WOLKE", "SONNE", "STERN", "MEERE", "KLEID",
  "JACKE", "SCHUH", "BRIEF", "SEITE", "WORTE", "FRAGE",
];

// Curated common 5-letter Portuguese words, kept accent-free.
const WORDS_PT: string[] = [
  "CASAS", "LIVRO", "PORTA", "PRAIA", "NOITE", "VERDE", "LARGO", "FOGOS", "MUNDO", "AMIGO",
  "PRATO", "FRUTA", "LEITE", "DOCES", "FELIZ", "BARCO", "NARIZ", "BOCAS", "BARBA", "BOLSA",
  "BANCO", "CAMPO", "MONTE", "VALES", "COSTA", "ILHAS", "NORTE", "LADOS", "PERTO", "LONGE",
  "NOVOS", "VELHO", "JOVEM", "SUJOS", "LENTO", "GORDO", "POBRE", "LIVRE", "FORTE", "FRACO",
];

// Curated common 5-letter Italian words, kept accent-free.
const WORDS_IT: string[] = [
  "LIBRO", "PORTA", "NOTTE", "VERDE", "LARGO", "FUOCO", "MONDO", "AMICO", "LATTE", "DOLCE",
  "BARCA", "BOCCA", "BARBA", "BORSA", "BANCA", "CAMPO", "MONTE", "VALLE", "COSTA", "ISOLE",
  "NUOVO", "LENTO", "MAGRO", "FORTE", "FIORE", "CIELO", "SEDIA", "LETTO", "TETTO", "PIANO",
  "BAGNO", "PARCO", "TRENO", "AEREO",
];

// Curated common 5-letter Russian words.
const WORDS_RU: string[] = [
  "СТОЛЫ", "КНИГИ", "ДВЕРИ", "ГОРОД", "ПТИЦЫ", "ЦВЕТЫ", "ТРАВА", "ОГОНЬ", "ЗЕМЛЯ", "ВЕТЕР",
  "ДОЖДЬ", "СНЕГА", "ВЕСНА", "ОСЕНЬ", "МЕСЯЦ", "СЕМЬЯ", "ШКОЛА", "ИГРОК", "ТАНЕЦ", "ПЕСНЯ",
  "ФИЛЬМ", "КНИГА", "БУКВЫ", "СЛОВА", "ЯЗЫКИ", "ОБМАН", "ОТВЕТ", "КОНЕЦ", "СРЕДА",
];

export const WORD_LISTS: Partial<Record<Language, string[]>> = {
  en: WORDS_EN,
  he: WORDS_HE,
  es: WORDS_ES,
  fr: WORDS_FR,
  de: WORDS_DE,
  pt: WORDS_PT,
  it: WORDS_IT,
  ru: WORDS_RU,
};

// Physical/on-screen keyboard layouts, only needed for languages whose native
// keyboard differs meaningfully from QWERTY. English falls back to QWERTY.
export const KEYBOARD_LAYOUTS: Partial<Record<Language, string[][]>> = {
  en: [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
  ],
  // Standard Israeli physical keyboard layout.
  he: [
    ["ק", "ר", "א", "ט", "ו", "ן", "ם", "פ"],
    ["ש", "ד", "ג", "כ", "ע", "י", "ח", "ל", "ך", "ף"],
    ["ENTER", "ז", "ס", "ב", "ה", "נ", "מ", "צ", "ת", "ץ", "BACK"],
  ],
  // Standard Russian ЙЦУКЕН physical keyboard layout.
  ru: [
    ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х", "Ъ"],
    ["Ф", "Ы", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Э"],
    ["ENTER", "Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю", "BACK"],
  ],
};

// Matches a single letter typed on a physical keyboard for the given language.
export const LETTER_PATTERNS: Partial<Record<Language, RegExp>> = {
  en: /^[a-zA-Z]$/,
  he: /^[א-ת]$/,
  ru: /^[а-яА-ЯёЁ]$/,
};

export function getWordList(language: Language): string[] {
  return WORD_LISTS[language] ?? WORD_LISTS.en!;
}

export function getWordLength(language: Language): number {
  const list = getWordList(language);
  return list[0]?.length ?? 5;
}

export function getKeyboardLayout(language: Language): string[][] {
  return KEYBOARD_LAYOUTS[language] ?? KEYBOARD_LAYOUTS.en!;
}

export function getLetterPattern(language: Language): RegExp {
  return LETTER_PATTERNS[language] ?? LETTER_PATTERNS.en!;
}
