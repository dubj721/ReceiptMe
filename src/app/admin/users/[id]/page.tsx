import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: profile },
    { data: receipts },
    { data: events },
    { data: feedbackItems },
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", id).single(),
    supabase.from("receipts").select("*").eq("user_id", id).order("transaction_date", { ascending: false }),
    supabase.from("events").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("feedback").select("*").eq("user_id", id).order("created_at", { ascending: false }),
  ]);

  if (!profile) notFound();

  const totalAmount = (receipts ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
  const avgRating = (feedbackItems?.length ?? 0) > 0
    ? ((feedbackItems ?? []).reduce((s: number, f: any) => s + f.rating, 0) / feedbackItems!.length).toFixed(1)
    : null;

  const eventLabels: Record<string, string> = {
    receipt_created: "📥 Submitted a receipt",
    receipt_edited: "\u270F\uFE0F Edited a receipt",
    receipt_deleted: "🗑️ Deleted a receipt",
    pdf_exported: "📄 Exported PDF",
    missing_form_completed: "\u2713 Completed missing form",
    feedback_submitted: "💬 Submitted feedback",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-xs text-gray-400 hover:text-gray-600">← Users</Link>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-navy flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-brand-cyan">{profile.name?.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <p className="text-base font-bold text-gray-900">{profile.name}</p>
          <p className="text-sm text-gray-400">{profile.email}</p>
          <p className="text-xs text-gray-300 mt-0.5">
            {profile.country} · Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        {profile.is_admin && (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-brand-navy text-brand-cyan">Admin</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Receipts", value: receipts?.length ?? 0 },
          { label: "Total Spent", value: "$" + totalAmount.toFixed(2) },
          { label: "Events Logged", value: events?.length ?? 0 },
          { label: "Avg Rating", value: avgRating ? avgRating + "/5" : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-brand-navy mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Activity timeline */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-900 mb-3">Recent Activity</p>
          {(events?.length ?? 0) === 0 ? (
            <p className="text-xs text-gray-400">No events yet</p>
          ) : (
            <div className="space-y-2.5">
              {(events ?? []).slice(0, 15).map((e: any) => (
                <div key={e.id} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700">{eventLabels[e.event_type] ?? e.event_type}</p>
                    <p className="text-[10px] text-gray-300">
                      {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-900 mb-3">Feedback</p>
          {(feedbackItems?.length ?? 0) === 0 ? (
            <p className="text-xs text-gray-400">No feedback yet</p>
          ) : (
            <div className="space-y-3">
              {(feedbackItems ?? []).map((f: any) => (
                <div key={f.id} className="border-b border-gray-50 pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm">{"⭐".repeat(f.rating)}</span>
                    <span className="text-[10px] text-gray-300">
                      {new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {f.comment && <p className="text-xs text-gray-500 italic">"{f.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
