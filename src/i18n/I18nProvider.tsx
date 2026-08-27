"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dict, type Dict, type Lang } from "./dict";

type Ctx = { lang: Lang; t: Dict; setLang: (l: Lang) => void; toggle: () => void };

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos_lang");
      // Read after mount so the server-rendered HTML and the first client render match.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "th" || saved === "en") setLangState(saved);
    } catch {
      /* storage may be unavailable */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("pos_lang", l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l;
  }, []);

  const value = useMemo<Ctx>(
    () => ({ lang, t: dict[lang], setLang, toggle: () => setLang(lang === "th" ? "en" : "th") }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/** Pick the localized name of a record that carries `name` (TH) and optional `nameEn`. */
export function localName(lang: Lang, name: string, nameEn?: string | null) {
  return lang === "en" && nameEn ? nameEn : name;
}
