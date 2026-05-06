/**
 * Insight Global Q2 2026 Expense Schedule
 *
 * Four city groups, each with their own monthly IA Review windows.
 *
 * HOW THE CYCLE WORKS (using Atlanta Sales / Group 2 as the example):
 *   - IA Review begins Wednesday 5/6 (day after payroll runs)
 *   - Review window runs through Tuesday 5/12
 *   - Payroll runs Tuesday 5/12 — system locks at 2:00 PM, no reviews after
 *   - Canadian employees: cannot be reviewed on Tuesdays at all; due Monday 5/11 by 5:00 PM ET
 *   - Next cycle begins Wednesday 6/3
 *
 * The GROUP_DATES below are the IA Review START dates (all Wednesdays).
 * Payroll run date = IA Review start + 6 days (following Tuesday) for US.
 * Payroll run date = IA Review start + 5 days (following Monday) for CA.
 *
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

// ── IA Review START dates per group (Q2 2026, all Wednesdays) ──────────────
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

// ── Public types ───────────────────────────────────────────────────────────

export interface DeadlineResult {
  /** Hard submission deadline: Tuesday 2pm (US) or Monday EOD (CA). */
  payrollRunDate:    Date;
  /** The Wednesday the IA Review window opened / opens. */
  iaReviewStartDate: Date;
  /** The Wednesday the next cycle's IA Review begins (null = end of schedule). */
  nextCycleDate:     Date | null;
  /** Days from today to payrollRunDate. 0 = due today, <0 = past due. */
  daysUntil:         number;
  /** Display string for the time cutoff: "2:00 PM" or "End of Day". */
  cutoffTime:        string;
  /** True when today >= iaReviewStartDate (review window is open). */
  reviewStarted:     boolean;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns deadline info for the next (or current) review cycle.
 * Returns null if city is missing or not in the schedule.
 */
export function getNextDeadline(
  city:    string | null | undefined,
  country: "US" | "CA" = "US",
): DeadlineResult | null {
  if (!city) return null;

  const group = CITY_TO_GROUP[city];
  if (!group) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // US: payroll runs the following Tuesday (+6 days from Wednesday IA Review start)
  // CA: submit by preceding Monday (+5 days), so they're reviewed before payroll closes
  const payrollOffset = country === "CA" ? 5 : 6;
  const cutoffTime    = country === "CA" ? "5:00 PM ET" : "2:00 PM";

  const dates = GROUP_DATES[group];

  for (let i = 0; i < dates.length; i++) {
    const iaDate = new Date(dates[i]);
    iaDate.setHours(0, 0, 0, 0);

    const payrollDate = new Date(iaDate);
    payrollDate.setDate(payrollDate.getDate() + payrollOffset);
    payrollDate.setHours(0, 0, 0, 0);

    const diff = Math.round((payrollDate.getTime() - today.getTime()) / 86_400_000);

    if (diff >= 0) {
      return {
        payrollRunDate:    payrollDate,
        iaReviewStartDate: iaDate,
        nextCycleDate:     i + 1 < dates.length ? new Date(dates[i + 1]) : null,
        daysUntil:         diff,
        cutoffTime,
        reviewStarted:     today >= iaDate,
      };
    }
  }

  // All cycles have passed — return last (past due state)
  const lastIa = new Date(dates[dates.length - 1]);
  lastIa.setHours(0, 0, 0, 0);
  const lastPayroll = new Date(lastIa);
  lastPayroll.setDate(lastPayroll.getDate() + payrollOffset);
  lastPayroll.setHours(0, 0, 0, 0);
  const diff = Math.round((lastPayroll.getTime() - today.getTime()) / 86_400_000);

  return {
    payrollRunDate:    lastPayroll,
    iaReviewStartDate: lastIa,
    nextCycleDate:     null,
    daysUntil:         diff,
    cutoffTime,
    reviewStarted:     true,
  };
}

/** Sorted list of every city/office for the Settings dropdown. */
export const ALL_CITIES: string[] = Object.keys(CITY_TO_GROUP).sort((a, b) =>
  a.localeCompare(b),
);
