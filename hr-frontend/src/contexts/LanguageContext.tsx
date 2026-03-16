import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppLanguage, getTranslationDiagnostics, translate } from "@/lib/i18n";

type LanguageContextType = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "app.language";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>("th");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const diagnostics = getTranslationDiagnostics();
    if (diagnostics.duplicateKeys.length > 0) {
      console.warn("[i18n] Duplicate translation keys:", diagnostics.duplicateKeys);
    }
    if (diagnostics.missingInThai.length > 0 || diagnostics.missingInEnglish.length > 0) {
      console.warn("[i18n] Missing translation keys:", diagnostics);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "th" || saved === "en") {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (next: AppLanguage) => {
    setLanguageState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string, fallback?: string) => translate(language, key, fallback),
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
};
