import { createClient } from "@/lib/supabase/server";

async function getStats() {
  const supabase = await createClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
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
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", monthAgo),
    supabase.from("receipts").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("event_type", "pdf_exported"),
    supabase.from("receipts").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("feedback").select("rating"),
    supabase.from("feedback").select("*, user:users(name)").order("created_at", { ascending: false }).limit(5),
    supabase.from("users").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const avgRating = (feedbackRows?.length ?? 0) > 0
    ? (feedbackRows!.reduce((s: number, r: any) => s + r.rating, 0) / feedbackRows!.length).toFixed(1)
    : null;

  return { totalUsers, newThisMonth, totalReceipts, totalExports, weekReceipts, avgRating,
    feedbackCount: feedbackRows?.length ?? 0, recentFeedback, recentUsers };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-brand-navy">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const s = await getStats();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-400">Beta test dashboard — all users</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Users" value={s.totalUsers ?? 0} sub={`+${s.newThisMonth ?? 0} this month`} />
        <StatCard label="Total Receipts" value={s.totalReceipts ?? 0} sub={`+${s.weekReceipts ?? 0} this week`} />
        <StatCard label="PDF Exports" value={s.totalExports ?? 0} />
        <StatCard label="Feedback Responses" value={s.feedbackCount} />
        <StatCard label="Avg Rating" value={s.avgRating ? `${s.avgRating} / 5` : "—"} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent feedback */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-900 mb-3">Recent Feedback</p>
          {(s.recentFeedback?.length ?? 0) === 0 ? (
            <p className="text-xs text-gray-400">No feedback yet</p>
          ) : (
            <div className="space-y-3">
              {s.recentFeedback!.map((f: any) => (
                <div key={f.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-semibold text-gray-700">{f.user?.name ?? "Unknown"}</p>
                    <span className="text-xs">{"⭐".repeat(f.rating)}</span>
                  </div>
                  {f.comment && <p className="text-xs text-gray-500 italic">"{f.comment}"</p>}
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Newest users */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-900 mb-3">Newest Users</p>
          {(s.recentUsers?.length ?? 0) === 0 ? (
            <p className="text-xs text-gray-400">No users yet</p>
          ) : (
            <div className="space-y-3">
              {s.recentUsers!.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-navy/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-navy">
                      {u.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                  </div>
                  <p className="text-[10px] text-gray-300 flex-shrink-0">
                    {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
