"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Locale, Translations, translations } from "./translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (keyPath: string, fallback?: string) => string;
  dictionary: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "businesshub_locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Load from localStorage or cookie on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && (saved === "en" || saved === "si")) {
        setLocaleState(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      // localStorage may fail in restricted browser modes
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLocale;
    } catch {
      // ignore storage failure
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "si" : "en");
  }, [locale, setLocale]);

  const dictionary = translations[locale] || translations.en;

  const t = useCallback(
    (keyPath: string, fallback?: string): string => {
      const keys = keyPath.split(".");
      let current: any = dictionary;

      for (const k of keys) {
        if (current && typeof current === "object" && k in current) {
          current = current[k];
        } else {
          return fallback || keyPath;
        }
      }

      if (typeof current === "string") {
        return current;
      }

      return fallback || keyPath;
    },
    [dictionary]
  );

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        toggleLocale,
        t,
        dictionary,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
