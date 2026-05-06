import Link from "next/link";

interface Props {
  city:       string | null | undefined;
  daysUntil:  number | null;
  dueDate:    Date   | null;
}

function formatDueDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
    year:    "numeric",
  });
}

export default function DeadlineBanner({ city, daysUntil, dueDate }: Props) {

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
          <p className="text-white font-bold text-base">Set your office city</p>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Tap here to choose your city in Settings and see your expense deadline.
          </p>
        </div>
      </Link>
    );
  }

  // ── City set but not found in schedule ───────────────────────────────────
  if (daysUntil === null || dueDate === null) {
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
    // Past due
    accentColor = "#f87171";
    bgGradient  = "linear-gradient(135deg, rgba(80,10,10,0.9) 0%, rgba(100,20,20,0.85) 100%)";
  } else if (daysUntil === 0) {
    // Due today
    accentColor = "#fb923c";
    bgGradient  = "linear-gradient(135deg, rgba(80,30,5,0.9) 0%, rgba(100,45,10,0.85) 100%)";
  } else if (daysUntil <= 3) {
    // 1–3 days — urgent
    accentColor = "#fb923c";
    bgGradient  = "linear-gradient(135deg, rgba(60,25,5,0.92) 0%, rgba(80,38,8,0.88) 100%)";
  } else if (daysUntil <= 7) {
    // 4–7 days — warning
    accentColor = "#fbbf24";
    bgGradient  = "linear-gradient(135deg, rgba(50,35,5,0.92) 0%, rgba(70,52,8,0.88) 100%)";
  } else {
    // 8+ days — normal
    accentColor = "#00D6F2";
    bgGradient  = "linear-gradient(135deg, rgba(8,38,60,0.95) 0%, rgba(14,58,88,0.92) 100%)";
  }

  // ── Headline copy ────────────────────────────────────────────────────────
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

  return (
    <div
      className="w-full rounded-2xl px-6 py-7 text-center"
      style={{ background: bgGradient }}>

      {/* Primary headline */}
      <p className="font-black leading-tight" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>
        {headline}
      </p>

      {/* Due date */}
      <p className="mt-2 text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
        {daysUntil < 0 ? "Was due" : "Due"} {formatDueDate(dueDate)} · IA Review
      </p>

      {/* City label */}
      <p className="mt-1 text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: "rgba(255,255,255,0.28)" }}>
        {city}
      </p>
    </div>
  );
}
