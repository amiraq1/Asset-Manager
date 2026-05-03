import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "./ar";
import en from "./en";

export type SupportedLocale = "ar" | "en";

export const SUPPORTED_LOCALES: SupportedLocale[] = ["ar", "en"];

let initPromise: Promise<typeof i18n> | null = null;

export function initI18n(
  locale: SupportedLocale = "ar",
): Promise<typeof i18n> {
  if (initPromise) {
    return initPromise.then(async (inst) => {
      if (inst.language !== locale) await inst.changeLanguage(locale);
      return inst;
    });
  }
  initPromise = i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: "v4",
      resources: {
        ar: { translation: ar },
        en: { translation: en },
      },
      lng: locale,
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      returnNull: false,
    })
    .then(() => i18n);
  return initPromise;
}

export function isRTL(locale: string): boolean {
  return locale === "ar";
}

export default i18n;
