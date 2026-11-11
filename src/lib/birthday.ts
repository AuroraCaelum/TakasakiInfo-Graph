/**
 * Birthdays: which persons and characters have theirs today, and how a birthday reads.
 *
 * "Today" is the viewer's own date, in the browser's time zone.
 */

import { useMemo, useSyncExternalStore } from "react";

import type { UiLang } from "../i18n";

const pad = (n: number) => String(n).padStart(2, "0");

/** The date in the browser's time zone as `YYYY-MM-DD`. */
export function localDate(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** The `MM-DD` birthdays that fall on `date` (`YYYY-MM-DD`): a 02-29 birthday falls on 02-28 in common years. */
export function birthdaysOn(date: string): Set<string> {
  const md = date.slice(5);
  return new Set(md === "02-28" && !isLeap(Number(date.slice(0, 4))) ? [md, "02-29"] : [md]);
}

// --- today, shared by every component and moved on at local midnight -------------------------

/** A development aid: `?today=MM-DD` (or `YYYY-MM-DD`) pretends it is that day. */
function override(): string | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("today");
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : /^\d{2}-\d{2}$/.test(v) ? `2024-${v}` : null;
}

let today = override() ?? localDate(new Date());
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function schedule() {
  const now = new Date();
  const untilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
  timer = setTimeout(() => {
    today = override() ?? localDate(new Date());
    listeners.forEach((l) => l());
    schedule();
  }, untilMidnight + 1000);
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) schedule();
  return () => {
    listeners.delete(l);
    if (!listeners.size) clearTimeout(timer);
  };
}

/** The `MM-DD` birthdays that fall today (the viewer's date); updates at midnight. */
export function useBirthdaysToday(): Set<string> {
  const date = useSyncExternalStore(subscribe, () => today);
  return useMemo(() => birthdaysOn(date), [date]);
}

// --- display ---------------------------------------------------------------------------------

const LOCALE: Record<UiLang, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP" };

/** `YYYY-MM-DD` or `MM-DD` in the UI language: "1997년 5월 2일", "May 31", "5月31日". */
export function formatBirthday(b: string, lang: UiLang): string {
  const withYear = b.length === 10;
  const [y, m, d] = (withYear ? b : `2000-${b}`).split("-").map(Number); // 2000: a leap year, for 02-29
  return new Intl.DateTimeFormat(LOCALE[lang], {
    ...(withYear ? { year: "numeric" } : {}), month: "long", day: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
