import type { Names } from "../../shared/v1";
import type { NameLang, UiLang } from "../i18n";

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

/**
 * The order spellings are listed in, by UI language: Korean first on a Korean page, the
 * romanisation first otherwise; the kana reading always comes last.
 */
export const nameOrder = (ui: UiLang): readonly (keyof Names)[] => (ui === "ko" ? ["ja", "ko", "rom", "kana"] : ["ja", "rom", "ko", "kana"]);

/** A name part (family or given) in every script, the kana as the reading of ja: `佐伯 (さえき) / 사에키 / Saeki`. */
export function namePartText(n: Names, ui: UiLang): string {
  const ja = n.ja && (n.kana && n.kana !== n.ja ? `${n.ja} (${n.kana})` : n.ja);
  return nameOrder(ui).map((k) => (k === "ja" ? ja : k === "kana" ? undefined : n[k])).filter(Boolean).join(" / ");
}

/** The other spellings worth showing under the main one (deduplicated, kana included), in `nameOrder(ui)`. */
export function otherNames(n: Names | undefined, lang: NameLang, ui: UiLang): { lang: keyof Names; text: string }[] {
  if (!n) return [];
  const main = nameOf(n, lang);
  const seen = new Set([main]);
  const out: { lang: keyof Names; text: string }[] = [];
  for (const k of nameOrder(ui)) {
    const v = n[k];
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push({ lang: k, text: v });
    }
  }
  return out;
}
