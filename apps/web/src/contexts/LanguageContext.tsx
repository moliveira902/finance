"use client";
import { createContext, useContext, useMemo } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { createT, type Language } from "@/lib/i18n";

interface LanguageContextValue {
  language:    Language;
  locale:      string;       // "pt-BR" | "en-US"
  setLanguage: (lang: Language) => void;
  t:           ReturnType<typeof createT>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { appSettings, updateAppSettings } = useFinanceStore();
  const language: Language = (appSettings?.language as Language) ?? "pt";
  const locale             = language === "en" ? "en-US" : "pt-BR";

  const t = useMemo(() => createT(language), [language]);

  function setLanguage(lang: Language) {
    updateAppSettings({ language: lang });
  }

  return (
    <LanguageContext.Provider value={{ language, locale, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be inside <LanguageProvider>");
  return ctx;
}
