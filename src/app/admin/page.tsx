import { createAdminClient } from "@/lib/supabase/admin";

const CARD = {
  background: "linear-gradient(135deg, rgb(10,44,68) 0%, rgb(16,62,92) 100%)",
  border: "1px solid rgba(0,214,242,0.15)",
  borderRadius: 16,
} as const;

async function getStats() {
  const admin = createAdminClient();
  const now     = new Date();
  const weekAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: newThisMonth },
    { count: totalReceipts },
    { count: totalExports },
    { count: weekReceipts },
    { data: feedbackRows },
    { data: recentFeedback },
    { data: recentUsers },
  ] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("users").select("*", { count: "exact", head: true }).gte("created_at", monthAgo),
    admin.from("receipts").select("*", { count: "exact", head: true }),
    admin.from("events").select("*", { count: "exact", head: true }).eq("event_type", "pdf_exported"),
    admin.from("receipts").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    admin.from("feedback").select("rating"),
    admin.from("feedback").select("*, user:users(name)").order("created_at", { ascending: false }).limit(5),
    admin.from("users").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const avgRating = (feedbackRows?.length ?? 0) > 0
    ? (feedbackRows!.reduce((s: number, r: any) => s + r.rating, 0) / feedbackRows!.length).toFixed(1)
    : null;

  return { totalUsers, newThisMonth, totalReceipts, totalExports, weekReceipts,
    avgRating, feedbackCount: feedbackRows?.length ?? 0, recentFeedback, recentUsers };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-5" style={CARD}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1"
        style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: "#00D6F2" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{sub}</p>}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const s = await getStats();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Overview</h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Beta test dashboard — all users
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Users"        value={s.totalUsers ?? 0}    sub={`+${s.newThisMonth ?? 0} this month`} />
        <StatCard label="Total Receipts"     value={s.totalReceipts ?? 0} sub={`+${s.weekReceipts ?? 0} this week`} />
        <StatCard label="PDF Exports"        value={s.totalExports ?? 0} />
        <StatCard label="Feedback Responses" value={s.feedbackCount} />
        <StatCard label="Avg Rating"         value={s.avgRating ? `${s.avgRating} / 5` : "—"} />
      </div>

      {/* Recent panels */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Recent Feedback */}
        <div className="p-5" style={CARD}>
          <p className="text-sm font-bold text-white mb-4">Recent Feedback</p>
          {(s.recentFeedback?.length ?? 0) === 0 ? (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>No feedback yet</p>
          ) : s.recentFeedback!.map((f: any) => (
            <div key={f.id}
              className="pb-3 mb-3 last:pb-0 last:mb-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-semibold text-white">{f.user?.name ?? "Unknown"}</p>
                <span className="text-xs">{"⭐".repeat(f.rating)}</span>
              </div>
              {f.comment && (
                <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.5)" }}>"{f.comment}"</p>
              )}
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                {new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          ))}
        </div>

        {/* Newest Users */}
        <div className="p-5" style={CARD}>
          <p className="text-sm font-bold text-white mb-4">Newest Users</p>
          {(s.recentUsers?.length ?? 0) === 0 ? (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>No users yet</p>
          ) : s.recentUsers!.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 mb-3 last:mb-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,214,242,0.15)", border: "1px solid rgba(0,214,242,0.25)" }}>
                <span className="text-xs font-bold" style={{ color: "#00D6F2" }}>
                  {u.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{u.email}</p>
              </div>
              <p className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
