import { createClient } from "@/lib/supabase/server";

export default async function AdminFeedbackPage() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("feedback")
    .select("*, user:users(name, email)")
    .order("created_at", { ascending: false });

  const avgRating = (items?.length ?? 0) > 0
    ? ((items ?? []).reduce((s: number, f: any) => s + f.rating, 0) / items!.length).toFixed(1)
    : null;

  const dist = [5,4,3,2,1].map(n => ({
    star: n,
    count: (items ?? []).filter((f: any) => f.rating === n).length,
    pct: items?.length ? Math.round(((items ?? []).filter((f: any) => f.rating === n).length / items.length) * 100) : 0,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Feedback</h1>
        <p className="text-sm text-gray-400">{items?.length ?? 0} responses</p>
      </div>

      {/* Rating summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-6 items-center">
        <div className="text-center flex-shrink-0">
          <p className="text-4xl font-bold text-brand-navy">{avgRating ?? "—"}</p>
          <p className="text-xs text-gray-400 mt-1">avg rating</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {dist.map(({ star, count, pct }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-4">{star}</span>
              <span className="text-xs">⭐</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-cyan rounded-full transition-all" style={{ width: pct + "%" }} />
              </div>
              <span className="text-[10px] text-gray-400 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback list */}
      <div className="space-y-3">
        {(items?.length ?? 0) === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm">No feedback yet</p>
          </div>
        ) : (
          (items ?? []).map((f: any) => (
            <div key={f.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-navy/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-navy">
                      {f.user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{f.user?.name ?? "Unknown"}</p>
                    <p className="text-[10px] text-gray-400">{f.user?.email}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm">{"⭐".repeat(f.rating)}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
              {f.comment && (
                <p className="mt-3 text-sm text-gray-600 italic border-l-2 border-brand-cyan/30 pl-3">
                  "{f.comment}"
                </p>
              )}
              {f.context && (
                <p className="mt-2 text-[10px] text-gray-300">Context: {f.context}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
