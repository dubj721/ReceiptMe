/**
 * Insight Global Q2 2026 Expense Schedule
 *
 * Four city groups, each with their own monthly IA Review (submission) deadlines.
 * The IA Review date is when the employee's expense report must be submitted
 * and manager-approved to be included in that month's payroll run.
 *
 * Source: Official Q2 2026 Expense Schedule (April – June 2026)
 * Add Q3+ dates to GROUP_DATES when the new schedule is published.
 */

// ── City → group number ─────────────────────────────────────────────────────

const CITY_TO_GROUP: Record<string, 1 | 2 | 3 | 4> = {
  // ── Group 1 — IA Review: first week of each month ──────────────────────
  "Birmingham":        1,
  "Greenville":        1,
  "Milwaukee":         1,
  "Orlando":           1,
  "Sacramento":        1,
  "Charlotte":         1,
  "Jacksonville":      1,
  "New Jersey":        1,
  "Pensacola":         1,
  "San Francisco":     1,
  "Chattanooga":       1,
  "Las Vegas":         1,
  "New York City":     1,
  "Philadelphia":      1,
  "Silicon Valley":    1,
  "Chicago":           1,
  "Los Angeles":       1,
  "Orange County":     1,
  "Raleigh":           1,
  "Tampa":             1,

  // ── Group 2 — IA Review: second week of each month ─────────────────────
  "Atlanta Sales":     2,
  "KOP":               2,
  "Ottawa":            2,
  "Salt Lake City":    2,
  "Toronto":           2,
  "Calgary":           2,
  "Miami":             2,
  "Phoenix":           2,
  "San Diego":         2,
  "Vancouver":         2,
  "Ft. Lauderdale":    2,
  "Monument":          2,
  "Pittsburgh":        2,
  "Seattle":           2,
  "Waterloo":          2,
  "Huntsville":        2,
  "Nashville":         2,
  "Portland":          2,
  "Stamford":          2,

  // ── Group 3 — IA Review: third week of each month ──────────────────────
  "Austin":                  3,
  "Dallas":                  3,
  "Ft. Worth":               3,
  "New Orleans":             3,
  "Semiconductor Offices":   3,
  "Baltimore":               3,
  "Denver":                  3,
  "Grand Rapids":            3,
  "Norfolk":                 3,
  "St. Louis":               3,
  "Boise":                   3,
  "Des Moines":              3,
  "Hartford":                3,
  "Oklahoma City":           3,
  "Washington DC":           3,
  "Boston":                  3,
  "Detroit":                 3,
  "IGT Legal":               3,
  "Richmond":                3,
  "Charleston":              3,
  "Digital":                 3,
  "Memphis":                 3,
  "San Antonio":             3,

  // ── Group 4 — IA Review: fourth week of each month ─────────────────────
  "Bentonville":       4,
  "Columbus":          4,
  "IGH Offices":       4,
  "Louisville":        4,
  "Cincinnati":        4,
  "Atlanta Corporate": 4,
  "Indianapolis":      4,
  "Minneapolis":       4,
  "Cleveland":         4,
  "Houston":           4,
  "Kansas City":       4,
  "Omaha":             4,
};

// ── IA Review dates per group (Q2 2026) ────────────────────────────────────
// Add Q3 2026 rows when the next schedule is published.
const GROUP_DATES: Record<1 | 2 | 3 | 4, Date[]> = {
  1: [
    new Date("2026-04-01"),
    new Date("2026-04-29"),
    new Date("2026-05-27"),
  ],
  2: [
    new Date("2026-04-08"),
    new Date("2026-05-06"),
    new Date("2026-06-03"),
  ],
  3: [
    new Date("2026-04-15"),
    new Date("2026-05-13"),
    new Date("2026-06-10"),
  ],
  4: [
    new Date("2026-04-22"),
    new Date("2026-05-20"),
    new Date("2026-06-17"),
  ],
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns the next upcoming IA Review deadline for a given city.
 * daysUntil = 0 → due today, < 0 → already past.
 * Returns null if the city is not in the schedule.
 */
export function getNextDeadline(
  city: string | null | undefined,
): { date: Date; daysUntil: number } | null {
  if (!city) return null;

  const group = CITY_TO_GROUP[city];
  if (!group) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = GROUP_DATES[group];

  // Walk forward through scheduled dates
  for (const raw of dates) {
    const d = new Date(raw);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    if (diff >= 0) return { date: d, daysUntil: diff };
  }

  // All dates have passed — return last one with negative diff
  const last = new Date(dates[dates.length - 1]);
  last.setHours(0, 0, 0, 0);
  const diff = Math.round((last.getTime() - today.getTime()) / 86_400_000);
  return { date: last, daysUntil: diff };
}

/** Sorted list of every city/office for the Settings dropdown. */
export const ALL_CITIES: string[] = Object.keys(CITY_TO_GROUP).sort((a, b) =>
  a.localeCompare(b),
);
