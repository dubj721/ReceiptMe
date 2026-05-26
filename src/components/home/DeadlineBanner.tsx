import Link from "next/link";

interface Props {
  city:              string | null | undefined;
  daysUntil:         number | null;
  payrollRunDate:    Date   | null;
  iaReviewStartDate: Date   | null;
  nextCycleDate:     Date   | null | undefined;
  cutoffTime:        string | null;
  reviewStarted:     boolean;
}

function fmtShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DeadlineBanner({
  city,
  daysUntil,
  payrollRunDate,
  iaReviewStartDate,
  nextCycleDate,
  cutoffTime,
  reviewStarted,
}: Props) {

  // ── No city set yet ──────────────────────────────────────────────────────
  if (!city) {
    return (
      <Link href="/settings" className="block w-full">
        <div
          className="w-full rounded-2xl p-6 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(10,44,68,0.95) 0%, rgba(16,62,92,0.9) 100%)",
            border: "1px solid rgba(0,214,242,0.15)",
          }}>
          <p className="text-2xl mb-2">📍</p>
          <p className="text-white font-bold text-base">Set your office</p>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Tap here to choose your office in Settings and see your expense deadline.
          </p>
        </div>
      </Link>
    );
  }

  // ── City set but not found in schedule ───────────────────────────────────
  if (daysUntil === null || payrollRunDate === null || iaReviewStartDate === null) {
    return (
      <div
        className="w-full rounded-2xl p-6 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(10,44,68,0.95) 0%, rgba(16,62,92,0.9) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
        <p className="text-white font-bold text-base">Schedule unavailable</p>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          {city} isn't in the current schedule. Contact the Expense Team.
        </p>
      </div>
    );
  }

  // ── Urgency colours ──────────────────────────────────────────────────────
  let accentColor: string;
  let bgGradient:  string;

  if (daysUntil < 0) {
    accentColor = "#f87171";
    bgGradient  = "linear-gradient(135deg, rgba(80,10,10,0.9) 0%, rgba(100,20,20,0.85) 100%)";
  } else if (daysUntil === 0) {
    accentColor = "#fb923c";
    bgGradient  = "linear-gradient(135deg, rgba(80,30,5,0.9) 0%, rgba(100,45,10,0.85) 100%)";
  } else if (daysUntil <= 3) {
    accentColor = "#fb923c";
    bgGradient  = "linear-gradient(135deg, rgba(60,25,5,0.92) 0%, rgba(80,38,8,0.88) 100%)";
  } else if (daysUntil <= 7) {
    accentColor = "#fbbf24";
    bgGradient  = "linear-gradient(135deg, rgba(50,35,5,0.92) 0%, rgba(70,52,8,0.88) 100%)";
  } else {
    accentColor = "#00D6F2";
    bgGradient  = "linear-gradient(135deg, rgba(8,38,60,0.95) 0%, rgba(14,58,88,0.92) 100%)";
  }

  // ── Headline ─────────────────────────────────────────────────────────────
  let headline: React.ReactNode;

  if (daysUntil < 0) {
    headline = (
      <>
        <span style={{ color: accentColor }}>Expenses Past Due</span>
        <span className="text-white"> — Submit Now</span>
      </>
    );
  } else if (daysUntil === 0) {
    headline = <span style={{ color: accentColor }}>Expenses Due Today</span>;
  } else {
    headline = (
      <>
        <span className="text-white">Expenses Due in </span>
        <span style={{ color: accentColor }}>{daysUntil}</span>
        <span className="text-white"> {daysUntil === 1 ? "Day" : "Days"}</span>
      </>
    );
  }

  // ── Review window label ───────────────────────────────────────────────────
  const reviewLabel = daysUntil < 0
    ? "Review closed"
    : reviewStarted
      ? "Review began"
      : "Review begins";

  return (
    <div
      className="w-full rounded-2xl px-6 py-7 text-center"
      style={{ background: bgGradient }}>

      {/* ── Big countdown ─────────────────────────────────────────────── */}
      <p className="font-black leading-tight" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>
        {headline}
      </p>

      {/* ── Review window + hard deadline ─────────────────────────────── */}
      <p className="mt-2.5 text-xs font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
        <span>{reviewLabel} </span>
        <span style={{ color: accentColor, fontWeight: 600 }}>{fmtShort(iaReviewStartDate)}</span>
        <span style={{ color: "rgba(255,255,255,0.3)" }}> · </span>
        <span>Due </span>
        <span style={{ color: accentColor, fontWeight: 600 }}>{fmtShort(payrollRunDate)}</span>
        {cutoffTime && (
          <span style={{ color: "rgba(255,255,255,0.4)" }}> by {cutoffTime}</span>
        )}
      </p>

      {/* ── Next cycle ────────────────────────────────────────────────── */}
      {nextCycleDate && (
        <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.32)" }}>
          Next cycle begins{" "}
          <span style={{ color: "rgba(255,255,255,0.52)" }}>
            {fmtShort(nextCycleDate)}
          </span>
        </p>
      )}

      {/* ── City label ────────────────────────────────────────────────── */}
      <p className="mt-2 text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: "rgba(255,255,255,0.2)" }}>
        {city}
      </p>
    </div>
  );
}
