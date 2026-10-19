import type { Names } from "../../shared/v1";
import type { NameLang } from "../i18n";

const FALLBACK: Record<NameLang, (keyof Names)[]> = {
  ja: ["ja", "rom", "ko"],
  rom: ["rom", "ja", "ko"],
  ko: ["ko", "rom", "ja"],
};

/** The name in `lang`, falling back to the other scripts (a missing ko reads the romanisation). */
export function nameOf(n: Names | undefined, lang: NameLang, fallback = ""): string {
  if (!n) return fallback;
  for (const k of FALLBACK[lang]) {
    const v = n[k];
    if (v) return v;
  }
  return fallback;
}

/** The other spellings worth showing under the main one (deduplicated, kana included). */
export function otherNames(n: Names | undefined, lang: NameLang): { lang: keyof Names; text: string }[] {
  if (!n) return [];
  const main = nameOf(n, lang);
  const seen = new Set([main]);
  const out: { lang: keyof Names; text: string }[] = [];
  for (const k of ["ja", "kana", "rom", "ko"] as const) {
    const v = n[k];
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push({ lang: k, text: v });
    }
  }
  return out;
}
