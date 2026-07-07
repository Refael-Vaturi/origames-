import type { Language } from "@/contexts/LanguageContext";
import type { TriviaQuestion } from "./questions";

export interface QuestionTranslation {
  q: string;
  choices: [string, string, string, string];
}

// Keyed by the question's index in QUESTIONS (stable as long as that array is
// only appended to, never reordered). Each language file only needs to cover
// the questions someone has translated so far — untranslated entries silently
// fall back to English, same pattern as the rest of the site's t()/tf().
export type TranslationMap = Record<number, QuestionTranslation>;

const loaders: Partial<Record<Language, () => Promise<{ default: TranslationMap }>>> = {
  he: () => import("./translations/he"),
  ar: () => import("./translations/ar"),
  es: () => import("./translations/es"),
  fr: () => import("./translations/fr"),
  ru: () => import("./translations/ru"),
};

const cache: Partial<Record<Language, TranslationMap>> = {};
const pending: Partial<Record<Language, Promise<void>>> = {};

/** Kicks off (and caches) loading a language's translation map. Safe to call repeatedly. */
export function preloadTriviaTranslations(language: Language): Promise<void> {
  if (cache[language] || !loaders[language]) return Promise.resolve();
  if (!pending[language]) {
    pending[language] = loaders[language]!().then((mod) => {
      cache[language] = mod.default;
    });
  }
  return pending[language]!;
}

/** Synchronous lookup — returns the localized question if already loaded, else the English original. */
export function localizeQuestion(question: TriviaQuestion, index: number, language: Language): TriviaQuestion {
  const map = cache[language];
  const translated = map?.[index];
  if (!translated) return question;
  return { ...question, q: translated.q, choices: translated.choices };
}
