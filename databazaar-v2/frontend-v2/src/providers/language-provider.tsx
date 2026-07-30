"use client";

import React, { createContext, useContext, useEffect, useCallback, useState } from "react";
import { useTranslation, I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { LANG_KEY } from "@/lib/constants";

type LangKey = "en" | "bn";

interface LanguageContextType {
  lang: LangKey;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  toggleLang: () => void;
  setLang: (lang: LangKey) => void;
  i18nInstance: typeof i18n;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function LanguageProviderInner({ children }: { children: React.ReactNode }) {
  const { i18n: i18nHook } = useTranslation();
  const [lang, setLangState] = useState<LangKey>("en");

  useEffect(() => {
    const current = (i18nHook.language || localStorage.getItem(LANG_KEY) || "en") as LangKey;
    setLangState(current.startsWith("bn") ? "bn" : "en");
  }, [i18nHook.language]);

  const setLang = useCallback(
    (newLang: LangKey) => {
      i18nHook.changeLanguage(newLang);
      localStorage.setItem(LANG_KEY, newLang);
      setLangState(newLang);
    },
    [i18nHook]
  );

  const toggleLang = useCallback(() => {
    const target = lang === "en" ? "bn" : "en";
    setLang(target);
  }, [lang, setLang]);

  // Create a proxy translation object that supports both:
  // 1. t('nav.home') -> standard i18next translation
  // 2. t.nav.home -> dictionary object access for existing templates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translateFn: any = (key: string, options?: Record<string, unknown>) => {
    return i18nHook.t(key, options);
  };

  const currentBundle = i18nHook.getResourceBundle(lang, "translation") || {};

  const tProxy = new Proxy(translateFn, {
    get(_target, prop: string) {
      if (prop in currentBundle) {
        return currentBundle[prop];
      }
      return translateFn(prop);
    },
  });

  return (
    <LanguageContext.Provider
      value={{
        lang,
        t: tProxy,
        toggleLang,
        setLang,
        i18nInstance: i18nHook as typeof i18n,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProviderInner>{children}</LanguageProviderInner>
    </I18nextProvider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
