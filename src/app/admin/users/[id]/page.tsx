import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";

const CARD = {
  background: "linear-gradient(135deg, rgb(10,44,68) 0%, rgb(16,62,92) 100%)",
  border: "1px solid rgba(0,214,242,0.15)",
  borderRadius: 16,
} as const;

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const [
    { data: profile },
    { data: receipts },
    { data: events },
    { data: feedbackItems },
  ] = await Promise.all([
    admin.from("users").select("*").eq("id", id).single(),
    admin.from("receipts").select("*").eq("user_id", id).order("transaction_date", { ascending: false }),
    admin.from("events").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(30),
    admin.from("feedback").select("*").eq("user_id", id).order("created_at", { ascending: false }),
  ]);

  if (!profile) notFound();

  const totalAmount = (receipts ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
  const avgRating = (feedbackItems?.length ?? 0) > 0
    ? ((feedbackItems ?? []).reduce((s: number, f: any) => s + f.rating, 0) / feedbackItems!.length).toFixed(1)
    : null;

  const eventLabels: Record<string, string> = {
    receipt_created:        "📥 Submitted a receipt",
    receipt_edited:         "✏️ Edited a receipt",
    receipt_deleted:        "🗑️ Deleted a receipt",
    pdf_exported:           "📄 Exported PDF",
    missing_form_completed: "✓ Completed missing form",
    feedback_submitted:     "💬 Submitted feedback",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link
        href="/admin/users"
        className="text-xs font-semibold hover:opacity-70 transition-opacity"
        style={{ color: "#00D6F2" }}>
        ← Users
      </Link>

      {/* Profile header */}
      <div className="p-5 flex items-center gap-4" style={CARD}>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(0,214,242,0.15)", border: "1px solid rgba(0,214,242,0.25)" }}>
          <span className="text-xl font-bold" style={{ color: "#00D6F2" }}>
            {profile.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-white">{profile.name}</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{profile.email}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
            {profile.country} · Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        {profile.is_admin && (
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
            style={{ background: "rgba(0,214,242,0.15)", color: "#00D6F2", border: "1px solid rgba(0,214,242,0.3)" }}>
            Admin
          </span>
        )}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Receipts",      value: receipts?.length ?? 0 },
          { label: "Total Spent",   value: "$" + totalAmount.toFixed(2) },
          { label: "Events Logged", value: events?.length ?? 0 },
          { label: "Avg Rating",    value: avgRating ? avgRating + "/5" : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 text-center" style={CARD}>
            <p
              className="text-[10px] font-semibold uppercase tracking-wide mb-1"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              {label}
            </p>
            <p className="text-xl font-bold" style={{ color: "#00D6F2" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Activity + Feedback */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Recent Activity */}
        <div className="p-5" style={CARD}>
          <p className="text-sm font-bold text-white mb-3">Recent Activity</p>
          {(events?.length ?? 0) === 0 ? (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>No events yet</p>
          ) : (
            <div className="space-y-2.5">
              {(events ?? []).slice(0, 15).map((e: any) => (
                <div key={e.id} className="flex items-start gap-2.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: "#00D6F2" }}
                  />
                  <div>
                    <p className="text-xs text-white">{eventLabels[e.event_type] ?? e.event_type}</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="p-5" style={CARD}>
          <p className="text-sm font-bold text-white mb-3">Feedback</p>
          {(feedbackItems?.length ?? 0) === 0 ? (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>No feedback yet</p>
          ) : (
            <div className="space-y-3">
              {(feedbackItems ?? []).map((f: any) => (
                <div
                  key={f.id}
                  className="pb-3 last:pb-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm">{"⭐".repeat(f.rating)}</span>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {f.comment && (
                    <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.5)" }}>"{f.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
