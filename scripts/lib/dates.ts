import type { Period } from "../../shared/graph";

/** ISO dates (yyyy-mm-dd) compare correctly as strings. */
export function minDate(a: string | undefined | null, b: string | undefined | null): string | undefined {
  if (!a) return b ?? undefined;
  if (!b) return a;
  return a < b ? a : b;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Is `date` inside the inclusive period? An absent date is inside every period. */
export function inPeriod(date: string | undefined, [from, until]: Period): boolean {
  if (!date) return true;
  return (from === null || from <= date) && (until === null || date <= until);
}

/**
 * Merges overlapping or back-to-back periods (2024-03-31 then 2024-04-01 is one period), so a
 * member who stays across lineup changes gets one continuous membership.
 */
export function mergePeriods(periods: Period[]): Period[] {
  if (!periods.length) return [];
  const sorted = [...periods].sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""));
  const out: Period[] = [[...sorted[0]] as Period];
  for (const [from, until] of sorted.slice(1)) {
    const last = out[out.length - 1];
    const touches = last[1] === null || from === null || from <= addDays(last[1], 1);
    if (touches) {
      if (last[1] !== null && (until === null || until > last[1])) last[1] = until;
    } else {
      out.push([from, until]);
    }
  }
  return out;
}
