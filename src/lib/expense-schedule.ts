/**
 * Insight Global Q2 2026 Expense Schedule
 *
 * Four city groups, each with their own monthly IA Review (submission) deadlines.
 *
 * SUBMISSION CUTOFFS (relative to the Wednesday IA Review date):
 *   • US External  — Tuesday 2:00 PM  (1 day before IA Review)
 *   • US Internal  — Tuesday 12:00 PM (1 day before IA Review, noon)
 *   • Canadian     — Monday  EOD      (2 days before IA Review)
 *
 * Source: Official Q2 2026 Expense Schedule (April – June 2026)
 * Add Q3+ dates to GROUP_DATES when the new schedule is published.
 */

import type { EmployeeType } from "@/types";

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
// All IA Review dates fall on Wednesdays.
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

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Given an IA Review date (Wednesday), returns the submission deadline date.
 * US employees: Tuesday (1 day before)
 * Canadian employees: Monday (2 days before)
 */
function submissionDateFor(iaDate: Date, country: "US" | "CA"): Date {
  const d = new Date(iaDate);
  d.setDate(d.getDate() - (country === "CA" ? 2 : 1));
  return d;
}

/**
 * The display time cutoff label shown in the banner.
 * CA: "End of Day"  |  US Internal: "12:00 PM"  |  US External: "2:00 PM"
 */
function cutoffTimeFor(country: "US" | "CA", employeeType: EmployeeType): string {
  if (country === "CA") return "End of Day";
  return employeeType === "internal" ? "12:00 PM" : "2:00 PM";
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface DeadlineResult {
  /** The date the employee must submit by (Tuesday US, Monday CA). */
  submissionDate: Date;
  /** The Wednesday IA Review date for display purposes. */
  iaReviewDate: Date;
  /** Days from today to submissionDate. 0 = due today, <0 = past due. */
  daysUntil: number;
  /** Human-readable time cutoff, e.g. "2:00 PM", "12:00 PM", "End of Day". */
  cutoffTime: string;
}

/**
 * Returns the next upcoming submission deadline for the given city/country/type.
 * "Next upcoming" = the first submissionDate that has not yet passed.
 * If all dates have passed, returns the last one (with negative daysUntil).
 * Returns null if city is missing or not in the schedule.
 */
export function getNextDeadline(
  city: string | null | undefined,
  country: "US" | "CA" = "US",
  employeeType: EmployeeType = "external",
): DeadlineResult | null {
  if (!city) return null;

  const group = CITY_TO_GROUP[city];
  if (!group) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cutoffTime = cutoffTimeFor(country, employeeType);

  for (const raw of GROUP_DATES[group]) {
    const iaDate = new Date(raw);
    iaDate.setHours(0, 0, 0, 0);

    const subDate = submissionDateFor(iaDate, country);
    subDate.setHours(0, 0, 0, 0);

    const diff = Math.round((subDate.getTime() - today.getTime()) / 86_400_000);
    if (diff >= 0) {
      return { submissionDate: subDate, iaReviewDate: iaDate, daysUntil: diff, cutoffTime };
    }
  }

  // All submission dates have passed — return the last one (negative diff)
  const lastIa = new Date(GROUP_DATES[group][GROUP_DATES[group].length - 1]);
  lastIa.setHours(0, 0, 0, 0);
  const lastSub = submissionDateFor(lastIa, country);
  lastSub.setHours(0, 0, 0, 0);
  const diff = Math.round((lastSub.getTime() - today.getTime()) / 86_400_000);

  return { submissionDate: lastSub, iaReviewDate: lastIa, daysUntil: diff, cutoffTime };
}

/** Sorted list of every city/office for the Settings dropdown. */
export const ALL_CITIES: string[] = Object.keys(CITY_TO_GROUP).sort((a, b) =>
  a.localeCompare(b),
);
