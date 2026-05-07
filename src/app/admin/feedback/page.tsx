import { createAdminClient } from "@/lib/supabase/admin";

const CARD = {
  background: "linear-gradient(135deg, rgb(10,44,68) 0%, rgb(16,62,92) 100%)",
  border: "1px solid rgba(0,214,242,0.15)",
  borderRadius: 16,
} as const;

export default async function AdminFeedbackPage() {
  const admin = createAdminClient();
  const { data: items } = await admin
    .from("feedback")
    .select("*, user:users(name, email)")
    .order("created_at", { ascending: false });

  const avgRating = (items?.length ?? 0) > 0
    ? ((items ?? []).reduce((s: number, f: any) => s + f.rating, 0) / items!.length).toFixed(1)
    : null;

  const dist = [5,4,3,2,1].map(n => ({
    star: n,
    count: (items ?? []).filter((f: any) => f.rating === n).length,
    pct: items?.length
      ? Math.round(((items ?? []).filter((f: any) => f.rating === n).length / items.length) * 100)
      : 0,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Feedback</h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {items?.length ?? 0} responses
        </p>
      </div>

      {/* Rating summary */}
      <div className="p-5 flex gap-6 items-center" style={CARD}>
        <div className="text-center flex-shrink-0">
          <p className="text-4xl font-bold" style={{ color: "#00D6F2" }}>{avgRating ?? "—"}</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>avg rating</p>
        </div>
        <div className="flex-1 space-y-2">
          {dist.map(({ star, count, pct }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs w-4" style={{ color: "rgba(255,255,255,0.5)" }}>{star}</span>
              <span className="text-xs">⭐</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: pct + "%", background: "#00D6F2" }} />
              </div>
              <span className="text-[10px] w-6 text-right" style={{ color: "rgba(255,255,255,0.35)" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Individual responses */}
      <div className="space-y-3">
        {(items?.length ?? 0) === 0 ? (
          <div className="p-8 text-center" style={CARD}>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>No feedback yet</p>
          </div>
        ) : (items ?? []).map((f: any) => (
          <div key={f.id} className="p-4" style={CARD}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,214,242,0.15)", border: "1px solid rgba(0,214,242,0.25)" }}>
                  <span className="text-xs font-bold" style={{ color: "#00D6F2" }}>
                    {f.user?.name?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{f.user?.name ?? "Unknown"}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{f.user?.email}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm">{"⭐".repeat(f.rating)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
            {f.comment && (
              <p className="mt-3 text-sm italic pl-3"
                style={{ color: "rgba(255,255,255,0.6)", borderLeft: "2px solid rgba(0,214,242,0.3)" }}>
                "{f.comment}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
