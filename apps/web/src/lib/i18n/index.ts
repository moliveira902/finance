import { pt } from "./pt";
import { en } from "./en";

export type Language     = "pt" | "en";
export type Translations = typeof pt;

export const translations: Record<Language, Translations> = { pt, en };

export function getTranslations(lang: Language): Translations {
  return translations[lang] ?? translations.pt;
}

function deepGet(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return path;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : path;
}

export function createT(lang: Language) {
  const msgs = getTranslations(lang) as unknown as Record<string, unknown>;
  const fallback = pt as unknown as Record<string, unknown>;

  return function t(key: string, vars?: Record<string, string | number>): string {
    let str = deepGet(msgs, key);
    if (str === key) str = deepGet(fallback, key); // fallback to PT
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  };
}

export { pt, en };
